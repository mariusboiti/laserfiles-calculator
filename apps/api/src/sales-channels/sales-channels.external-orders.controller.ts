import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SalesChannelsExternalOrdersService } from './sales-channels.external-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class ListExternalOrdersQueryDto {
  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsString()
  processedState?: string;
}

@ApiTags('sales-channels')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales-channels/external-orders')
export class SalesChannelsExternalOrdersController {
  constructor(
    private readonly externalOrdersService: SalesChannelsExternalOrdersService,
  ) {}

  @Roles('ADMIN')
  @Get()
  async list(@Query() query: ListExternalOrdersQueryDto) {
    return this.externalOrdersService.list(query);
  }

  @Roles('ADMIN')
  @Get(':id/review')
  async review(@Param('id') id: string) {
    return this.externalOrdersService.getForReview(id);
  }

  @Roles('ADMIN')
  @Post(':id/create-internal')
  async createInternal(@Param('id') id: string) {
    return this.externalOrdersService.createInternalOrderFromExternal(id);
  }

  @Roles('ADMIN')
  @Post(':id/ignore')
  async ignore(@Param('id') id: string) {
    return this.externalOrdersService.markIgnored(id);
  }
}
