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
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderPriority, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackOrdersService = new OrdersService(prisma);

class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @IsOptional()
  @IsString()
  search?: string;
}

class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  widthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  heightMm?: number;

  @IsOptional()
  @IsString()
  customizationText?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}

class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

class UpdateStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

class AddOrderItemDto extends CreateOrderItemDto {}

class AddItemFromTemplateDto {
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
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  personalization?: any;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsString()
  templateProductId?: string;

  @IsOptional()
  @Type(() => Number)
  priceOverride?: number;
}

class BulkAddFromTemplateItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  personalization?: any;
}

class BulkAddFromTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAddFromTemplateItemDto)
  items!: BulkAddFromTemplateItemDto[];

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private getService(): OrdersService {
    return this.ordersService ?? fallbackOrdersService;
  }

  @Get()
  async list(@Query() query: any) {
    const params = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      status: query.status,
      customerId: query.customerId,
      priority: query.priority,
      search: query.search,
    };

    return this.getService().list(params);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().findOne(id);
  }

  @Get(':id/external-status')
  async getExternalStatus(@Param('id') id: string) {
    return this.getService().getExternalSyncStatus(id);
  }

  @Post()
  async create(@Body() body: CreateOrderDto, @User() user: any) {
    return this.getService().create(body, user.sub);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateOrderDto,
    @User() user: any,
  ) {
    return this.getService().update(id, body, user.sub);
  }

  // Quick status change for workers (mobile)
  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
    @User() user: any,
  ) {
    return this.getService().updateStatus(id, body.status, user.sub);
  }

  @Post(':id/external-status/retry')
  async retryExternalStatus(@Param('id') id: string) {
    return this.getService().retryExternalStatus(id);
  }

  @Post(':id/items')
  async addItem(
    @Param('id') id: string,
    @Body() body: AddOrderItemDto,
    @User() user: any,
  ) {
    return this.getService().addItem(id, body, user.sub);
  }

  @Patch(':orderId/items/:itemId')
  async updateItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: AddOrderItemDto,
    @User() user: any,
  ) {
    return this.getService().updateItem(orderId, itemId, body, user.sub);
  }

  @Post(':id/add-item-from-template')
  async addItemFromTemplate(
    @Param('id') id: string,
    @Body() body: AddItemFromTemplateDto,
    @User() user: any,
  ) {
    return this.getService().addItemFromTemplate(id, body, user.sub);
  }

  @Post(':id/bulk-add-from-template')
  async bulkAddFromTemplate(
    @Param('id') id: string,
    @Body() body: BulkAddFromTemplateDto,
    @User() user: any,
  ) {
    return this.getService().bulkAddFromTemplate(id, body, user.sub);
  }
}
