import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * LocalStrategy — validates email + password credentials for login.
 *
 * Used only by POST /auth/login.
 * On success, attaches the validated user to req.user so AuthController can issue tokens.
 *
 * Tenant context:
 * - SUPER_ADMIN can log in without any tenant header.
 * - All other roles require x-tenant-slug or subdomain to be resolved first
 *   (TenantMiddleware already attached req.tenant before this strategy runs).
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true, // give us req so we can read req.tenant
    });
  }

  async validate(
    req: { tenant?: { id: string } },
    email: string,
    password: string,
  ) {
    const tenantId = req.tenant?.id ?? null;
    const user = await this.authService.validateCredentials(
      email,
      password,
      tenantId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}
