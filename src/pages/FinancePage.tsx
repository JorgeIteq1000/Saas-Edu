import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Plus, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FinancialData {
  enrollments: any[];
  sales: any[];
}

const FinancePage = () => {
  const [financialData, setFinancialData] = useState<FinancialData>({ enrollments: [], sales: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('finance', 'view')) {
      fetchFinancialData();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const fetchFinancialData = async () => {
    try {
      // Buscar matrículas para dados de mensalidades
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          *,
          student:profiles!enrollments_student_id_fkey(full_name, email),
          course:courses(name, code, monthly_fee, enrollment_fee)
        `)
        .order('created_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;

      // Buscar vendas para receitas
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          seller:profiles!sales_seller_id_fkey(full_name),
          course:courses(name, monthly_fee, enrollment_fee)
        `)
        .eq('status', 'fechada')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      setFinancialData({ enrollments: enrollments || [], sales: sales || [] });
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados financeiros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalRevenue = () => {
    const enrollmentFees = financialData.enrollments
      .filter(e => e.enrollment_fee_status === 'pago')
      .reduce((sum, e) => sum + (e.course?.enrollment_fee || 0), 0);
    
    const salesRevenue = financialData.sales
      .reduce((sum, s) => sum + (s.value || 0), 0);
    
    return enrollmentFees + salesRevenue;
  };

  const calculatePendingRevenue = () => {
    return financialData.enrollments
      .filter(e => e.enrollment_fee_status === 'pendente')
      .reduce((sum, e) => sum + (e.course?.enrollment_fee || 0), 0);
  };

  const getPaymentStatusLabel = (status: string) => {
    const statuses = {
      pendente: 'Pendente',
      pago: 'Pago',
      cancelado: 'Cancelado',
      em_atraso: 'Em Atraso'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const filteredEnrollments = financialData.enrollments.filter(enrollment =>
    enrollment.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSales = financialData.sales.filter(sale =>
    sale.seller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission('finance', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para visualizar dados financeiros.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle financeiro e receitas</p>
        </div>
        {hasPermission('finance', 'create') && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateTotalRevenue().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Pendente</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculatePendingRevenue().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matrículas Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialData.enrollments.filter(e => e.enrollment_fee_status === 'pago').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Fechadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialData.sales.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="enrollments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="enrollments">Taxas de Matrícula</TabsTrigger>
          <TabsTrigger value="sales">Receita de Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle>Taxas de Matrícula</CardTitle>
              <CardDescription>
                Controle de pagamentos das taxas de matrícula
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por aluno ou curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p>Carregando dados financeiros...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Taxa de Matrícula</TableHead>
                      <TableHead>Status do Pagamento</TableHead>
                      <TableHead>Data da Matrícula</TableHead>
                      {hasPermission('finance', 'edit') && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{enrollment.student?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{enrollment.student?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{enrollment.course?.name}</p>
                            <p className="text-sm text-muted-foreground">{enrollment.course?.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {(enrollment.course?.enrollment_fee || 0).toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={enrollment.enrollment_fee_status === 'pago' ? 'default' : 'secondary'}>
                            {getPaymentStatusLabel(enrollment.enrollment_fee_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(enrollment.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        {hasPermission('finance', 'edit') && (
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Editar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Receita de Vendas</CardTitle>
              <CardDescription>
                Receitas provenientes de vendas fechadas
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por vendedor ou curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Valor da Venda</TableHead>
                    <TableHead>Data</TableHead>
                    {hasPermission('finance', 'edit') && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        {sale.seller?.full_name}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.course?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {(sale.value || 0).toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      {hasPermission('finance', 'edit') && (
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancePage;