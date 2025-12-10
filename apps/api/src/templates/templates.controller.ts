import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TemplateFieldType, TemplateRuleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsGuard } from '../common/guards/entitlements.guard';
import { RequiresFeatures } from '../common/decorators/features.decorator';
import { Entitlements as EntitlementsParam } from '../common/decorators/entitlements.decorator';
import type { IdentityEntitlements } from '@laser/shared/entitlements';

const prisma = new PrismaService();
const fallbackTemplatesService = new TemplatesService(prisma);

class TemplatesListQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  defaultMaterialId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  baseWidthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  baseHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  layersCount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  defaultMaterialId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  baseWidthMm?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  baseHeightMm?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  layersCount?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  defaultMaterialId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  widthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  heightMm?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  defaultMaterialId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  widthMm?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  heightMm?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateFieldDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsEnum(TemplateFieldType)
  fieldType!: TemplateFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsNumber()
  minNumber?: number;

  @IsOptional()
  @IsNumber()
  maxNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxLength?: number;

  @IsOptional()
  optionsJson?: any;

  @IsOptional()
  @IsBoolean()
  affectsPricing?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsProductionNotes?: boolean;
}

class UpdateFieldDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsEnum(TemplateFieldType)
  fieldType?: TemplateFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsNumber()
  minNumber?: number | null;

  @IsOptional()
  @IsNumber()
  maxNumber?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxLength?: number | null;

  @IsOptional()
  optionsJson?: any;

  @IsOptional()
  @IsBoolean()
  affectsPricing?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsProductionNotes?: boolean;
}

class CreatePricingRuleDto {
  @IsEnum(TemplateRuleType)
  ruleType!: TemplateRuleType;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  appliesWhenJson?: any;

  @IsOptional()
  @IsInt()
  priority?: number;
}

class UpdatePricingRuleDto {
  @IsOptional()
  @IsEnum(TemplateRuleType)
  ruleType?: TemplateRuleType;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  variantId?: string | null;

  @IsOptional()
  appliesWhenJson?: any;

  @IsOptional()
  @IsInt()
  priority?: number;
}

@ApiTags('templates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, EntitlementsGuard, RolesGuard)
@RequiresFeatures('templates_basic')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  private getService(): TemplatesService {
    return this.templatesService ?? fallbackTemplatesService;
  }

  @Get()
  async list(@Query() query: TemplatesListQuery) {
    return this.getService().list({
      search: query.search,
      categoryId: query.categoryId,
      isActive: query.isActive,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(
    @Body() body: CreateTemplateDto,
    @EntitlementsParam() entitlements: IdentityEntitlements | undefined,
  ) {
    const limit = entitlements?.limits?.max_templates;
    const ignoreLimit = !!entitlements?.features?.templates_unlimited;
    if (!ignoreLimit && typeof limit === 'number' && limit > 0) {
      const currentCount = await this.getService().countTemplates();
      if (currentCount + 1 > limit) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'LIMIT_REACHED',
          limitKey: 'max_templates',
          limit,
          current: currentCount,
          attemptedToAdd: 1,
        } as any);
      }
    }

    return this.getService().create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTemplateDto) {
    return this.getService().update(id, body);
  }

  @Roles('ADMIN')
  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @EntitlementsParam() entitlements: IdentityEntitlements | undefined,
  ) {
    const limit = entitlements?.limits?.max_templates;
    const ignoreLimit = !!entitlements?.features?.templates_unlimited;
    if (!ignoreLimit && typeof limit === 'number' && limit > 0) {
      const currentCount = await this.getService().countTemplates();
      if (currentCount + 1 > limit) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'LIMIT_REACHED',
          limitKey: 'max_templates',
          limit,
          current: currentCount,
          attemptedToAdd: 1,
        } as any);
      }
    }

    return this.getService().duplicate(id);
  }

  @Get(':id/variants')
  async listVariants(@Param('id') id: string) {
    return this.getService().listVariants(id);
  }

  @Roles('ADMIN')
  @Post(':id/variants')
  async createVariant(@Param('id') id: string, @Body() body: CreateVariantDto) {
    return this.getService().createVariant(id, body);
  }

  @Roles('ADMIN')
  @Patch(':id/variants/:variantId')
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() body: UpdateVariantDto,
  ) {
    return this.getService().updateVariant(id, variantId, body);
  }

  @Get(':id/fields')
  async listFields(@Param('id') id: string) {
    return this.getService().listFields(id);
  }

  @Roles('ADMIN')
  @Post(':id/fields')
  async createField(@Param('id') id: string, @Body() body: CreateFieldDto) {
    return this.getService().createField(id, body as any);
  }

  @Roles('ADMIN')
  @Patch(':id/fields/:fieldId')
  async updateField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() body: UpdateFieldDto,
  ) {
    return this.getService().updateField(id, fieldId, body as any);
  }

  @Get(':id/pricing-rules')
  async listPricingRules(@Param('id') id: string) {
    return this.getService().listPricingRules(id);
  }

  @Roles('ADMIN')
  @Post(':id/pricing-rules')
  async createPricingRule(
    @Param('id') id: string,
    @Body() body: CreatePricingRuleDto,
  ) {
    return this.getService().createPricingRule(id, body as any);
  }

  @Roles('ADMIN')
  @Patch(':id/pricing-rules/:ruleId')
  async updatePricingRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() body: UpdatePricingRuleDto,
  ) {
    return this.getService().updatePricingRule(id, ruleId, body as any);
  }
}
