import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SeasonsService } from './production.seasons.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackSeasonsService = new SeasonsService(prisma);

class CreateSeasonDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateSeasonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

@ApiTags('seasons')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  private getService(): SeasonsService {
    return this.seasonsService ?? fallbackSeasonsService;
  }

  @Get()
  async list() {
    return this.getService().list();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().get(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateSeasonDto) {
    return this.getService().create({
      name: body.name,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: body.isActive,
      notes: body.notes ?? null,
    });
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateSeasonDto) {
    return this.getService().update(id, {
      name: body.name,
      startDate:
        typeof body.startDate === 'string'
          ? new Date(body.startDate)
          : body.startDate === null
          ? null
          : undefined,
      endDate:
        typeof body.endDate === 'string'
          ? new Date(body.endDate)
          : body.endDate === null
          ? null
          : undefined,
      isActive: body.isActive,
      notes:
        typeof body.notes !== 'undefined'
          ? body.notes === null
            ? null
            : body.notes
          : undefined,
    });
  }

  @Roles('ADMIN')
  @Post(':id/set-active')
  async setActive(@Param('id') id: string) {
    return this.getService().setActive(id);
  }
}
