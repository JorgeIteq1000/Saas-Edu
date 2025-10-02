// src/pages/CoursePortalPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Home, BookCopy, Library, Briefcase, CheckCircle, Clock, ArrowRight } from 'lucide-react';

// Interfaces para os dados
interface EnrollmentDetails {
  id: string;
  status: string;
  enrollment_date: string;
  courses: {
    name: string;
    description: string;
    workload_hours: number;
  };
  profiles: {
    full_name: string;
    // avatar_url não existe no schema, vamos remover
  }
}

interface Pillar {
  title: string;
  status: 'Concluído' | 'Pendente' | 'Aguardando' | 'Em dia' | 'Atrasado';
  icon: React.ElementType;
  color: 'green' | 'yellow' | 'red';
  actionText: string;
}

// Componente para um item do Pilar
const PillarItem = ({ pillar }: { pillar: Pillar }) => {
  const statusColors = {
    green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800',
    red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
  };

  const Icon = pillar.icon;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-4">
        <Icon className={`h-6 w-6 text-${pillar.color}-600`} />
        <span className="font-medium text-card-foreground">{pillar.title}</span>
      </div>
      <div className="flex items-center gap-4">
        <Badge className={statusColors[pillar.color]}>{pillar.status}</Badge>
        <Button variant="ghost" size="sm">{pillar.actionText}</Button>
      </div>
    </div>
  )
};


const CoursePortalPage = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [enrollment, setEnrollment] = useState<EnrollmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollmentDetails = async () => {
      if (!enrollmentId) return;
      setLoading(true);
      try {
        // --- CORREÇÃO APLICADA AQUI ---
        // Especificando a relação correta para a tabela 'profiles'
        const { data, error } = await supabase
          .from('enrollments')
          .select(`
            id, status, enrollment_date,
            courses (name, description, workload_hours),
            profiles:profiles!enrollments_student_id_fkey (full_name)
          `)
          .eq('id', enrollmentId)
          .single();
        // --- FIM DA CORREÇÃO ---

        if (error) throw error;
        setEnrollment(data as any);
      } catch (error: any) {
        toast({ title: "Erro", description: "Não foi possível carregar os dados do curso.", variant: "destructive" });
        navigate('/my-enrollments');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollmentDetails();
  }, [enrollmentId, navigate, toast]);
  
  const pillars: Pillar[] = [
      { title: 'Financeiro', status: 'Em dia', icon: CheckCircle, color: 'green', actionText: 'Ver dados' },
      { title: 'Documentos', status: 'Concluído', icon: CheckCircle, color: 'green', actionText: 'Ver dados' },
      { title: 'Período mínimo', status: 'Aguardando', icon: Clock, color: 'yellow', actionText: 'Ver dados' },
      { title: 'Avaliação', status: 'Aguardando', icon: Clock, color: 'yellow', actionText: 'Ver dados' },
      { title: 'Dados pessoais', status: 'Concluído', icon: CheckCircle, color: 'green', actionText: 'Ver dados' },
      { title: 'Tempo máximo', status: 'Em dia', icon: CheckCircle, color: 'green', actionText: 'Ver dados' },
  ];

  if (loading) {
    return <div className="p-6 text-center"><Loader2 className="mr-2 h-8 w-8 animate-spin inline" /> Carregando portal do curso...</div>;
  }
  
  if (!enrollment) {
      return <div>Matrícula não encontrada.</div>
  }

  const menuItems = [
    { title: 'Voltar ao Portal', url: '/my-enrollments', icon: ArrowLeft },
    { title: 'Início', url: `/curso/${enrollmentId}`, icon: Home },
    { title: 'Disciplinas', url: `/curso/${enrollmentId}/disciplinas`, icon: BookCopy }, 
    { title: 'Biblioteca Virtual', url: '#', icon: Library },
    { title: 'Estágio', url: '#', icon: Briefcase },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen bg-muted/40">
      {/* Coluna Esquerda - Menu */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <Card className="p-4">
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src={`https://ui-avatars.com/api/?name=${enrollment.profiles.full_name.replace(' ', '+')}&background=random`} 
              alt="Avatar do aluno" 
              className="w-24 h-24 rounded-full mb-4 border-2 border-primary"
            />
            <h3 className="font-semibold">{enrollment.profiles.full_name}</h3>
          </div>
          <nav className="flex flex-col gap-2">
            {menuItems.map(item => (
              <NavLink 
                key={item.title} 
                to={item.url} 
                className={({ isActive }) => 
                  `flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${
                    (item.url === `/curso/${enrollmentId}` && location.pathname.startsWith('/curso/')) || (isActive && item.url !== `/curso/${enrollmentId}`)
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent'
                  }`
                }
                end={item.url !== `/curso/${enrollmentId}`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </Card>
      </aside>

      {/* Coluna Direita - Conteúdo Principal */}
      <main className="flex-1 space-y-6">
        <Card>
            <CardHeader>
                <div className='flex justify-between items-start'>
                    <div>
                        <p className="text-sm font-medium text-primary">SEJA BEM-VINDO(A)</p>
                        <CardTitle className="text-2xl">{enrollment.courses.name}</CardTitle>
                    </div>
                    <div className='text-right'>
                        <p className='text-sm text-muted-foreground'>Carga Horária</p>
                        <p className='font-semibold'>{enrollment.courses.workload_hours} horas</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Card className='bg-muted/50 p-6'>
                    <p className='text-muted-foreground'>Nosso objetivo é proporcionar uma formação acadêmica sólida aliada a experiências enriquecedoras. Estamos empenhados em oferecer um ambiente estimulante com recursos de ponta para guiá-los nessa jornada transformadora. Para ser considerado concluinte e apto à certificação, o aluno deverá cumprir todos os **pilares obrigatórios** listados abaixo.</p>
                </Card>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verifique os pilares obrigatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pillars.map(pillar => (
              <PillarItem key={pillar.title} pillar={pillar} />
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CoursePortalPage;