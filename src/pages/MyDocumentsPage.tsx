import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Loader2, UploadCloud, AlertCircle, FileCheck, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// TIPOS E INTERFACES
type DocumentStatus = 'not_sent' | 'pending' | 'approved' | 'rejected'

interface DocumentDetail {
  name: string
  status: DocumentStatus
  filePath: string | null
  rejectionReason: string | null
}

// COMPONENTE DO MODAL DE DETALHES
const DocumentDetailModal = ({
  document,
  isOpen,
  onClose,
}: {
  document: DocumentDetail | null
  isOpen: boolean
  onClose: () => void
}) => {
  if (!document) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{document.name}</DialogTitle>
          <DialogDescription>
            Detalhes e situação do seu documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {document.status === 'rejected' && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <h4 className="font-semibold text-destructive">
                    Documento Recusado
                  </h4>
                  <p className="text-sm text-destructive/80 mt-1">
                    {document.rejectionReason ||
                      'O documento foi recusado. Por favor, envie um novo arquivo.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {document.status === 'approved' && (
             <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700">
                <div className="flex items-start gap-3">
                    <FileCheck className="h-5 w-5" />
                    <p className="text-sm font-medium">Seu documento foi aprovado!</p>
                </div>
            </div>
          )}

          {document.filePath ? (
            <Button asChild variant="outline" className="w-full">
              <a href={document.filePath} target="_blank" rel="noopener noreferrer">
                <LinkIcon className="mr-2 h-4 w-4" />
                Visualizar Documento Enviado
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Você ainda não enviou este documento.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// COMPONENTE DO CARD DE DOCUMENTO (ATUALIZADO)
const DocumentCard = ({ 
    document,
    isUploading,
    onUploadClick,
    onCardClick 
}: { 
    document: DocumentDetail,
    isUploading: boolean,
    onUploadClick: (documentType: string) => void,
    onCardClick: (document: DocumentDetail) => void
}) => {
  const { name: documentName, status } = document;

  const getStatusInfo = (): { text: string; variant: 'default' | 'destructive' | 'secondary' | 'outline', color: string } => {
    switch (status) {
      case 'pending':
        return { text: 'Em Análise', variant: 'secondary', color: 'text-yellow-600' }
      case 'approved':
        return { text: 'Aprovado', variant: 'default', color: 'text-green-600' }
      case 'rejected':
        return { text: 'Recusado', variant: 'destructive', color: 'text-red-600' }
      case 'not_sent':
      default:
        return { text: 'Pendente de Envio', variant: 'outline', color: 'text-gray-500' }
    }
  }

  const { text, variant, color } = getStatusInfo()

  return (
    <Card 
      className="flex flex-col justify-between hover:border-primary transition-colors cursor-pointer"
      onClick={() => onCardClick(document)}
    >
      <CardHeader>
        <CardTitle className="text-lg">{documentName}</CardTitle>
        <CardDescription>Status do seu documento</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <Badge variant={variant} className={color}>{text}</Badge>
        <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            disabled={isUploading}
            onClick={(e) => {
                e.stopPropagation();
                onUploadClick(documentName);
            }}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {isUploading ? 'Enviando...' : (status === 'not_sent' ? 'Enviar Documento' : 'Substituir Arquivo')}
        </Button>
      </CardContent>
    </Card>
  )
}

// COMPONENTE PRINCIPAL DA PÁGINA (ATUALIZADO)
const MyDocumentsPage = () => {
  const [requiredDocuments, setRequiredDocuments] = useState<DocumentDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null)

  const handleOpenModal = (document: DocumentDetail) => {
    setSelectedDocument(document)
    setIsModalOpen(true)
  }

  const fetchStudentProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('user_id', userId)
      .single()
    if (error) {
      console.error('log: Erro ao buscar perfil do aluno:', error)
      return null
    }
    return data
  }

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

  const handleUpload = async (documentType: string) => {
    if (!studentProfile) {
        toast.error('Não foi possível identificar o perfil do aluno.')
        return
    }
    const fileInput = fileInputRef.current
    if (!fileInput) return
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement
      if (!target.files || target.files.length === 0) return
      const file = target.files[0]
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('O arquivo é muito grande. Máximo de 5MB.')
        return
      }
      setUploadingDoc(documentType)
      console.log(`log: Iniciando upload para o documento: ${documentType}`)
      try {
        const fileData = await toBase64(file)
        console.log('log: Chamando a edge function "upload-student-document"...')
        const { data, error } = await supabase.functions.invoke('upload-student-document', {
            body: {
                fileData,
                fileType: file.type,
                documentType,
                studentProfile,
            },
        })
        if (error) throw new Error(error.message)
        if (data.error) throw new Error(data.error)
        console.log('log: Resposta da função:', data)
        toast.success(`Documento "${documentType}" enviado com sucesso!`)
        
        // Atualiza a UI para refletir a mudança de status e o novo link
        setRequiredDocuments(prevDocs => 
            prevDocs.map(doc => 
                doc.name === documentType 
                ? { ...doc, status: 'pending', filePath: data.file.webViewLink, rejectionReason: null } 
                : doc
            )
        )
      } catch (err: any) {
        console.error('log: Erro no processo de upload:', err)
        toast.error('Falha ao enviar o documento.', {
          description: err.message,
        })
      } finally {
        setUploadingDoc(null)
        fileInput.value = ''
      }
    }
    fileInput.click()
  }

  useEffect(() => {
    const fetchRequiredDocuments = async () => {
      console.log('log: Iniciando busca de documentos necessários...')
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('log: Usuário (auth) não encontrado.')
          throw new Error('Usuário não autenticado')
        }
        
        const profile = await fetchStudentProfile(user.id);
        if (profile) setStudentProfile(profile);
        else throw new Error('Perfil de aluno não encontrado.')

        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('*, courses(*, course_types(*))')
          .eq('student_id', profile.id)

        if (enrollmentsError) throw enrollmentsError;
        if (!enrollments) return;

        const allRequiredDocs = new Set<string>()
        enrollments.forEach(enrollment => {
          if (enrollment.courses?.course_types?.required_documents) {
             enrollment.courses.course_types.required_documents.forEach(doc => allRequiredDocs.add(doc))
          }
        })

        const { data: sentDocuments, error: sentDocumentsError } = await supabase
          .from('student_documents')
          .select('document_type, status, file_path, rejection_reason')
          .eq('user_id', profile.id)

        if (sentDocumentsError) throw sentDocumentsError

        const sentDocsMap = new Map(sentDocuments.map(d => [d.document_type, {
            status: d.status as DocumentStatus,
            filePath: d.file_path,
            rejectionReason: d.rejection_reason
        }]))

        const documentsWithStatus = Array.from(allRequiredDocs).map(docName => {
            const sentDoc = sentDocsMap.get(docName);
            return {
                name: docName,
                status: sentDoc?.status || 'not_sent',
                filePath: sentDoc?.filePath || null,
                rejectionReason: sentDoc?.rejectionReason || null,
            }
        })
        
        setRequiredDocuments(documentsWithStatus)
      } catch (error) {
        console.error('log: Erro final ao buscar documentos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequiredDocuments()
  }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/png, image/jpeg, application/pdf" />

      <DocumentDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={selectedDocument}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Meus Documentos</h1>
        <p className="text-muted-foreground mt-1">
          Envie e gerencie os documentos necessários para seus cursos.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
             <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      ) : requiredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {requiredDocuments.map((doc) => (
            <DocumentCard 
                key={doc.name} 
                document={doc}
                isUploading={uploadingDoc === doc.name}
                onUploadClick={handleUpload}
                onCardClick={handleOpenModal}
            />
          ))}
        </div>
      ) : (
         <Card>
            <CardContent className="p-6">
               <p>Nenhum documento é necessário para os cursos em que você está matriculado no momento.</p>
            </CardContent>
         </Card>
      )}
    </div>
  )
}

export default MyDocumentsPage