import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { LaserPipelineService } from './laser-pipeline.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('laser-pipeline')
@UseGuards(JwtAuthGuard)
export class LaserPipelineController {
  constructor(private readonly service: LaserPipelineService) {}

  @Post('product-to-job')
  createJobFromProduct(@Body() body: any) {
    return this.service.createJobFromProduct(body);
  }

  @Post('product-to-listing')
  createListingFromProduct(@Body() body: any) {
    return this.service.createListingFromProduct(body);
  }

  @Post('full-pipeline')
  executeFullPipeline(@Body() body: any) {
    return this.service.executeFullPipeline(body);
  }

  @Post('batch-jobs')
  createBatchJobs(@Body() body: any) {
    return this.service.createBatchJobs(body);
  }
}
