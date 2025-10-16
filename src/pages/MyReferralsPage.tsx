import { useEffect, useState, useCallback } from 'react';
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
import { Loader2, Gift, Users, Copy, Share2, Zap } from 'lucide-react';

// LOG: Schema de validação para o formulário de indicação (inalterado)
const referralSchema = z.object({
  referred_name: z.string().min(3, 'O nome do amigo é obrigatório.'),
  referred_phone: z.string().min(10, 'O telefone é obrigatório.'),
  interested_course_id: z.string().min(1, 'Selecione um curso.'),
});

interface Course { id: string; name: string; }

// LOG: Interface de Indicação (com campo 'course_name' mapeado)
interface Referral {
    id: string;
    created_at: string;
    referred_name: string;
    status: string;
    course_name: string; // Simplificamos para evitar erros de tipagem do join
}

// LOG: Interface para o perfil do aluno com o novo código
interface StudentProfile {
    id: string;
    referral_code: string | null;
}

const BASE_URL = window.location.origin; // O domínio do seu app

const MyReferralsPage = () => {
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [copying, setCopying] = useState(false);
    const [enrolledCount, setEnrolledCount] = useState(0); // Novo estado para o placar

    const form = useForm<z.infer<typeof referralSchema>>({
        resolver: zodResolver(referralSchema),
        defaultValues: {
            referred_name: '',
            referred_phone: '',
            interested_course_id: '',
        },
    });

    // LOG: Função para buscar todos os dados (Cursos, Perfil, Indicações e Placar)
    const fetchData = useCallback(async () => {
        setLoading(true);
        console.log("log: Iniciando busca de dados para a página de Indicação.");
        
        try {
            // 1. Busca os dados de autenticação
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return;

            // 2. Busca o perfil e o código de indicação do aluno
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, referral_code')
                .eq('user_id', user.id)
                .single();
            if(profileError) throw profileError;
            setProfile(profileData as StudentProfile);
            console.log("log: Código de Indicação do aluno:", profileData.referral_code);

            // 3. Busca cursos ativos
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('id, name')
                .eq('active', true);
            if (coursesError) throw coursesError;
            setCourses(coursesData || []);
            
            // 4. Busca Indicações feitas pelo aluno (CORREÇÃO DO ERRO)
            const { data: referralsData, error: referralsError } = await supabase
                .from('referrals')
                // A query de join foi corrigida para usar o formato simples de Supabase (referrals -> courses)
                .select('id, created_at, referred_name, status, courses(name)') 
                .eq('referred_by_student_id', profileData.id)
                .order('created_at', { ascending: false });

            if(referralsError) throw referralsError;
            
            // Mapeia para a interface correta
            const mappedReferrals: Referral[] = (referralsData as any[]).map(ref => ({
                ...ref,
                course_name: ref.courses?.name || 'Curso Deletado', // Mapeia o nome do curso
            }));
            setReferrals(mappedReferrals || []);
            console.log("log: Histórico de leads de indicação carregado.");
            
            // 5. Busca o placar (Matrículas Confirmadas com o CÓDIGO DO ALUNO)
            if (profileData.referral_code) {
                const { count, error: countError } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('referred_by_code', profileData.referral_code)
                    .eq('status', 'matriculado'); // Filtra apenas matrículas de sucesso
                
                if (countError) throw countError;
                setEnrolledCount(count || 0);
                console.log(`log: ${count || 0} matrículas confirmadas por indicação.`);
            }

        } catch (error: any) {
            console.error('log: Erro ao carregar dados:', error);
            toast({ title: 'Erro', description: `Não foi possível carregar os dados: ${error.message}`, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // --- Lógica de Gamificação ---
    const referralCode = profile?.referral_code || '---';
    const referralLink = profile?.referral_code ? `${BASE_URL}/enroll?ref=${profile.referral_code}` : '';
    const nextMilestone = enrolledCount === 0 ? 1 : enrolledCount + 1; // Próximo objetivo para recompensa

    const handleCopy = () => {
        if (!referralLink) return;
        setCopying(true);
        navigator.clipboard.writeText(referralLink)
            .then(() => {
                toast({ title: 'Copiado!', description: 'Link de indicação copiado para a área de transferência.' });
                console.log("log: Link copiado:", referralLink);
            })
            .catch((err) => {
                console.error('log: Erro ao copiar link:', err);
                toast({ title: 'Erro', description: 'Falha ao copiar o link. Tente manualmente.', variant: 'destructive' });
            })
            .finally(() => {
                setTimeout(() => setCopying(false), 500);
            });
    };
    
    // --- Lógica de Submissão de Leads (Inalterada) ---
    const onSubmit = async (values: z.infer<typeof referralSchema>) => {
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: studentProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
            if (!studentProfile) throw new Error("Perfil do aluno não encontrado");
            
            // LOG: Enviando novo lead para a tabela 'referrals'
            const { error } = await supabase.from('referrals').insert({
                ...values,
                referred_by_student_id: studentProfile.id,
                status: 'nova' // status inicial para o lead
            });

            if (error) throw error;
            
            toast({ title: 'Sucesso!', description: 'Sua indicação foi enviada com sucesso! Nossa equipe entrará em contato.' });
            form.reset();
            fetchData(); // Recarrega os dados para atualizar o histórico
            
        } catch (error: any) {
            console.error('log: Erro ao submeter lead:', error);
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    }
    
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Indicação Premiada 🎁</h1>
                    <p className="text-muted-foreground">Indique um amigo e ganhe prêmios por cada matrícula confirmada!</p>
                </div>
            </div>
            
            {/* NOVO: Placar de Gamificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placar: Matrículas Confirmadas */}
                <Card className="bg-green-50 dark:bg-green-950 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Matrículas Confirmadas</CardTitle>
                        <Zap className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{enrolledCount}</div></CardContent>
                </Card>
                {/* Placar: Próxima Recompensa */}
                <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Próxima Recompensa</CardTitle>
                        <Gift className="w-4 h-4 text-purple-600" />
                    </CardHeader>
                    <CardContent><div className="text-xl font-bold">Ao Confirmar a {nextMilestone}ª Matrícula</div></CardContent>
                </Card>
                {/* Código de Indicação (Novo no layout) */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2"><Share2 className="w-5 h-5" /> Seu Link Exclusivo</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleCopy} disabled={copying || !profile?.referral_code}>
                            {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />} Copiar Link
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Input readOnly value={referralLink} className="truncate text-sm" placeholder="Carregando código..." />
                        <p className="text-sm text-muted-foreground mt-2">Código: **{referralCode}**</p>
                    </CardContent>
                </Card>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Coluna do Formulário (Seu código original) */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Enviar um Lead (Alternativa)</CardTitle>
                        <CardDescription>Envie os dados de um amigo que prefere contato direto.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField name="referred_name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome do Amigo</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField name="referred_phone" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Telefone do Amigo</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField name="interested_course_id" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Curso de Interesse</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o curso..." /></SelectTrigger></FormControl><SelectContent>{courses.map(course => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enviar Indicação como Lead
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Coluna da Tabela de Histórico (Seu código original, corrigido) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Histórico de Leads Enviados</CardTitle>
                        <CardDescription>Acompanhe o status dos leads que você enviou por formulário.</CardDescription>
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
                                            <TableCell>{ref.course_name}</TableCell>
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