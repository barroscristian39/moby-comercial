import { Module } from '@nestjs/common'
import { JobFunctionsController } from './job-functions.controller'
import { JobFunctionsService } from './job-functions.service'
import { JobFunctionsRepository } from './job-functions.repository'

@Module({
  controllers: [JobFunctionsController],
  providers: [JobFunctionsService, JobFunctionsRepository],
  exports: [JobFunctionsService, JobFunctionsRepository],
})
export class JobFunctionsModule {}
