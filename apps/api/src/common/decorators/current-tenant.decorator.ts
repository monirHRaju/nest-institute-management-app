import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext } from '../types/request.types';

/**
 * @CurrentTenant() — Extract the resolved tenant (or a specific property like 'id') from the request.
 *
 * Usage in a controller:
 *   @Get()
 *   findAll(@CurrentTenant() tenant: TenantContext) { ... }
 *   findAll(@CurrentTenant('id') tenantId: string) { ... }
 *
 * Falls back to `request.user?.tenantId` when `data === 'id'` and no subdomain/header was provided.
 */
export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest();
    if (data === 'id') {
      return request.tenant?.id ?? request.user?.tenantId;
    }
    if (data) {
      return request.tenant?.[data];
    }
    return request.tenant;
  },
);
