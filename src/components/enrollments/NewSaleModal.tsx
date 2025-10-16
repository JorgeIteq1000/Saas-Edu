// src/components/enrollments/NewSaleModal.tsx

import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import InputMask from 'react-input-mask';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, UserSearch } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

// Schema de validação com Zod
const saleSchema = z.object({
  // Dados do Aluno
  fullName: z.string().min(3, 'Nome completo é obrigatório.'),
  documentNumber: z.string().refine(val => val.replace(/\D/g, '').length === 11, 'CPF inválido.'),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().min(10, 'Telefone é obrigatório.'),
  birthDate: z.string().min(10, 'Data de nascimento é obrigatória.'),
  zipCode: z.string().refine(val => val.replace(/\D/g, '').length === 8, 'CEP inválido.'),
  addressStreet: z.string().min(3, 'Endereço é obrigatório.'),
  addressNumber: z.string().min(1, 'Número é obrigatório.'),
  addressNeighborhood: z.string().min(1, 'Bairro é obrigatório.'),
  addressCity: z.string().min(1, 'Cidade é obrigatória.'),
  addressState: z.string().min(1, 'Estado é obrigatório.'),
  
  // Dados da Venda
  productType: z.enum(['course', 'combo']),
  courseTypeId: z.string().optional(),
  courseId: z.string().optional(),
  comboId: z.string().optional(),
  coupon: z.string().optional(),
});

// Tipos
interface CourseType { id: string; name: string; }
interface Course { id: string; name: string; course_type_id: string; price: number; }
interface Combo { id: string; name: string; price: number; }
interface NewSaleModalProps {
  onSaleCreated: () => void;
  triggerButton: ReactNode;
}

const NewSaleModal = ({ onSaleCreated, triggerButton }: NewSaleModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [studentFound, setStudentFound] = useState(false);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [selectedProductPrice, setSelectedProductPrice] = useState<number | null>(null);

  // Novos estados para a lógica de combo
  const [comboCourseTypes, setComboCourseTypes] = useState<CourseType[]>([]);
  const [selectedComboCourses, setSelectedComboCourses] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: { productType: 'course' },
  });

  const productType = form.watch('productType');
  const selectedCourseType = form.watch('courseTypeId');
  const selectedCourseId = form.watch('courseId');
  const selectedComboId = form.watch('comboId');

  useEffect(() => {
    const fetchData = async () => {
      console.log('log: Buscando dados para o modal de matrícula...');
      try {
        const { data: courseTypesData } = await supabase.from('course_types').select('id, name');
        setCourseTypes(courseTypesData || []);

        const { data: coursesRawData, error: coursesError } = await supabase
          .from('courses')
          .select('id, name, course_type_id, monthly_fee, max_installments');
        if (coursesError) throw coursesError;

        const coursesWithPrice = coursesRawData.map(course => ({
            ...course,
            price: (Number(course.monthly_fee) || 0) * (course.max_installments || 1)
        }));
        setCourses(coursesWithPrice || []);
        
        const { data: combosData, error: combosError } = await supabase.from('combos').select('id, name, price');
        if (combosError) throw combosError;
        setCombos(combosData || []);
      } catch (error: any) {
        console.error('log: 💥 Erro ao buscar dados para o modal:', error);
        toast({ title: 'Erro de Permissão', description: 'Verifique as permissões (RLS) para ler os cursos e combos.', variant: 'destructive' });
      }
    };
    if (open) {
        fetchData();
    }
  }, [open, toast]);
  
  useEffect(() => {
    if (selectedCourseType) {
      setFilteredCourses(courses.filter(c => c.course_type_id === selectedCourseType));
    } else {
      setFilteredCourses([]);
    }
    form.setValue('courseId', undefined);
  }, [selectedCourseType, courses, form]);

  useEffect(() => {
    const fetchComboDetails = async () => {
      if (productType === 'combo' && selectedComboId) {
        console.log(`log: Buscando detalhes para o combo ID: ${selectedComboId}`);
        const { data, error } = await supabase
          .from('combo_course_types')
          .select('course_types(id, name)')
          .eq('combo_id', selectedComboId);

        if (error) {
          toast({ title: 'Erro', description: 'Não foi possível buscar os tipos de curso do combo.', variant: 'destructive' });
          setComboCourseTypes([]);
        } else {
          const types = data.map((item: any) => item.course_types).filter(Boolean);
          setComboCourseTypes(types as CourseType[]);
          console.log('log: Tipos de curso encontrados para o combo:', types);
        }
      } else {
        setComboCourseTypes([]);
      }
      setSelectedComboCourses({});
    };
    fetchComboDetails();
  }, [productType, selectedComboId, toast]);

  useEffect(() => {
    let price: number | null = null;
    if (productType === 'course' && selectedCourseId) {
        const selectedCourse = courses.find(c => c.id === selectedCourseId);
        price = selectedCourse?.price ?? null;
    } else if (productType === 'combo' && selectedComboId) {
        const selectedCombo = combos.find(c => c.id === selectedComboId);
        price = Number(selectedCombo?.price) ?? null;
    }
    setSelectedProductPrice(price);
  }, [productType, selectedCourseId, selectedComboId, courses, combos]);

  const handleCpfBlur = async () => {
    const cpf = form.getValues('documentNumber')?.replace(/\D/g, '') || '';
    if (cpf.length !== 11) {
      setStudentFound(false);
      return;
    }
    setIsSearchingCpf(true);
    setStudentFound(false);
    try {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('document_number', cpf).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (profile) {
        setStudentFound(true);
        toast({ title: 'Aluno Encontrado!', description: `Dados de ${profile.full_name} foram preenchidos.` });
        form.setValue('fullName', profile.full_name);
        form.setValue('email', profile.email);
        form.setValue('phone', profile.phone);
        form.setValue('birthDate', profile.birth_date);
        form.setValue('zipCode', profile.address_zip_code);
        form.setValue('addressStreet', profile.address_street);
        form.setValue('addressNumber', profile.address_number);
        form.setValue('addressNeighborhood', profile.address_neighborhood);
        form.setValue('addressCity', profile.address_city);
        form.setValue('addressState', profile.address_state);
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Não foi possível buscar o CPF.', variant: 'destructive' });
    } finally {
      setIsSearchingCpf(false);
    }
  };

  const handleCepBlur = async () => {
    const cep = form.getValues('zipCode')?.replace(/\D/g, '') || '';
    if (cep.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-cep', {
        body: { cep },
      });
      if (error) throw error;
      if (!data.erro) {
        form.setValue('addressStreet', data.logradouro);
        form.setValue('addressNeighborhood', data.bairro);
        form.setValue('addressCity', data.localidade);
        form.setValue('addressState', data.uf);
      } else {
        toast({ title: 'CEP não encontrado', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro ao buscar CEP', description: error.message, variant: 'destructive' });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof saleSchema>) => {
    setIsSubmitting(true);
    console.log('log: Submetendo formulário...', values);
    
    const salePayload: any = {
      productType: values.productType,
      coupon: values.coupon,
    };

    if (values.productType === 'course') {
      salePayload.course_id = values.courseId;
    } else if (values.productType === 'combo') {
      const allTypesSelected = comboCourseTypes.every(type => selectedComboCourses[type.id]);
      if (!allTypesSelected || comboCourseTypes.length === 0) {
        toast({ title: "Campos Faltando", description: "Por favor, selecione um curso para cada tipo do combo.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      salePayload.combo_id = values.comboId;
      salePayload.selected_course_ids = Object.values(selectedComboCourses);
    }

    try {
        const { data, error } = await supabase.functions.invoke('create-sale-enrollment', {
            body: {
                studentData: {
                    full_name: values.fullName,
                    document_number: values.documentNumber,
                    email: values.email,
                    phone: values.phone,
                    birth_date: values.birthDate,
                    address_zip_code: values.zipCode,
                    address_street: values.addressStreet,
                    address_number: values.addressNumber,
                    address_neighborhood: values.addressNeighborhood,
                    address_city: values.addressCity,
                    address_state: values.addressState,
                },
                saleData: salePayload
            }
        });

        if (error || data?.error) throw new Error(data?.error || error.message);
        
        toast({ title: 'Sucesso!', description: 'Nova matrícula realizada com sucesso.' });
        onSaleCreated();
        setOpen(false);
        form.reset({ productType: 'course' });
        setStudentFound(false);
        setSelectedComboCourses({});
        setComboCourseTypes([]);

    } catch (error: any) {
        console.error('log: 💥 Erro ao chamar a Edge Function:', error);
        toast({ title: "Erro na Matrícula", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nova Matrícula</DialogTitle>
          <DialogDescription>Preencha os dados abaixo para criar uma nova venda e matricular o aluno.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <section>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Dados do Aluno</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="documentNumber" render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <InputMask mask="999.999.999-99" value={field.value || ''} onChange={field.onChange} onBlur={handleCpfBlur}>
                                {(inputProps: any) => <Input {...inputProps} placeholder="Digite o CPF para buscar..." />}
                            </InputMask>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {isSearchingCpf ? <Loader2 className="h-4 w-4 animate-spin" /> : studentFound ? <UserCheck className="h-4 w-4 text-green-500" /> : <UserSearch className="h-4 w-4 text-muted-foreground" />}
                            </div>
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem className="md:col-span-1"><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <InputMask mask="(99) 99999-9999" value={field.value || ''} onChange={field.onChange} disabled={studentFound}>
                        {(inputProps: any) => <Input {...inputProps} />}
                      </InputMask>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="birthDate" render={({ field }) => (
                  <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField control={form.control} name="zipCode" render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <InputMask mask="99999-999" value={field.value || ''} onChange={field.onChange} onBlur={handleCepBlur} disabled={studentFound}>
                                {(inputProps: any) => <Input {...inputProps} />}
                            </InputMask>
                            {isSearchingCep && <Loader2 className="absolute inset-y-0 right-0 flex items-center pr-3 h-4 w-4 animate-spin" />}
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="addressStreet" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Rua / Logradouro</FormLabel><FormControl><Input {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="addressNumber" render={({ field }) => (
                  <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="addressNeighborhood" render={({ field }) => (
                  <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="addressCity" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="addressState" render={({ field }) => (
                  <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} disabled={studentFound} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </section>
            
            <Separator />

            <section>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Detalhes da Venda</h3>
                <FormField control={form.control} name="productType" render={({ field }) => (
                    <FormItem className="space-y-3 mb-4"><FormLabel>Tipo de Produto</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="course" /></FormControl><FormLabel>Curso Individual</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="combo" /></FormControl><FormLabel>Combo</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )} />
                
                {productType === 'course' && (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="courseTypeId" render={({ field }) => (
                            <FormItem><FormLabel>Tipo de Curso</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                    <SelectContent>{courseTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="courseId" render={({ field }) => (
                            <FormItem><FormLabel>Curso</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedCourseType}>
                                    <FormControl><SelectTrigger><SelectValue placeholder={filteredCourses.length > 0 ? "Selecione..." : "Selecione o tipo primeiro"} /></SelectTrigger></FormControl>
                                    <SelectContent>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}

                {productType === 'combo' && (
                    <div className="space-y-4">
                        <FormField control={form.control} name="comboId" render={({ field }) => (
                            <FormItem><FormLabel>Combo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o combo..." /></SelectTrigger></FormControl>
                                    <SelectContent>{combos.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        {comboCourseTypes.length > 0 && (
                            <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                                <h4 className="font-medium text-center">Selecione os Cursos do Combo</h4>
                                {comboCourseTypes.map(type => (
                                    <div key={type.id} className="space-y-2">
                                    <Label>{type.name}</Label>
                                    <Select
                                        value={selectedComboCourses[type.id] || ''}
                                        onValueChange={courseId => setSelectedComboCourses(prev => ({...prev, [type.id]: courseId}))}
                                    >
                                        <SelectTrigger><SelectValue placeholder={`Selecione um curso de ${type.name}`} /></SelectTrigger>
                                        <SelectContent>
                                        {courses.filter(c => c.course_type_id === type.id).map(course => (
                                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedProductPrice !== null && (
                    <div className="mt-4 p-3 bg-muted rounded-md text-center">
                        <span className="text-sm text-muted-foreground">Valor Total do Produto</span>
                        <p className="text-2xl font-bold">
                            {selectedProductPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                )}
                
                <FormField control={form.control} name="coupon" render={({ field }) => (
                  <FormItem className="mt-4"><FormLabel>Cupom de Desconto (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </section>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar Matrícula
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewSaleModal;