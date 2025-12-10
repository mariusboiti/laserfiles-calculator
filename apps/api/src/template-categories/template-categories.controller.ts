import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TemplateCategoriesService } from './template-categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();
const fallbackTemplateCategoriesService = new TemplateCategoriesService(prisma);

class CreateTemplateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;
}

class UpdateTemplateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}

@ApiTags('template-categories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('template-categories')
export class TemplateCategoriesController {
  constructor(private readonly categoriesService: TemplateCategoriesService) {}

  private getService(): TemplateCategoriesService {
    return this.categoriesService ?? fallbackTemplateCategoriesService;
  }

  @Get()
  async list() {
    return this.getService().list();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getService().findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateTemplateCategoryDto) {
    return this.getService().create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTemplateCategoryDto) {
    return this.getService().update(id, body);
  }
}
