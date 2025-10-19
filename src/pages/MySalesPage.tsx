// src/pages/MySalesPage.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Tipagem atualizada para refletir a busca na tabela 'enrollments'
interface ClosedSale {
  id: string;
  status: string; // Agora é enrollment_status (ativa, pendente, etc.)
  created_at: string;
  value: number | null; // Mantido para compatibilidade, será sempre null nesta query
  student: {
    full_name: string;
    document_number: string | null;
  } | null;
  course: {
    name: string;
  } | null;
  // Adiciona a informação do vendedor, necessária para a depuração, mas não usada na tabela
  seller: { 
    full_name: string 
  } | null; 
}

// Função para padronizar o label de status (Adaptado para Enrollment Status)
const getStatusLabel = (status: string) => {
    const statuses: { [key: string]: string } = {
        ativa: 'Ativa',
        pendente: 'Pendente',
        trancada: 'Trancada',
        cancelada: 'Cancelada',
        concluida: 'Concluída',
        // Adicionando status de pipeline para visualização completa
        lead: 'Lead', 
        proposta: 'Proposta',
        fechada: 'Fechada',
        perdida: 'Perdida'
    };
    return statuses[status.toLowerCase()] || status;
};

// Função para padronizar a cor do badge de status
const getStatusColor = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    const colors: { [key: string]: "secondary" | "default" | "destructive" | "outline" } = {
        pendente: 'secondary',
        ativa: 'default',
        concluida: 'default',
        trancada: 'outline',
        cancelada: 'destructive',
        
        // Pipeline statuses for sales that are not enrollments yet (if we merge logic later)
        lead: 'secondary', 
        proposta: 'outline',
        fechada: 'default',
        perdida: 'destructive'
    };
    // Prioriza o status de matrícula, mas garante um fallback
    return colors[status.toLowerCase()] || 'default';
};


const MySalesPage = () => {
    const [sales, setSales] = useState<ClosedSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { hasPermission, loading: permissionsLoading } = usePermissions();
    const { toast } = useToast();

    console.log("log: MySalesPage component renderizando..."); 

    const fetchSales = async () => {
        console.log('log: Iniciando busca de Minhas Vendas...');
        if (!hasPermission('sales', 'view')) {
            console.log('log: Usuário sem permissão para visualizar vendas.');
            setLoading(false);
            return;
        }

        try {
            // 1. Obter o perfil do usuário logado para filtrar as vendas
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('log: Usuário não autenticado, interrompendo a busca.');
                throw new Error("Usuário não autenticado.");
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, role, team_id') // Obtemos o ID, role e team_id (necessário para gestores)
                .eq('user_id', user.id)
                .single();

            if (profileError || !profile) {
                console.log('log: Erro ao buscar perfil:', profileError?.message);
                throw new Error(profileError?.message || "Perfil do usuário não encontrado.");
            }
            
            console.log(`log: Perfil encontrado. Role: ${profile.role}, Profile ID: ${profile.id}`);

            // Monta a query base. AGORA USAMOS A TABELA 'enrollments'
            let query = supabase
                .from('enrollments')
                // 💥 AJUSTE NA QUERY: removemos o alias complexo 'seller:profiles!...'
                // e usamos a sintaxe padrão. A query de enrollment_fee foi omitida
                // pois não há coluna para ela aqui.
                .select(`
                    id,
                    status,
                    created_at,
                    student:profiles!enrollments_student_id_fkey(full_name, document_number),
                    course:courses(name),
                    seller:profiles!enrollments_seller_id_fkey(full_name)
                `)
                .order('created_at', { ascending: false });

            // 2. Aplicar filtro com base na função do usuário
            if (profile.role === 'vendedor') {
                // Vendedor: Vê apenas as suas vendas (seller_id = seu profile.id)
                console.log('log: Aplicando filtro: Vendedor (apenas vendas próprias).');
                query = query.eq('seller_id', profile.id);

            } else if (profile.role === 'gestor') {
                // Gestor: Vê as vendas de todos do seu time
                if (profile.team_id) {
                    console.log(`log: Aplicando filtro: Gestor (vendas do time: ${profile.team_id}).`);
                    const { data: teamProfiles, error: teamError } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('team_id', profile.team_id);
                    
                    if (teamError) throw teamError;

                    const sellerIds = teamProfiles.map(p => p.id);
                    
                    if (sellerIds.length > 0) {
                        query = query.in('seller_id', sellerIds);
                    } else {
                        query = query.eq('seller_id', 'invalid_id_to_return_no_sales');
                        console.log('log: Nenhum vendedor encontrado no time.');
                    }
                } else {
                    console.log('log: Gestor sem team_id. Aplicando filtro: vendas próprias.');
                    query = query.eq('seller_id', profile.id);
                }
            } else if (profile.role === 'admin_geral') {
                 // Admin Geral: Vê todas as vendas (sem filtro de seller_id)
                 console.log('log: Aplicando filtro: Admin Geral (todas as vendas).');
                 // Não aplica filtro para admin_geral
            } else {
                // Outras roles não devem ver vendas
                query = query.eq('seller_id', 'invalid_id_to_return_no_sales');
                console.log(`log: Role ${profile.role}. Aplicando filtro: Nenhuma venda.`);
            }

            // 3. Executar a consulta
            const { data, error } = await query;
            
            if (error) throw error;
            
            // Mapeamos os resultados para a interface de ClosedSale, adicionando 'value: null'
            // O mapeamento é necessário para compatibilizar a tipagem ClosedSale com os dados de enrollment
            const mappedSales: ClosedSale[] = (data as any[]).map(item => ({
                ...item,
                value: null, // Mantido como null, pois não é a tabela 'sales'
            }));

            console.log(`log: 🎉 Vendas (Matrículas) carregadas: ${mappedSales.length}`);
            setSales(mappedSales);

        } catch (error) {
            console.error('log: 💥 Erro ao buscar vendas:', error);
            toast({
                title: "Erro",
                description: "Erro ao carregar vendas. Verifique o console para mais detalhes.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!permissionsLoading) {
            fetchSales();
        }
    }, [permissionsLoading]); 

    // Lógica de filtro local por termo de busca
    const filteredSales = sales.filter(sale => {
        const studentName = sale.student?.full_name?.toLowerCase() || '';
        const studentCpf = sale.student?.document_number?.toLowerCase() || '';
        const courseName = sale.course?.name?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();

        return studentName.includes(term) || studentCpf.includes(term) || courseName.includes(term);
    });

    // Como estamos buscando em enrollments, o 'value' será sempre 0,
    const totalValue = 0; 

    if (permissionsLoading) {
        return <div className="p-6 text-center">Carregando permissões...</div>;
    }

    if (!hasPermission('sales', 'view')) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
                            <p className="text-muted-foreground">Você não tem permissão para visualizar vendas.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Contagem de status baseada na coluna 'status' da tabela enrollments (ativa, pendente, etc.)
    const activeEnrollmentsCount = sales.filter(s => s.status === 'ativa').length;


    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Minhas Vendas</h1>
            <p className="text-muted-foreground">Visualize e gerencie as matrículas (vendas fechadas) sob sua responsabilidade.</p>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Matrículas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sales.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Matrículas Ativas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {activeEnrollmentsCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total Estimado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Se necessário, este campo pode ser removido ou atualizado para calcular o valor real */}
                        <div className="text-2xl font-bold">R$ 0,00</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">100%</div>
                        <p className="text-xs text-muted-foreground">Considerando apenas matrículas fechadas</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalhes das Matrículas</CardTitle>
                    <CardDescription>
                        Lista de todas as matrículas realizadas.
                    </CardDescription>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, CPF ou curso..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <p>Carregando vendas...</p>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                             Nenhuma matrícula encontrada para o seu perfil ou time. 
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Curso</TableHead>
                                        <TableHead>Vendedor</TableHead> {/* Adicionamos o vendedor aqui */}
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data Matrícula</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">
                                                {sale.student?.full_name || 'Nome Pendente'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {sale.student?.document_number || 'CPF Pendente'}
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">{sale.course?.name || 'Curso Não Definido'}</p>
                                            </TableCell>
                                            {/* Exibe o nome do vendedor/aqui, garantindo que seja um campo disponível no .select() */}
                                            <TableCell className="text-sm text-muted-foreground"> 
                                                {sale.seller?.full_name || 'Vendedor Desconhecido'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusColor(sale.status)}>
                                                    {getStatusLabel(sale.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell>
                                                <button className="text-blue-500 hover:text-blue-700 text-sm font-medium" disabled>
                                                    Detalhes
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MySalesPage;
