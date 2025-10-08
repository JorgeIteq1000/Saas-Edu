import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, BookOpen, DollarSign, Activity, Copy, LogIn, Users as UsersIcon, Eye, Edit, Save, XCircle, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

// LOG: Interfaces ajustadas para o modelo de dados final e mais simples.
interface Profile {
  full_name: string;
  email: string;
  phone: string;
  document_number: string;
  birth_date?: string;
  gender?: string;
  rg?: string;
  rg_issuer?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;
  father_name?: string;
  mother_name?: string;
  birth_country?: string;
  birth_state?: string;
  birth_city?: string;
  previous_institution?: string;
  previous_course?: string;
  education_level?: string;
  graduation_date?: string;
}

interface Course {
    name: string;
    description: string;
}

interface Combo {
    name: string;
}

interface Enrollment {
  id: string;
  status: string;
  enrollment_date: string;
  package_id: string | null;
  courses: Course; // Agora é sempre obrigatório e nunca nulo.
  combos: Combo | null; // O combo que originou o pacote.
}

interface Referral {
    id: string;
    created_at: string;
    referred_name: string;
    status: string;
    course: {
        name: string;
    }
}

interface ActivityLog {
  id: string;
  created_at: string;
  action_type: string;
  actor: {
      full_name: string;
  }
}

// Componentes Auxiliares (permanecem os mesmos)
const CopyableInfo = ({ text }: { text: string | null | undefined }) => {
    const { toast } = useToast();
    const copyToClipboard = () => {
        if (text) {
            navigator.clipboard.writeText(text);
            toast({ title: "Copiado!", description: `${text} copiado para a área de transferência.` });
        }
    };
    return (
        <div className="flex items-center gap-2">
            <span>{text || '-'}</span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copiar</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

const DataField = ({ label, value, isEditing, onChange, type = "text" }: { label: string; value?: string | null; isEditing?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }) => {
    const inputValue = type === 'date' && value ? new Date(value).toISOString().split('T')[0] : value || '';
    if (isEditing) {
        return (
            <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-muted-foreground">{label}</label>
                <Input type={type} defaultValue={inputValue} onChange={onChange} />
            </div>
        );
    }
    const displayValue = type === 'date' && value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : value;
    return (
        <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p>{displayValue || '-'}</p>
        </div>
    );
};


const StudentEnrollmentDetailsPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPerPage] = useState(5);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editableProfile, setEditableProfile] = useState<Partial<Profile>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchLogs = async (page: number) => {
    if (!studentId) return;
    const from = (page - 1) * logsPerPage;
    const to = from + logsPerPage - 1;
    const { data, error, count } = await supabase
        .from('student_activity_logs')
        .select(`id, created_at, action_type, actor:profiles!student_activity_logs_actor_id_fkey(full_name)`, { count: 'exact' })
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .range(from, to);
    if (error) throw error;
    setActivityLogs(data as any[] || []);
    setTotalLogs(count || 0);
  };

  const fetchData = async (logActivity = false) => {
    if (!studentId) return;
    setLoading(true);
    try {
        if (logActivity) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: actorProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
                if (actorProfile) {
                    await supabase.from('student_activity_logs').insert({
                        student_id: studentId,
                        actor_id: actorProfile.id,
                        action_type: 'acesso_administrativo'
                    });
                }
            }
        }
        
        // LOG: Consulta de matrículas foi CORRIGIDA E SIMPLIFICADA
        const [profileResult, enrollmentsResult, referralsResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', studentId).single(),
            supabase.from('enrollments').select(`*, courses(*), combos(*)`).eq('student_id', studentId),
            supabase.from('referrals').select(`*, course:courses!referrals_interested_course_id_fkey(name)`).eq('referred_by_student_id', studentId)
        ]);

        if (profileResult.error) throw profileResult.error;
        setProfile(profileResult.data);
        setEditableProfile(profileResult.data || {});
        
        if (enrollmentsResult.error) throw enrollmentsResult.error;
        setEnrollments(enrollmentsResult.data as Enrollment[] || []);

        if (referralsResult.error) throw referralsResult.error;
        setReferrals(referralsResult.data as any[] || []);
        
        await fetchLogs(1);

    } catch (error: any) {
        console.error("Erro ao buscar dados do aluno:", error)
        toast({ title: "Erro", description: error.message || "Não foi possível carregar os dados do aluno.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [studentId]);

  useEffect(() => {
    fetchLogs(logsPage);
  }, [logsPage]);

  const handleProfileChange = (field: keyof Profile, value: string) => {
    setEditableProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    if (!studentId || !profile) return;
    setIsSaving(true);
    try {
        const changedFields: { field: string, from: any, to: any }[] = [];
        (Object.keys(editableProfile) as Array<keyof Profile>).forEach(key => {
            if (profile[key] !== editableProfile[key]) {
                changedFields.push({ field: key, from: profile[key], to: editableProfile[key] });
            }
        });

        if(changedFields.length === 0) {
            toast({ title: "Nenhuma alteração", description: "Nenhum dado foi modificado." });
            setIsEditing(false);
            return;
        }

        const { error: updateError } = await supabase.from('profiles').update(editableProfile).eq('id', studentId);
        if (updateError) throw updateError;
        
        const { data: { user } } = await supabase.auth.getUser();
        const { data: actorProfile } = await supabase.from('profiles').select('id').eq('user_id', user!.id).single();

        await supabase.from('student_activity_logs').insert({
            student_id: studentId,
            actor_id: actorProfile!.id,
            action_type: 'dados_atualizados',
            details: { fields: changedFields.map(f => f.field) }
        });

        toast({ title: "Sucesso!", description: "Dados do aluno atualizados." });
        setIsEditing(false);
        fetchData(false);

    } catch (error: any) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleImpersonate = async () => {
    if (!profile) return;
    setImpersonating(true);
    try {
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { userIdToImpersonate: profile.email },
      });

      if (error) throw new Error(error.message);
      
      if (data.signInLink) {
        window.open(data.signInLink, '_blank');
      } else {
        throw new Error(data.error || "Link de acesso não foi gerado.");
      }

    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setImpersonating(false);
    }
  };

  const renderLogIcon = (action: string) => {
    switch(action) {
      case 'acesso_administrativo': return <Eye className="h-4 w-4 mr-2 text-blue-500" />;
      case 'dados_atualizados': return <Edit className="h-4 w-4 mr-2 text-yellow-500" />;
      case 'login_aluno': return <LogIn className="h-4 w-4 mr-2 text-green-500" />;
      default: return <Activity className="h-4 w-4 mr-2" />;
    }
  };

  if (loading && !isSaving) {
    return <div className="p-6 text-center"><Loader2 className="mr-2 h-8 w-8 animate-spin inline" /> Carregando...</div>;
  }
  
  return (
    <div className="p-6 space-y-6">
        <Button variant="outline" onClick={() => navigate('/enrollments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista
        </Button>
      
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-2xl">{profile?.full_name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
                        <div className="flex items-center"><strong className="mr-2">Email:</strong> <CopyableInfo text={profile?.email} /></div>
                        <div className="flex items-center"><strong className="mr-2">CPF:</strong> <CopyableInfo text={profile?.document_number} /></div>
                        <div className="flex items-center"><strong className="mr-2">Telefone:</strong> <CopyableInfo text={profile?.phone} /></div>
                    </div>
                </div>
                <Button onClick={handleImpersonate} disabled={impersonating}>
                    {impersonating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Acessar Portal
                </Button>
            </CardHeader>
        </Card>
      
        <Tabs defaultValue="courses">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="courses"><BookOpen className="mr-2 h-4 w-4"/>Cursos</TabsTrigger>
                <TabsTrigger value="personal-data"><User className="mr-2 h-4 w-4"/>Dados Pessoais</TabsTrigger>
                <TabsTrigger value="financial"><DollarSign className="mr-2 h-4 w-4"/>Financeiro</TabsTrigger>
                <TabsTrigger value="activities"><Activity className="mr-2 h-4 w-4"/>Atividades</TabsTrigger>
                <TabsTrigger value="indications"><UsersIcon className="mr-2 h-4 w-4"/>Indicações</TabsTrigger>
            </TabsList>

            <TabsContent value="courses">
              <Card>
                <CardHeader>
                  <CardTitle>Cursos Matriculados</CardTitle>
                  <CardDescription>Lista de todos os cursos em que o aluno está ou esteve matriculado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {enrollments.map(enroll => (
                    <Card key={enroll.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{enroll.courses?.name || 'Curso não encontrado'}</CardTitle>
                            <CardDescription>Matriculado em: {new Date(enroll.enrollment_date).toLocaleDateString('pt-BR')}</CardDescription>
                          </div>
                          <Badge>{enroll.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {enroll.combos && (
                            <div className="mb-4 flex items-center">
                                <Badge variant="secondary" className="text-xs">
                                    <Package className="h-3 w-3 mr-1.5" />
                                    Parte do pacote: {enroll.combos.name}
                                </Badge>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground mb-4">{enroll.courses?.description || 'Sem descrição.'}</p>
                        <Button size="sm">Ver Detalhes do Curso</Button>
                      </CardContent>
                    </Card>
                  ))}
                  {enrollments.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum curso matriculado.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* O resto das abas permanece inalterado */}
            <TabsContent value="personal-data">
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Dados Pessoais e Contato</CardTitle></div>
                            {!isEditing ? (
                                <Button variant="outline" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Modificar</Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="destructive" onClick={() => setIsEditing(false)}><XCircle className="mr-2 h-4 w-4" /> Cancelar</Button>
                                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Salvar
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <DataField label="Nome Completo" value={editableProfile?.full_name} isEditing={isEditing} onChange={(e) => handleProfileChange('full_name', e.target.value)} />
                            <DataField label="Email" value={editableProfile?.email} isEditing={isEditing} onChange={(e) => handleProfileChange('email', e.target.value)} />
                            <DataField label="Telefone" value={editableProfile?.phone} isEditing={isEditing} onChange={(e) => handleProfileChange('phone', e.target.value)} />
                            <DataField label="CPF" value={editableProfile?.document_number} isEditing={isEditing} onChange={(e) => handleProfileChange('document_number', e.target.value)} />
                            <DataField label="Data de Nascimento" value={editableProfile?.birth_date} isEditing={isEditing} onChange={(e) => handleProfileChange('birth_date', e.target.value)} type="date" />
                            <DataField label="Sexo" value={editableProfile?.gender} isEditing={isEditing} onChange={(e) => handleProfileChange('gender', e.target.value)} />
                            <DataField label="RG" value={editableProfile?.rg} isEditing={isEditing} onChange={(e) => handleProfileChange('rg', e.target.value)} />
                            <DataField label="Órgão Expedidor" value={editableProfile?.rg_issuer} isEditing={isEditing} onChange={(e) => handleProfileChange('rg_issuer', e.target.value)} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <DataField label="CEP" value={editableProfile?.address_zip_code} isEditing={isEditing} onChange={(e) => handleProfileChange('address_zip_code', e.target.value)} />
                            <DataField label="Rua" value={editableProfile?.address_street} isEditing={isEditing} onChange={(e) => handleProfileChange('address_street', e.target.value)} />
                            <DataField label="Número" value={editableProfile?.address_number} isEditing={isEditing} onChange={(e) => handleProfileChange('address_number', e.target.value)} />
                            <DataField label="Complemento" value={editableProfile?.address_complement} isEditing={isEditing} onChange={(e) => handleProfileChange('address_complement', e.target.value)} />
                            <DataField label="Bairro" value={editableProfile?.address_neighborhood} isEditing={isEditing} onChange={(e) => handleProfileChange('address_neighborhood', e.target.value)} />
                            <DataField label="Cidade" value={editableProfile?.address_city} isEditing={isEditing} onChange={(e) => handleProfileChange('address_city', e.target.value)} />
                            <DataField label="Estado" value={editableProfile?.address_state} isEditing={isEditing} onChange={(e) => handleProfileChange('address_state', e.target.value)} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Filiação e Naturalidade</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <DataField label="Nome da Mãe" value={editableProfile?.mother_name} isEditing={isEditing} onChange={(e) => handleProfileChange('mother_name', e.target.value)} />
                            <DataField label="Nome do Pai" value={editableProfile?.father_name} isEditing={isEditing} onChange={(e) => handleProfileChange('father_name', e.target.value)} />
                            <DataField label="País de Origem" value={editableProfile?.birth_country} isEditing={isEditing} onChange={(e) => handleProfileChange('birth_country', e.target.value)} />
                            <DataField label="Estado Natal" value={editableProfile?.birth_state} isEditing={isEditing} onChange={(e) => handleProfileChange('birth_state', e.target.value)} />
                            <DataField label="Cidade Natal" value={editableProfile?.birth_city} isEditing={isEditing} onChange={(e) => handleProfileChange('birth_city', e.target.value)} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Dados Acadêmicos Anteriores</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <DataField label="Instituição de Ensino" value={editableProfile?.previous_institution} isEditing={isEditing} onChange={(e) => handleProfileChange('previous_institution', e.target.value)} />
                            <DataField label="Curso Anterior" value={editableProfile?.previous_course} isEditing={isEditing} onChange={(e) => handleProfileChange('previous_course', e.target.value)} />
                            <DataField label="Nível de Escolaridade" value={editableProfile?.education_level} isEditing={isEditing} onChange={(e) => handleProfileChange('education_level', e.target.value)} />
                            <DataField label="Data de Colação de Grau" value={editableProfile?.graduation_date} isEditing={isEditing} onChange={(e) => handleProfileChange('graduation_date', e.target.value)} type="date" />
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="activities">
                <Card>
                    <CardHeader>
                        <CardTitle>Atividades Recentes</CardTitle>
                        <CardDescription>Histórico de interações com o perfil deste aluno.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    {activityLogs.length > 0 ? (
                        <>
                            <div className="space-y-4">
                                {activityLogs.map(log => (
                                    <div key={log.id} className="flex items-center p-2 rounded-md hover:bg-gray-50">
                                        {renderLogIcon(log.action_type)}
                                        <div>
                                            <p className="text-sm">
                                                <strong>{log.actor.full_name}</strong> {log.action_type.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(log.created_at).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-end space-x-2 pt-4">
                                <Button variant="outline" size="sm" onClick={() => setLogsPage(p => p - 1)} disabled={logsPage === 1}>
                                    Anterior
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setLogsPage(p => p + 1)} disabled={logsPage * logsPerPage >= totalLogs}>
                                    Próximo
                                </Button>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Nenhuma atividade registrada.</p>
                    )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="indications">
                <Card>
                    <CardHeader>
                        <CardTitle>Indicações Realizadas</CardTitle>
                        <CardDescription>Lista de amigos que este aluno indicou.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {referrals.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Amigo Indicado</TableHead>
                                        <TableHead>Curso de Interesse</TableHead>
                                        <TableHead>Data da Indicação</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {referrals.map(ref => (
                                        <TableRow key={ref.id}>
                                            <TableCell>{ref.referred_name}</TableCell>
                                            <TableCell>{ref.course.name}</TableCell>
                                            <TableCell>{new Date(ref.created_at).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell><Badge>{ref.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Este aluno ainda não fez indicações.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
};

export default StudentEnrollmentDetailsPage;