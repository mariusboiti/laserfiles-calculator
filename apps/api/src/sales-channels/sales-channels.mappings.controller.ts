import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SalesChannelsMappingsService } from './sales-channels.mappings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class ListMappingsQueryDto {
  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

class SuggestionsQueryDto {
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minScore?: number;
}

class CreateMappingDto {
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  externalProductId!: string;

  @IsString()
  @IsNotEmpty()
  externalProductName!: string;

  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsString()
  templateProductId?: string;

  @IsOptional()
  personalizationMappingJson?: any;

  @IsOptional()
  @IsEnum(['USE_TEMPLATE_RULES', 'EXTERNAL_PRICE_IGNORE', 'PRICE_OVERRIDE'])
  pricingMode?: 'USE_TEMPLATE_RULES' | 'EXTERNAL_PRICE_IGNORE' | 'PRICE_OVERRIDE';

  @IsOptional()
  priceOverride?: number | null;
}

class ApplySuggestionsDto {
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minScore?: number;
}

class UpdateMappingDto {
  @IsOptional()
  @IsString()
  externalProductName?: string;

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
  @IsString()
  templateProductId?: string;

  @IsOptional()
  personalizationMappingJson?: any;

  @IsOptional()
  @IsEnum(['USE_TEMPLATE_RULES', 'EXTERNAL_PRICE_IGNORE', 'PRICE_OVERRIDE'])
  pricingMode?: 'USE_TEMPLATE_RULES' | 'EXTERNAL_PRICE_IGNORE' | 'PRICE_OVERRIDE';

  @IsOptional()
  priceOverride?: number | null;
}

@ApiTags('sales-channels')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales-channels/mappings')
export class SalesChannelsMappingsController {
  constructor(private readonly mappingsService: SalesChannelsMappingsService) {}

  @Roles('ADMIN')
  @Get()
  async list(@Query() query: ListMappingsQueryDto) {
    return this.mappingsService.list(query);
  }

  @Roles('ADMIN')
  @Get('suggestions')
  async suggestions(@Query() query: SuggestionsQueryDto) {
    return this.mappingsService.suggestForConnection(
      query.connectionId,
      typeof query.minScore === 'number' ? query.minScore : undefined,
    );
  }

  @Roles('ADMIN')
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.mappingsService.get(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateMappingDto) {
    return this.mappingsService.create(body);
  }

  @Roles('ADMIN')
  @Post('suggestions/apply-high-confidence')
  async applyHighConfidence(@Body() body: ApplySuggestionsDto) {
    const minScore = typeof body.minScore === 'number' ? body.minScore : 80;
    return this.mappingsService.applyHighConfidence(body.connectionId, minScore);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateMappingDto) {
    return this.mappingsService.update(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.mappingsService.remove(id);
  }
}
