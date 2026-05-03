import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { FastifyRequest } from 'fastify'
import { AuthService } from '../auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email', passReqToCallback: true })
  }

  async validate(req: FastifyRequest, email: string, password: string) {
    const user = await this.authService.validateUser(email, password, {
      ip: (req.headers['x-forwarded-for'] as string) || req.ip,
      userAgent: req.headers['user-agent'],
    })
    if (!user) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos', statusCode: 401 },
      })
    }
    return user
  }
}
