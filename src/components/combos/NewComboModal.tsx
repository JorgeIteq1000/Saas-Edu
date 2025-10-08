// LOG: Refatorado para usar Tipos de Curso em vez de Cursos.
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// LOG: Criando um tipo local para CourseType, ou importe se já existir um global.
interface CourseType {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const NewComboModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [selectedCourseTypes, setSelectedCourseTypes] = useState<string[]>([]);
  
  // LOG: Buscando todos os TIPOS de curso para popular o seletor.
  useEffect(() => {
    if (isOpen) {
      const fetchCourseTypes = async () => {
        const { data, error } = await supabase.from('course_types').select('id, name').eq('active', true);
        if (error) console.error("Erro ao buscar tipos de curso:", error);
        else setCourseTypes(data || []);
      };
      fetchCourseTypes();
    }
  }, [isOpen]);

  const handleTypeSelection = (typeId: string) => {
    setSelectedCourseTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSave = async () => {
    if (!name || price <= 0 || selectedCourseTypes.length < 2) {
      toast({ title: 'Erro', description: 'Preencha o nome, o preço e selecione pelo menos 2 tipos de curso.', variant: 'destructive' });
      return;
    }
    
    // 1. Inserir o combo na tabela 'combos'
    const { data: comboData, error: comboError } = await supabase
      .from('combos')
      .insert({ name, description, price, is_active: true })
      .select()
      .single();

    if (comboError || !comboData) {
      toast({ title: 'Erro ao criar combo', description: comboError?.message, variant: 'destructive' });
      return;
    }

    // 2. Inserir as associações na tabela 'combo_course_types'
    const comboCourseTypesData = selectedCourseTypes.map(typeId => ({
      combo_id: comboData.id,
      course_type_id: typeId,
    }));

    const { error: comboTypesError } = await supabase
      .from('combo_course_types')
      .insert(comboCourseTypesData);

    if (comboTypesError) {
      toast({ title: 'Erro ao associar tipos de curso ao combo', description: comboTypesError.message, variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Sucesso!', description: 'Combo criado com sucesso.' });
    onSave();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Combo de Cursos</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Inputs de Nome, Preço e Descrição continuam os mesmos */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Preço (R$)</Label>
            <Input id="price" type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Descrição</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" />
          </div>

          {/* LOG: Alterado para selecionar TIPOS de curso */}
          <div className="grid grid-cols-4 items-center gap-4">
             <Label className="text-right">Tipos de Curso</Label>
             <div className="col-span-3 max-h-40 overflow-y-auto rounded-md border p-2">
                {courseTypes.map(type => (
                  <div key={type.id} className="flex items-center space-x-2 my-1">
                    <Checkbox 
                      id={type.id} 
                      onCheckedChange={() => handleTypeSelection(type.id)}
                      checked={selectedCourseTypes.includes(type.id)}
                    />
                    <label htmlFor={type.id}>{type.name}</label>
                  </div>
                ))}
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Combo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewComboModal;