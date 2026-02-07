import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LaserMachinesService } from './laser-machines.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('laser-machines')
@UseGuards(JwtAuthGuard)
export class LaserMachinesController {
  constructor(private readonly service: LaserMachinesService) {}

  // ── Machine Profiles ──────────────────────────────────────────

  @Get()
  listMachines(@Query('userId') userId?: string) {
    return this.service.listMachines(userId);
  }

  @Get(':id')
  getMachine(@Param('id') id: string) {
    return this.service.getMachine(id);
  }

  @Post()
  createMachine(@Body() body: any) {
    return this.service.createMachine(body);
  }

  @Put(':id')
  updateMachine(@Param('id') id: string, @Body() body: any) {
    return this.service.updateMachine(id, body);
  }

  @Delete(':id')
  deleteMachine(@Param('id') id: string) {
    return this.service.deleteMachine(id);
  }

  @Post(':id/ping')
  pingMachine(@Param('id') id: string) {
    return this.service.pingMachine(id);
  }

  // ── Laser Jobs ────────────────────────────────────────────────

  @Get('jobs/list')
  listJobs(
    @Query('userId') userId?: string,
    @Query('machineId') machineId?: string,
    @Query('status') status?: any,
    @Query('limit') limit?: string,
  ) {
    return this.service.listJobs({
      userId,
      machineId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.service.getJob(id);
  }

  @Post('jobs')
  createJob(@Body() body: any) {
    return this.service.createJob(body);
  }

  @Post('jobs/:id/send')
  sendJobToMachine(@Param('id') id: string) {
    return this.service.sendJobToMachine(id);
  }

  @Put('jobs/:id/progress')
  updateJobProgress(@Param('id') id: string, @Body() body: any) {
    return this.service.updateJobProgress(id, body);
  }

  @Post('jobs/:id/cancel')
  cancelJob(@Param('id') id: string) {
    return this.service.cancelJob(id);
  }

  @Get('jobs/stats/:userId')
  getJobStats(@Param('userId') userId: string) {
    return this.service.getJobStats(userId);
  }
}
