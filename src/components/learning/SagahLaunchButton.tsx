// src/components/learning/SagahLaunchButton.tsx

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Importe seu cliente Supabase
import { Button } from '@/components/ui/button'; // Use seu componente de botão

interface SagahLaunchButtonProps {
  userId: string;
  disciplineId: string;
  learningUnitId: string;
  children: React.ReactNode;
}

const SagahLaunchButton: React.FC<SagahLaunchButtonProps> = ({
  userId,
  disciplineId,
  learningUnitId,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // log: Função para criar e submeter o formulário LTI
  const submitForm = (launchUrl: string, launchData: { [key: string]: string }) => {
    // Cria um formulário na memória
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = launchUrl;
    form.target = '_blank'; // Abre em uma nova aba

    // Adiciona os parâmetros como inputs escondidos
    for (const key in launchData) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = launchData[key];
      form.appendChild(input);
    }

    // Adiciona o formulário ao corpo do documento, submete e remove
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleLaunch = async () => {
    setIsLoading(true);
    // log: Botão de lançamento clicado. Chamando a edge function 'generate-sagah-launch'.
    
    const { data, error } = await supabase.functions.invoke('generate-sagah-launch', {
      body: { userId, disciplineId, learningUnitId },
    });

    if (error) {
      console.error('Erro ao gerar dados de lançamento LTI:', error);
      // Aqui você pode usar um toast ou alerta para o usuário
      alert(`Erro: ${error.message}`);
      setIsLoading(false);
      return;
    }

    // log: Dados recebidos da edge function. Montando e submetendo o formulário.
    submitForm(data.launchUrl, data.launchData);
    setIsLoading(false);
  };

  return (
    <Button onClick={handleLaunch} disabled={isLoading}>
      {isLoading ? 'Carregando...' : children}
    </Button>
  );
};

export default SagahLaunchButton;