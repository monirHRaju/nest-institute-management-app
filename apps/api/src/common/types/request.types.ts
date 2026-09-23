import type { TenantStatus, TenantPlan } from '@repo/db';
import type { Role } from '@repo/shared';

/**
 * Resolved tenant object attached to the request by TenantMiddleware.
 */
export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  themeConfig: Record<string, unknown>;
}

/**
 * Authenticated user info attached by JwtAuthGuard (Segment 1.3).
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  tenantId: string | null;
}

/**
 * Extended request interface with our custom tenant + auth fields.
 * NestJS middleware receives this as the `req` argument.
 */
export interface AppRequest {
  headers: Record<string, string | string[] | undefined>;
  tenant?: TenantContext;
  user?: AuthUser;
  // Allow additional properties from NestJS/Fastify request
  [key: string]: unknown;
}
