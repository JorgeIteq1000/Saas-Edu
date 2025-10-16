// LOG: Refatoração final para criar matrículas individuais a partir de um combo, com suporte a código de indicação.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Interfaces...
interface Student { id: string; full_name: string; }
interface Course { id: string; name: string; course_type_id: string; }
interface Combo { id: string; name: string; }
interface CourseType { id: string; name: string; }

interface NewEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrollmentCreated: () => void;
  // NOVO: Propriedade para receber o código de indicação da URL.
  initialReferralCode?: string | null; 
}

const NewEnrollmentModal = ({ open, onOpenChange, onEnrollmentCreated, initialReferralCode }: NewEnrollmentModalProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<'course' | 'combo'>('course');
  const [comboCourseTypes, setComboCourseTypes] = useState<CourseType[]>([]);
  const [selectedComboCourses, setSelectedComboCourses] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ student_id: '', selected_item_id: '' });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    // Busca dados de forma otimizada
    const { data: studentsData } = await supabase.from('profiles').select('id, full_name').eq('role', 'aluno');
    setStudents(studentsData || []);
    const { data: coursesData } = await supabase.from('courses').select('id, name, course_type_id');
    setCourses(coursesData || []);
    const { data: combosData } = await supabase.from('combos').select('id, name').eq('is_active', true);
    setCombos(combosData || []);
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
      // LOG: Se houver um código de indicação na URL, ele será exibido aqui
      if (initialReferralCode) {
        console.log(`log: Modal aberto com Referral Code: ${initialReferralCode}`);
      }
    } else {
      // Limpa o estado quando o modal fecha
      setFormData({ student_id: '', selected_item_id: ''});
      setItemType('course');
      setComboCourseTypes([]);
      setSelectedComboCourses({});
    }
  }, [open, fetchData, initialReferralCode]);

  useEffect(() => {
    const fetchComboDetails = async () => {
      if (itemType === 'combo' && formData.selected_item_id) {
        setLoading(true);
        const { data, error } = await supabase
          .from('combo_course_types')
          .select('course_types(id, name)')
          .eq('combo_id', formData.selected_item_id);
        if (error) {
          toast({ title: 'Erro', description: 'Não foi possível buscar os detalhes do combo.', variant: 'destructive' });
          setComboCourseTypes([]);
        } else {
          const types = data.map((item: any) => item.course_types).flat();
          setComboCourseTypes(types as CourseType[]);
        }
        setLoading(false);
      } else {
        setComboCourseTypes([]);
      }
    };
    fetchComboDetails();
  }, [itemType, formData.selected_item_id, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.student_id || !formData.selected_item_id) {
      toast({ title: "Erro", description: "Selecione um aluno e um item.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
        if (itemType === 'course') {
            // Lógica para curso individual
            const enrollmentData = {
                student_id: formData.student_id,
                course_id: formData.selected_item_id,
                status: 'pendente',
                enrollment_fee_status: 'pendente',
                enrollment_number: '',
                enrollment_date: new Date().toISOString(),
                // NOVO: Adiciona o código de indicação
                referred_by_code: initialReferralCode || null,
            };

            console.log("log: Inserindo matrícula individual:", enrollmentData);
            const { error } = await supabase.from('enrollments').insert(enrollmentData);
            if (error) throw error;

        } else {
            // Lógica para combos
            const allTypesSelected = comboCourseTypes.every(type => selectedComboCourses[type.id]);
            if (!allTypesSelected || comboCourseTypes.length === 0) {
                toast({ title: "Erro", description: "Selecione um curso para cada tipo do combo.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const package_id = uuidv4(); 
            const selectedCourseIds = Object.values(selectedComboCourses);

            const enrollmentsToInsert = selectedCourseIds.map(courseId => ({
                student_id: formData.student_id,
                course_id: courseId,
                combo_id: formData.selected_item_id, 
                package_id: package_id, 
                status: 'pendente',
                enrollment_fee_status: 'pendente',
                enrollment_number: '',
                enrollment_date: new Date().toISOString(),
                // NOVO: Adiciona o código de indicação em cada matrícula do combo
                referred_by_code: initialReferralCode || null, 
            }));

            console.log("log: Inserindo matrículas de combo (pacote):", enrollmentsToInsert);
            const { error } = await supabase.from('enrollments').insert(enrollmentsToInsert);
            if (error) throw error;
        }

        toast({ title: "Sucesso", description: "Matrícula(s) criada(s) com sucesso!" });
        onEnrollmentCreated();
        onOpenChange(false);

    } catch (error: any) {
        console.error('log: Erro detalhado na inserção da matrícula:', error);
        toast({ title: "Erro", description: `Falha ao criar matrícula: ${error.message}`, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Matrícula</DialogTitle>
          <DialogDescription>Crie uma nova matrícula para um aluno.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Alerta de Indicação, se o código estiver presente */}
          {initialReferralCode && (
              <div className="p-2 text-sm bg-blue-50 dark:bg-blue-900 rounded-md border border-blue-200">
                  <span className="font-semibold">Indicação Detectada:</span> Código **{initialReferralCode}** será registrado.
              </div>
          )}
          <div className="space-y-2">
            <Label>Aluno</Label>
            <Select value={formData.student_id} onValueChange={(v) => setFormData(p => ({ ...p, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={itemType} onValueChange={(v: 'course'|'combo') => { setItemType(v); setFormData(p => ({ ...p, selected_item_id: '' })); setSelectedComboCourses({}); }}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="course">Curso Individual</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{itemType === 'course' ? 'Curso' : 'Combo'}</Label>
            <Select value={formData.selected_item_id} onValueChange={(v) => { setFormData(p => ({ ...p, selected_item_id: v })); setSelectedComboCourses({}); }}>
              <SelectTrigger><SelectValue placeholder={`Selecione um ${itemType}`} /></SelectTrigger>
              <SelectContent>
                {itemType === 'course' 
                  ? courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                  // @ts-ignore
                  : combos.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {itemType === 'combo' && comboCourseTypes.length > 0 && (
            <div className="p-4 border rounded-md space-y-4">
              <h4 className="font-medium text-center">Selecione os Cursos do Combo</h4>
              {loading && <p>Carregando opções...</p>}
              {!loading && comboCourseTypes.map(type => (
                <div key={type.id} className="space-y-2">
                  <Label>{type.name}</Label>
                  <Select
                    value={selectedComboCourses[type.id] || ''}
                    onValueChange={courseId => setSelectedComboCourses(prev => ({...prev, [type.id]: courseId}))}
                  >
                    <SelectTrigger><SelectValue placeholder={`Selecione um curso de ${type.name}`} /></SelectTrigger>
                    <SelectContent>
                      {courses.filter(c => c.course_type_id === type.id).map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Matrícula
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewEnrollmentModal;
