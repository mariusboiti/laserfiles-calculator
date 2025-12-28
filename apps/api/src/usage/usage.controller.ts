import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

class ExportUsageDto {
  @IsString()
  @IsNotEmpty()
  toolKey!: string;
}

@ApiTags('usage')
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('export')
  async trackExport(@User() user: any, @Body() body: ExportUsageDto) {
    if (!body.toolKey) {
      throw new BadRequestException('toolKey is required');
    }

    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Missing user id in token');
    }

    const result = await this.usageService.trackExport(String(userId), body.toolKey);

    return result;
  }
}
