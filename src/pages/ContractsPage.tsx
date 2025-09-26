import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import NewContractModal from '@/components/contracts/NewContractModal'; // Importar o novo modal

interface Contract {
  id: string;
  name: string;
  version: string;
  active: boolean;
  created_at: string;
  course_types: { // Corrigido para corresponder à consulta
    name: string;
  };
  certifying_institutions: { // Corrigido para corresponder à consulta
    name: string;
  };
}

const ContractsPage = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false); // Estado para controlar o modal
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          course_types (name),
          certifying_institutions (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data as any[] || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contratos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (hasPermission('contracts', 'view')) {
      fetchContracts();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const filteredContracts = contracts.filter(contract =>
    contract.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.course_types?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.certifying_institutions?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission('contracts', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para visualizar contratos.</p>
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
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Gerencie os contratos dos cursos</p>
        </div>
        {hasPermission('contracts', 'create') && (
          // Botão agora abre o modal
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os contratos por tipo de curso e instituição
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, tipo ou instituição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando contratos...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Contrato</TableHead>
                  <TableHead>Tipo de Curso</TableHead>
                  <TableHead>Instituição Certificadora</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  {hasPermission('contracts', 'edit') && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.name}
                    </TableCell>
                    <TableCell>{contract.course_types?.name}</TableCell>
                    <TableCell>{contract.certifying_institutions?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contract.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={contract.active ? 'default' : 'secondary'}>
                        {contract.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(contract.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {hasPermission('contracts', 'edit') && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Adicionar o componente do modal aqui */}
      <NewContractModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onContractCreated={fetchContracts}
      />
    </div>
  );
};

export default ContractsPage;