import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, BookOpen, DollarSign, Activity, Copy, LogIn } from 'lucide-react'; // Adicionado LogIn
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react'; // Adicionado Loader2

// ... (Interface Profile e Enrollment permanecem as mesmas)
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

interface Enrollment {
  id: string;
  status: string;
  enrollment_date: string;
  courses: {
    name: string;
    description: string;
    duration_months: number;
  };
}


// ... (Componentes DataField e CopyableInfo permanecem os mesmos)
const DataField = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex flex-col space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p>{value || '-'}</p>
    </div>
  );
  
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
                      <TooltipContent>
                          <p>Copiar</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          </div>
      );
  };


const StudentEnrollmentDetailsPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false); // Novo estado
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    // ... (useEffect permanece o mesmo)
    if (!studentId) {
        toast({ title: "Erro", description: "ID do aluno não encontrado.", variant: "destructive" });
        navigate('/enrollments');
        return;
      }
  
      const fetchData = async () => {
        setLoading(true);
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', studentId)
            .single();
          if (profileError) throw profileError;
          setProfile(profileData);
  
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select(`*, courses (*)`)
            .eq('student_id', studentId);
          if (enrollmentsError) throw enrollmentsError;
          setEnrollments(enrollmentsData as any[] || []);
  
        } catch (error: any) {
          console.error("log: Erro ao buscar detalhes do aluno:", error);
          toast({ title: "Erro", description: "Não foi possível carregar os dados do aluno.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
  }, [studentId, toast, navigate]);

  // Nova função para lidar com o login "como aluno"
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

  if (loading) {
    return <div className="p-6 text-center">Carregando dados do aluno...</div>;
  }

  if (!profile) {
    return <div className="p-6 text-center">Aluno não encontrado.</div>;
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
            <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
                <div className="flex items-center"><strong className="mr-2">Email:</strong> <CopyableInfo text={profile.email} /></div>
                <div className="flex items-center"><strong className="mr-2">CPF:</strong> <CopyableInfo text={profile.document_number} /></div>
                <div className="flex items-center"><strong className="mr-2">Telefone:</strong> <CopyableInfo text={profile.phone} /></div>
            </div>
          </div>
          {/* Botão de Acessar Portal */}
          <Button onClick={handleImpersonate} disabled={impersonating}>
            {impersonating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Acessar Portal
          </Button>
        </CardHeader>
      </Card>

      {/* O resto do componente (Tabs) permanece o mesmo */}
      <Tabs defaultValue="courses">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="courses"><BookOpen className="mr-2 h-4 w-4"/>Cursos</TabsTrigger>
          <TabsTrigger value="personal-data"><User className="mr-2 h-4 w-4"/>Dados Pessoais</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="mr-2 h-4 w-4"/>Financeiro</TabsTrigger>
          <TabsTrigger value="activities"><Activity className="mr-2 h-4 w-4"/>Atividades</TabsTrigger>
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
                        <CardTitle className="text-lg">{enroll.courses.name}</CardTitle>
                        <CardDescription>Matriculado em: {new Date(enroll.enrollment_date).toLocaleDateString('pt-BR')}</CardDescription>
                      </div>
                      <Badge>{enroll.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{enroll.courses.description || 'Sem descrição.'}</p>
                    <Button size="sm">Ver Detalhes do Curso</Button>
                  </CardContent>
                </Card>
              ))}
               {enrollments.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum curso matriculado.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal-data">
            <Card>
                <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DataField label="Data de Nascimento" value={profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('pt-BR') : '-'} />
                    <DataField label="Sexo" value={profile.gender} />
                    <DataField label="RG" value={profile.rg} />
                    <DataField label="Órgão Expedidor" value={profile.rg_issuer} />
                </CardContent>
            </Card>
             <Card className="mt-6">
                <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DataField label="CEP" value={profile.address_zip_code} />
                    <DataField label="Rua" value={profile.address_street} />
                    <DataField label="Número" value={profile.address_number} />
                    <DataField label="Complemento" value={profile.address_complement} />
                    <DataField label="Bairro" value={profile.address_neighborhood} />
                    <DataField label="Cidade" value={profile.address_city} />
                    <DataField label="Estado" value={profile.address_state} />
                </CardContent>
            </Card>
             <Card className="mt-6">
                <CardHeader><CardTitle>Filiação e Naturalidade</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DataField label="Nome da Mãe" value={profile.mother_name} />
                    <DataField label="Nome do Pai" value={profile.father_name} />
                    <DataField label="País de Origem" value={profile.birth_country} />
                    <DataField label="Estado Natal" value={profile.birth_state} />
                    <DataField label="Cidade Natal" value={profile.birth_city} />
                </CardContent>
            </Card>
             <Card className="mt-6">
                <CardHeader><CardTitle>Dados Acadêmicos Anteriores</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DataField label="Instituição de Ensino" value={profile.previous_institution} />
                    <DataField label="Curso" value={profile.previous_course} />
                    <DataField label="Nível de Escolaridade" value={profile.education_level} />
                    <DataField label="Data de Colação de Grau" value={profile.graduation_date ? new Date(profile.graduation_date).toLocaleDateString('pt-BR') : '-'} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="financial">
            <Card>
                <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
                <CardContent><p className="text-center text-muted-foreground py-8">Em desenvolvimento...</p></CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="activities">
            <Card>
                <CardHeader><CardTitle>Atividades Recentes</CardTitle></CardHeader>
                <CardContent><p className="text-center text-muted-foreground py-8">Em desenvolvimento...</p></CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentEnrollmentDetailsPage;