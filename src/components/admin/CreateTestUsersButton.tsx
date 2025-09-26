import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users } from 'lucide-react';

interface CreateTestUsersButtonProps {
  userRole?: string;
}

const CreateTestUsersButton = ({ userRole }: CreateTestUsersButtonProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateTestUsers = async () => {
    if (userRole !== 'admin_geral') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem criar usuários de teste.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      console.log('Calling create-test-users function...');
      
      const { data, error } = await supabase.functions.invoke('create-test-users', {
        body: {}
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      console.log('Function response:', data);

      toast({
        title: "Usuários de teste criados!",
        description: "Usuários de teste foram criados com sucesso. Senhas: [role]123456",
      });

    } catch (error) {
      console.error('Error creating test users:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar usuários de teste. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Só mostra o botão para administradores
  if (userRole !== 'admin_geral') {
    return null;
  }

  return (
    <Button
      onClick={handleCreateTestUsers}
      disabled={isCreating}
      className="gap-2"
      variant="outline"
    >
      {isCreating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Users className="h-4 w-4" />
      )}
      {isCreating ? 'Criando usuários...' : 'Criar Usuários de Teste'}
    </Button>
  );
};

export default CreateTestUsersButton;