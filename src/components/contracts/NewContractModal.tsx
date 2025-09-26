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

// log: Definindo o schema de validação para o formulário de contrato
const contractSchema = z.object({
  name: z.string().min(3, 'O nome do contrato é obrigatório'),
  course_type_id: z.string().min(1, 'O tipo de curso é obrigatório'),
  certifying_institution_id: z.string().min(1, 'A instituição é obrigatória'),
  contract_content: z.string().min(10, 'O conteúdo do contrato é obrigatório'),
  version: z.string().default('1.0'),
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

interface NewContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractCreated: () => void;
}

const NewContractModal = ({ open, onOpenChange, onContractCreated }: NewContractModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [certifyingInstitutions, setCertifyingInstitutions] = useState<CertifyingInstitution[]>([]);

  const form = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      name: '',
      course_type_id: '',
      certifying_institution_id: '',
      contract_content: '',
      version: '1.0',
      active: true,
    },
  });

  useEffect(() => {
    // log: Buscando dados para preencher os selects do formulário
    const fetchSelectData = async () => {
      try {
        const { data: typesData, error: typesError } = await supabase.from('course_types').select('id, name').eq('active', true);
        if (typesError) throw typesError;
        setCourseTypes(typesData || []);

        const { data: institutionsData, error: institutionsError } = await supabase.from('certifying_institutions').select('id, name').eq('active', true);
        if (institutionsError) throw institutionsError;
        setCertifyingInstitutions(institutionsData || []);
      } catch (error) {
        console.error("log: Erro ao carregar dados para o modal de contrato:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os dados necessários.", variant: "destructive" });
      }
    };

    if (open) {
      fetchSelectData();
    }
  }, [open, toast]);

  const onSubmit = async (values: z.infer<typeof contractSchema>) => {
    setLoading(true);
    console.log('log: Enviando dados do novo contrato:', values);
    try {
      const { error } = await supabase.from('contracts').insert([values]);
      if (error) throw error;

      toast({ title: "Sucesso!", description: "Novo contrato criado com sucesso." });
      onContractCreated();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("log: Erro ao criar contrato:", error);
      toast({ title: "Erro", description: "Não foi possível criar o contrato.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
          <DialogDescription>
            Crie um novo modelo de contrato para ser utilizado nas matrículas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Contrato</FormLabel>
                  <FormControl><Input placeholder="Ex: Contrato Pós-Graduação EAD" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>Instituição Certificadora</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="contract_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo do Contrato (HTML)</FormLabel>
                  <FormControl><Textarea placeholder="Insira o texto do contrato aqui..." {...field} rows={8} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Ativar este contrato?</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Contrato
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewContractModal;