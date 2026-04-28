import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface MenuPermission {
  id: string;
  menu_key: string;
  role: string;
  is_visible: boolean;
}

export function useMenuPermissions() {
  return useQuery({
    queryKey: ['menu_permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_permissions' as any)
        .select('*')
        .order('menu_key');
      if (error) throw error;
      return (data ?? []) as unknown as MenuPermission[];
    },
  });
}

interface UserMenuOverride {
  id: string;
  user_id: string;
  menu_key: string;
  is_visible: boolean;
}

export function useUserMenuOverrides() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_menu_overrides', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_menu_overrides' as any)
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as UserMenuOverride[];
    },
  });
}

export function useVisibleMenuKeys(): Set<string> {
  const { roles, isSuperAdmin } = useAuth();
  const { data: permissions = [] } = useMenuPermissions();
  const { data: overrides = [] } = useUserMenuOverrides();

  return useMemo(() => {
    const visibleKeys = new Set<string>();
    for (const perm of permissions) {
      if (perm.is_visible && roles.includes(perm.role as any)) {
        visibleKeys.add(perm.menu_key);
      }
    }
    for (const ov of overrides) {
      if (ov.is_visible) visibleKeys.add(ov.menu_key);
      else visibleKeys.delete(ov.menu_key);
    }
    return visibleKeys;
  }, [permissions, roles, overrides]);
}
