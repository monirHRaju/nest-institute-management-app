import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AppRequest, TenantContext } from '../types/request.types';

/**
 * @CurrentTenant() — Extract the resolved tenant from the request.
 *
 * Usage in a controller:
 *   findAll(@CurrentTenant('id') tenantId: string) { ... }
 *   getConfig(@CurrentTenant() tenant: TenantContext) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (
    data: keyof TenantContext | undefined,
    ctx: ExecutionContext,
  ): TenantContext | string | undefined => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    const tenant = request.tenant;
    const user = request.user;

    // 1. If property 'id' requested:
    if (data === 'id') {
      const id = tenant?.id || user?.tenantId;
      if (!id) {
        throw new UnauthorizedException(
          'Tenant context or authenticated tenant user required',
        );
      }
      return id;
    }

    // 2. If other specific property requested (e.g. 'slug', 'name'):
    if (data) {
      return tenant ? (tenant[data] as string) : undefined;
    }

    // 3. Return full TenantContext if available
    return tenant;
  },
);
