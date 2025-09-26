import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface NewEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrollmentCreated: () => void;
}

const NewEnrollmentModal = ({ open, onOpenChange, onEnrollmentCreated }: NewEnrollmentModalProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    status: 'pendente',
    enrollment_fee_status: 'pendente',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      // Buscar alunos
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'aluno')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Buscar cursos
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, code')
        .order('name');

      if (coursesError) throw coursesError;

      setStudents(studentsData || []);
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados para nova matrícula",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.course_id) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um aluno e um curso",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // O número da matrícula será gerado automaticamente pelo trigger
      // Criar matrícula
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert([{
          enrollment_number: '', // Será preenchido pelo trigger
          student_id: formData.student_id,
          course_id: formData.course_id,
          status: formData.status as any,
          enrollment_fee_status: formData.enrollment_fee_status as any,
          enrollment_date: new Date().toISOString(),
        }]);

      if (enrollmentError) throw enrollmentError;

      toast({
        title: "Sucesso",
        description: "Matrícula criada com sucesso!",
      });

      // Reset form
      setFormData({
        student_id: '',
        course_id: '',
        status: 'pendente',
        enrollment_fee_status: 'pendente',
      });

      onEnrollmentCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar matrícula:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar matrícula. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Matrícula</DialogTitle>
          <DialogDescription>
            Crie uma nova matrícula para um aluno em um curso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Aluno</Label>
            <Select
              value={formData.student_id}
              onValueChange={(value) => setFormData({ ...formData, student_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name} ({student.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Curso</Label>
            <Select
              value={formData.course_id}
              onValueChange={(value) => setFormData({ ...formData, course_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status da Matrícula</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* CORREÇÃO APLICADA AQUI */}
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="ativa">Ativa/Matriculado</SelectItem>
                <SelectItem value="trancada">Trancada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-status">Status do Pagamento</Label>
            <Select
              value={formData.enrollment_fee_status}
              onValueChange={(value) => setFormData({ ...formData, enrollment_fee_status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem> {/* Corrigido de em_atraso para vencido */}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
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