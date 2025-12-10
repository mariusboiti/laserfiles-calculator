import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BatchPriority, BatchStatus, BatchType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BatchesService } from './production.batches.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackBatchesService = new BatchesService(prisma);

class ListBatchesQueryDto {
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsDateString()
  targetDateFrom?: string;

  @IsOptional()
  @IsDateString()
  targetDateTo?: string;
}

class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsEnum(BatchType)
  batchType!: BatchType;

  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @IsOptional()
  @IsEnum(BatchPriority)
  priority?: BatchPriority;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  defaultMaterialId?: string | null;

  @IsOptional()
  @IsString()
  defaultVariantId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

class UpdateBatchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  seasonId?: string | null;

  @IsOptional()
  @IsEnum(BatchType)
  batchType?: BatchType;

  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @IsOptional()
  @IsEnum(BatchPriority)
  priority?: BatchPriority;

  @IsOptional()
  @IsDateString()
  targetDate?: string | null;

  @IsOptional()
  @IsString()
  defaultMaterialId?: string | null;

  @IsOptional()
  @IsString()
  defaultVariantId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

class CreateBatchFromFilterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(BatchType)
  batchType!: BatchType;

  @IsOptional()
  @IsEnum(BatchPriority)
  priority?: BatchPriority;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  seasonFilterId?: string;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @IsString()
  orderPriority?: string;
}

class ModifyBatchItemsDto {
  @IsArray()
  @IsString({ each: true })
  orderItemIds!: string[];
}

class CreateBatchTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;
}

class UpdateBatchTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string | null;
}

@ApiTags('batches')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  private getService(): BatchesService {
    return this.batchesService ?? fallbackBatchesService;
  }

  @Get()
  async list(@Query() query: ListBatchesQueryDto) {
    return this.getService().list({
      status: query.status,
      seasonId: query.seasonId,
      templateId: query.templateId,
      targetDateFrom: query.targetDateFrom ? new Date(query.targetDateFrom) : undefined,
      targetDateTo: query.targetDateTo ? new Date(query.targetDateTo) : undefined,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().get(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateBatchDto) {
    return this.getService().create({
      name: body.name,
      seasonId: body.seasonId,
      batchType: body.batchType,
      status: body.status,
      priority: body.priority,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      defaultMaterialId:
        typeof body.defaultMaterialId !== 'undefined' ? body.defaultMaterialId : undefined,
      defaultVariantId:
        typeof body.defaultVariantId !== 'undefined' ? body.defaultVariantId : undefined,
      notes:
        typeof body.notes !== 'undefined'
          ? body.notes === null
            ? null
            : body.notes
          : undefined,
    });
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateBatchDto) {
    return this.getService().update(id, {
      name: body.name,
      seasonId:
        typeof body.seasonId !== 'undefined'
          ? body.seasonId === null
            ? null
            : body.seasonId
          : undefined,
      batchType: body.batchType,
      status: body.status,
      priority: body.priority,
      targetDate:
        typeof body.targetDate !== 'undefined'
          ? body.targetDate === null
            ? null
            : new Date(body.targetDate)
          : undefined,
      defaultMaterialId:
        typeof body.defaultMaterialId !== 'undefined'
          ? body.defaultMaterialId
          : undefined,
      defaultVariantId:
        typeof body.defaultVariantId !== 'undefined'
          ? body.defaultVariantId
          : undefined,
      notes:
        typeof body.notes !== 'undefined'
          ? body.notes === null
            ? null
            : body.notes
          : undefined,
    });
  }

  @Roles('ADMIN')
  @Post('from-filter')
  async createFromFilter(@Body() body: CreateBatchFromFilterDto) {
    return this.getService().createFromFilter({
      name: body.name,
      batchType: body.batchType,
      priority: body.priority,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      seasonId: body.seasonId,
      templateId: body.templateId,
      variantId: body.variantId,
      seasonFilterId: body.seasonFilterId,
      orderStatus: body.orderStatus,
      orderPriority: body.orderPriority,
    });
  }

  @Roles('ADMIN')
  @Post(':id/items')
  async addItems(@Param('id') id: string, @Body() body: ModifyBatchItemsDto) {
    return this.getService().addItems(id, body.orderItemIds || []);
  }

  @Roles('ADMIN')
  @Patch(':id/items/remove')
  async removeItems(@Param('id') id: string, @Body() body: ModifyBatchItemsDto) {
    return this.getService().removeItems(id, body.orderItemIds || []);
  }

  @Get(':id/items')
  async listItems(@Param('id') id: string) {
    return this.getService().listItems(id);
  }

  @Get(':id/forecast')
  async forecast(@Param('id') id: string) {
    return this.getService().forecast(id);
  }

  @Get(':id/tasks')
  async listTasks(@Param('id') id: string) {
    return this.getService().listTasks(id);
  }

  @Roles('ADMIN')
  @Post(':id/tasks')
  async createTask(@Param('id') id: string, @Body() body: CreateBatchTaskDto) {
    return this.getService().createTask(id, {
      title: body.title,
      assignedUserId: body.assignedUserId,
    });
  }

  @Roles('ADMIN')
  @Patch(':id/tasks/:taskId')
  async updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateBatchTaskDto,
  ) {
    return this.getService().updateTask(id, taskId, {
      title: body.title,
      status: body.status,
      assignedUserId: body.assignedUserId,
    });
  }
}
