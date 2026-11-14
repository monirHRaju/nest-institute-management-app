import { headers } from 'next/headers';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  themeConfig: {
    primaryColor?: string;
    accentColor?: string;
    aboutText?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    logoUrl?: string;
    bannerUrl?: string;
  };
}

export interface PublicCourse {
  id: string;
  name: string;
  description?: string | null;
  duration?: string | null;
  fees: number;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  batches?: Array<{
    id: string;
    name: string;
    startDate?: string | null;
    schedule?: string | null;
    capacity?: number | null;
  }>;
}

/**
 * Resolves the current tenant slug from request headers / Host subdomain.
 */
export async function resolveTenantSlug(): Promise<string | null> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const explicitSlug = headersList.get('x-tenant-slug');

  if (explicitSlug?.trim()) {
    return explicitSlug.trim().toLowerCase();
  }

  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
    return parts[0].toLowerCase();
  }

  return process.env.NODE_ENV !== 'production' ? 'mtech' : null;
}

/**
 * Fetches the tenant configuration from the backend API.
 */
export async function getTenantConfig(): Promise<TenantConfig | null> {
  try {
    const slug = await resolveTenantSlug();
    if (!slug) return null;

    const response = await fetch(`${API_BASE_URL}/public/tenant-config`, {
      method: 'GET',
      headers: {
        'x-tenant-slug': slug,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300, tags: [`tenant-${slug}`] },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    return json.data as TenantConfig;
  } catch (error) {
    console.error('Failed to fetch tenant config:', error);
    return null;
  }
}

/**
 * Fetches the public courses list for the current tenant.
 */
export async function getPublicCourses(): Promise<PublicCourse[]> {
  try {
    const slug = await resolveTenantSlug();
    if (!slug) return [];

    const response = await fetch(`${API_BASE_URL}/public/courses`, {
      method: 'GET',
      headers: {
        'x-tenant-slug': slug,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const json = await response.json();
    return (json.data as PublicCourse[]) || [];
  } catch (error) {
    console.error('Failed to fetch public courses:', error);
    return [];
  }
}
