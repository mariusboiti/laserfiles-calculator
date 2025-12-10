import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PricingService, PriceDto } from './pricing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

class PriceRequestDto {
  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(1)
  widthMm!: number;

  @IsInt()
  @Min(1)
  heightMm!: number;

  @IsOptional()
  @IsNumber()
  wastePercent?: number;

  @IsOptional()
  @IsNumber()
  machineMinutes?: number;

  @IsOptional()
  @IsNumber()
  machineHourlyCost?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addOnIds?: string[];

  @IsOptional()
  @IsNumber()
  targetMarginPercent?: number;
}

@ApiTags('pricing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // Allowed for both ADMIN and WORKER
  @Post('preview')
  async preview(@Body() body: PriceRequestDto) {
    const dto: PriceDto = body;
    return this.pricingService.preview(dto);
  }

  // Persist price snapshot on an order item (ADMIN only)
  @Roles('ADMIN')
  @Post('orders/:orderId/items/:itemId')
  async priceOrderItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: PriceRequestDto,
    @User() user: any,
  ) {
    const dto: PriceDto = body;
    return this.pricingService.priceOrderItem(orderId, itemId, dto, user.sub);
  }
}
