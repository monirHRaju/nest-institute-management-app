import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/request.types';

/**
 * @CurrentUser() — Extract authenticated user from request.
 * Populated by JwtAuthGuard → JwtStrategy after token validation.
 *
 * Usage:
 *   @Get('me')
 *   getProfile(@CurrentUser() user: AuthUser) { ... }
 *
 * Returns undefined on @Public() routes (no auth performed).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
