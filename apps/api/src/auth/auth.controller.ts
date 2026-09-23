import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoginSchema } from '@repo/shared';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/request.types';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Validates credentials, issues access token + sets HttpOnly refresh cookie.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  @ApiBody({ schema: { example: { email: 'admin@mtech.com', password: 'Admin123!' } } })
  @ApiResponse({ status: 200, description: 'Login successful, returns accessToken' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // Validate request body with Zod
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      throw new UnauthorizedException('Invalid request body');
    }
    const { email, password } = result.data;

    // Validate credentials (tenantId from TenantMiddleware, null for SUPER_ADMIN)
    const tenantContext = (req as unknown as { tenant?: { id: string } }).tenant;
    const tenantId = tenantContext?.id ?? null;

    const user = await this.authService.validateCredentials(email, password, tenantId);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { accessToken, refreshToken } = await this.authService.login(
      user,
      userAgent,
      ipAddress,
    );

    // Set HttpOnly refresh token cookie
    res.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return {
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
      },
    };
  }

  /**
   * POST /api/v1/auth/refresh
   * Reads HttpOnly cookie, rotates refresh token, returns new access token.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ApiResponse({ status: 200, description: 'New access token issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { accessToken, refreshToken } = await this.authService.refreshToken(token);

    // Rotate cookie
    res.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60,
    });

    return { success: true, data: { accessToken } };
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes session and clears refresh token cookie.
   */
  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — revoke session and clear cookie' })
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * GET /api/v1/auth/me
   * Returns the current authenticated user's profile.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.authService.getProfile(user.userId);
    return { success: true, data: profile };
  }
}
