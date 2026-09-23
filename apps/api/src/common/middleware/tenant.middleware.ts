import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppRequest } from '../types/request.types';

type NextFunction = (error?: unknown) => void;

/**
 * TenantMiddleware — resolves the current tenant from every incoming request.
 *
 * Resolution order (dev-first strategy):
 *  1. x-tenant-slug header        ← use in Postman / local dev
 *  2. First subdomain of Host      ← use in production (mtech.yourapp.com)
 *
 * Attaches `req.tenant` (TenantContext) on success.
 * Throws NotFoundException  if slug resolves to no tenant.
 * Throws ForbiddenException if tenant is SUSPENDED.
 *
 * Excluded routes (registered in AppModule): /health, /api/v1/auth/*
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: AppRequest, _res: unknown, next: NextFunction) {
    const slug = this.resolveSlug(req);

    if (!slug) {
      // No slug found — skip (SUPER_ADMIN or public routes handle this)
      return next();
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        plan: true,
        themeConfig: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }

    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenException(
        `Tenant "${slug}" is suspended. Please contact support.`,
      );
    }

    req.tenant = {
      ...tenant,
      themeConfig: tenant.themeConfig as Record<string, unknown>,
    };

    next();
  }

  /**
   * Extract tenant slug from header or Host subdomain.
   * Returns null if neither is present (e.g., SUPER_ADMIN calling without tenant context).
   */
  private resolveSlug(req: AppRequest): string | null {
    // Priority 1: explicit header (dev + API testing)
    const headerSlug = req.headers['x-tenant-slug'] as string | undefined;
    if (headerSlug?.trim()) return headerSlug.trim().toLowerCase();

    // Priority 2: subdomain from Host header (production)
    const host = (req.headers['host'] ?? '') as string;
    const hostname = host.split(':')[0]; // strip port if any
    const parts = hostname.split('.');

    // e.g. mtech.yourapp.vercel.app → parts[0] = 'mtech'
    // Skip if it's just 'localhost' or a bare IP
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
      return parts[0].toLowerCase();
    }

    return null;
  }
}
