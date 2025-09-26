import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Sale {
  id: string;
  status: string;
  value?: number;
  notes?: string;
  created_at: string;
  seller?: {
    full_name: string;
    email: string;
  };
  student?: {
    full_name: string;
    email: string;
  };
  course?: {
    name: string;
    code: string;
  };
  enrollment?: {
    enrollment_number: string;
  };
}

const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('sales', 'view')) {
      fetchSales();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          seller:profiles!sales_seller_id_fkey(full_name, email),
          student:profiles!sales_student_id_fkey(full_name, email),
          course:courses(name, code),
          enrollment:enrollments(enrollment_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statuses = {
      lead: 'Lead',
      proposta: 'Proposta',
      negociacao: 'Negociação',
      fechada: 'Fechada',
      perdida: 'Perdida'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      lead: 'secondary',
      proposta: 'default',
      negociacao: 'default',
      fechada: 'default',
      perdida: 'destructive'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const filteredSales = sales.filter(sale =>
    sale.seller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = sales
    .filter(sale => sale.status === 'fechada' && sale.value)
    .reduce((sum, sale) => sum + (sale.value || 0), 0);

  if (!hasPermission('sales', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para visualizar vendas.</p>
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
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">Gerencie o pipeline de vendas</p>
        </div>
        {hasPermission('sales', 'create') && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Fechadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales.filter(s => s.status === 'fechada').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales.length > 0 ? 
                ((sales.filter(s => s.status === 'fechada').length / sales.length) * 100).toFixed(1) + '%' 
                : '0%'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
          <CardDescription>
            Acompanhe todas as oportunidades de vendas
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por vendedor, cliente ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando vendas...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  {hasPermission('sales', 'edit') && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.seller?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{sale.seller?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.student?.full_name || 'Lead'}</p>
                        <p className="text-sm text-muted-foreground">{sale.student?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.course?.name}</p>
                        <p className="text-sm text-muted-foreground">{sale.course?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(sale.status) as any}>
                        {getStatusLabel(sale.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.value ? 
                        sale.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {hasPermission('sales', 'edit') && (
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
    </div>
  );
};

export default SalesPage;