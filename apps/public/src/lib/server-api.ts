import { headers } from 'next/headers';
import type { PublicCourseRecord } from '@repo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  currency?: string;
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
  createdAt?: string;
}

/**
 * Resolves the tenant slug on the server from the Host header or x-tenant-slug header.
 */
export async function getServerTenantSlug(): Promise<string> {
  try {
    const headersList = await headers();
    const explicitSlug = headersList.get('x-tenant-slug');
    if (explicitSlug) return explicitSlug.toLowerCase();

    const host = headersList.get('host') || '';
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
      return parts[0].toLowerCase();
    }
  } catch (error) {
    console.error('Failed to resolve server tenant slug:', error);
  }
  return process.env.DEFAULT_TENANT_SLUG || 'mtech';
}

/**
 * Fetches tenant branding and public config on the server.
 */
export async function getTenantConfig(): Promise<TenantConfig | null> {
  try {
    const slug = await getServerTenantSlug();
    const response = await fetch(`${API_BASE_URL}/public/tenant-config`, {
      method: 'GET',
      headers: {
        'x-tenant-slug': slug,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60, tags: [`tenant-${slug}`] },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    return (json.data ?? json) as TenantConfig;
  } catch (error) {
    console.error('Failed to fetch tenant config:', error);
    return null;
  }
}

/**
 * Fetches public courses for the current tenant on the server.
 */
export async function getPublicCourses(): Promise<PublicCourseRecord[]> {
  try {
    const slug = await getServerTenantSlug();
    const response = await fetch(`${API_BASE_URL}/public/courses`, {
      method: 'GET',
      headers: {
        'x-tenant-slug': slug,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60, tags: [`courses-${slug}`] },
    });

    if (!response.ok) {
      return [];
    }

    const json = await response.json();
    return (json.data ?? json) as PublicCourseRecord[];
  } catch (error) {
    console.error('Failed to fetch public courses:', error);
    return [];
  }
}

/**
 * Fetches a single public course by ID for the current tenant on the server.
 */
export async function getPublicCourseById(id: string): Promise<PublicCourseRecord | null> {
  try {
    const slug = await getServerTenantSlug();
    const response = await fetch(`${API_BASE_URL}/public/courses/${id}`, {
      method: 'GET',
      headers: {
        'x-tenant-slug': slug,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    return (json.data ?? json) as PublicCourseRecord;
  } catch (error) {
    console.error(`Failed to fetch public course ${id}:`, error);
    return null;
  }
}
