// src/components/learning/SagahLaunchButton.tsx

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';
import { postToUrl } from '@/lib/utils';

interface SagahLaunchButtonProps {
  learningUnitId: string;
  enrollmentId: string; // Adicionamos o enrollmentId como propriedade obrigatória
  size?: 'sm' | 'default' | 'lg' | 'icon';
  children?: React.ReactNode;
}

const SagahLaunchButton = ({ learningUnitId, enrollmentId, size = 'default', children }: SagahLaunchButtonProps) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const { toast } = useToast();

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sagah-launch', {
        // Enviando ambos os IDs para a função
        body: { learningUnitId, enrollmentId },
      });

      if (error) throw error;
      
      postToUrl(data.launch_url, data.params, '_blank');

    } catch (err: any) {
      console.error("Erro ao iniciar conteúdo LTI:", err);
      toast({
        title: "Erro ao acessar conteúdo",
        description: err.message || "Não foi possível gerar o link de acesso seguro.",
        variant: "destructive",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Button size={size} onClick={handleLaunch} disabled={isLaunching}>
      {isLaunching ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        !children && <Play className="mr-2 h-4 w-4" />
      )}
      {isLaunching ? 'Aguarde...' : children || 'Acessar Conteúdo'}
    </Button>
  );
};

export default SagahLaunchButton;