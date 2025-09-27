import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import AppSidebar from './AppSidebar';
import AuthPage from '@/components/auth/AuthPage';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // log: Lógica de autenticação aprimorada
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Se o usuário fez login (especialmente via link mágico que adiciona um # na URL)
      // e estamos na página raiz, navegamos para a raiz novamente para limpar a URL.
      if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
        navigate('/');
      }
    });

    // Verifica a sessão inicial ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    // Se não há sessão, renderiza a página de autenticação
    return <AuthPage />;
  }
  
  // Se há sessão, renderiza o layout principal da aplicação
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center px-6 shadow-soft">
            <SidebarTrigger className="mr-4 md:hidden" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">GradGate - Sistema de Gestão Acadêmica</h1>
            </div>
          </header>
          
          <main className="flex-1 p-6 overflow-auto bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;