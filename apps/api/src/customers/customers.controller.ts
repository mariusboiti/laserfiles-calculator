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
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

class CustomersListQuery {
  @IsOptional()
  @IsString()
  search?: string;
}

class CreateCustomerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackCustomersService = new CustomersService(prisma);

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  private getService(): CustomersService {
    return this.customersService ?? fallbackCustomersService;
  }

  @Get()
  async list(@Query() query: CustomersListQuery) {
    return this.getService().list({ search: query.search });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateCustomerDto) {
    return this.getService().create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateCustomerDto) {
    return this.getService().update(id, body);
  }
}
