import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, DollarSign, List, User, Send, Paperclip, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces
interface EnrollmentDetails {
  id: string;
  student: { id: string; full_name: string; email: string; };
  course: { id: string; name: string; };
}

interface DisciplineGrade {
  discipline_id: string;
  discipline_name: string;
  grade: number | null;
  last_updated: string | null;
}

interface Occurrence {
  id: string;
  description: string;
  created_at: string;
  image_url?: string;
  author: { full_name: string; } | null;
}

// Subcomponentes para cada Aba
const DisciplinesTab = ({ enrollmentId }: { enrollmentId: string }) => {
  const [grades, setGrades] = useState<DisciplineGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_student_grades_for_enrollment', {
        p_enrollment_id: enrollmentId
      });
      if (error) console.error("log: Erro ao buscar notas via RPC:", error);
      else setGrades(data || []);
      setLoading(false);
    };
    fetchGrades();
  }, [enrollmentId]);

  return (
    <Card>
      <CardHeader><CardTitle>Disciplinas e Notas</CardTitle><CardDescription>Acompanhe o desempenho acadêmico do aluno neste curso.</CardDescription></CardHeader>
      <CardContent>
        {loading ? ( <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div> ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Disciplina</TableHead><TableHead className="text-right">Nota</TableHead></TableRow></TableHeader>
            <TableBody>
              {grades.length > 0 ? grades.map(g => (
                <TableRow key={g.discipline_id}>
                  <TableCell>{g.discipline_name}</TableCell>
                  <TableCell className="text-right font-medium">{g.grade ?? 'Não Lançada'}</TableCell>
                </TableRow>
              )) : (<TableRow><TableCell colSpan={2} className="text-center">Nenhuma disciplina encontrada.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

const FinanceTab = ({ enrollmentId }: { enrollmentId: string }) => {
  return (
    <Card>
      <CardHeader><CardTitle>Financeiro</CardTitle><CardDescription>Histórico de pagamentos e pendências do aluno neste curso.</CardDescription></CardHeader>
      <CardContent><p>A seção financeira ainda será implementada.</p></CardContent>
    </Card>
  );
};

const OccurrencesTab = ({ enrollmentId }: { enrollmentId: string }) => {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [newOccurrence, setNewOccurrence] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOccurrences = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enrollment_occurrences')
      .select(`id, description, created_at, image_url, author:created_by(full_name)`)
      .eq('enrollment_id', enrollmentId)
      .order('created_at', { ascending: false });

    if (error) console.error("log: Erro ao buscar ocorrências:", error);
    else setOccurrences(data || []);
    setLoading(false);
  }, [enrollmentId]);

  useEffect(() => { fetchOccurrences(); }, [fetchOccurrences]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
    }
  };

  const handleSaveOccurrence = async () => {
    if (newOccurrence.trim().length === 0) return;
    setSaving(true);
    let imageUrl: string | null = null;

    try {
      // 1. Faz o upload da imagem, se houver
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${enrollmentId}/${new Date().getTime()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('occurrence_images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('occurrence_images')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      // 2. Insere a ocorrência no banco de dados
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user?.id).single();
      const { error: insertError } = await supabase.from('enrollment_occurrences').insert({
        enrollment_id: enrollmentId,
        description: newOccurrence.trim(),
        created_by: profile?.id,
        image_url: imageUrl,
      });

      if (insertError) throw insertError;
      
      toast({ title: "Sucesso", description: "Ocorrência registrada." });
      setNewOccurrence('');
      setImageFile(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
      await fetchOccurrences();

    } catch (error: any) {
      console.error("log: Erro ao salvar ocorrência:", error);
      toast({ title: "Erro", description: error.message || "Não foi possível salvar a ocorrência.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Ocorrências</CardTitle><CardDescription>Registro de eventos importantes relacionados a esta matrícula.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {hasPermission('enrollments', 'edit') && (
          <div className="space-y-4 p-4 border rounded-lg">
            <Textarea placeholder="Descreva a ocorrência..." value={newOccurrence} onChange={(e) => setNewOccurrence(e.target.value)} disabled={saving} />
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}><Paperclip className="mr-2 h-4 w-4" />Anexar Imagem</Button>
                    <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    {imageFile && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <span>{imageFile.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {setImageFile(null); if(fileInputRef.current) fileInputRef.current.value = "";}}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
                <Button onClick={handleSaveOccurrence} disabled={saving || !newOccurrence.trim()}>
                    <Send className="mr-2 h-4 w-4" />{saving ? 'Registrando...' : 'Registrar Ocorrência'}
                </Button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {loading ? ( <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> ) : occurrences.length > 0 ? (
            occurrences.map(occ => (
              <div key={occ.id} className="flex items-start gap-4 border-b pb-4 last:border-b-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><User className="h-4 w-4" /></div>
                <div className="flex-1">
                  <p className="whitespace-pre-wrap">{occ.description}</p>
                  {occ.image_url && (
                    <a href={occ.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        <img src={occ.image_url} alt="Anexo da ocorrência" className="max-w-xs max-h-48 rounded-md border" />
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{occ.author?.full_name || 'Sistema'} - {format(new Date(occ.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            ))
          ) : ( <p className="text-center text-muted-foreground py-4">Nenhuma ocorrência registrada.</p> )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente Principal da Página
const EnrollmentCourseDetailsPage = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const { toast } = useToast();
  const [enrollment, setEnrollment] = useState<EnrollmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEnrollment = useCallback(async () => {
    if (!enrollmentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`id, student:profiles!enrollments_student_id_fkey(id, full_name, email), course:courses!enrollments_course_id_fkey(id, name)`)
        .eq('id', enrollmentId)
        .single();
      if (error) throw error;
      setEnrollment(data as any);
    } catch (error: any) {
      console.error("log: Erro ao buscar detalhes da matrícula:", error);
      toast({ title: "Erro de Carregamento", description: `Não foi possível carregar os detalhes. Erro: ${error.message}`, variant: "destructive" })
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, toast]);

  useEffect(() => { fetchEnrollment(); }, [fetchEnrollment]);

  if (loading) { return ( <div className="p-6 space-y-4"><Skeleton className="h-8 w-1/4" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-96 w-full" /></div> ); }
  if (!enrollment) { return ( <div className="p-6"><p>Matrícula não encontrada.</p><Button variant="outline" asChild className="mt-4"><Link to="/enrollments"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Matrículas</Link></Button></div>); }

  return (
    <div className="p-6 space-y-4">
        <Button variant="outline" asChild><Link to={`/matriculas/${enrollment.student.id}`}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Matrículas do Aluno</Link></Button>
      <Card>
        <CardHeader><CardTitle className="text-2xl">{enrollment.course.name}</CardTitle><CardDescription>Aluno: {enrollment.student.full_name} ({enrollment.student.email})</CardDescription></CardHeader>
      </Card>
      <Tabs defaultValue="disciplines" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disciplines"><BookOpen className="mr-2 h-4 w-4" />Disciplinas e Notas</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="mr-2 h-4 w-4" />Financeiro</TabsTrigger>
          <TabsTrigger value="occurrences"><List className="mr-2 h-4 w-4" />Ocorrências</TabsTrigger>
        </TabsList>
        <TabsContent value="disciplines">{enrollmentId && <DisciplinesTab enrollmentId={enrollmentId} />}</TabsContent>
        <TabsContent value="finance">{enrollmentId && <FinanceTab enrollmentId={enrollmentId} />}</TabsContent>
        <TabsContent value="occurrences">{enrollmentId && <OccurrencesTab enrollmentId={enrollmentId} />}</TabsContent>
      </Tabs>
    </div>
  );
};

export default EnrollmentCourseDetailsPage;