import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Eye, CheckCircle, XCircle, AlertCircle, Clock, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Document {
  id: string;
  student_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  status: string;
  reviewer_id?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  created_at: string;
  student: {
    full_name: string;
    email: string;
  };
  reviewer?: {
    full_name: string;
  };
}

const DocumentsPage = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (hasPermission('documents', 'view')) {
      fetchDocuments();
    }
  }, [hasPermission]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          student:profiles!documents_student_id_fkey(full_name, email),
          reviewer:profiles!documents_reviewer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedDocument || !newStatus) return;

    setReviewing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('documents')
        .update({
          status: newStatus,
          reviewer_id: profile.id,
          reviewer_notes: reviewNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedDocument.id);

      if (error) throw error;

      toast({
        title: 'Documento revisado',
        description: `Status alterado para: ${getStatusLabel(newStatus)}`
      });

      await fetchDocuments();
      setSelectedDocument(null);
      setReviewNotes('');
      setNewStatus('');
    } catch (error) {
      console.error('Erro ao revisar documento:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao revisar o documento.',
        variant: 'destructive'
      });
    } finally {
      setReviewing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'em_analise':
        return <Clock className="h-4 w-4" />;
      case 'aprovado':
        return <CheckCircle className="h-4 w-4" />;
      case 'recusado':
        return <XCircle className="h-4 w-4" />;
      case 'divergente':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_analise':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'aprovado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'recusado':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'divergente':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'em_analise':
        return 'Em Análise';
      case 'aprovado':
        return 'Aprovado';
      case 'recusado':
        return 'Recusado';
      case 'divergente':
        return 'Divergente';
      default:
        return status;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (!hasPermission('documents', 'view')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para acessar a análise de documentos.</p>
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
          <h1 className="text-3xl font-bold">Análise de Documentos</h1>
          <p className="text-muted-foreground">Revise e aprove documentos enviados pelos alunos</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno, tipo ou nome do documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="em_analise">Em Análise</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
            <SelectItem value="divergente">Divergente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredDocuments.map(document => (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{document.document_name}</h3>
                    <Badge variant="outline" className={getStatusColor(document.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(document.status)}
                        {getStatusLabel(document.status)}
                      </div>
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Aluno:</strong> {document.student.full_name} ({document.student.email})</p>
                    <p><strong>Tipo:</strong> {document.document_type}</p>
                    <p><strong>Enviado em:</strong> {new Date(document.created_at).toLocaleDateString('pt-BR')}</p>
                    {document.reviewer && (
                      <p><strong>Revisado por:</strong> {document.reviewer.full_name}</p>
                    )}
                  </div>
                  {document.reviewer_notes && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm"><strong>Observações:</strong> {document.reviewer_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(document.document_url, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </Button>
                  
                  {hasPermission('documents', 'edit') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(document);
                            setNewStatus(document.status);
                            setReviewNotes(document.reviewer_notes || '');
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Revisar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Revisar Documento</DialogTitle>
                          <DialogDescription>
                            Analise o documento e defina o status e observações
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedDocument && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Aluno:</strong> {selectedDocument.student.full_name}
                              </div>
                              <div>
                                <strong>Tipo:</strong> {selectedDocument.document_type}
                              </div>
                              <div>
                                <strong>Nome:</strong> {selectedDocument.document_name}
                              </div>
                              <div>
                                <strong>Enviado em:</strong> {new Date(selectedDocument.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Status</label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="em_analise">Em Análise</SelectItem>
                                  <SelectItem value="aprovado">Aprovado</SelectItem>
                                  <SelectItem value="recusado">Recusado</SelectItem>
                                  <SelectItem value="divergente">Divergente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Observações</label>
                              <Textarea
                                placeholder="Digite suas observações sobre o documento..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                rows={4}
                              />
                            </div>
                          </div>
                        )}

                        <DialogFooter>
                          <Button
                            onClick={handleReview}
                            disabled={reviewing || !newStatus}
                          >
                            {reviewing ? 'Salvando...' : 'Salvar Revisão'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDocuments.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum documento encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'todos' 
                  ? 'Tente ajustar os filtros de busca.' 
                  : 'Não há documentos para revisar no momento.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;