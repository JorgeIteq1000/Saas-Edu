import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const institutionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().default(true),
});

interface CertifyingInstitution {
  id: string;
  name: string;
  cnpj?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  active: boolean;
  created_at: string;
}

const CertifyingInstitutionsManagement = () => {
  const [institutions, setInstitutions] = useState<CertifyingInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<CertifyingInstitution | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof institutionSchema>>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      active: true,
    },
  });

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('certifying_institutions')
        .select('*')
        .order('name');

      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error('Erro ao buscar instituições:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar instituições certificadoras",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof institutionSchema>) => {
    try {
      if (editingInstitution) {
        const { error } = await supabase
          .from('certifying_institutions')
          .update({
            name: values.name,
            cnpj: values.cnpj,
            contact_email: values.contact_email,
            contact_phone: values.contact_phone,
            address: values.address,
            active: values.active
          })
          .eq('id', editingInstitution.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('certifying_institutions')
          .insert([{
            name: values.name,
            cnpj: values.cnpj,
            contact_email: values.contact_email,
            contact_phone: values.contact_phone,
            address: values.address,
            active: values.active
          }]);
        if (error) throw error;
      }

      form.reset();
      setShowModal(false);
      setEditingInstitution(null);
      fetchInstitutions();
      
      toast({
        title: "Sucesso",
        description: editingInstitution ? "Instituição atualizada com sucesso" : "Instituição criada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar instituição:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar instituição certificadora",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (institution: CertifyingInstitution) => {
    setEditingInstitution(institution);
    form.reset({
      name: institution.name,
      cnpj: institution.cnpj || '',
      contact_email: institution.contact_email || '',
      contact_phone: institution.contact_phone || '',
      address: institution.address || '',
      active: institution.active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instituição?')) return;

    try {
      const { error } = await supabase
        .from('certifying_institutions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchInstitutions();
      toast({
        title: "Sucesso",
        description: "Instituição excluída com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir instituição:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir instituição certificadora",
        variant: "destructive",
      });
    }
  };

  const handleNewInstitution = () => {
    setEditingInstitution(null);
    form.reset({
      name: '',
      cnpj: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      active: true,
    });
    setShowModal(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Faculdades Certificadoras</CardTitle>
              <CardDescription>
                Gerencie as instituições que certificam os cursos
              </CardDescription>
            </div>
            <Button onClick={handleNewInstitution}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Instituição
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando instituições...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email de Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.map((institution) => (
                  <TableRow key={institution.id}>
                    <TableCell className="font-medium">{institution.name}</TableCell>
                    <TableCell>{institution.cnpj || '-'}</TableCell>
                    <TableCell>{institution.contact_email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={institution.active ? 'default' : 'secondary'}>
                        {institution.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(institution.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(institution)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(institution.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingInstitution ? 'Editar Instituição Certificadora' : 'Nova Instituição Certificadora'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Instituição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Universidade Federal Exemplo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 0000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de Contato</FormLabel>
                    <FormControl>
                      <Input placeholder="contato@instituicao.edu.br" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço completo da instituição..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Ativa</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingInstitution ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CertifyingInstitutionsManagement;