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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const courseSchema = z.object({
  name: z.string().min(3, 'O nome do curso é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  course_type_id: z.string().min(1, 'O tipo do curso é obrigatório'),
  certifying_institution_id: z.string().min(1, 'A faculdade certificadora é obrigatória'),
  // O campo course_type é necessário para a inserção no banco de dados
  course_type: z.enum(['graduacao', 'pos_graduacao', 'especializacao', 'extensao']),
  modality: z.enum(['ead', 'presencial', 'hibrido']),
  duration_months: z.coerce.number().min(1, 'Duração deve ser maior que zero'),
  workload_hours: z.coerce.number().min(1, 'Carga horária deve ser maior que zero'),
  enrollment_fee: z.coerce.number().nonnegative('Valor não pode ser negativo').optional(),
  monthly_fee: z.coerce.number().nonnegative('Valor não pode ser negativo').optional(),
  active: z.boolean().default(true),
});

interface CourseType {
  id: string;
  name: string;
}

interface CertifyingInstitution {
  id: string;
  name: string;
}

interface NewCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCourseCreated: () => void;
}

const NewCourseModal = ({ open, onOpenChange, onCourseCreated }: NewCourseModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [certifyingInstitutions, setCertifyingInstitutions] = useState<CertifyingInstitution[]>([]);

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      course_type: 'graduacao', // Valor padrão para o ENUM
      modality: 'ead',
      duration_months: 0,
      workload_hours: 0,
      enrollment_fee: 0,
      monthly_fee: 0,
      active: true,
      course_type_id: '',
      certifying_institution_id: '',
    },
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: typesData, error: typesError } = await supabase.from('course_types').select('id, name');
        if (typesError) throw typesError;
        setCourseTypes(typesData || []);

        const { data: institutionsData, error: institutionsError } = await supabase.from('certifying_institutions').select('id, name');
        if (institutionsError) throw institutionsError;
        setCertifyingInstitutions(institutionsData || []);
      } catch (error) {
        console.error("Erro ao buscar dados para o formulário:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os tipos de curso e instituições.", variant: "destructive" });
      }
    };
    if (open) {
      fetchDropdownData();
    }
  }, [open, toast]);


  const onSubmit = async (values: z.infer<typeof courseSchema>) => {
    setLoading(true);
    try {
      // Garantir que o `course_type` seja enviado com um valor válido do ENUM.
      // Aqui, estamos usando um valor fixo, mas poderia ser dinâmico se necessário.
      const dataToInsert = { ...values, course_type: 'graduacao' as const };

      const { error } = await supabase.from('courses').insert([dataToInsert]);
      if (error) throw error;

      toast({ title: "Sucesso!", description: "Novo curso criado com sucesso." });
      onCourseCreated();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      toast({ title: "Erro", description: "Não foi possível criar o curso.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Curso</DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para cadastrar um novo curso no sistema.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Curso</FormLabel>
                    <FormControl><Input placeholder="Ex: Engenharia de Software" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl><Input placeholder="Ex: ADS01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea placeholder="Breve descrição sobre o curso..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
               <FormField
                control={form.control}
                name="course_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Curso</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {courseTypes.map(type => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="certifying_institution_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faculdade Certificadora</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {certifyingInstitutions.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ead">EAD</SelectItem>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="duration_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (meses)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workload_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga Horária (horas)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="enrollment_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Matrícula (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="monthly_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensalidade (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Curso Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Curso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewCourseModal;