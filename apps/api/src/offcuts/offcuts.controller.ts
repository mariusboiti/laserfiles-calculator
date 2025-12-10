import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppGlobals } from '../app.globals';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import {
  MaterialCategory,
  OffcutCondition,
  OffcutShapeType,
  OffcutStatus,
} from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { EntitlementsGuard } from '../common/guards/entitlements.guard';
import { RequiresFeatures } from '../common/decorators/features.decorator';
import { Entitlements as EntitlementsParam } from '../common/decorators/entitlements.decorator';
import type { IdentityEntitlements } from '@laser/shared/entitlements';
import { OffcutsService } from './offcuts.service';

class OffcutsListQueryDto {
  @IsOptional()
  @IsEnum(MaterialCategory)
  materialCategory?: MaterialCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  thicknessMm?: number;

  @IsOptional()
  @IsEnum(OffcutStatus)
  status?: OffcutStatus;

  @IsOptional()
  @IsEnum(OffcutCondition)
  condition?: OffcutCondition;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

class CreateOffcutDto {
  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsInt()
  thicknessMm!: number;

  @IsEnum(OffcutShapeType)
  shapeType!: OffcutShapeType;

  @IsOptional()
  @IsInt()
  @Min(1)
  widthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  heightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  boundingBoxWidthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  boundingBoxHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedAreaMm2?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  locationLabel?: string;

  @IsOptional()
  @IsEnum(OffcutCondition)
  condition?: OffcutCondition;

  @IsOptional()
  @IsEnum(OffcutStatus)
  status?: OffcutStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateOffcutDto {
  @IsOptional()
  @IsInt()
  thicknessMm?: number;

  @IsOptional()
  @IsInt()
  widthMm?: number | null;

  @IsOptional()
  @IsInt()
  heightMm?: number | null;

  @IsOptional()
  @IsInt()
  boundingBoxWidthMm?: number | null;

  @IsOptional()
  @IsInt()
  boundingBoxHeightMm?: number | null;

  @IsOptional()
  @IsInt()
  estimatedAreaMm2?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  locationLabel?: string | null;

  @IsOptional()
  @IsEnum(OffcutCondition)
  condition?: OffcutCondition;

  @IsOptional()
  @IsEnum(OffcutStatus)
  status?: OffcutStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

class ReserveOffcutDto {
  @IsOptional()
  @IsString()
  orderItemId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}

class UseFullOffcutDto extends ReserveOffcutDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

class UsePartialOffcutDto extends UseFullOffcutDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  usedAreaMm2?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usedWidthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usedHeightMm?: number;
}

class SuggestionsQueryDto {
  @IsString()
  @IsNotEmpty()
  orderItemId!: string;
}

@ApiTags('offcuts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, EntitlementsGuard, RolesGuard)
@RequiresFeatures('offcuts')
@Controller('offcuts')
export class OffcutsController {
  private get offcutsService(): OffcutsService {
    const svc = AppGlobals.offcutsService;
    if (!svc) {
      throw new InternalServerErrorException('OffcutsService not initialized');
    }
    return svc;
  }

  @Get()
  async list(@Query() query: OffcutsListQueryDto) {
    return this.offcutsService.listOffcuts({
      materialCategory: query.materialCategory,
      thicknessMm: query.thicknessMm,
      status: query.status,
      condition: query.condition,
      location: query.location,
      search: query.search,
    });
  }

  @Get('usages')
  async listUsages() {
    return this.offcutsService.listUsages();
  }

  @Get('reservations')
  async listReservations() {
    return this.offcutsService.listReservations();
  }

  @Get('suggestions')
  async suggestions(@Query() query: SuggestionsQueryDto) {
    return this.offcutsService.suggestionsForOrderItem(query.orderItemId);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.offcutsService.getOffcut(id);
  }

  @Roles('ADMIN', 'WORKER')
  @Post()
  async create(
    @Body() body: CreateOffcutDto,
    @User() user: any,
    @EntitlementsParam() entitlements: IdentityEntitlements | undefined,
  ) {
    const limit = entitlements?.limits?.max_offcuts_tracked;
    if (typeof limit === 'number' && limit > 0) {
      const currentCount = await this.offcutsService.countActiveOffcuts();
      const quantity = body.quantity ?? 1;
      if (currentCount + quantity > limit) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'LIMIT_REACHED',
          limitKey: 'max_offcuts_tracked',
          limit,
          current: currentCount,
          attemptedToAdd: quantity,
        } as any);
      }
    }

    return this.offcutsService.createOffcut({
      materialId: body.materialId,
      thicknessMm: body.thicknessMm,
      shapeType: body.shapeType,
      widthMm: body.widthMm,
      heightMm: body.heightMm,
      boundingBoxWidthMm: body.boundingBoxWidthMm,
      boundingBoxHeightMm: body.boundingBoxHeightMm,
      estimatedAreaMm2: body.estimatedAreaMm2,
      quantity: body.quantity,
      locationLabel: body.locationLabel,
      condition: body.condition,
      status: body.status,
      notes: body.notes,
      createdByUserId: user?.sub ?? null,
    });
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateOffcutDto) {
    return this.offcutsService.updateOffcut(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.offcutsService.softDeleteOffcut(id);
  }

  @Roles('ADMIN', 'WORKER')
  @Post(':id/reserve')
  async reserve(@Param('id') id: string, @Body() body: ReserveOffcutDto, @User() user: any) {
    return this.offcutsService.reserveOffcut(id, {
      orderItemId: body.orderItemId,
      batchId: body.batchId,
      userId: user?.sub,
    });
  }

  @Roles('ADMIN', 'WORKER')
  @Post(':id/use-full')
  async useFull(@Param('id') id: string, @Body() body: UseFullOffcutDto, @User() user: any) {
    return this.offcutsService.useFull(id, {
      orderItemId: body.orderItemId,
      batchId: body.batchId,
      notes: body.notes,
      userId: user?.sub,
    });
  }

  @Roles('ADMIN', 'WORKER')
  @Post(':id/use-partial')
  async usePartial(@Param('id') id: string, @Body() body: UsePartialOffcutDto, @User() user: any) {
    return this.offcutsService.usePartial(id, {
      orderItemId: body.orderItemId,
      batchId: body.batchId,
      notes: body.notes,
      userId: user?.sub,
      usedAreaMm2: body.usedAreaMm2,
      usedWidthMm: body.usedWidthMm,
      usedHeightMm: body.usedHeightMm,
    });
  }
}
