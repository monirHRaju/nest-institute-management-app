import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { Role } from '@repo/shared';
import type { AuthUser } from '../../common/types/request.types';

/**
 * RolesGuard — Applied globally via APP_GUARD (after JwtAuthGuard).
 *
 * Flow:
 *  1. Read @Roles(...) metadata from handler or controller.
 *  2. If no @Roles() is declared → allow (guard is a no-op for public or unscoped routes).
 *  3. If @Roles() present → check req.user.role against allowed roles.
 *  4. On mismatch → throws 403 ForbiddenException.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() → open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied — no user context');
    }

    const hasRole = requiredRoles.includes(user.role as Role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied — required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
