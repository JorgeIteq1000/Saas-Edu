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
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        // Se for admin_geral, tem acesso total a tudo
        if (profile.role === 'admin_geral') {
          // LOG: CORREÇÃO APLICADA AQUI! Adicionamos 'combos' à lista.
          const modules = [
            'users', 'enrollments', 'sales', 'finance', 
            'protocols', 'settings', 'reports', 'courses', 'certificates',
            'documents', 'announcements', 'contracts', 'combos' 
          ];
          
          const adminPermissions: UserPermissions = {};
          modules.forEach(module => {
            adminPermissions[module] = {
              can_view: true,
              can_create: true,
              can_edit: true,
              can_delete: true
            };
          });
          
          setPermissions(adminPermissions);
          setLoading(false);
          return;
        }

        // Buscar permissões específicas do usuário
        const { data: userPermissions } = await supabase
          .from('permissions')
          .select('*')
          .eq('user_id', profile.id);

        if (userPermissions) {
          const permissionsMap: UserPermissions = {};
          userPermissions.forEach(perm => {
            permissionsMap[perm.module_name] = {
              can_view: perm.can_view,
              can_create: perm.can_create,
              can_edit: perm.can_edit,
              can_delete: perm.can_delete
            };
          });
          
          setPermissions(permissionsMap);
        }
      } catch (error) {
        console.error('Erro ao buscar permissões:', error);
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