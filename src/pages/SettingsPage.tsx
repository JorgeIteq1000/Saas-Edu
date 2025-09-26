import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Shield, Users, Database } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SettingsPage = () => {
  const { hasPermission } = usePermissions();

  if (!hasPermission('settings', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para acessar as configurações.</p>
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
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configure o sistema e permissões de usuários</p>
        </div>
      </div>

      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Gerenciar Permissões de Usuários
                </CardTitle>
                <CardDescription>
                  Configure quais módulos cada usuário pode acessar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Módulos Disponíveis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Usuários</span>
                          <span className="text-muted-foreground">users</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Matrículas</span>
                          <span className="text-muted-foreground">enrollments</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Vendas</span>
                          <span className="text-muted-foreground">sales</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Financeiro</span>
                          <span className="text-muted-foreground">finance</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Protocolos</span>
                          <span className="text-muted-foreground">protocols</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Relatórios</span>
                          <span className="text-muted-foreground">reports</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Certificados</span>
                          <span className="text-muted-foreground">certificates</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Documentos</span>
                          <span className="text-muted-foreground">documents</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Avisos</span>
                          <span className="text-muted-foreground">announcements</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Cursos</span>
                          <span className="text-muted-foreground">courses</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Tipos de Permissão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Visualizar (can_view)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Criar (can_create)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Editar (can_edit)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Excluir (can_delete)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="pt-4">
                  <Button onClick={() => window.location.href = '/user-permissions'}>
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Permissões de Usuários
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Configurações gerais da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Configurações em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  As configurações do sistema serão implementadas em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>
                Gerenciar políticas de segurança e acesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Segurança em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  As configurações de segurança serão implementadas em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;