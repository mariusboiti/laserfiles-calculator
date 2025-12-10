import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SalesChannelsConnectionsService } from './sales-channels.connections.service';
import { AppGlobals } from '../app.globals';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EntitlementsGuard } from '../common/guards/entitlements.guard';
import { RequiresFeatures } from '../common/decorators/features.decorator';

class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['WOOCOMMERCE', 'ETSY', 'CSV'])
  channel!: 'WOOCOMMERCE' | 'ETSY' | 'CSV';

  @IsOptional()
  credentialsJson?: any;

  @IsOptional()
  settingsJson?: any;
}

class UpdateConnectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  credentialsJson?: any;

  @IsOptional()
  settingsJson?: any;
}

@ApiTags('sales-channels')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, EntitlementsGuard, RolesGuard)
@RequiresFeatures('sales_channels_import')
@Controller('sales-channels/connections')
export class SalesChannelsConnectionsController {
  private get connectionsService(): SalesChannelsConnectionsService {
    const svc = AppGlobals.salesChannelsConnectionsService;
    if (!svc) {
      throw new InternalServerErrorException('SalesChannelsConnectionsService not initialized');
    }
    return svc;
  }

  @Roles('ADMIN')
  @Get()
  async list() {
    return this.connectionsService.list();
  }

  @Roles('ADMIN')
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.connectionsService.get(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateConnectionDto) {
    return this.connectionsService.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateConnectionDto) {
    return this.connectionsService.update(id, body);
  }

  @Roles('ADMIN')
  @Post(':id/test')
  async test(@Param('id') id: string) {
    return this.connectionsService.test(id);
  }

  @Roles('ADMIN')
  @Post(':id/sync')
  async sync(@Param('id') id: string) {
    return this.connectionsService.syncNow(id);
  }
}
