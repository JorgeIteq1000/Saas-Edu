import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import UserModal from '@/components/users/UserModal'; // Importar o novo modal

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  phone?: string;
  created_at: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (hasPermission('users', 'view')) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);


  const handleNewUser = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const getRoleLabel = (role: string) => {
    const roles = {
      admin_geral: 'Admin Geral',
      gestor: 'Gestor',
      vendedor: 'Vendedor',
      colaborador: 'Colaborador',
      aluno: 'Aluno'
    };
    return roles[role as keyof typeof roles] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin_geral: 'destructive',
      gestor: 'default',
      vendedor: 'secondary',
      colaborador: 'outline',
      aluno: 'default'
    };
    return colors[role as keyof typeof colors] || 'default';
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission('users', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para visualizar usuários.</p>
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
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        {hasPermission('users', 'create') && (
          <Button onClick={handleNewUser}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os usuários cadastrados no sistema
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando usuários...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  {hasPermission('users', 'edit') && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleColor(user.role) as any}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'secondary'}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {hasPermission('users', 'edit') && (
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <UserModal 
        open={showModal}
        onOpenChange={setShowModal}
        onUserSaved={fetchUsers}
        user={selectedUser}
      />
    </div>
  );
};

export default UsersPage;