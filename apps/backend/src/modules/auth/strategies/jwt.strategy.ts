import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { RequestUser } from '@moby/shared'
import { AuthService } from '../auth.service'

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret')

export interface JwtPayload {
  sub: string
  typ: 'access'
  tenantId: string | null
  role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    })
  }

  validate(payload: JwtPayload): Promise<RequestUser> {
    return this.authService.validateJwtPayload(payload)
  }
}
