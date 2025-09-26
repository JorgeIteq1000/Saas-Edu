import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Filter, TrendingUp, Users, DollarSign, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReportData {
  totalUsers: number;
  totalEnrollments: number;
  totalSales: number;
  totalRevenue: number;
  monthlyEnrollments: number;
  monthlySales: number;
  monthlyRevenue: number;
}

const ReportsPage = () => {
  const [reportData, setReportData] = useState<ReportData>({
    totalUsers: 0,
    totalEnrollments: 0,
    totalSales: 0,
    totalRevenue: 0,
    monthlyEnrollments: 0,
    monthlySales: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('reports', 'view')) {
      fetchReportData();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const fetchReportData = async () => {
    try {
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

      // Buscar dados gerais
      const [
        { count: totalUsers },
        { count: totalEnrollments },
        { count: totalSales },
        { count: monthlyEnrollments },
        { count: monthlySales }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('*', { count: 'exact', head: true }).eq('status', 'fechada'),
        supabase.from('enrollments').select('*', { count: 'exact', head: true })
          .gte('created_at', firstDayOfMonth.toISOString()),
        supabase.from('sales').select('*', { count: 'exact', head: true })
          .eq('status', 'fechada')
          .gte('created_at', firstDayOfMonth.toISOString())
      ]);

      // Buscar receita total
      const { data: allSales } = await supabase
        .from('sales')
        .select('value')
        .eq('status', 'fechada');

      const totalRevenue = allSales?.reduce((sum, sale) => sum + (sale.value || 0), 0) || 0;

      // Buscar receita mensal
      const { data: monthlySalesData } = await supabase
        .from('sales')
        .select('value')
        .eq('status', 'fechada')
        .gte('created_at', firstDayOfMonth.toISOString());

      const monthlyRevenue = monthlySalesData?.reduce((sum, sale) => sum + (sale.value || 0), 0) || 0;

      setReportData({
        totalUsers: totalUsers || 0,
        totalEnrollments: totalEnrollments || 0,
        totalSales: totalSales || 0,
        totalRevenue,
        monthlyEnrollments: monthlyEnrollments || 0,
        monthlySales: monthlySales || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Erro ao buscar dados dos relatórios:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos relatórios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('reports', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para visualizar relatórios.</p>
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
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análises e relatórios do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Usuários cadastrados
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Matrículas</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalEnrollments}</div>
                  <p className="text-xs text-muted-foreground">
                    +{reportData.monthlyEnrollments} este mês
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendas Fechadas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalSales}</div>
                  <p className="text-xs text-muted-foreground">
                    +{reportData.monthlySales} este mês
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.totalRevenue.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{reportData.monthlyRevenue.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })} este mês
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Mês</CardTitle>
                  <CardDescription>
                    Performance do mês atual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Novas Matrículas</span>
                    <span className="font-bold">{reportData.monthlyEnrollments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Vendas Fechadas</span>
                    <span className="font-bold">{reportData.monthlySales}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Receita</span>
                    <span className="font-bold">
                      {reportData.monthlyRevenue.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Relatórios Rápidos</CardTitle>
                  <CardDescription>
                    Acesso rápido aos relatórios mais utilizados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Relatório de Vendas Mensais
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Relatório de Matrículas por Curso
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Relatório Financeiro Detalhado
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Performance de Vendedores
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Vendas</CardTitle>
              <CardDescription>
                Análise detalhada das vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Relatório em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Os relatórios detalhados de vendas serão implementados em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Matrículas</CardTitle>
              <CardDescription>
                Análise detalhada das matrículas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Relatório em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Os relatórios detalhados de matrículas serão implementados em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Financeiro</CardTitle>
              <CardDescription>
                Análise detalhada das finanças
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Relatório em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Os relatórios detalhados financeiros serão implementados em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;