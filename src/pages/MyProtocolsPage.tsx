import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Plus, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Protocol {
  id: string;
  protocol_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  created_at: string;
  updated_at: string;
}

const MyProtocolsPage = () => {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMyProtocols();
  }, []);

  const fetchMyProtocols = async () => {
    try {
      // Primeiro buscar o perfil do usuário atual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      // Buscar protocolos do usuário
      const { data, error } = await supabase
        .from('protocols')
        .select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProtocols(data || []);
    } catch (error) {
      console.error('Erro ao buscar protocolos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus protocolos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statuses = {
      aberto: 'Aberto',
      em_andamento: 'Em Andamento',
      aguardando_resposta: 'Aguardando Resposta',
      resolvido: 'Resolvido',
      fechado: 'Fechado'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      aberto: 'secondary',
      em_andamento: 'default',
      aguardando_resposta: 'secondary',
      resolvido: 'default',
      fechado: 'destructive'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      aberto: AlertCircle,
      em_andamento: Clock,
      aguardando_resposta: Clock,
      resolvido: CheckCircle,
      fechado: XCircle
    };
    const Icon = icons[status as keyof typeof icons] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      baixa: 'default',
      normal: 'secondary',
      alta: 'destructive',
      urgente: 'destructive'
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Protocolos</h1>
          <p className="text-muted-foreground">Acompanhe suas solicitações e comunicações</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Protocolo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando seus protocolos...</p>
        </div>
      ) : protocols.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum protocolo encontrado</h3>
              <p className="text-muted-foreground">Você ainda não possui protocolos abertos.</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Protocolo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Cards de resumo */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{protocols.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                    <p className="text-2xl font-bold">
                      {protocols.filter(p => p.status === 'em_andamento').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resolvidos</p>
                    <p className="text-2xl font-bold">
                      {protocols.filter(p => p.status === 'resolvido').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Urgentes</p>
                    <p className="text-2xl font-bold">
                      {protocols.filter(p => p.priority === 'urgente').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de protocolos */}
          <Card>
            <CardHeader>
              <CardTitle>Seus Protocolos</CardTitle>
              <CardDescription>
                Lista de todos os seus protocolos e solicitações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Protocolo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell className="font-medium">
                        {protocol.protocol_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{protocol.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {protocol.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {protocol.department}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(protocol.status)}
                          <Badge variant={getStatusColor(protocol.status) as any}>
                            {getStatusLabel(protocol.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(protocol.priority) as any}>
                          {protocol.priority.charAt(0).toUpperCase() + protocol.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(protocol.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyProtocolsPage;