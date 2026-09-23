import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { Role } from '@repo/shared';
import type { JwtPayload } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  tenantId: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: Omit<ValidatedUser, never>;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── 1. Validate credentials (used by LocalStrategy) ─────────────────────────
  async validateCredentials(
    email: string,
    password: string,
    tenantId: string | null,
  ): Promise<ValidatedUser | null> {
    // Find user by email + tenantId
    // SUPER_ADMIN: tenantId = null → find with tenantId IS NULL
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) return null;

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
      tenantId: user.tenantId,
    };
  }

  // ── 2. Login — issue tokens + store session ──────────────────────────────────
  async login(
    user: ValidatedUser,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<LoginResult> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.storeRefreshToken(
      user.id,
      user.tenantId,
      userAgent,
      ipAddress,
    );

    return { accessToken, refreshToken, user };
  }

  // ── 3. Refresh — rotate refresh token ───────────────────────────────────────
  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tenantId: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Revoke old session (rotation)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const validatedUser: ValidatedUser = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role as Role,
      tenantId: session.user.tenantId,
    };

    const accessToken = this.generateAccessToken(validatedUser);
    const newRefreshToken = await this.storeRefreshToken(
      validatedUser.id,
      validatedUser.tenantId,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ── 4. Logout — revoke session ───────────────────────────────────────────────
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session
      .update({
        where: { refreshToken },
        data: { isRevoked: true },
      })
      .catch(() => {
        // Session not found or already revoked — silently ignore
      });
  }

  // ── 5. Get current user profile ──────────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        phone: true,
        isActive: true,
        createdAt: true,
        tenant: {
          select: { id: true, name: true, slug: true, plan: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private generateAccessToken(user: ValidatedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as any,
    });
  }

  private async storeRefreshToken(
    userId: string,
    tenantId: string | null,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const token = nanoid(64);
    const expiresInDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.session.create({
      data: {
        refreshToken: token,
        userId,
        tenantId,
        expiresAt,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      },
    });

    return token;
  }
}
