import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TodayQueueEntityType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TodayQueueService } from './production.today-queue.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackTodayQueueService = new TodayQueueService(prisma);

class PinDto {
  @IsEnum(TodayQueueEntityType)
  entityType!: TodayQueueEntityType;

  @IsString()
  @IsNotEmpty()
  id!: string;
}

@ApiTags('today-queue')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('today-queue')
export class TodayQueueController {
  constructor(private readonly todayQueueService: TodayQueueService) {}

  private getService(): TodayQueueService {
    return this.todayQueueService ?? fallbackTodayQueueService;
  }

  @Get()
  async getTodayQueue() {
    return this.getService().getTodayQueue();
  }

  @Post('pin')
  async pin(@Body() body: PinDto) {
    return this.getService().pin(body.entityType, body.id);
  }

  @Delete('pin')
  async unpin(@Body() body: PinDto) {
    return this.getService().unpin(body.entityType, body.id);
  }
}
