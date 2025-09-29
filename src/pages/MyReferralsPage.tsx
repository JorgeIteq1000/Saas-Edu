import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Gift, Users } from 'lucide-react';

// log: Schema de validação para o formulário de indicação
const referralSchema = z.object({
  referred_name: z.string().min(3, 'O nome do amigo é obrigatório.'),
  referred_phone: z.string().min(10, 'O telefone é obrigatório.'),
  interested_course_id: z.string().min(1, 'Selecione um curso.'),
});

interface Course {
  id: string;
  name: string;
}

interface Referral {
    id: string;
    created_at: string;
    referred_name: string;
    status: string;
    courses: {
        name: string;
    }
}

const MyReferralsPage = () => {
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<z.infer<typeof referralSchema>>({
        resolver: zodResolver(referralSchema),
        defaultValues: {
            referred_name: '',
            referred_phone: '',
            interested_course_id: '',
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // log: Buscando cursos ativos para o select
                const { data: coursesData, error: coursesError } = await supabase
                    .from('courses')
                    .select('id, name')
                    .eq('active', true);
                if (coursesError) throw coursesError;
                setCourses(coursesData || []);
                
                // log: Buscando indicações feitas pelo aluno logado
                const { data: { user } } = await supabase.auth.getUser();
                if(!user) return;
                
                const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
                if(!profile) return;
                
                const { data: referralsData, error: referralsError } = await supabase
                    .from('referrals')
                    .select('id, created_at, referred_name, status, courses(name)')
                    .eq('referred_by_student_id', profile.id)
                    .order('created_at', { ascending: false });
                if(referralsError) throw referralsError;
                setReferrals(referralsData as any || []);

            } catch (error: any) {
                toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);
    
    const onSubmit = async (values: z.infer<typeof referralSchema>) => {
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
            if (!profile) throw new Error("Perfil do aluno não encontrado");
            
            const { error } = await supabase.from('referrals').insert({
                ...values,
                referred_by_student_id: profile.id,
            });

            if (error) throw error;
            
            toast({ title: 'Sucesso!', description: 'Sua indicação foi enviada com sucesso!' });
            form.reset();
            // Recarrega a lista de indicações
            const { data: referralsData, error: referralsError } = await supabase
                .from('referrals')
                .select('id, created_at, referred_name, status, courses(name)')
                .eq('referred_by_student_id', profile.id)
                .order('created_at', { ascending: false });
            if(referralsError) throw referralsError;
            setReferrals(referralsData as any || []);
            
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    }
    
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Indicação Premiada</h1>
                    <p className="text-muted-foreground">Indique um amigo e ganhe prêmios!</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5"/> Indicar um Amigo</CardTitle>
                        <CardDescription>Preencha os dados abaixo para indicar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField name="referred_name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome do Amigo</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField name="referred_phone" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Telefone do Amigo</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField name="interested_course_id" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Curso de Interesse</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o curso..." /></SelectTrigger></FormControl><SelectContent>{courses.map(course => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enviar Indicação
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Minhas Indicações</CardTitle>
                        <CardDescription>Acompanhe o status das suas indicações.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <p>Carregando...</p> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome Indicado</TableHead>
                                        <TableHead>Curso</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {referrals.map(ref => (
                                        <TableRow key={ref.id}>
                                            <TableCell>{ref.referred_name}</TableCell>
                                            <TableCell>{ref.courses.name}</TableCell>
                                            <TableCell>{new Date(ref.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell><Badge>{ref.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                     {referrals.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">Você ainda não fez nenhuma indicação.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
};

export default MyReferralsPage;