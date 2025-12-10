import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateProductsService } from './template-products.service';

class TemplateProductsListQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

class CreateTemplateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  defaultQuantity!: number;

  @IsOptional()
  personalizationJson?: any;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceOverride?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

class UpdateTemplateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  defaultQuantity?: number;

  @IsOptional()
  personalizationJson?: any;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceOverride?: number | null;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

const prisma = new PrismaService();
const fallbackTemplateProductsService = new TemplateProductsService(prisma);

@ApiTags('template-products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('template-products')
export class TemplateProductsController {
  constructor(private readonly templateProductsService: TemplateProductsService) {}

  private getService(): TemplateProductsService {
    return this.templateProductsService ?? fallbackTemplateProductsService;
  }

  @Roles('ADMIN')
  @Get()
  async list(@Query() query: TemplateProductsListQuery) {
    return this.getService().list(query);
  }

  @Roles('ADMIN')
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateTemplateProductDto) {
    return this.getService().create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTemplateProductDto) {
    return this.getService().update(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.getService().remove(id);
  }
}
