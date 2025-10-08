// LOG: Iniciando a criação da página de gerenciamento de combos.
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Combo } from '@/integrations/supabase/types';
import NewComboModal from '@/components/combos/NewComboModal'; // Criaremos este componente a seguir

const CombosPage = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // LOG: Função para buscar os combos do banco de dados.
  const fetchCombos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('combos').select('*');
    if (error) {
      console.error('Erro ao buscar combos:', error);
    } else {
      setCombos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCombos();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestão de Combos</CardTitle>
          <Button onClick={() => setIsModalOpen(true)}>Novo Combo</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando combos...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {combos.map((combo) => (
                <Card key={combo.id}>
                  <CardHeader>
                    <CardTitle>{combo.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Preço: R$ {combo.price}</p>
                    <p>Ativo: {combo.is_active ? 'Sim' : 'Não'}</p>
                    {/* Aqui poderiam entrar botões de editar/visualizar cursos */}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <NewComboModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchCombos} // Para atualizar a lista após salvar
      />
    </div>
  );
};

export default CombosPage;