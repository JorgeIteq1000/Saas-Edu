import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import NewEnrollmentModal from '@/components/enrollments/NewEnrollmentModal';

interface Enrollment {
  id: string;
  enrollment_number: string;
  status: string;
  enrollment_date: string;
  start_date?: string;
  expected_end_date?: string;
  enrollment_fee_status: string;
  created_at: string;
  student?: {
    full_name: string;
    email: string;
  };
  course?: {
    name: string;
    code: string;
  };
  seller?: {
    full_name: string;
  };
}

const EnrollmentsPage = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (hasPermission('enrollments', 'view')) {
      fetchEnrollments();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          student:profiles!enrollments_student_id_fkey(full_name, email),
          course:courses(name, code),
          seller:profiles!enrollments_seller_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error) {
      console.error('Erro ao buscar matrículas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar matrículas",
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

  const filteredEnrollments = enrollments.filter(enrollment =>
    enrollment.enrollment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission('enrollments', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para visualizar matrículas.</p>
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
          <h1 className="text-3xl font-bold">Matrículas</h1>
          <p className="text-muted-foreground">Gerencie as matrículas dos cursos</p>
        </div>
        {hasPermission('enrollments', 'create') && (
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Matrícula
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Matrículas</CardTitle>
          <CardDescription>
            Visualize e gerencie todas as matrículas do sistema
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, aluno ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando matrículas...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Matrícula</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Data</TableHead>
                  {hasPermission('enrollments', 'edit') && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      {enrollment.enrollment_number}
                    </TableCell>
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
                      <Badge variant={getStatusColor(enrollment.status) as any}>
                        {getStatusLabel(enrollment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={enrollment.enrollment_fee_status === 'pago' ? 'default' : 'secondary'}>
                        {getPaymentStatusLabel(enrollment.enrollment_fee_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{enrollment.seller?.full_name || '-'}</TableCell>
                    <TableCell>
                      {new Date(enrollment.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {hasPermission('enrollments', 'edit') && (
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

      <NewEnrollmentModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onEnrollmentCreated={fetchEnrollments}
      />
    </div>
  );
};

export default EnrollmentsPage;