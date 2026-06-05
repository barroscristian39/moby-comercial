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
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Throttle } from '@nestjs/throttler'
import { FastifyReply, FastifyRequest } from 'fastify'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { RequestUser } from '@moby/shared'
import { AuthService } from './auth.service'
import {
  ForgotPasswordDto,
  ForgotPasswordSchema,
  LoginDto,
  LoginSchema,
  LoginVerificationDto,
  LoginVerificationResendDto,
  LoginVerificationResendSchema,
  LoginVerificationSchema,
  ResetPasswordDto,
  ResetPasswordSchema,
} from './dto/login.dto'

const REFRESH_COOKIE = 'refresh_token'
type CookieSameSite = 'strict' | 'lax' | 'none'

function resolveCookieSameSite(): CookieSameSite {
  const rawValue = process.env.COOKIE_SAME_SITE?.trim().toLowerCase()

  if (rawValue === 'strict' || rawValue === 'lax' || rawValue === 'none') {
    return rawValue
  }

  return process.env.NODE_ENV === 'production' ? 'none' : 'strict'
}

function resolveCookieSecure() {
  const rawValue = process.env.COOKIE_SECURE?.trim().toLowerCase()

  if (rawValue === 'true') return true
  if (rawValue === 'false') return false

  return process.env.NODE_ENV === 'production'
}

function buildRefreshCookieOptions() {
  const domain = process.env.COOKIE_DOMAIN?.trim()

  return {
    httpOnly: true,
    secure: resolveCookieSecure(),
    sameSite: resolveCookieSameSite(),
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    ...(domain ? { domain } : {}),
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodPipe(LoginSchema)) _body: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(
      (req as any).user,
      this.getMeta(req),
    )

    if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
      return {
        data: result,
      }
    }

    const authenticatedResult = result as Awaited<ReturnType<AuthService['verifyLoginCode']>>
    const { accessToken, refreshToken, user, context } = authenticatedResult

    ;(res as any).setCookie(REFRESH_COOKIE, refreshToken, buildRefreshCookieOptions())

    return {
      data: { accessToken, user, context },
    }
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  async verifyLogin(
    @Body(new ZodPipe(LoginVerificationSchema)) dto: LoginVerificationDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { accessToken, refreshToken, user, context } = await this.authService.verifyLoginCode(
      dto.challengeId,
      dto.code,
      this.getMeta(req),
    )

    ;(res as any).setCookie(REFRESH_COOKIE, refreshToken, buildRefreshCookieOptions())

    return {
      data: { accessToken, user, context },
    }
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login/resend')
  @HttpCode(HttpStatus.OK)
  async resendLoginVerification(
    @Body(new ZodPipe(LoginVerificationResendSchema)) dto: LoginVerificationResendDto,
    @Req() req: FastifyRequest,
  ) {
    return {
      data: await this.authService.resendLoginCode(dto.challengeId, this.getMeta(req)),
    }
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const rawToken = (req as any).cookies?.[REFRESH_COOKIE]
    if (!rawToken) {
      throw new UnauthorizedException({
        error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token não encontrado', statusCode: 401 },
      })
    }

    const { accessToken, refreshToken, user, context } = await this.authService.refresh(
      rawToken,
      this.getMeta(req),
    )

    ;(res as any).setCookie(REFRESH_COOKIE, refreshToken, buildRefreshCookieOptions())

    return {
      data: { accessToken, user, context },
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() currentUser: RequestUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.authService.logout(currentUser, this.getMeta(req))
    ;(res as any).clearCookie(REFRESH_COOKIE, buildRefreshCookieOptions())
    return null
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() currentUser: RequestUser) {
    return { data: currentUser }
  }

  @UseGuards(JwtAuthGuard)
  @Get('context')
  async context(@CurrentUser() currentUser: RequestUser) {
    return { data: await this.authService.getAccessContext(currentUser) }
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodPipe(ForgotPasswordSchema)) dto: ForgotPasswordDto,
    @Req() req: FastifyRequest,
  ) {
    return { data: await this.authService.forgotPassword(dto.email, this.getMeta(req)) }
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodPipe(ResetPasswordSchema)) dto: ResetPasswordDto,
    @Req() req: FastifyRequest,
  ) {
    return { data: await this.authService.resetPassword(dto.email, dto.code, dto.password, this.getMeta(req)) }
  }

  private getMeta(req: FastifyRequest) {
    const forwardedFor = req.headers['x-forwarded-for']
    const userAgentHeader = req.headers['user-agent']
    const resolvedForwardedFor =
      Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : typeof forwardedFor === 'string'
          ? forwardedFor
          : null
    const resolvedUserAgent =
      Array.isArray(userAgentHeader)
        ? userAgentHeader[0]
        : typeof userAgentHeader === 'string'
          ? userAgentHeader
          : null

    return {
      ip: resolvedForwardedFor ?? req.ip ?? null,
      userAgent: resolvedUserAgent,
    }
  }
}
