import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Award, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';

type CourseType = 'graduacao' | 'pos_graduacao' | 'especializacao' | 'extensao';

interface CertificateTemplate {
  id: string;
  name: string;
  course_type: CourseType;
  certifying_institution: string;
  layout_url: string | null;
  html_content: string | null;
  active: boolean;
  created_at: string;
}

interface CertificateRequest {
  id: string;
  student_id: string;
  enrollment_id: string;
  template_id: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  certificate_url: string | null;
  notes: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  enrollments: {
    enrollment_number: string;
    courses: {
      name: string;
    };
  };
  certificate_templates: {
    name: string;
  };
}

interface TemplateForm {
  name: string;
  course_type: CourseType | '';
  certifying_institution: string;
  layout_url: string;
  html_content: string;
  active: boolean;
}

const CertificatesPage = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);

  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    name: '',
    course_type: '',
    certifying_institution: '',
    layout_url: '',
    html_content: '',
    active: true
  });

  useEffect(() => {
    if (hasPermission('certificates', 'view')) {
      fetchData();
    }
  }, [hasPermission]);

  const fetchData = async () => {
    try {
      const [templatesResult, requestsResult] = await Promise.all([
        supabase.from('certificate_templates').select('*').order('created_at', { ascending: false }),
        supabase
          .from('certificate_requests')
          .select(`
            *,
            profiles!certificate_requests_student_id_fkey(full_name, email),
            enrollments!certificate_requests_enrollment_id_fkey(
              enrollment_number,
              courses!enrollments_course_id_fkey(name)
            ),
            certificate_templates!certificate_requests_template_id_fkey(name)
          `)
          .order('requested_at', { ascending: false })
      ]);

      if (templatesResult.data) setTemplates(templatesResult.data);
      if (requestsResult.data) setRequests(requestsResult.data as any);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos certificados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      course_type: '',
      certifying_institution: '',
      layout_url: '',
      html_content: '',
      active: true
    });
  };

  const handleSaveTemplate = async () => {
    try {
      if (!templateForm.course_type) {
        toast({
          title: "Erro",
          description: "Selecione um tipo de curso",
          variant: "destructive",
        });
        return;
      }

      if (!templateForm.name.trim() || !templateForm.certifying_institution.trim()) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }

      const templateData = {
        name: templateForm.name,
        course_type: templateForm.course_type as CourseType,
        certifying_institution: templateForm.certifying_institution,
        layout_url: templateForm.layout_url || null,
        html_content: templateForm.html_content || null,
        active: templateForm.active
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('certificate_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Modelo de certificado atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('certificate_templates')
          .insert([templateData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Modelo de certificado criado com sucesso",
        });
      }

      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar modelo de certificado",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('certificate_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso`,
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da solicitação",
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

  const getCourseTypeLabel = (courseType: CourseType) => {
    const labels = {
      'graduacao': 'Graduação',
      'pos_graduacao': 'Pós-Graduação',
      'especializacao': 'Especialização',
      'extensao': 'Extensão'
    };
    return labels[courseType] || courseType;
  };

  if (!hasPermission('certificates', 'view')) {
    return (
      <div className="p-8 text-center">
        <Award className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificados</h1>
          <p className="text-muted-foreground">
            Gerencie modelos e solicitações de certificados
          </p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Solicitações</TabsTrigger>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Certificados</CardTitle>
              <CardDescription>
                Gerencie as solicitações de certificados dos alunos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.profiles.full_name}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.enrollments.courses.name} - {request.certificate_templates.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado em {new Date(request.requested_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {request.status === 'pending' && hasPermission('certificates', 'edit') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRequestStatus(request.id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateRequestStatus(request.id, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma solicitação encontrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Modelos de Certificados</CardTitle>
                  <CardDescription>
                    Configure modelos de certificados por tipo de curso e instituição
                  </CardDescription>
                </div>
                {hasPermission('certificates', 'create') && (
                  <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Modelo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTemplate ? 'Editar Modelo' : 'Novo Modelo de Certificado'}
                        </DialogTitle>
                        <DialogDescription>
                          Configure as informações do modelo de certificado
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nome do Modelo</Label>
                          <Input
                            id="name"
                            value={templateForm.name}
                            onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                            placeholder="Ex: Certificado de Conclusão - Graduação"
                          />
                        </div>
                        <div>
                          <Label htmlFor="course_type">Tipo de Curso</Label>
                          <Select
                            value={templateForm.course_type}
                            onValueChange={(value: CourseType) => setTemplateForm({...templateForm, course_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="graduacao">Graduação</SelectItem>
                              <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                              <SelectItem value="especializacao">Especialização</SelectItem>
                              <SelectItem value="extensao">Extensão</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="certifying_institution">Faculdade Certificadora</Label>
                          <Input
                            id="certifying_institution"
                            value={templateForm.certifying_institution}
                            onChange={(e) => setTemplateForm({...templateForm, certifying_institution: e.target.value})}
                            placeholder="Nome da faculdade ou instituição"
                          />
                        </div>
                        <div>
                          <Label htmlFor="layout_url">URL do Layout</Label>
                          <Input
                            id="layout_url"
                            type="url"
                            value={templateForm.layout_url}
                            onChange={(e) => setTemplateForm({...templateForm, layout_url: e.target.value})}
                            placeholder="https://exemplo.com/layout-certificado.pdf"
                          />
                        </div>
                        <div>
                          <Label htmlFor="html_content">Conteúdo HTML</Label>
                          <Textarea
                            id="html_content"
                            value={templateForm.html_content}
                            onChange={(e) => setTemplateForm({...templateForm, html_content: e.target.value})}
                            placeholder="HTML para personalização do certificado..."
                            rows={6}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="active"
                            checked={templateForm.active}
                            onCheckedChange={(checked) => setTemplateForm({...templateForm, active: checked})}
                          />
                          <Label htmlFor="active">Modelo ativo</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowTemplateDialog(false);
                              setEditingTemplate(null);
                              resetForm();
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleSaveTemplate}>
                            {editingTemplate ? 'Atualizar' : 'Criar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant={template.active ? "default" : "secondary"}>
                          {template.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getCourseTypeLabel(template.course_type)} - {template.certifying_institution}
                      </p>
                    </div>
                    {hasPermission('certificates', 'edit') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTemplate(template);
                            setTemplateForm({
                              name: template.name,
                              course_type: template.course_type,
                              certifying_institution: template.certifying_institution,
                              layout_url: template.layout_url || '',
                              html_content: template.html_content || '',
                              active: template.active
                            });
                            setShowTemplateDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum modelo encontrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CertificatesPage;