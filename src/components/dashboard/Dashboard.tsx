import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CreateTestUsersButton from '@/components/admin/CreateTestUsersButton';
import AnnouncementsModal from '@/components/dashboard/AnnouncementsModal'; // Importação do novo componente
import {
  BookOpen,
  Users,
  TrendingUp,
  DollarSign,
  GraduationCap,
  UserPlus,
  FileText,
  Calendar
} from 'lucide-react';

interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  totalSales: number;
  pendingEnrollments: number;
  activeCourses: number;
}

interface Profile {
  role: string;
  full_name: string;
}

const Dashboard = () => {
  console.log('📊 Dashboard component carregando...');
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    totalSales: 0,
    pendingEnrollments: 0,
    activeCourses: 0,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 Dashboard useEffect executando...');
    const fetchData = async () => {
      try {
        console.log('👤 Buscando usuário...');
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 Usuário encontrado:', !!user);
        if (!user) {
          console.log('❌ Nenhum usuário encontrado');
          setLoading(false);
          return;
        }

        // Get user profile
        console.log('📋 Buscando perfil do usuário...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', user.id)
          .single();
        
        console.log('📋 Perfil encontrado:', profileData, 'Error:', profileError);
        setProfile(profileData);

        // Fetch dashboard stats based on role
        if (profileData?.role === 'admin_geral') {
          await fetchAdminStats();
        } else if (profileData?.role === 'gestor') {
          await fetchManagerStats(user.id);
        } else if (profileData?.role === 'vendedor') {
          await fetchSellerStats(user.id);
        } else if (profileData?.role === 'aluno') {
          await fetchStudentStats(user.id);
        }

        setLoading(false);
        console.log('✅ Dashboard data carregado com sucesso');
      } catch (error) {
        console.error('❌ Erro no Dashboard:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchAdminStats = async () => {
    const [
      { count: coursesCount },
      { count: studentsCount },
      { count: enrollmentsCount },
      { count: salesCount },
      { count: pendingCount },
      { count: activeCoursesCount }
    ] = await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'aluno'),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('active', true)
    ]);

    setStats({
      totalCourses: coursesCount || 0,
      totalStudents: studentsCount || 0,
      totalEnrollments: enrollmentsCount || 0,
      totalSales: salesCount || 0,
      pendingEnrollments: pendingCount || 0,
      activeCourses: activeCoursesCount || 0,
    });
  };

  const fetchManagerStats = async (userId: string) => {
    // For now, show simplified stats for managers
    const { count: teamSalesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    setStats(prev => ({
      ...prev,
      totalSales: teamSalesCount || 0,
    }));
  };

  const fetchSellerStats = async (userId: string) => {
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (sellerProfile) {
      const { count: mySalesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerProfile.id);

      setStats(prev => ({
        ...prev,
        totalSales: mySalesCount || 0,
      }));
    }
  };

  const fetchStudentStats = async (userId: string) => {
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (studentProfile) {
      const { count: myEnrollmentsCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentProfile.id);

      setStats(prev => ({
        ...prev,
        totalEnrollments: myEnrollmentsCount || 0,
      }));
    }
  };

  const renderAdminDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCourses} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudantes</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Usuários cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matrículas</CardTitle>
            <UserPlus className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingEnrollments} pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Total de leads/vendas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Cadastrar Novo Curso
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Nova Matrícula
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Relatórios
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Resumo do Sistema</CardTitle>
            <CardDescription>
              Status geral da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sistema</span>
                <Badge variant="default" className="bg-success">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Banco de Dados</span>
                <Badge variant="default" className="bg-success">Conectado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Últimas Atualizações</span>
                <Badge variant="secondary">Hoje</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderStudentDashboard = () => (
    <>
      {/* Adiciona o modal de avisos aqui, ele cuidará da própria lógica de exibição */}
      <AnnouncementsModal />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="mr-2 h-5 w-5 text-primary" />
              Minhas Matrículas
            </CardTitle>
            <CardDescription>
              Acompanhe seus cursos e progresso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stats.totalEnrollments}</div>
            <p className="text-sm text-muted-foreground">
              {stats.totalEnrollments === 0 ? 'Nenhuma matrícula encontrada' : 'Cursos ativos'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-accent" />
              Portal do Aluno
            </CardTitle>
            <CardDescription>
              Acesse seus documentos e serviços
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Meus Documentos
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Abrir Protocolo
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderGenericDashboard = () => (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Bem-vindo ao GradGate</CardTitle>
        <CardDescription>
          Sistema de Gestão Acadêmica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Seu perfil está sendo carregado. Use o menu lateral para navegar pelo sistema.
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-soft">
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Olá, {profile?.full_name || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de controle do Quality Educacional
          </p>
        </div>
        <CreateTestUsersButton userRole={profile?.role} />
      </div>

      {profile?.role === 'admin_geral' && renderAdminDashboard()}
      {profile?.role === 'aluno' && renderStudentDashboard()}
      {(!profile?.role || (profile?.role !== 'admin_geral' && profile?.role !== 'aluno')) && renderGenericDashboard()}
    </div>
  );
};

export default Dashboard;