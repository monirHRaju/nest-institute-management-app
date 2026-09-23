import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext } from '../types/request.types';

/**
 * @CurrentTenant() — Extract the resolved tenant from the request.
 *
 * Usage in a controller:
 *   @Get()
 *   findAll(@CurrentTenant() tenant: TenantContext) { ... }
 *
 * Returns undefined if the route is not tenant-scoped (e.g., SUPER_ADMIN route).
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
