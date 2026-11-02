'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Role } from '@repo/shared';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data as UserProfile;
    },
    retry: false, // Don't retry on 401s, interceptor handles refresh/redirect
  });

  return {
    user: data,
    isLoading,
    error,
  };
}
