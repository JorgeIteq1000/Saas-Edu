import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface LearningUnit {
  id: string;
  name: string;
}

interface Discipline {
  id: string;
  name: string;
  workload_hours: number;
  learning_units: LearningUnit[];
}

interface CourseDisciplinesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string | null;
  courseName: string | null;
}

const postToUrl = (path: string, params: { [key: string]: string }) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = path;
  form.target = '_blank';

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.name = key;
      hiddenField.value = params[key];
      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

export const CourseDisciplinesModal = ({ open, onOpenChange, courseId, courseName }: CourseDisciplinesModalProps) => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDisciplines = async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('course_disciplines')
          .select('discipline:disciplines(id, name, workload_hours, learning_units(*))')
          .eq('course_id', courseId);
        if (error) throw error;
        setDisciplines(data.map((item: any) => item.discipline).filter(Boolean) || []);
      } catch (error: any) {
        toast({ title: 'Erro', description: 'Não foi possível carregar as disciplinas.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchDisciplines();
    }
  }, [open, courseId, toast]);

  const handleLaunchSagah = async (learningUnitId: string) => {
    setLaunchingId(learningUnitId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sagah-launch', {
        body: { learningUnitId }, // Envia o ID da UA
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      postToUrl(data.launch_url, data.params);

    } catch (error: any) {
      toast({ title: 'Erro ao acessar conteúdo', description: error.message, variant: 'destructive' });
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Disciplinas e Conteúdos</DialogTitle>
          <DialogDescription>{courseName}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {disciplines.map(discipline => (
              <AccordionItem value={discipline.id} key={discipline.id}>
                <AccordionTrigger className="font-medium text-lg">{discipline.name}</AccordionTrigger>
                <AccordionContent>
                  {discipline.learning_units.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unidade de Aprendizagem</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {discipline.learning_units.map(unit => (
                          <TableRow key={unit.id}>
                            <TableCell>{unit.name}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => handleLaunchSagah(unit.id)} disabled={launchingId === unit.id}>
                                {launchingId === unit.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                )}
                                Acessar Conteúdo
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center p-4">Nenhuma unidade de aprendizagem cadastrada para esta disciplina.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
             {disciplines.length === 0 && (
                <div className="text-center p-8">
                    <p className="text-muted-foreground">Nenhuma disciplina encontrada para este curso.</p>
                </div>
            )}
          </Accordion>
        )}
      </DialogContent>
    </Dialog>
  );
};