import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * JwtAuthGuard — Applied globally via APP_GUARD.
 *
 * Flow:
 *  1. Check @Public() metadata → if present, skip JWT validation entirely.
 *  2. Otherwise, validate Authorization: Bearer <token> via JwtStrategy.
 *  3. On success, req.user is populated with { userId, email, role, tenantId }.
 *  4. On failure, throws 401 UnauthorizedException.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check @Public() on handler or controller class
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }
}
