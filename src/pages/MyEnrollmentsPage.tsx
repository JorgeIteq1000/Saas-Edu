import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Calendar, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Enrollment {
  id: string;
  enrollment_number: string;
  status: string;
  enrollment_date: string;
  start_date?: string;
  expected_end_date?: string;
  enrollment_fee_status: string;
  course: {
    name: string;
    code: string;
    duration_months: number;
  };
}

const MyEnrollmentsPage = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMyEnrollments();
  }, []);

  const fetchMyEnrollments = async () => {
    try {
      // Primeiro buscar o perfil do usuário atual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      // Buscar matrículas do usuário
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(name, code, duration_months)
        `)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error) {
      console.error('Erro ao buscar matrículas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar suas matrículas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statuses = {
      pendente: 'Pendente',
      aprovada: 'Aprovada',
      matriculado: 'Matriculado',
      cancelada: 'Cancelada',
      concluida: 'Concluída'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pendente: 'secondary',
      aprovada: 'default',
      matriculado: 'default',
      cancelada: 'destructive',
      concluida: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Minhas Matrículas</h1>
          <p className="text-muted-foreground">Acompanhe o status dos seus cursos</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando suas matrículas...</p>
        </div>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma matrícula encontrada</h3>
              <p className="text-muted-foreground">Você ainda não possui matrículas em cursos.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Cards de resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Cursos</p>
                    <p className="text-2xl font-bold">{enrollments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                    <p className="text-2xl font-bold">
                      {enrollments.filter(e => e.status === 'matriculado').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pendentes Pagamento</p>
                    <p className="text-2xl font-bold">
                      {enrollments.filter(e => e.enrollment_fee_status === 'pendente').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de matrículas */}
          <Card>
            <CardHeader>
              <CardTitle>Seus Cursos</CardTitle>
              <CardDescription>
                Detalhes das suas matrículas e status dos cursos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Matrícula</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Previsão Fim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.enrollment_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{enrollment.course?.name}</p>
                          <p className="text-sm text-muted-foreground">{enrollment.course?.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(enrollment.status) as any}>
                          {getStatusLabel(enrollment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={enrollment.enrollment_fee_status === 'pago' ? 'default' : 'secondary'}>
                          {getPaymentStatusLabel(enrollment.enrollment_fee_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {enrollment.course?.duration_months} meses
                      </TableCell>
                      <TableCell>
                        {enrollment.start_date 
                          ? new Date(enrollment.start_date).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {enrollment.expected_end_date 
                          ? new Date(enrollment.expected_end_date).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyEnrollmentsPage;