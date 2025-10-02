import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, BookMarked, Plus, Trash2, PlusCircle, ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import NewTeacherModal from './NewTeacherModal';

// Schemas de validação
const disciplineSchema = z.object({
  name: z.string().min(3, 'O nome da disciplina é obrigatório.'),
  workload_hours: z.coerce.number().min(1, 'Carga horária deve ser maior que zero.'),
  teacher_id: z.string().min(1, 'Selecione um docente.'),
  recovery_attempts: z.coerce.number().min(0, 'O valor não pode ser negativo.').default(1),
});

const learningUnitSchema = z.object({
  name: z.string().min(3, 'O nome da UA é obrigatório.'),
  sagah_content_id: z.string().min(10, 'O Content ID da Sagah é obrigatório.'),
});

// Interfaces
interface Teacher { id: string; full_name: string; }
interface LearningUnit { id: string; name: string; sagah_content_id: string; }
interface Discipline {
  id: string;
  name: string;
  workload_hours: number;
  recovery_attempts: number;
  teacher: { full_name: string; };
  learning_units: LearningUnit[];
}
interface PedagogicalModalProps { courseId: string; courseName: string; }

const PedagogicalModal = ({ courseId, courseName }: PedagogicalModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'disciplines' | 'units'>('disciplines');
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const { toast } = useToast();

  const disciplineForm = useForm<z.infer<typeof disciplineSchema>>({ resolver: zodResolver(disciplineSchema), defaultValues: { name: '', workload_hours: 40, teacher_id: '', recovery_attempts: 1 } });
  const unitForm = useForm<z.infer<typeof learningUnitSchema>>({ resolver: zodResolver(learningUnitSchema), defaultValues: { name: '', sagah_content_id: '' } });

  const fetchData = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const { data: teachersData, error: teachersError } = await supabase.from('teachers').select('id, full_name');
      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      const { data: disciplinesData, error: disciplinesError } = await supabase
        .from('course_disciplines')
        .select(`discipline:disciplines (*, teacher:teachers(full_name), learning_units(*))`)
        .eq('course_id', courseId)
        .order('name', { referencedTable: 'disciplines', ascending: true }); // Ordena as disciplinas por nome
      if (disciplinesError) throw disciplinesError;
      setDisciplines(disciplinesData.map((item: any) => item.discipline).filter(Boolean) || []);
    } catch (error: any) {
      toast({ title: "Erro", description: "Não foi possível carregar os dados pedagógicos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      // Reseta a view quando o modal fecha
      setView('disciplines');
      setSelectedDiscipline(null);
    }
  }, [open]);

  const handleManageUnits = (disciplineId: string) => {
    const findDiscipline = disciplines.find(d => d.id === disciplineId);
    if (findDiscipline) {
      setSelectedDiscipline(findDiscipline);
      setView('units');
    }
  };
  
  const onDisciplineSubmit = async (values: z.infer<typeof disciplineSchema>) => {
    try {
      const { data: newDiscipline, error: disciplineError } = await supabase.from('disciplines').insert(values).select().single();
      if (disciplineError) throw disciplineError;
      const { error: associationError } = await supabase.from('course_disciplines').insert({ course_id: courseId, discipline_id: newDiscipline.id });
      if (associationError) throw associationError;
      toast({ title: "Sucesso!", description: "Disciplina adicionada ao curso." });
      disciplineForm.reset();
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const onUnitSubmit = async (values: z.infer<typeof learningUnitSchema>) => {
    if (!selectedDiscipline) return;
    try {
      const { error } = await supabase.from('learning_units').insert({ ...values, discipline_id: selectedDiscipline.id });
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Unidade de Aprendizagem adicionada." });
      unitForm.reset();
      await fetchData(); 
      
      // Atualiza a 'selectedDiscipline' com os novos dados para a UI refletir a mudança
      setSelectedDiscipline(prev => {
          const updatedDisciplines = disciplines.find(d => d.id === prev?.id);
          return updatedDisciplines ? {...updatedDisciplines, learning_units: [...(updatedDisciplines.learning_units || []), values] as any} : null;
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleContentIdPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text');
    try {
        const url = new URL(pastedText);
        const contentId = url.searchParams.get('contentId');
        if (contentId) {
            event.preventDefault(); 
            unitForm.setValue('sagah_content_id', contentId);
        }
    } catch (e) {
        // Ignora se não for uma URL válida
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><BookMarked className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Gestão Pedagógica: {courseName}</DialogTitle>
          {view === 'units' && selectedDiscipline && (
            <DialogDescription className="flex items-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => setView('disciplines')} className="mr-2 h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span>Gerenciando UAs para: <strong>{selectedDiscipline.name}</strong></span>
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
          <>
            {view === 'disciplines' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium mb-4">Adicionar Disciplina</h3>
                  <Form {...disciplineForm}>
                    <form onSubmit={disciplineForm.handleSubmit(onDisciplineSubmit)} className="space-y-4">
                        <FormField control={disciplineForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Disciplina</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={disciplineForm.control} name="teacher_id" render={({ field }) => ( <FormItem><FormLabel>Docente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <NewTeacherModal onTeacherCreated={fetchData} />
                        <FormField control={disciplineForm.control} name="workload_hours" render={({ field }) => ( <FormItem><FormLabel>Carga Horária</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={disciplineForm.control} name="recovery_attempts" render={({ field }) => ( <FormItem><FormLabel>Tentativas de Recuperação</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar Disciplina</Button>
                    </form>
                  </Form>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium mb-4">Disciplinas do Curso</h3>
                  <Table>
                    <TableHeader><TableRow><TableHead>Disciplina</TableHead><TableHead>Docente</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {disciplines.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell>{d.teacher?.full_name || 'Não definido'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleManageUnits(d.id)}>Gerenciar UAs</Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {disciplines.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">Nenhuma disciplina cadastrada.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {view === 'units' && selectedDiscipline && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium mb-4">Adicionar Unidade de Aprendizagem (UA)</h3>
                  <Form {...unitForm}>
                    <form onSubmit={unitForm.handleSubmit(onUnitSubmit)} className="space-y-4">
                      <FormField control={unitForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da UA</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={unitForm.control} name="sagah_content_id" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Apenas o Content ID da Sagah</FormLabel>
                              <FormControl>
                                  <Input {...field} onPaste={handleContentIdPaste} placeholder="Cole a URL ou digite o ID" />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar UA</Button>
                    </form>
                  </Form>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium mb-4">UAs da Disciplina</h3>
                  <Table>
                    <TableHeader><TableRow><TableHead>Nome da UA</TableHead><TableHead>Content ID</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedDiscipline.learning_units.map(unit => (
                        <TableRow key={unit.id}>
                          <TableCell>{unit.name}</TableCell>
                          <TableCell className="font-mono text-xs">{unit.sagah_content_id}</TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                      {selectedDiscipline.learning_units.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">Nenhuma UA cadastrada.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PedagogicalModal;