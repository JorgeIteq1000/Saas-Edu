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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// log: Adicionando validação de senha, que é opcional para não quebrar a edição
const userSchema = z.object({
  full_name: z.string().min(3, 'O nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin_geral', 'gestor', 'vendedor', 'colaborador', 'aluno']),
  active: z.boolean().default(true),
}).refine(data => {
    // log: Se não estiver editando, a senha é obrigatória e deve ter no mínimo 6 caracteres
    const editingUser = (window as any).editingUser; // Gambiarra para obter o estado de edição
    if (!editingUser && (!data.password || data.password.length < 6)) {
        return false;
    }
    return true;
}, {
    message: "A senha é obrigatória e deve ter no mínimo 6 caracteres.",
    path: ["password"],
});


interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  phone?: string;
}

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserSaved: () => void;
  user: Profile | null;
}

const UserModal = ({ open, onOpenChange, onUserSaved, user }: UserModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!user;
  
  // Usado na validação do Zod
  (window as any).editingUser = isEditing;


  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'aluno',
      active: true,
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
        role: user.role as any,
        active: user.active,
        password: '', // Limpa o campo de senha na edição
      });
    } else {
      form.reset({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        role: 'aluno',
        active: true,
      });
    }
  }, [user, open, form]);

  const onSubmit = async (values: z.infer<typeof userSchema>) => {
    setLoading(true);
    try {
      if (isEditing) {
        // log: Atualizando usuário existente (sem a senha)
        const { password, ...updateData } = values;
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
        if (error) throw error;
        toast({ title: "Sucesso!", description: "Usuário atualizado com sucesso." });
      } else {
        // log: Criando novo usuário invocando a Edge Function
        const { error } = await supabase.functions.invoke('create-user', {
            body: {
                email: values.email,
                password: values.password,
                userData: {
                    full_name: values.full_name,
                    phone: values.phone,
                    role: values.role
                }
            }
        });
        if (error) throw error;
        toast({ title: "Sucesso!", description: "Novo usuário criado com sucesso." });
      }

      onUserSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("log: Erro ao salvar usuário:", error);
      toast({ title: "Erro", description: error.message || "Não foi possível salvar os dados do usuário.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Altere as informações do usuário abaixo.' : 'Crie um novo usuário no sistema.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl><Input type="email" {...field} disabled={isEditing} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="aluno">Aluno</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="admin_geral">Admin Geral</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Usuário Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserModal;