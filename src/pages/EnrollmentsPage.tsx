import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Plus, Search, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import NewEnrollmentModal from '@/components/enrollments/NewEnrollmentModal';
import { useNavigate } from 'react-router-dom';

// Interface para o perfil do aluno com a contagem de matrículas
interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  enrollments: { count: number }[];
}

const EnrollmentsPage = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // CORREÇÃO: Consulta ajustada para resolver a ambiguidade
      // Especificamos que a contagem de 'enrollments' deve ser feita pela chave estrangeira 'student_id'
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          enrollments:enrollments!student_id ( count )
        `)
        .eq('role', 'aluno')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStudents(data as any[] || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      toast({ title: "Erro", description: "Erro ao carregar alunos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('enrollments', 'view')) {
      fetchStudents();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission('enrollments', 'view')) {
    return (
      <div className="p-6">
        <Card><CardContent className="pt-6 text-center"><UserPlus className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3><p className="text-muted-foreground">Você não tem permissão para visualizar matrículas.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Alunos</h1>
          <p className="text-muted-foreground">Visualize e gerencie os alunos e suas matrículas</p>
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
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>
            Lista de todos os alunos com matrículas no sistema.
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email do aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8"><p>Carregando alunos...</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Cursos Matriculados</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.enrollments[0]?.count || 0}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/matriculas/${student.id}`)}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Ver Detalhes
                      </Button>
                    </TableCell>
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
        onEnrollmentCreated={fetchStudents}
      />
    </div>
  );
};

export default EnrollmentsPage;