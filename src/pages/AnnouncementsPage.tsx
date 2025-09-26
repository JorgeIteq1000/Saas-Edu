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

interface Course {
  id: string;
  name: string;
  course_type: string;
}

const AnnouncementsPage = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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
      fetchCourses();
    }
  }, [hasPermission]);

  const fetchAnnouncements = async () => {
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
      console.error('Erro ao buscar avisos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, course_type')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
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

  const handleEdit = (announcement: Announcement) => {
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
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        target_audience: targetAudience,
        target_course_id: targetAudience === 'curso_especifico' ? targetCourseId : null,
        has_action_button: hasActionButton,
        action_button_text: hasActionButton ? actionButtonText.trim() : null,
        action_button_url: hasActionButton ? actionButtonUrl.trim() : null,
        is_indefinite: isIndefinite,
        expires_at: isIndefinite ? null : `${expiresAt}T23:59:59`,
        active,
        created_by: profile.id
      };

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
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar aviso:', error);
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
      console.error('Erro ao excluir aviso:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir o aviso.',
        variant: 'destructive'
      });
    }
  };

  const toggleActive = async (announcement: Announcement) => {
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
      console.error('Erro ao alterar status:', error);
    }
  };

  const getAudienceLabel = (audience: string, courseId?: string) => {
    switch (audience) {
      case 'geral':
        return 'Todos os alunos';
      case 'graduacao':
        return 'Graduação';
      case 'pos_graduacao':
        return 'Pós-graduação';
      case 'especializacao':
        return 'Especialização';
      case 'extensao':
        return 'Extensão';
      case 'curso_especifico':
        const course = courses.find(c => c.id === courseId);
        return course ? `Curso: ${course.name}` : 'Curso específico';
      default:
        return audience;
    }
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
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
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

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Digite o título do aviso"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image">URL da Imagem</Label>
                    <Input
                      id="image"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Digite o conteúdo do aviso"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Público-alvo</Label>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geral">Todos os alunos</SelectItem>
                        <SelectItem value="graduacao">Graduação</SelectItem>
                        <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                        <SelectItem value="especializacao">Especialização</SelectItem>
                        <SelectItem value="extensao">Extensão</SelectItem>
                        <SelectItem value="curso_especifico">Curso específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {targetAudience === 'curso_especifico' && (
                    <div className="space-y-2">
                      <Label>Curso</Label>
                      <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o curso" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="action-button"
                    checked={hasActionButton}
                    onCheckedChange={(checked) => setHasActionButton(checked === true)}
                  />
                  <Label htmlFor="action-button">Adicionar botão de ação</Label>
                </div>

                {hasActionButton && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div className="space-y-2">
                      <Label>Texto do Botão</Label>
                      <Input
                        value={actionButtonText}
                        onChange={(e) => setActionButtonText(e.target.value)}
                        placeholder="Ex: Saiba mais"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL do Botão</Label>
                      <Input
                        value={actionButtonUrl}
                        onChange={(e) => setActionButtonUrl(e.target.value)}
                        placeholder="https://exemplo.com"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="indefinite"
                      checked={isIndefinite}
                      onCheckedChange={(checked) => setIsIndefinite(checked === true)}
                    />
                    <Label htmlFor="indefinite">Prazo indefinido</Label>
                  </div>

                  {!isIndefinite && (
                    <div className="ml-6">
                      <Label>Data de expiração</Label>
                      <Input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={active}
                    onCheckedChange={(checked) => setActive(checked === true)}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {!canManageAnnouncements && announcements.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum aviso disponível</h3>
                <p className="text-muted-foreground">Não há avisos para exibir no momento.</p>
              </div>
            </CardContent>
          </Card>
        )}
        {announcements.map(announcement => (
          <Card key={announcement.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    <Badge variant={announcement.active ? "default" : "secondary"}>
                      {announcement.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {!announcement.is_indefinite && announcement.expires_at && (
                      <Badge variant="outline">
                        <Calendar className="mr-1 h-3 w-3" />
                        Expira em {new Date(announcement.expires_at).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground">{announcement.content}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {getAudienceLabel(announcement.target_audience, announcement.target_course_id)}
                    </div>
                    <div>
                      Criado em {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  {announcement.has_action_button && (
                    <div className="mt-2">
                      <Badge variant="outline">
                        Botão: {announcement.action_button_text}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {announcement.has_action_button && announcement.action_button_text && announcement.action_button_url && (
                      <Button asChild size="sm">
                        <a href={announcement.action_button_url} target="_blank" rel="noopener noreferrer">
                          {announcement.action_button_text}
                        </a>
                      </Button>
                    )}
                  </div>

                  {canManageAnnouncements && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(announcement)}
                      >
                        {announcement.active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                  
                  {hasPermission('announcements', 'edit') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Aviso</DialogTitle>
                          <DialogDescription>
                            Edite as informações do aviso
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-title">Título *</Label>
                              <Input
                                id="edit-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="edit-image">URL da Imagem</Label>
                              <Input
                                id="edit-image"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-content">Conteúdo *</Label>
                            <Textarea
                              id="edit-content"
                              value={content}
                              onChange={(e) => setContent(e.target.value)}
                              rows={4}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Público-alvo</Label>
                              <Select value={targetAudience} onValueChange={setTargetAudience}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="geral">Todos os alunos</SelectItem>
                                  <SelectItem value="graduacao">Graduação</SelectItem>
                                  <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                                  <SelectItem value="especializacao">Especialização</SelectItem>
                                  <SelectItem value="extensao">Extensão</SelectItem>
                                  <SelectItem value="curso_especifico">Curso específico</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {targetAudience === 'curso_especifico' && (
                              <div className="space-y-2">
                                <Label>Curso</Label>
                                <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o curso" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {courses.map(course => (
                                      <SelectItem key={course.id} value={course.id}>
                                        {course.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="edit-action-button"
                              checked={hasActionButton}
                              onCheckedChange={(checked) => setHasActionButton(checked === true)}
                            />
                            <Label htmlFor="edit-action-button">Adicionar botão de ação</Label>
                          </div>

                          {hasActionButton && (
                            <div className="grid grid-cols-2 gap-4 ml-6">
                              <div className="space-y-2">
                                <Label>Texto do Botão</Label>
                                <Input
                                  value={actionButtonText}
                                  onChange={(e) => setActionButtonText(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>URL do Botão</Label>
                                <Input
                                  value={actionButtonUrl}
                                  onChange={(e) => setActionButtonUrl(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="edit-indefinite"
                                checked={isIndefinite}
                                onCheckedChange={(checked) => setIsIndefinite(checked === true)}
                              />
                              <Label htmlFor="edit-indefinite">Prazo indefinido</Label>
                            </div>

                            {!isIndefinite && (
                              <div className="ml-6">
                                <Label>Data de expiração</Label>
                                <Input
                                  type="date"
                                  value={expiresAt}
                                  onChange={(e) => setExpiresAt(e.target.value)}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="edit-active"
                              checked={active}
                              onCheckedChange={(checked) => setActive(checked === true)}
                            />
                            <Label htmlFor="edit-active">Ativo</Label>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={resetForm}>
                            Cancelar
                          </Button>
                          <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Salvando...' : 'Atualizar'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                      {hasPermission('announcements', 'delete') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {announcements.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum aviso criado</h3>
              <p className="text-muted-foreground">Crie seu primeiro aviso para os alunos.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;