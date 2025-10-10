import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  GraduationCap,
  BookOpen,
  Users,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Home,
  UserPlus,
  DollarSign,
  BarChart3,
  Megaphone,
  User,
  Gift,
  PackagePlus, // LOG: Novo ícone para Combos importado.
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';



interface Profile {
  role: string;
  full_name: string;
}

const AppSidebar = () => {
  const { state } = useSidebar();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const { hasPermission } = usePermissions();

  const isCollapsed = state === 'collapsed';

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', user.id)
          .single();
        setProfile(data);
      }
    };
    getProfile();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    }
  };

  const getMenuItems = () => {
    const role = profile?.role;
    
    const baseItems = [
      { title: 'Dashboard', url: '/', icon: Home },
    ];

    // LOG: Adicionado o item "Combos" à lista de todos os menus possíveis.
    const allMenuItems = [
      { title: 'Cursos', url: '/courses', icon: BookOpen, permission: 'courses' },
      { title: 'Combos', url: '/combos', icon: PackagePlus, permission: 'combos' },
      { title: 'Contratos', url: '/contracts', icon: FileText, permission: 'contracts' },
      { title: 'Usuários', url: '/users', icon: Users, permission: 'users' },
      { title: 'Matrículas', url: '/enrollments', icon: UserPlus, permission: 'enrollments' },
      { title: 'Vendas', url: '/sales', icon: TrendingUp, permission: 'sales' },
      { title: 'Indicações', url: '/referrals', icon: Gift, permission: 'sales' },
      { title: 'Financeiro', url: '/finance', icon: DollarSign, permission: 'finance' },
      { title: 'Protocolos', url: '/protocols', icon: FileText, permission: 'protocols' },
      { title: 'Certificados', url: '/certificates', icon: GraduationCap, permission: 'certificates' },
      { title: 'Documentos', url: '/documents', icon: FileText, permission: 'documents' },
      { title: 'Avisos', url: '/announcements', icon: Megaphone, permission: 'announcements' },
      { title: 'Relatórios', url: '/reports', icon: BarChart3, permission: 'reports' },
      { title: 'Configurações', url: '/settings', icon: Settings, permission: 'settings' },
    ];

    // Filtra os itens com base nas permissões do usuário.
    const availableItems = allMenuItems.filter(item => 
      hasPermission(item.permission, 'view')
    );

    const roleSpecificItems = [];
    
    if (role === 'gestor') {
      roleSpecificItems.push({ title: 'Equipe', url: '/team', icon: Users });
    }

    if (role === 'vendedor') {
      roleSpecificItems.push(
        { title: 'Minhas Vendas', url: '/my-sales', icon: TrendingUp },
        { title: 'Leads', url: '/leads', icon: UserPlus }
      );
    }

    if (role === 'aluno') {
      roleSpecificItems.push(
        { title: 'Minhas Matrículas', url: '/my-enrollments', icon: BookOpen },
        { title: 'Meus Protocolos', url: '/my-protocols', icon: FileText },
        { title: 'Meus Certificados', url: '/my-certificates', icon: GraduationCap },
        { title: 'Documentos', url: '/my-documents', icon: FileText },
        { title: 'Meus Dados', url: '/my-data', icon: User },
        { title: 'Indicação Premiada', url: '/my-referrals', icon: Gift }
      );
    }

    return [...baseItems, ...availableItems, ...roleSpecificItems];
  };

  const menuItems = getMenuItems();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <GraduationCap className="h-8 w-8 text-sidebar-primary" />
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-semibold text-sidebar-foreground">Quality Educacional</h2>
                <p className="text-sm text-sidebar-foreground/70">
                  {profile?.full_name || 'Carregando...'}
                </p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {!isCollapsed && 'Sair'}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;