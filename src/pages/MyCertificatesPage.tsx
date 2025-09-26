import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Award, Plus, Download, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Enrollment {
  id: string;
  enrollment_number: string;
  status: string;
  courses: {
    id: string;
    name: string;
    course_type: string;
  };
}

interface CertificateTemplate {
  id: string;
  name: string;
  course_type: string;
  certifying_institution: string;
}

interface CertificateRequest {
  id: string;
  enrollment_id: string;
  template_id: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  certificate_url: string | null;
  enrollments: {
    enrollment_number: string;
    courses: {
      name: string;
    };
  };
  certificate_templates: {
    name: string;
    certifying_institution: string;
  };
}

const MyCertificatesPage = () => {
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Buscar matrículas do aluno
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrollment_number,
          status,
          courses!enrollments_course_id_fkey(
            id,
            name,
            course_type
          )
        `)
        .eq('student_id', profile.id)
        .eq('status', 'ativa');

      // Buscar modelos de certificado ativos
      const { data: templatesData } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('active', true);

      // Buscar solicitações existentes
      const { data: requestsData } = await supabase
        .from('certificate_requests')
        .select(`
          *,
          enrollments!certificate_requests_enrollment_id_fkey(
            enrollment_number,
            courses!enrollments_course_id_fkey(name)
          ),
          certificate_templates!certificate_requests_template_id_fkey(
            name,
            certifying_institution
          )
        `)
        .eq('student_id', profile.id)
        .order('requested_at', { ascending: false });

      if (enrollmentsData) setEnrollments(enrollmentsData as any);
      if (templatesData) setTemplates(templatesData);
      if (requestsData) setRequests(requestsData as any);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus certificados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCertificate = async () => {
    try {
      if (!selectedEnrollment || !selectedTemplate) {
        toast({
          title: "Erro",
          description: "Selecione uma matrícula e um modelo de certificado",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Verificar se já existe solicitação para esta matrícula
      const { data: existingRequest } = await supabase
        .from('certificate_requests')
        .select('id')
        .eq('student_id', profile.id)
        .eq('enrollment_id', selectedEnrollment)
        .single();

      if (existingRequest) {
        toast({
          title: "Erro",
          description: "Já existe uma solicitação de certificado para esta matrícula",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('certificate_requests')
        .insert([{
          student_id: profile.id,
          enrollment_id: selectedEnrollment,
          template_id: selectedTemplate,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação de certificado enviada com sucesso",
      });

      setShowRequestDialog(false);
      setSelectedEnrollment('');
      setSelectedTemplate('');
      fetchData();
    } catch (error) {
      console.error('Erro ao solicitar certificado:', error);
      toast({
        title: "Erro",
        description: "Erro ao solicitar certificado",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const canRequestCertificate = (enrollment: Enrollment) => {
    // Verificar se pode solicitar certificado baseado nos critérios
    // Por enquanto, apenas verifica se está ativo
    return enrollment.status === 'ativa';
  };

  const getAvailableTemplates = (enrollment: Enrollment) => {
    return templates.filter(template => 
      template.course_type === enrollment.courses.course_type
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Certificados</h1>
          <p className="text-muted-foreground">
            Solicite e acompanhe seus certificados de conclusão
          </p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Solicitar Certificado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Certificado</DialogTitle>
              <DialogDescription>
                Selecione a matrícula e o tipo de certificado que deseja solicitar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Matrícula</label>
                <Select value={selectedEnrollment} onValueChange={setSelectedEnrollment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma matrícula" />
                  </SelectTrigger>
                  <SelectContent>
                    {enrollments
                      .filter(enrollment => canRequestCertificate(enrollment))
                      .map((enrollment) => (
                        <SelectItem key={enrollment.id} value={enrollment.id}>
                          {enrollment.courses.name} - {enrollment.enrollment_number}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEnrollment && (
                <div>
                  <label className="text-sm font-medium">Modelo de Certificado</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTemplates(
                        enrollments.find(e => e.id === selectedEnrollment)!
                      ).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.certifying_institution}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRequestCertificate}
                  disabled={!selectedEnrollment || !selectedTemplate}
                >
                  Solicitar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Minhas Solicitações</CardTitle>
            <CardDescription>
              Acompanhe o status das suas solicitações de certificado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {request.enrollments.courses.name}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.certificate_templates.name} - {request.certificate_templates.certifying_institution}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado em {new Date(request.requested_at).toLocaleDateString('pt-BR')}
                      {request.approved_at && (
                        <span> • Aprovado em {new Date(request.approved_at).toLocaleDateString('pt-BR')}</span>
                      )}
                    </p>
                  </div>
                  {request.status === 'approved' && request.certificate_url && (
                    <Button size="sm" asChild>
                      <a href={request.certificate_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-1" />
                        Baixar
                      </a>
                    </Button>
                  )}
                </div>
              ))}
              {requests.length === 0 && (
                <div className="text-center py-8">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhuma solicitação</h3>
                  <p className="text-muted-foreground">
                    Você ainda não solicitou nenhum certificado
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Matrículas</CardTitle>
            <CardDescription>
              Matrículas elegíveis para solicitação de certificado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <span className="font-medium">{enrollment.courses.name}</span>
                    <p className="text-sm text-muted-foreground">
                      Matrícula: {enrollment.enrollment_number}
                    </p>
                    <Badge variant={enrollment.status === 'ativa' ? 'default' : 'secondary'}>
                      {enrollment.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {canRequestCertificate(enrollment) ? (
                      <span className="text-green-600">Elegível para certificado</span>
                    ) : (
                      <span>Não elegível</span>
                    )}
                  </div>
                </div>
              ))}
              {enrollments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Você não possui matrículas ativas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyCertificatesPage;