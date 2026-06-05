import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { RequestUser } from '@moby/shared'
import { AuthService } from '../auth.service'

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret')
const jwtIssuer = process.env.JWT_ISSUER || 'moby.backend'
const jwtAudience = process.env.JWT_AUDIENCE || 'moby.frontend'

export interface JwtPayload {
  sub: string
  typ: 'access'
  tenantId: string | null
  role: string
  sessionVersion: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      issuer: jwtIssuer,
      audience: jwtAudience,
    })
  }

  validate(payload: JwtPayload): Promise<RequestUser> {
    return this.authService.validateJwtPayload(payload)
  }
}
