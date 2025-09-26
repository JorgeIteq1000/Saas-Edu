import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  has_action_button: boolean; // <-- Adicionado
  action_button_text?: string; // <-- Adicionado
  action_button_url?: string; // <-- Adicionado
}

const AnnouncementsModal = () => {
  console.log('log: AnnouncementsModal.tsx - Componente renderizado');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    console.log('log: AnnouncementsModal.tsx - useEffect para buscar avisos');
    const fetchAnnouncements = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('log: AnnouncementsModal.tsx - Usuário não encontrado');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('user_id', user.id)
          .single();

        if (profile && profile.role === 'aluno') {
          console.log('log: AnnouncementsModal.tsx - Perfil de aluno encontrado, buscando avisos...');
          const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('active', true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

          if (error) throw error;

          if (data && data.length > 0) {
            console.log(`log: AnnouncementsModal.tsx - ${data.length} avisos encontrados`);
            setAnnouncements(data);
            setIsOpen(true);
          } else {
            console.log('log: AnnouncementsModal.tsx - Nenhum aviso ativo encontrado para este aluno');
          }
        }
      } catch (error) {
        console.error('log: AnnouncementsModal.tsx - Erro ao buscar avisos:', error);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsOpen(false);
    }
  };

  const currentAnnouncement = announcements[currentIndex];

  if (!isOpen || !currentAnnouncement) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Megaphone className="mr-2 h-5 w-5" />
            {currentAnnouncement.title}
          </DialogTitle>
          <DialogDescription>
            Um aviso importante da instituição para você.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {currentAnnouncement.image_url && (
            <img src={currentAnnouncement.image_url} alt={currentAnnouncement.title} className="mb-4 rounded-md max-h-60 w-full object-cover" />
          )}
          <p className="text-sm text-muted-foreground">
            {currentAnnouncement.content}
          </p>
        </div>
        <DialogFooter className="sm:justify-between">
          {/* Lógica para o botão de ação adicionada aqui */}
          {currentAnnouncement.has_action_button && currentAnnouncement.action_button_url && (
            <Button asChild variant="outline">
              <a href={currentAnnouncement.action_button_url} target="_blank" rel="noopener noreferrer">
                {currentAnnouncement.action_button_text || 'Saiba Mais'}
              </a>
            </Button>
          )}
          <Button onClick={handleNext} className="mt-2 sm:mt-0">
            {currentIndex < announcements.length - 1 ? 'Próximo Aviso' : 'Entendi, fechar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementsModal;