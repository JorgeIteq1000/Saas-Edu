// src/pages/MyCourseDisciplinesPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Check, X, BookOpen, RefreshCw } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import SagahLaunchButton from '@/components/learning/SagahLaunchButton';

// Interfaces (sem alteração)
interface Grade {
  learning_unit_id: string;
  grade: number;
  attempts: number;
}
interface LearningUnit {
  id: string;
  name: string;
  latestGrade?: Grade;
}
interface Discipline {
  id: string;
  name: string;
  recovery_attempts: number;
  learning_units: LearningUnit[];
  averageGrade?: number;
}
interface CourseInfo {
  name: string;
  disciplines: Discipline[];
}

// Constantes com as novas regras de negócio
const PASSING_GRADE = 7.0;
const ATTEMPT_FINISHED_THRESHOLD = 2.1;

const MyCourseDisciplinesPage = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A lógica de busca de dados permanece a mesma, pois já busca tudo que precisamos
    const fetchDisciplinesAndGrades = async () => {
      console.log('log: Iniciando busca de dados...');
      if (!enrollmentId) return;
      try {
        setLoading(true);
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('course_id, student_id, courses(name)')
          .eq('id', enrollmentId)
          .single();
        if (enrollmentError) throw enrollmentError;

        const { data: disciplinesData, error: disciplinesError } = await supabase
          .from('course_disciplines')
          .select('discipline:disciplines(id, name, recovery_attempts, learning_units(id, name))')
          .eq('course_id', enrollmentData.course_id);
        if (disciplinesError) throw disciplinesError;

        let disciplines = disciplinesData.map((item: any) => item.discipline).filter(Boolean);
        
        const { data: gradesData, error: gradesError } = await supabase
          .from('student_grades')
          .select('learning_unit_id, grade, attempts')
          .eq('enrollment_id', enrollmentId)
          .eq('student_id', enrollmentData.student_id);

        if (gradesError) throw gradesError;
        
        disciplines.forEach((discipline: Discipline) => {
            let totalGrade = 0;
            let gradedUnits = 0;
            discipline.learning_units.forEach(ua => {
                const gradesForUnit = gradesData.filter(g => g.learning_unit_id === ua.id);
                if (gradesForUnit.length > 0) {
                    const latestAttempt = gradesForUnit.sort((a, b) => b.attempts - a.attempts)[0];
                    ua.latestGrade = { 
                        learning_unit_id: ua.id, 
                        grade: latestAttempt.grade, 
                        attempts: latestAttempt.attempts 
                    };
                    totalGrade += latestAttempt.grade;
                    gradedUnits++;
                }
            });
            if (gradedUnits > 0) {
                discipline.averageGrade = parseFloat((totalGrade / gradedUnits).toFixed(1));
            }
        });

        setCourseInfo({
          name: enrollmentData.courses.name,
          disciplines,
        });
      } catch (error: any) {
        console.error("log: 💥 Erro ao buscar disciplinas/notas:", error);
        toast({ title: "Erro", description: "Não foi possível carregar as disciplinas.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchDisciplinesAndGrades();
  }, [enrollmentId, toast]);

  const GradeIndicator = ({ grade }: { grade: number }) => {
    const isApproved = grade >= PASSING_GRADE;
    return (
      <div className="flex items-center gap-2 w-24 justify-end">
        <span className={`font-bold text-lg ${isApproved ? 'text-green-600' : 'text-red-600'}`}>
          {grade.toFixed(1)}
        </span>
        {isApproved ? <Check className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-red-600" />}
      </div>
    )
  };

  if (loading) {
    return <div className="p-6 text-center"><Loader2 className="mr-2 h-8 w-8 animate-spin inline" /> Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* O cabeçalho da página permanece o mesmo */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/curso/${enrollmentId}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">{courseInfo?.name}</h1>
          <p className="text-muted-foreground">Acompanhe suas notas.</p>
        </div>
        <Card className="p-4 w-48 text-center">
            <p className="text-sm font-medium text-muted-foreground">Média para Aprovação</p>
            <p className="text-2xl font-bold text-primary">{PASSING_GRADE.toFixed(1)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quadro de Notas</CardTitle>
          <CardDescription>A média da disciplina é calculada com base na última nota de cada Unidade de Aprendizagem.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {courseInfo?.disciplines.map(discipline => (
              <AccordionItem value={discipline.id} key={discipline.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="text-lg font-medium">{discipline.name}</span>
                    {discipline.averageGrade !== undefined ? (
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-muted-foreground">Média</span>
                            <GradeIndicator grade={discipline.averageGrade} />
                        </div>
                    ) : (
                        <Badge variant="outline">Sem notas</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-4 border-l-2 ml-2">
                    {discipline.learning_units.length > 0 ? discipline.learning_units.map(ua => {
                        const { latestGrade } = ua;
                        const gradeValue = latestGrade?.grade;
                        const attemptsMade = latestGrade?.attempts ?? 0;
                        const totalAttemptsAllowed = 1 + (discipline.recovery_attempts ?? 0);
                        const hasAttemptsLeft = attemptsMade < totalAttemptsAllowed;

                        // ===== NOVA LÓGICA DE EXIBIÇÃO =====
                        let buttonText = "Estudar";
                        let ButtonIcon = BookOpen;
                        let isDisabled = false;

                        if (latestGrade && gradeValue !== undefined) {
                            if (gradeValue >= PASSING_GRADE) {
                                buttonText = "Aprovado";
                                ButtonIcon = Check;
                                isDisabled = true;
                            } else if (gradeValue > ATTEMPT_FINISHED_THRESHOLD) { // Ex: 2.2 a 6.9
                                if (hasAttemptsLeft) {
                                    buttonText = "Recuperação";
                                    ButtonIcon = RefreshCw;
                                } else {
                                    buttonText = "Reprovado";
                                    ButtonIcon = X;
                                    isDisabled = true;
                                }
                            } else { // Ex: 0 a 2.1
                                // O aluno pode continuar a mesma tentativa
                                buttonText = "Em Progresso";
                                ButtonIcon = BookOpen;
                            }
                        }
                        // Botão fica desabilitado se já está aprovado ou se foi reprovado e não tem mais tentativas
                        isDisabled = (gradeValue !== undefined && gradeValue >= PASSING_GRADE) || (gradeValue !== undefined && gradeValue < PASSING_GRADE && !hasAttemptsLeft);
                        // ===================================

                        return (
                            <div key={ua.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                <span className="flex-1">{ua.name}</span>
                                <div className="flex items-center gap-6">
                                    {latestGrade ? <GradeIndicator grade={latestGrade.grade} /> : <Badge variant="secondary" className="w-24 justify-center">Aguardando</Badge>}
                                    
                                    <SagahLaunchButton 
                                        learningUnitId={ua.id} 
                                        enrollmentId={enrollmentId!}
                                        size="sm"
                                        disabled={isDisabled}
                                    >
                                        <ButtonIcon className="mr-2 h-4 w-4" />
                                        {buttonText}
                                    </SagahLaunchButton>
                                </div>
                            </div>
                        )
                    }) : <p className="text-sm text-muted-foreground p-2">Nenhuma Unidade de Aprendizagem.</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyCourseDisciplinesPage;