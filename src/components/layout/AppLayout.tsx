import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import AuthPage from '@/components/auth/AuthPage';
import { Session, User } from '@supabase/supabase-js';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  console.log('AppLayout: Componente renderizado');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('AppLayout: Estados atuais - loading:', loading, 'user:', !!user, 'session:', !!session);

  useEffect(() => {
    console.log('AppLayout: Iniciando autenticação...');
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AppLayout: Auth state change:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AppLayout: Session check:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    return <AuthPage />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center px-6 shadow-soft">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Quality Educacional - Sistema de Gestão Acadêmica</h1>
            </div>
          </header>
          
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;