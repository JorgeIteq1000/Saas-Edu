import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CourseTypesManagement from '@/components/courses/CourseTypesManagement';
import CertifyingInstitutionsManagement from '@/components/courses/CertifyingInstitutionsManagement';
import NewCourseModal from './NewCourseModal';

// Interface ajustada para refletir os dados aninhados
interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  modality: string;
  duration_months: number;
  workload_hours: number;
  enrollment_fee: number;
  monthly_fee: number;
  active: boolean;
  created_at: string;
  // Tipos para os dados relacionados (joins)
  course_types: {
    name: string;
  } | null;
}

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      // Consulta corrigida para buscar os nomes das tabelas relacionadas
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_types (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data as Course[] || []);
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cursos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Removido o fetchCourses do array de dependência para evitar o loop
  useEffect(() => {
    if (hasPermission('courses', 'view')) {
      fetchCourses();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);


  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission('courses', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para visualizar cursos.</p>
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
          <h1 className="text-3xl font-bold">Cursos</h1>
          <p className="text-muted-foreground">Gerencie os cursos, tipos e instituições certificadoras</p>
        </div>
        {hasPermission('courses', 'create') && (
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Curso
          </Button>
        )}
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Lista de Cursos</TabsTrigger>
          <TabsTrigger value="types">Tipos de Curso</TabsTrigger>
          <TabsTrigger value="institutions">Faculdades Certificadoras</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Cursos</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os cursos disponíveis
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p>Carregando cursos...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Carga Horária</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      {hasPermission('courses', 'edit') && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">
                          {course.name}
                        </TableCell>
                        <TableCell>{course.code}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {course.course_types?.name || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {course.modality.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{course.duration_months} meses</TableCell>
                        <TableCell>{course.workload_hours}h</TableCell>
                        <TableCell>
                          <Badge variant={course.active ? 'default' : 'secondary'}>
                            {course.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(course.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        {hasPermission('courses', 'edit') && (
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

        <TabsContent value="types">
          <CourseTypesManagement />
        </TabsContent>

        <TabsContent value="institutions">
          <CertifyingInstitutionsManagement />
        </TabsContent>
      </Tabs>

      <NewCourseModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onCourseCreated={fetchCourses}
      />
    </div>
  );
};

export default CoursesPage;