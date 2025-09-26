import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Shield, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Permission {
  id: string;
  user_id: string;
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const UserPermissionsPage = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const modules = [
    { id: 'users', name: 'Usuários' },
    { id: 'enrollments', name: 'Matrículas' },
    { id: 'sales', name: 'Vendas' },
    { id: 'finance', name: 'Financeiro' },
    { id: 'protocols', name: 'Protocolos' },
    { id: 'certificates', name: 'Certificados' },
    { id: 'documents', name: 'Documentos' },
    { id: 'announcements', name: 'Avisos' },
    { id: 'courses', name: 'Cursos' },
    { id: 'reports', name: 'Relatórios' },
    { id: 'settings', name: 'Configurações' }
  ];

  useEffect(() => {
    if (hasPermission('users', 'view')) {
      fetchUsers();
    }
  }, [hasPermission]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .neq('role', 'admin_geral')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    fetchUserPermissions(user.id);
  };

  const getPermission = (moduleId: string) => {
    return permissions.find(p => p.module_name === moduleId) || {
      id: '',
      user_id: selectedUser?.id || '',
      module_name: moduleId,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false
    };
  };

  const updatePermission = (moduleId: string, action: string, value: boolean) => {
    const permission = getPermission(moduleId);
    const updatedPermission = { ...permission, [action]: value };
    
    setPermissions(prev => {
      const exists = prev.find(p => p.module_name === moduleId);
      if (exists) {
        return prev.map(p => p.module_name === moduleId ? updatedPermission : p);
      } else {
        return [...prev, updatedPermission];
      }
    });
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Primeiro, remover permissões existentes
      const { error: deleteError } = await supabase
        .from('permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      if (deleteError) throw deleteError;

      // Inserir novas permissões apenas para módulos que têm pelo menos uma permissão ativa
      const activePermissions = permissions.filter(p => 
        p.can_view || p.can_create || p.can_edit || p.can_delete
      );

      if (activePermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('permissions')
          .insert(activePermissions.map(p => ({
            user_id: selectedUser.id,
            module_name: p.module_name,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete
          })));

        if (insertError) throw insertError;
      }

      toast({
        title: 'Permissões salvas',
        description: `Permissões de ${selectedUser.full_name} foram atualizadas com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar as permissões.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission('settings', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para gerenciar permissões de usuários.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Permissões</h1>
          <p className="text-muted-foreground">Configure as permissões de acesso dos usuários aos módulos do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários
            </CardTitle>
            <CardDescription>
              Selecione um usuário para gerenciar suas permissões
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUser?.id === user.id 
                      ? 'bg-accent border-primary' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissões
                {selectedUser && (
                  <span className="text-base font-normal text-muted-foreground">
                    - {selectedUser.full_name}
                  </span>
                )}
              </span>
              {selectedUser && (
                <Button onClick={savePermissions} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              )}
            </CardTitle>
            {!selectedUser && (
              <CardDescription>
                Selecione um usuário na lista ao lado para configurar suas permissões
              </CardDescription>
            )}
          </CardHeader>
          
          {selectedUser ? (
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                  <div>Módulo</div>
                  <div className="text-center">Visualizar</div>
                  <div className="text-center">Criar</div>
                  <div className="text-center">Editar</div>
                  <div className="text-center">Excluir</div>
                </div>
                
                {modules.map(module => {
                  const permission = getPermission(module.id);
                  return (
                    <div key={module.id} className="grid grid-cols-5 gap-4 items-center py-2 border-b">
                      <div className="font-medium">{module.name}</div>
                      
                      <div className="flex justify-center">
                        <Checkbox
                          checked={permission.can_view}
                          onCheckedChange={(checked) => 
                            updatePermission(module.id, 'can_view', checked as boolean)
                          }
                        />
                      </div>
                      
                      <div className="flex justify-center">
                        <Checkbox
                          checked={permission.can_create}
                          onCheckedChange={(checked) => 
                            updatePermission(module.id, 'can_create', checked as boolean)
                          }
                        />
                      </div>
                      
                      <div className="flex justify-center">
                        <Checkbox
                          checked={permission.can_edit}
                          onCheckedChange={(checked) => 
                            updatePermission(module.id, 'can_edit', checked as boolean)
                          }
                        />
                      </div>
                      
                      <div className="flex justify-center">
                        <Checkbox
                          checked={permission.can_delete}
                          onCheckedChange={(checked) => 
                            updatePermission(module.id, 'can_delete', checked as boolean)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4" />
                <p>Selecione um usuário para configurar permissões</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default UserPermissionsPage;