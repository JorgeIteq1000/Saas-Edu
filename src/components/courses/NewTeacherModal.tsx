import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';

const teacherSchema = z.object({
  full_name: z.string().min(3, 'O nome é obrigatório.'),
  titulation: z.string().min(3, 'A titulação é obrigatória.'),
});

interface NewTeacherModalProps {
  onTeacherCreated: () => void;
}

const NewTeacherModal = ({ onTeacherCreated }: NewTeacherModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      full_name: '',
      titulation: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof teacherSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('teachers').insert(values);
      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Novo docente cadastrado.' });
      onTeacherCreated();
      setOpen(false);
      form.reset();

    } catch (error: any) {
      console.error("log: Erro ao criar docente:", error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Docente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Docente</DialogTitle>
          <DialogDescription>
            Cadastre o nome e a titulação do docente para fins de certificação.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="titulation" render={({ field }) => ( 
              <FormItem>
                <FormLabel>Titulação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* --- AJUSTE AQUI --- */}
                    <SelectItem value="Especialista">Especialista</SelectItem>
                    <SelectItem value="Mestre">Mestre</SelectItem>
                    <SelectItem value="Doutor">Doutor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem> 
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Docente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTeacherModal;