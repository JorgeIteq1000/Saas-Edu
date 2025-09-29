import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Gift, Users, Edit, Save } from 'lucide-react';

// log: Interface para as indicações, incluindo dados do aluno, curso e representante
interface Referral {
  id: string;
  created_at: string;
  referred_name: string;
  referred_phone: string;
  status: string;
  admin_notes: string | null;
  student: {
    full_name: string;
  };
  course: {
    name: string;
  };
  representative: {
    id: string;
    full_name: string;
  } | null;
}

const ReferralsPage = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [representatives, setRepresentatives] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id, created_at, referred_name, referred_phone, status, admin_notes,
          student:profiles!referrals_referred_by_student_id_fkey(full_name),
          course:courses!referrals_interested_course_id_fkey(name),
          representative:profiles!referrals_assigned_to_rep_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data as any[] || []);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível carregar as indicações.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRepresentatives = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['vendedor', 'gestor']); // Vendedores e gestores podem receber indicações

      if (error) throw error;
      setRepresentatives(data || []);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os representantes.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (hasPermission('sales', 'view')) { // Usando a permissão de vendas por enquanto
      fetchReferrals();
      fetchRepresentatives();
    }
  }, [hasPermission]);

  const handleUpdate = async (id: string, field: 'status' | 'assigned_to_rep_id', value: string) => {
    try {
      const updateValue = value === 'null' ? null : value;
      const { error } = await supabase.from('referrals').update({ [field]: updateValue }).eq('id', id);
      if (error) throw error;
      
      // Atualiza o estado local para refletir a mudança imediatamente
      await fetchReferrals();
      
      toast({ title: 'Sucesso!', description: 'Indicação atualizada.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  if (!hasPermission('sales', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Gift className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
            <p className="text-muted-foreground">Você não tem permissão para visualizar indicações.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Indicações</h1>
          <p className="text-muted-foreground">Gerencie as indicações feitas pelos alunos.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Indicações</CardTitle>
          <CardDescription>Todas as indicações recebidas, da mais recente para a mais antiga.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicado Por</TableHead>
                  <TableHead>Amigo Indicado</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Curso de Interesse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atribuído a</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map(ref => (
                  <TableRow key={ref.id}>
                    <TableCell>{ref.student?.full_name}</TableCell>
                    <TableCell>{ref.referred_name}</TableCell>
                    <TableCell>{ref.referred_phone}</TableCell>
                    <TableCell>{ref.course?.name}</TableCell>
                    <TableCell>
                      <Select value={ref.status} onValueChange={(value) => handleUpdate(ref.id, 'status', value)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nova">Nova</SelectItem>
                          <SelectItem value="contactado">Contactado</SelectItem>
                          <SelectItem value="matriculado">Matriculado</SelectItem>
                          <SelectItem value="recompensado">Recompensado</SelectItem>
                          <SelectItem value="descartado">Descartado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={ref.representative?.id || 'null'} onValueChange={(value) => handleUpdate(ref.id, 'assigned_to_rep_id', value)}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Atribuir a..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Ninguém</SelectItem>
                          {representatives.map(rep => (
                            <SelectItem key={rep.id} value={rep.id}>{rep.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralsPage;