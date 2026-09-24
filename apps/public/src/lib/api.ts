import { headers } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

/**
 * Fetches the tenant configuration from the backend API.
 * Identifies the tenant by extracting the subdomain from the Host header,
 * or forwarding the explicit x-tenant-slug header if provided (useful for dev/testing).
 */
export async function getTenantConfig(): Promise<TenantConfig | null> {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const explicitSlug = headersList.get('x-tenant-slug');

    let slug = explicitSlug;

    if (!slug) {
      // Extract subdomain (e.g., mtech.localhost:3002 -> mtech)
      const hostname = host.split(':')[0];
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
        slug = parts[0];
      } else {
        slug = process.env.NODE_ENV === 'development' ? 'mtech' : null;
      }
    }

    if (!slug) return null;

    const response = await fetch(`${API_BASE_URL}/public/tenant-config`, {
      method: 'GET',
      headers: {
        'x-tenant-slug': slug as string,
        'Content-Type': 'application/json',
      },
      // Cache logic: revalidate every hour or tag-based
      next: { revalidate: 3600, tags: [`tenant-${slug}`] },
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
