import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Checkbox } from '@/components/ui/checkbox' // 1. Importar o Checkbox

// Lista padrão de documentos
const STANDARD_DOCUMENTS = [
  'RG/CPF',
  'Comprovante de Endereço',
  'Diploma',
  'Histórico da Graduação',
  'Titulo de Eleitor',
  'Histórico do Ensino Médio',
  'Certidão de Nascimento ou Casamento',
  'Reservista',
] as const // Usar 'as const' para manter os tipos literais

// 2. Atualizar o Schema para um array de strings
const courseTypeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  active: z.boolean().default(true),
  required_documents: z.array(z.string()).default([]), // Agora é um array de strings
})

// A interface já está correta, não precisa mudar
interface CourseType {
  id: string
  name: string
  description?: string
  active: boolean
  created_at: string
  required_documents: string[] | null
}

const CourseTypesManagement = () => {
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<CourseType | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof courseTypeSchema>>({
    resolver: zodResolver(courseTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      active: true,
      required_documents: [], // Inicia vazio
    },
  })

  // Não precisamos mais do useFieldArray
  // const { fields, append, remove } = useFieldArray(...)

  useEffect(() => {
    fetchCourseTypes()
  }, [])

  const fetchCourseTypes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('course_types')
        .select('*')
        .order('name')

      if (error) throw error
      setCourseTypes(data || [])
    } catch (error) {
      console.error('log: Erro ao buscar tipos de curso:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar tipos de curso',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 3. Simplificar o onSubmit
  const onSubmit = async (values: z.infer<typeof courseTypeSchema>) => {
    console.log('log: Salvando tipo de curso. Dados:', values)

    try {
      if (editingType) {
        const { error } = await supabase
          .from('course_types')
          .update({ ...values }) // Os valores já estão no formato correto
          .eq('id', editingType.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('course_types')
          .insert([{ ...values }]) // Os valores já estão no formato correto
        if (error) throw error
      }

      setShowModal(false)
      fetchCourseTypes()

      toast({
        title: 'Sucesso',
        description: editingType
          ? 'Tipo atualizado com sucesso'
          : 'Tipo criado com sucesso',
      })
    } catch (error) {
      console.error('log: Erro ao salvar tipo:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar tipo de curso',
        variant: 'destructive',
      })
    }
  }

  // 4. Simplificar o handleEdit
  const handleEdit = (courseType: CourseType) => {
    setEditingType(courseType)
    form.reset({
      name: courseType.name,
      description: courseType.description || '',
      active: courseType.active,
      required_documents: courseType.required_documents || [],
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de curso?')) return

    try {
      const { error } = await supabase.from('course_types').delete().eq('id', id)
      if (error) throw error

      fetchCourseTypes()
      toast({
        title: 'Sucesso',
        description: 'Tipo excluído com sucesso',
      })
    } catch (error) {
      console.error('log: Erro ao excluir tipo:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir tipo de curso',
        variant: 'destructive',
      })
    }
  }

  // 5. Simplificar o handleNewType
  const handleNewType = () => {
    setEditingType(null)
    form.reset({
      name: '',
      description: '',
      active: true,
      required_documents: [],
    })
    setShowModal(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tipos de Curso</CardTitle>
              <CardDescription>
                Gerencie os tipos de curso disponíveis no sistema
              </CardDescription>
            </div>
            <Button onClick={handleNewType}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando tipos de curso...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documentos Necessários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      {type.required_documents?.join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.active ? 'default' : 'secondary'}>
                        {type.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(type)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(type.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Curso' : 'Novo Tipo de Curso'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Graduação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do tipo de curso..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 6. Substituir o campo dinâmico pelos checkboxes */}
              <FormField
                control={form.control}
                name="required_documents"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">
                        Documentos Necessários
                      </FormLabel>
                    </div>
                    <div className="space-y-2">
                      {STANDARD_DOCUMENTS.map((doc) => (
                        <FormField
                          key={doc}
                          control={form.control}
                          name="required_documents"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={doc}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(doc)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, doc])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== doc
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {doc}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
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
                      <FormLabel>Ativo</FormLabel>
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
                  {editingType ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CourseTypesManagement