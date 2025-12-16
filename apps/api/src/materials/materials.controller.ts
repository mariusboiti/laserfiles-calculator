import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { StockMovementType, MaterialCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackMaterialsService = new MaterialsService(prisma);

class PaginationQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(MaterialCategory)
  category!: MaterialCategory;

  @IsInt()
  @Min(1)
  thicknessMm!: number;

  @IsEnum(['SHEET', 'M2'] as any)
  unitType!: 'SHEET' | 'M2';

  @IsOptional()
  @IsNumber()
  costPerSheet?: number;

  @IsOptional()
  @IsNumber()
  costPerM2?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sheetWidthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sheetHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsNumber()
  defaultWastePercent?: number;
}

class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(MaterialCategory)
  category?: MaterialCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  thicknessMm?: number;

  @IsOptional()
  @IsEnum(['SHEET', 'M2'] as any)
  unitType?: 'SHEET' | 'M2';

  @IsOptional()
  @IsNumber()
  costPerSheet?: number | null;

  @IsOptional()
  @IsNumber()
  costPerM2?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  sheetWidthMm?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  sheetHeightMm?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsNumber()
  defaultWastePercent?: number | null;
}

class CreateStockMovementDto {
  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @IsInt()
  @Min(0)
  qty!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('materials')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  private getService(): MaterialsService {
    return this.materialsService ?? fallbackMaterialsService;
  }

  @Get('categories')
  async getCategories() {
    return [
      { label: 'Plywood', value: 'PLYWOOD' },
      { label: 'MDF', value: 'MDF' },
      { label: 'Acrylic', value: 'ACRYLIC' },
      { label: 'Mirror Acrylic', value: 'MIRROR_ACRYLIC' },
      { label: 'Other', value: 'OTHER' },
    ];
  }

  @Get()
  async list(@Query() query: PaginationQuery) {
    return this.getService().list({
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateMaterialDto) {
    return this.getService().create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateMaterialDto) {
    return this.getService().update(id, body);
  }

  @Get(':id/stock-movements')
  async listStockMovements(@Param('id') id: string) {
    return this.getService().listStockMovements(id);
  }

  @Roles('ADMIN')
  @Post(':id/stock-movements')
  async createStockMovement(
    @Param('id') id: string,
    @Body() body: CreateStockMovementDto,
  ) {
    return this.getService().createStockMovement(id, body);
  }
}
