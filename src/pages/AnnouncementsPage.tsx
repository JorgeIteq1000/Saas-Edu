import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Edit, Trash2, Calendar, Users, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  target_audience: string;
  target_course_id?: string;
  has_action_button: boolean;
  action_button_text?: string;
  action_button_url?: string;
  is_indefinite: boolean;
  expires_at?: string;
  active: boolean;
  created_at: string;
  course?: {
    name: string;
  };
}

// Interface para cursos (usado no dropdown de curso específico)
interface Course {
  id: string;
  name: string;
}

// Interface para os tipos de curso
interface CourseType {
    id: string;
    name: string;
}

const AnnouncementsPage = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]); // Armazena objetos {id, name}
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('geral');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [hasActionButton, setHasActionButton] = useState(false);
  const [actionButtonText, setActionButtonText] = useState('');
  const [actionButtonUrl, setActionButtonUrl] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    if (hasPermission('announcements', 'view')) {
      fetchDataForSelects();
    }
  }, [hasPermission]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          course:courses(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('log: Erro ao buscar avisos:', error);
    } finally {
      setLoading(false);
    }
  };

  // log: Função corrigida para buscar dados de tabelas separadas
  const fetchDataForSelects = async () => {
    try {
      // 1. Busca os cursos para o dropdown de "Curso Específico"
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
      
      // 2. Busca os TIPOS de curso diretamente da tabela 'course_types'
      const { data: courseTypesData, error: courseTypesError } = await supabase
        .from('course_types')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (courseTypesError) throw courseTypesError;
      setCourseTypes(courseTypesData || []);
      
      console.log('log: Tipos de curso carregados:', courseTypesData);

    } catch (error) {
      console.error('log: Erro ao buscar dados para os selects:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageUrl('');
    setTargetAudience('geral');
    setTargetCourseId('');
    setHasActionButton(false);
    setActionButtonText('');
    setActionButtonUrl('');
    setIsIndefinite(true);
    setExpiresAt('');
    setActive(true);
    setSelectedAnnouncement(null);
    setIsEditing(false);
  };

  const openModal = (announcement: Announcement | null = null) => {
    if (announcement) {
        // Editando
        setSelectedAnnouncement(announcement);
        setTitle(announcement.title);
        setContent(announcement.content);
        setImageUrl(announcement.image_url || '');
        setTargetAudience(announcement.target_audience);
        setTargetCourseId(announcement.target_course_id || '');
        setHasActionButton(announcement.has_action_button);
        setActionButtonText(announcement.action_button_text || '');
        setActionButtonUrl(announcement.action_button_url || '');
        setIsIndefinite(announcement.is_indefinite);
        setExpiresAt(announcement.expires_at ? announcement.expires_at.split('T')[0] : '');
        setActive(announcement.active);
        setIsEditing(true);
    } else {
        // Criando
        resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Erro',
        description: 'Título e conteúdo são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('log: Usuário não autenticado.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        console.error('log: Perfil do usuário não encontrado.');
        return;
      }

      const isSpecificCourse = targetAudience === 'curso_especifico';
      
      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        target_audience: targetAudience,
        target_course_id: isSpecificCourse ? targetCourseId : null,
        has_action_button: hasActionButton,
        action_button_text: hasActionButton ? actionButtonText.trim() : null,
        action_button_url: hasActionButton ? actionButtonUrl.trim() : null,
        is_indefinite: isIndefinite,
        expires_at: isIndefinite ? null : `${expiresAt}T23:59:59`,
        active,
        created_by: profile.id
      };

      console.log(`log: Salvando aviso (${isEditing ? 'edição' : 'criação'})...`, announcementData);

      let error;
      if (isEditing && selectedAnnouncement) {
        const { error: updateError } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', selectedAnnouncement.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('announcements')
          .insert(announcementData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Aviso ${isEditing ? 'atualizado' : 'criado'} com sucesso.`
      });

      await fetchAnnouncements();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('log: Erro ao salvar aviso:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o aviso.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
     if (!window.confirm('Tem certeza que deseja excluir este aviso?')) return;
     console.log('log: Excluindo aviso ID:', id);
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Aviso excluído',
        description: 'O aviso foi removido com sucesso.'
      });

      await fetchAnnouncements();
    } catch (error) {
      console.error('log: Erro ao excluir aviso:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir o aviso.',
        variant: 'destructive'
      });
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    console.log(`log: Alterando status do aviso ID ${announcement.id} para ${!announcement.active}`);
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ active: !announcement.active })
        .eq('id', announcement.id);

      if (error) throw error;

      await fetchAnnouncements();
      toast({
        title: 'Status atualizado',
        description: `Aviso ${!announcement.active ? 'ativado' : 'desativado'} com sucesso.`
      });
    } catch (error) {
      console.error('log: Erro ao alterar status:', error);
    }
  };

  const getAudienceLabel = (audience: string, courseId?: string) => {
    if (audience === 'geral') return 'Todos os alunos';
    if (audience === 'curso_especifico') {
      const course = courses.find(c => c.id === courseId);
      return course ? `Curso: ${course.name}` : 'Curso específico';
    }
    // Para tipos de curso, apenas retorna o nome (que já vem capitalizado do banco)
    const courseType = courseTypes.find(ct => ct.name.toLowerCase().replace(/\s+/g, '_') === audience);
    return courseType ? courseType.name : audience;
  };

  const canManageAnnouncements = hasPermission('announcements', 'view');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avisos</h1>
          <p className="text-muted-foreground">
            {canManageAnnouncements ? 'Gerencie avisos que aparecem para os alunos' : 'Avisos importantes da instituição'}
          </p>
        </div>
        {canManageAnnouncements && hasPermission('announcements', 'create') && (
          <Dialog open={isModalOpen} onOpenChange={isOpen => { if (!isOpen) resetForm(); setIsModalOpen(isOpen); }}>
            <DialogTrigger asChild>
              <Button onClick={() => openModal(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar' : 'Criar'} Aviso</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Edite as informações do aviso' : 'Crie um novo aviso para os alunos'}
                </DialogDescription>
              </DialogHeader>

              {/* Formulário reutilizado */}
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="title">Título *</Label>
                     <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Digite o título do aviso" />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="image">URL da Imagem</Label>
                     <Input id="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="content">Conteúdo *</Label>
                   <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Digite o conteúdo do aviso" rows={4} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Público-alvo</Label>
                     <Select value={targetAudience} onValueChange={setTargetAudience}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="geral">Todos os alunos</SelectItem>
                         {/* log: Mapeamento corrigido para usar a tabela course_types */}
                         {courseTypes.map(type => (
                           <SelectItem key={type.id} value={type.name.toLowerCase().replace(/\s+/g, '_')}>
                             {type.name}
                           </SelectItem>
                         ))}
                         <SelectItem value="curso_especifico">Curso específico</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   {targetAudience === 'curso_especifico' && (
                     <div className="space-y-2">
                       <Label>Curso</Label>
                       <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                         <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                         <SelectContent>
                           {courses.map(course => ( <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem> ))}
                         </SelectContent>
                       </Select>
                     </div>
                   )}
                 </div>
                 <div className="flex items-center space-x-2">
                   <Checkbox id="action-button" checked={hasActionButton} onCheckedChange={(checked) => setHasActionButton(checked === true)} />
                   <Label htmlFor="action-button">Adicionar botão de ação</Label>
                 </div>
                 {hasActionButton && (
                   <div className="grid grid-cols-2 gap-4 ml-6">
                     <div className="space-y-2">
                       <Label>Texto do Botão</Label>
                       <Input value={actionButtonText} onChange={(e) => setActionButtonText(e.target.value)} placeholder="Ex: Saiba mais" />
                     </div>
                     <div className="space-y-2">
                       <Label>URL do Botão</Label>
                       <Input value={actionButtonUrl} onChange={(e) => setActionButtonUrl(e.target.value)} placeholder="https://exemplo.com" />
                     </div>
                   </div>
                 )}
                 <div className="space-y-4">
                   <div className="flex items-center space-x-2">
                     <Checkbox id="indefinite" checked={isIndefinite} onCheckedChange={(checked) => setIsIndefinite(checked === true)} />
                     <Label htmlFor="indefinite">Prazo indefinido</Label>
                   </div>
                   {!isIndefinite && (
                     <div className="ml-6">
                       <Label>Data de expiração</Label>
                       <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                     </div>
                   )}
                 </div>
                 <div className="flex items-center space-x-2">
                   <Checkbox id="active" checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
                   <Label htmlFor="active">Ativo</Label>
                 </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {loading && <p>Carregando avisos...</p>}
        {!loading && announcements.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{canManageAnnouncements ? 'Nenhum aviso criado' : 'Nenhum aviso disponível'}</h3>
              <p className="text-muted-foreground">{canManageAnnouncements ? 'Crie seu primeiro aviso para os alunos.' : 'Não há avisos para exibir no momento.'}</p>
            </CardContent>
          </Card>
        )}
        {announcements.map(announcement => (
          <Card key={announcement.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-lg">{announcement.title}</h3>
                    <Badge variant={announcement.active ? "default" : "secondary"}>{announcement.active ? 'Ativo' : 'Inativo'}</Badge>
                    {!announcement.is_indefinite && announcement.expires_at && (
                      <Badge variant="outline"><Calendar className="mr-1 h-3 w-3" />Expira em {new Date(announcement.expires_at).toLocaleDateString('pt-BR')}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{announcement.content}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-1"><Users className="h-4 w-4" />{getAudienceLabel(announcement.target_audience, announcement.target_course_id)}</div>
                    <div>Criado em {new Date(announcement.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  {announcement.has_action_button && (<div className="mt-2"><Badge variant="outline">Botão: {announcement.action_button_text}</Badge></div>)}
                </div>
                <div className="flex items-center gap-2">
                  {announcement.has_action_button && announcement.action_button_text && announcement.action_button_url && (
                    <Button asChild size="sm"><a href={announcement.action_button_url} target="_blank" rel="noopener noreferrer">{announcement.action_button_text}</a></Button>
                  )}
                  {canManageAnnouncements && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(announcement)}>{announcement.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      {hasPermission('announcements', 'edit') && (
                        <Button variant="ghost" size="sm" onClick={() => openModal(announcement)}><Edit className="h-4 w-4" /></Button>
                      )}
                      {hasPermission('announcements', 'delete') && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(announcement.id)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementsPage;