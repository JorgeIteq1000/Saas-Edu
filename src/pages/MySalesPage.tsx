// src/pages/MySalesPage.tsx

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Tipagem atualizada para refletir a busca na tabela 'enrollments' e incluir IDs de combo/pacote
interface ClosedSale {
  id: string;
  status: string; // enrollment_status (ativa, pendente, etc.)
  created_at: string;
  combo_id: string | null; // Adicionado
  package_id: string | null; // Adicionado
  value: number | null; // Mantido
  student: {
    full_name: string;
    document_number: string | null;
  } | null;
  course: {
    name: string;
  } | null;
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
        
        lead: 'secondary', 
        proposta: 'outline',
        fechada: 'default',
        perdida: 'destructive'
    };
    return colors[status.toLowerCase()] || 'default';
};

// Lógica para contar matrículas únicas (combos contam como 1)
const getUniqueEnrollments = (allEnrollments: ClosedSale[]): ClosedSale[] => {
    const uniqueRevenueEvents = new Map<string, ClosedSale>();

    for (const enrollment of allEnrollments) {
        // O identificador único de receita é o package_id (para combos) ou o enrollment.id (para cursos individuais)
        // package_id é usado quando combo_id está presente, caso contrário, usa o id da matrícula.
        const uniqueId = enrollment.combo_id && enrollment.package_id ? enrollment.package_id : enrollment.id;

        // Se o ID de evento único ainda não foi visto, armazena essa linha.
        if (!uniqueRevenueEvents.has(uniqueId)) {
            uniqueRevenueEvents.set(uniqueId, enrollment);
        }
    }
    
    // Retorna a lista de eventos de receita únicos
    return Array.from(uniqueRevenueEvents.values());
};


const MySalesPage = () => {
    const [sales, setSales] = useState<ClosedSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { hasPermission, loading: permissionsLoading } = usePermissions();
    const { toast } = useToast();

    console.log("log: MySalesPage component renderizando..."); 

    const fetchSales = useCallback(async () => {
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
                .select('id, role, team_id')
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
                // 💥 SELECT ATUALIZADO para incluir combo_id e package_id
                .select(`
                    id,
                    status,
                    created_at,
                    combo_id, 
                    package_id,
                    student:profiles!enrollments_student_id_fkey(full_name, document_number),
                    course:courses(name),
                    seller:profiles!enrollments_seller_id_fkey(full_name)
                `)
                .order('created_at', { ascending: false });

            // 2. Aplicar filtro com base na função do usuário
            if (profile.role === 'vendedor') {
                console.log('log: Aplicando filtro: Vendedor (apenas vendas próprias).');
                query = query.eq('seller_id', profile.id);

            } else if (profile.role === 'gestor') {
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
                 console.log('log: Aplicando filtro: Admin Geral (todas as vendas).');
            } else {
                query = query.eq('seller_id', 'invalid_id_to_return_no_sales');
                console.log(`log: Role ${profile.role}. Aplicando filtro: Nenhuma venda.`);
            }

            // 3. Executar a consulta
            const { data, error } = await query;
            
            if (error) throw error;
            
            const mappedSales: ClosedSale[] = (data as any[]).map(item => ({
                ...item,
                value: null, 
            }));

            console.log(`log: 🎉 Matrículas brutas carregadas (incluindo duplicatas de combo): ${mappedSales.length}`);
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
    }, [hasPermission, toast]);

    useEffect(() => {
        if (!permissionsLoading) {
            fetchSales();
        }
    }, [permissionsLoading, fetchSales]); 

    // ----------------------------------------------------
    // LÓGICA DE CONTABILIZAÇÃO E FILTRAGEM
    // ----------------------------------------------------

    // 1. Matrículas únicas para contagem (Combos contam como 1)
    const uniqueSales = getUniqueEnrollments(sales);
    
    // 2. Filtro de pesquisa aplicado às matrículas únicas
    const filteredSales = uniqueSales.filter(sale => {
        const studentName = sale.student?.full_name?.toLowerCase() || '';
        const studentCpf = sale.student?.document_number?.toLowerCase() || '';
        const courseName = sale.course?.name?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();

        return studentName.includes(term) || studentCpf.includes(term) || courseName.includes(term);
    });

    // 3. Cálculos para os Cards
    const totalEnrollmentsCount = uniqueSales.length;
    const activeEnrollmentsCount = uniqueSales.filter(s => s.status === 'ativa').length;
    const totalValue = 0; // Mantido em 0, pois o valor real não está na tabela enrollments

    // ... (o resto do componente) ...

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
                        <div className="text-2xl font-bold">{totalEnrollmentsCount}</div>
                        <p className="text-xs text-muted-foreground">Combos contam como uma única matrícula.</p>
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
                                        <TableHead>Vendedor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Tipo</TableHead> {/* Novo campo para indicar se é Combo ou Individual */}
                                        <TableHead>Data Matrícula</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Agora iteramos sobre filteredSales (matrículas únicas) */}
                                    {filteredSales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">
                                                {sale.student?.full_name || 'Nome Pendente'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {sale.student?.document_number || 'CPF Pendente'}
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">
                                                    {/* Mostra o nome do curso (ou nome do combo se for a primeira linha do pacote) */}
                                                    {sale.combo_id ? `Combo (Pacote: ${sale.package_id?.substring(0, 8)}...)` : sale.course?.name || 'Curso Não Definido'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground"> 
                                                {sale.seller?.full_name || 'Vendedor Desconhecido'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusColor(sale.status)}>
                                                    {getStatusLabel(sale.status)}
                                                </Badge>
                                            </TableCell>
                                             <TableCell>
                                                <Badge variant="outline">
                                                    {sale.combo_id ? 'Combo' : 'Individual'}
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
