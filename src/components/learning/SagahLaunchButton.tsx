// src/components/learning/SagahLaunchButton.tsx

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';
import { postToUrl } from '@/lib/utils'; // Assumindo que a função postToUrl está em utils

interface SagahLaunchButtonProps {
  learningUnitId: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  children?: React.ReactNode; // Prop para aceitar texto customizado
}

const SagahLaunchButton = ({ learningUnitId, size = 'default', children }: SagahLaunchButtonProps) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const { toast } = useToast();

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sagah-launch', {
        body: { learningUnitId },
      });

      if (error) throw error;
      
      // A função 'postToUrl' deve existir no seu 'src/lib/utils.ts'
      // Ela cria um formulário dinâmico e o submete em uma nova aba.
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
        // Renderiza o ícone apenas se não houver um texto customizado
        !children && <Play className="mr-2 h-4 w-4" />
      )}
      {isLaunching ? 'Aguarde...' : children || 'Acessar Conteúdo'}
    </Button>
  );
};

export default SagahLaunchButton;