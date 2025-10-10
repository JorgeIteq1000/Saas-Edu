import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Eye, CheckCircle, XCircle, Clock, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface Document {
  id: string;
  user_id: string;
  enrollment_id: string;
  document_type: string;
  status: string;
  file_path: string;
  rejection_reason?: string | null;
  uploaded_at: string;
  updated_at: string;
  reviewer_id?: string | null;
  student: {
    full_name: string | null;
    email: string | null;
  };
  reviewer: {
    full_name: string | null;
  };
}

const DocumentsPage = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_documents_with_details');
      if (error) throw error;
      const mappedData = data.map(doc => ({
        ...doc,
        student: { full_name: doc.student_full_name, email: doc.student_email },
        reviewer: { full_name: doc.reviewer_full_name },
      }));
      setDocuments(mappedData || []);
    } catch (error: any) {
      toast({ title: "Erro ao Carregar", description: `Não foi possível carregar os documentos. Detalhes: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    if (hasPermission('documents', 'view')) {
      fetchDocuments();
    } else {
      setLoading(false);
    }
  }, [hasPermission, fetchDocuments]);

  // --- LÓGICA DE REVISÃO ATUALIZADA PARA USAR RPC ---
  const handleReview = async () => {
    if (!selectedDocument || !newStatus) return;
    setReviewing(true);
    console.log(`%c[RPC] Chamando a função 'review_document' para o ID: ${selectedDocument.id}`, 'color: #7c3aed; font-weight: bold;');
    
    try {
      const { error } = await supabase.rpc('review_document', {
        doc_id: selectedDocument.id,
        new_status: newStatus,
        reason: newStatus === 'rejected' ? rejectionReason : null,
      });

      if (error) {
        console.error('%c[RPC] Erro retornado pela função:', 'color: red; font-weight: bold;', error);
        throw error;
      }
      
      console.log('%c[RPC] SUCESSO! A revisão foi salva.', 'color: green; font-weight: bold;');
      toast({ title: 'Sucesso!', description: 'Análise salva com sucesso.' });
      
      fetchDocuments();
      setSelectedDocument(null);
        
    } catch (error: any) {
      console.error('log: Erro ao chamar a função RPC review_document:', error);
      toast({ title: 'Erro ao Salvar', description: `A operação falhou. Detalhes: ${error.message}`, variant: 'destructive' });
    } finally {
      setReviewing(false);
    }
  };

  const getStatusProps = (status: string) => {
    switch (status) {
      case 'pending': return { icon: <Clock />, label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' };
      case 'approved': return { icon: <CheckCircle />, label: 'Aprovado', color: 'bg-green-100 text-green-800' };
      case 'rejected': return { icon: <XCircle />, label: 'Recusado', color: 'bg-red-100 text-red-800' };
      default: return { icon: <FileText />, label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const studentName = doc.student?.full_name || '';
    const matchesSearch =
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="flex gap-4"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-48" /></div>
        <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
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
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por aluno ou tipo de documento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Recusado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredDocuments.map(doc => {
          const statusProps = getStatusProps(doc.status);
          return (
            <Card key={doc.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{doc.document_type}</h3>
                    <Badge variant="outline" className={`${statusProps.color} flex items-center gap-1.5`}>{React.cloneElement(statusProps.icon, { className: "h-4 w-4" })} {statusProps.label}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Aluno:</strong> {doc.student?.full_name || 'Não encontrado'}</p>
                    <p><strong>Enviado em:</strong> {new Date(doc.uploaded_at).toLocaleString('pt-BR')}</p>
                    {doc.reviewer?.full_name && <p><strong>Revisado por:</strong> {doc.reviewer.full_name}</p>}
                  </div>
                  {doc.status === 'rejected' && doc.rejection_reason && <div className="mt-3 p-3 bg-muted rounded-lg"><p className="text-sm"><strong>Motivo:</strong> {doc.rejection_reason}</p></div>}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm"><a href={doc.file_path} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" /> Ver</a></Button>
                  {hasPermission('documents', 'edit') && <Button size="sm" onClick={() => { setSelectedDocument(doc); setNewStatus(doc.status); setRejectionReason(doc.rejection_reason || ''); }}><Eye className="mr-2 h-4 w-4" /> Revisar</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Revisar Documento</DialogTitle></DialogHeader>
          {selectedDocument && (
            <div className="space-y-4 py-4">
              <iframe src={selectedDocument.file_path.replace("/view?usp=drivesdk", "/preview")} className="w-full h-96 rounded-md border" title={`Documento ${selectedDocument.document_type}`} />
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Recusado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newStatus === 'rejected' && (
                <div className="space-y-2">
                  <Label>Motivo da Recusa</Label>
                  <Textarea placeholder="Descreva o motivo..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocument(null)}>Cancelar</Button>
            <Button onClick={handleReview} disabled={reviewing}>
              {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;