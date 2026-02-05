import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackQuotesService = new QuotesService(prisma);

class QuotesPaginationQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

class CreateQuoteDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsObject()
  data!: any;
}

@ApiTags('quotes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  private getService(): QuotesService {
    return this.quotesService ?? fallbackQuotesService;
  }

  @Get()
  async list(@Query() query: QuotesPaginationQuery) {
    return this.getService().list(query);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().findOne(id);
  }

  @Post()
  async create(@Body() body: CreateQuoteDto) {
    return this.getService().create(body);
  }

  @Post(':id/create-order')
  async createOrderFromQuote(@Param('id') id: string, @User() user: any) {
    return this.getService().createOrderFromQuote(id, user.sub);
  }
}
