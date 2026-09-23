import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — Mark a route as publicly accessible (skip JwtAuthGuard).
 * Applied to /health, /auth/*, and public tenant endpoints.
 *
 * Usage:
 *   @Public()
 *   @Get('health')
 *   health() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
