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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// log: Schema de validação atualizado com os novos campos e ENUM completo
const courseSchema = z.object({
  name: z.string().min(3, 'O nome do curso é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  course_type_id: z.string().min(1, 'O tipo de curso é obrigatório'),
  certifying_institution_id: z.string().min(1, 'A faculdade certificadora é obrigatória'),
  course_type: z.enum(['graduacao', 'pos_graduacao', 'especializacao', 'extensao', 'tecnico', 'livre']),
  modality: z.enum(['ead', 'presencial', 'hibrido']),
  duration_months: z.coerce.number().min(1, 'Duração deve ser maior que zero'),
  workload_hours: z.coerce.number().min(1, 'Carga horária deve ser maior que zero'),
  enrollment_fee: z.coerce.number().nonnegative('Valor não pode ser negativo').optional(),
  monthly_fee: z.coerce.number().nonnegative('Valor não pode ser negativo').optional(),
  max_installments: z.coerce.number().min(1, 'Mínimo de 1 parcela').max(48, 'Máximo de 48 parcelas'),
  payment_methods: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'Você precisa selecionar pelo menos uma forma de pagamento.',
  }),
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

const paymentMethodOptions = [
  { id: 'boleto', label: 'Boleto' },
  { id: 'pix', label: 'Pix' },
  { id: 'cartao_de_credito', label: 'Cartão de Crédito' },
];

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
      modality: 'ead',
      duration_months: 12,
      workload_hours: 360,
      enrollment_fee: 0,
      monthly_fee: 0,
      active: true,
      course_type_id: '',
      certifying_institution_id: '',
      max_installments: 12,
      payment_methods: ['boleto', 'pix', 'cartao_de_credito'],
    },
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: typesData, error: typesError } = await supabase.from('course_types').select('id, name').eq('active', true);
        if (typesError) throw typesError;
        setCourseTypes(typesData || []);

        const { data: institutionsData, error: institutionsError } = await supabase.from('certifying_institutions').select('id, name').eq('active', true);
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
      const courseTypeMap: { [key: string]: string } = {
        'graduação': 'graduacao',
        'pós-graduação': 'pos_graduacao',
        'especialização': 'especializacao',
        'extensão': 'extensao',
        'técnico': 'tecnico',
        'livre': 'livre',
      };
      
      const selectedCourseType = courseTypes.find(ct => ct.id === values.course_type_id);
      const courseTypeName = selectedCourseType ? selectedCourseType.name.toLowerCase() : 'graduacao';
      const enumCourseType = courseTypeMap[courseTypeName] || 'graduacao';
      
      const dataToInsert = {
        ...values,
        course_type: enumCourseType as any,
      };
      
      const { error } = await supabase.from('courses').insert([dataToInsert]);
      if (error) throw error;
      
      toast({ title: "Sucesso!", description: "Novo curso criado com sucesso." });
      onCourseCreated();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Erro ao criar curso:", error);
      toast({ title: "Erro", description: error.message || "Não foi possível criar o curso.", variant: "destructive" });
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField name="name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome do Curso</FormLabel><FormControl><Input placeholder="Ex: Engenharia de Software" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="code" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Código</FormLabel><FormControl><Input placeholder="Ex: ADS01" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>

            <FormField name="description" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Breve descrição sobre o curso..." {...field} /></FormControl><FormMessage /></FormItem> )} />

            <div className="grid grid-cols-3 gap-4">
               <FormField name="course_type_id" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tipo de Curso</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{courseTypes.map(type => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
              <FormField name="certifying_institution_id" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Faculdade Certificadora</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{certifyingInstitutions.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
              <FormField name="modality" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Modalidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="ead">EAD</SelectItem><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="hibrido">Híbrido</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
               <FormField name="duration_months" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Duração (meses)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="workload_hours" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Carga Horária (horas)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
               <FormField name="max_installments" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Max. Parcelas</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField name="enrollment_fee" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Taxa de Matrícula (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )} />
               <FormField name="monthly_fee" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Mensalidade (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            {/* CORREÇÃO APLICADA AQUI: Estrutura do formulário de checkboxes foi simplificada */}
            <FormField
              control={form.control}
              name="payment_methods"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Formas de Pagamento</FormLabel>
                    <FormDescription>Selecione as formas de pagamento aceitas para este curso.</FormDescription>
                  </div>
                  <div className="space-y-2">
                    {paymentMethodOptions.map((item) => (
                      <div key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), item.id])
                                : field.onChange(field.value?.filter((value) => value !== item.id));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{item.label}</FormLabel>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField name="active" control={form.control} render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Curso Ativo</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />

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