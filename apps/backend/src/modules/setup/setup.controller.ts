import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { BootstrapSetupDto, BootstrapSetupSchema } from './dto/bootstrap-setup.dto'
import { SetupService } from './setup.service'

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('status')
  @HttpCode(HttpStatus.OK)
  status() {
    return this.setupService.getStatus()
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('bootstrap')
  @HttpCode(HttpStatus.CREATED)
  bootstrap(@Body(new ZodPipe(BootstrapSetupSchema)) dto: BootstrapSetupDto) {
    return this.setupService.bootstrap(dto)
  }
}
