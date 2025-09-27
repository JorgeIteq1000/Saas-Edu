import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, Search } from 'lucide-react';

// log: Schema de validação para os dados do perfil do aluno
const profileSchema = z.object({
  full_name: z.string().min(1, 'Nome completo é obrigatório'),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  document_number: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  rg: z.string().optional().nullable(),
  rg_issuer: z.string().optional().nullable(),
  address_zip_code: z.string().optional().nullable(),
  address_street: z.string().optional().nullable(),
  address_number: z.string().optional().nullable(),
  address_complement: z.string().optional().nullable(),
  address_neighborhood: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  father_name: z.string().optional().nullable(),
  mother_name: z.string().optional().nullable(),
  birth_country: z.string().optional().nullable(),
  birth_state: z.string().optional().nullable(),
  birth_city: z.string().optional().nullable(),
  previous_institution: z.string().optional().nullable(),
  previous_course: z.string().optional().nullable(),
  education_level: z.string().optional().nullable(),
  graduation_date: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const MyDataPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  // log: Função para buscar o endereço a partir do CEP
  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, ''); // Remove caracteres não numéricos
    if (cleanCep.length !== 8) {
      return; // CEP inválido
    }
    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast({ title: "Erro", description: "CEP não encontrado.", variant: "destructive" });
        return;
      }
      // log: Preenchendo o formulário com os dados do CEP
      form.setValue('address_street', data.logradouro);
      form.setValue('address_neighborhood', data.bairro);
      form.setValue('address_city', data.localidade);
      form.setValue('address_state', data.uf);
      toast({ title: "Sucesso!", description: "Endereço preenchido automaticamente." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível buscar o CEP.", variant: "destructive" });
    } finally {
      setSearchingCep(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não encontrado.");

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setProfileId(data.id);
          form.reset({
            ...data,
            birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
            graduation_date: data.graduation_date ? data.graduation_date.split('T')[0] : '',
          });
        }
      } catch (error: any) {
        toast({ title: "Erro", description: "Não foi possível carregar seus dados.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [form, toast]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profileId) return;
    setSaving(true);
    try {
      const { email, document_number, graduation_date, ...updatableValues } = values;
      const { error } = await supabase.from('profiles').update(updatableValues).eq('id', profileId);
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Seus dados foram atualizados." });
    } catch (error: any) {
      toast({ title: "Erro", description: "Não foi possível salvar suas alterações.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Carregando seus dados...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Dados</h1>
          <p className="text-muted-foreground">Mantenha suas informações pessoais e acadêmicas atualizadas.</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField name="full_name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="document_number" control={form.control} render={({ field }) => ( <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="phone" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="birth_date" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="gender" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Sexo</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
              <FormField name="rg" control={form.control} render={({ field }) => ( <FormItem><FormLabel>RG</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="rg_issuer" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Órgão Expedidor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FormField name="address_zip_code" control={form.control} render={({ field }) => ( <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} onBlur={(e) => handleCepSearch(e.target.value)} /></FormControl>{searchingCep && <Loader2 className="animate-spin h-4 w-4" />}<FormMessage /></FormItem> )} />
               <FormField name="address_street" control={form.control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
               <FormField name="address_number" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
               <FormField name="address_complement" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
               <FormField name="address_neighborhood" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
               <FormField name="address_city" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
               <FormField name="address_state" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Filiação e Naturalidade</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField name="mother_name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome da Mãe</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField name="father_name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome do Pai</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField name="birth_country" control={form.control} render={({ field }) => ( <FormItem><FormLabel>País de Origem</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField name="birth_state" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Estado Natal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField name="birth_city" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Cidade Natal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dados Acadêmicos Anteriores</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField name="previous_institution" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Instituição de Ensino</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField name="previous_course" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Curso</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField name="education_level" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nível de Escolaridade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField name="graduation_date" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Data de Colação de Grau</FormLabel><FormControl><Input type="date" {...field} disabled /></FormControl><FormDescription>Esta data só pode ser alterada pelo setor administrativo.</FormDescription><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MyDataPage;