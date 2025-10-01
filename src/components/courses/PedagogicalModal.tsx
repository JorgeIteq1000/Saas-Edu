import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, BookMarked, Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import NewTeacherModal from './NewTeacherModal';

const disciplineSchema = z.object({
  name: z.string().min(3, 'O nome da disciplina é obrigatório.'),
  workload_hours: z.coerce.number().min(1, 'Carga horária deve ser maior que zero.'),
  teacher_id: z.string().min(1, 'Selecione um docente.'),
  sagah_content_id: z.string().optional(),
  recovery_attempts: z.coerce.number().min(0, 'O valor não pode ser negativo.').default(1),
});

interface Teacher {
  id: string;
  full_name: string;
}

interface Discipline {
  id: string;
  name: string;
  workload_hours: number;
  recovery_attempts: number;
  teacher: { // log: A referência agora é para a tabela 'teachers'
    full_name: string;
  };
}

interface PedagogicalModalProps {
  courseId: string;
  courseName: string;
}

const PedagogicalModal = ({ courseId, courseName }: PedagogicalModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof disciplineSchema>>({
    resolver: zodResolver(disciplineSchema),
    defaultValues: {
      name: '',
      workload_hours: 40,
      teacher_id: '',
      sagah_content_id: '',
      recovery_attempts: 1,
    },
  });

  const fetchData = async () => {
    if (!open) return;
    setLoading(true);
    try {
      // log: CORREÇÃO - Buscar da nova tabela 'teachers'
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('id, full_name');
      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // log: CORREÇÃO - Ajuste no select para buscar da tabela 'teachers'
      const { data: disciplinesData, error: disciplinesError } = await supabase
        .from('course_disciplines')
        .select(`
          discipline:disciplines (
            id, name, workload_hours, recovery_attempts,
            teacher:teachers (full_name)
          )
        `)
        .eq('course_id', courseId);
      
      if (disciplinesError) throw disciplinesError;
      setDisciplines(disciplinesData.map((item: any) => item.discipline).filter(Boolean) || []);

    } catch (error: any) {
      toast({ title: "Erro", description: "Não foi possível carregar os dados pedagógicos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [open, courseId]);

  const onSubmit = async (values: z.infer<typeof disciplineSchema>) => {
    try {
      const { data: newDiscipline, error: disciplineError } = await supabase
        .from('disciplines')
        .insert(values)
        .select()
        .single();
      if (disciplineError) throw disciplineError;

      const { error: associationError } = await supabase
        .from('course_disciplines')
        .insert({
          course_id: courseId,
          discipline_id: newDiscipline.id,
        });
      if (associationError) throw associationError;
      
      toast({ title: "Sucesso!", description: "Disciplina adicionada ao curso." });
      form.reset();
      fetchData();

    } catch (error: any) {
      console.error("log: Erro ao adicionar disciplina:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookMarked className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gestão Pedagógica do Curso</DialogTitle>
          <DialogDescription>{courseName}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium mb-4">Adicionar Disciplina</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Disciplina</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="teacher_id" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Docente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem> 
                )} />
                <NewTeacherModal onTeacherCreated={fetchData} />
                <FormField control={form.control} name="workload_hours" render={({ field }) => ( <FormItem><FormLabel>Carga Horária</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="sagah_content_id" render={({ field }) => ( <FormItem><FormLabel>Link/ID Sagah</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="recovery_attempts" render={({ field }) => ( <FormItem><FormLabel>Tentativas de Recuperação</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar
                </Button>
              </form>
            </Form>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium mb-4">Disciplinas do Curso</h3>
             {loading ? <p>Carregando disciplinas...</p> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Disciplina</TableHead>
                            <TableHead>Docente</TableHead>
                            <TableHead>C.H.</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {disciplines.map(d => (
                            <TableRow key={d.id}>
                                <TableCell>{d.name}</TableCell>
                                <TableCell>{d.teacher?.full_name || 'Não definido'}</TableCell>
                                <TableCell>{d.workload_hours}h</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {disciplines.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">Nenhuma disciplina cadastrada.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PedagogicalModal;