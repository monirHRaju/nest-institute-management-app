import { SetMetadata } from '@nestjs/common';
import type { Role } from '@repo/shared';

export const ROLES_KEY = 'roles';

/**
 * @Roles(...roles) — Specify which roles can access a route.
 * Used together with RolesGuard (added in Segment 1.3).
 *
 * Usage:
 *   @Roles(Role.SUPER_ADMIN)
 *   @Get()
 *   findAll() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
