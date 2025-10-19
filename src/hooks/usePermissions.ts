import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserPermissions {
  [module: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Buscar perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, team_id') // Adicionei 'team_id' para ser mais robusto, caso precise aqui
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile) {
          console.error("log: 💥 Erro ao buscar perfil:", profileError?.message);
          setLoading(false);
          return;
        }

        const role = profile.role;
        const profileId = profile.id;
        
        let finalPermissions: UserPermissions = {};

        // 1. Lógica para Admin Geral (Acesso Total)
        if (role === 'admin_geral') {
          const modules = [
            'users', 'enrollments', 'sales', 'finance', 
            'protocols', 'settings', 'reports', 'courses', 'certificates',
            'documents', 'announcements', 'contracts', 'combos' 
          ];
          
          modules.forEach(module => {
            finalPermissions[module] = {
              can_view: true,
              can_create: true,
              can_edit: true,
              can_delete: true
            };
          });
          
          setPermissions(finalPermissions);
          setLoading(false);
          return;
        }

        // 2. Buscar Permissões Específicas do Usuário (se existirem)
        const { data: userPermissions } = await supabase
          .from('permissions')
          .select('*')
          .eq('user_id', profileId);

        if (userPermissions) {
          userPermissions.forEach(perm => {
            finalPermissions[perm.module_name] = {
              can_view: perm.can_view,
              can_create: perm.can_create,
              can_edit: perm.can_edit,
              can_delete: perm.can_delete
            };
          });
        }
        
        // 3. 💥 AJUSTE CRUCIAL: Configurar permissões padrão para roles específicas
        // Isso garante que vendedores e gestores possam ver suas próprias vendas
        if ((role === 'vendedor' || role === 'gestor') && !finalPermissions['sales']) {
             finalPermissions['sales'] = {
                can_view: true,
                can_create: role === 'vendedor', // Vendedor pode criar a venda
                can_edit: role === 'vendedor',
                can_delete: false,
            };
        }
        
        // Garante que o aluno sempre veja seus próprios módulos (mesmo que não configurados no DB)
        if (role === 'aluno') {
             finalPermissions['my-data'] = { can_view: true, can_create: false, can_edit: true, can_delete: false };
             finalPermissions['my-enrollments'] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
             finalPermissions['my-protocols'] = { can_view: true, can_create: true, can_edit: false, can_delete: false };
             finalPermissions['my-certificates'] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
             finalPermissions['my-documents'] = { can_view: true, can_create: true, can_edit: false, can_delete: false };
             finalPermissions['my-referrals'] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
        }


        setPermissions(finalPermissions);
        console.log('log: Permissões carregadas com sucesso.');

      } catch (error) {
        console.error('log: 💥 Erro ao buscar permissões:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = useCallback((module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    const modulePermissions = permissions[module];
    if (!modulePermissions) return false;
    
    switch (action) {
      case 'view':
        return modulePermissions.can_view;
      case 'create':
        return modulePermissions.can_create;
      case 'edit':
        return modulePermissions.can_edit;
      case 'delete':
        return modulePermissions.can_delete;
      default:
        return false;
    }
  }, [permissions]);

  return {
    permissions,
    hasPermission,
    loading
  };
};
