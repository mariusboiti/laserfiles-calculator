import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('files')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('orders/:orderId')
  async listForOrder(@Param('orderId') orderId: string) {
    return this.filesService.listForOrder(orderId);
  }

  @Get('orders/:orderId/items/:itemId')
  async listForOrderItem(@Param('orderId') orderId: string, @Param('itemId') itemId: string) {
    return this.filesService.listForOrderItem(orderId, itemId);
  }

  @Post('orders/:orderId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'uploads',
    }),
  )
  async uploadForOrder(
    @Param('orderId') orderId: string,
    @UploadedFile() file: any,
  ) {
    return this.filesService.addForOrder(orderId, file);
  }

  @Post('orders/:orderId/items/:itemId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'uploads',
    }),
  )
  async uploadForOrderItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: any,
  ) {
    return this.filesService.addForOrderItem(orderId, itemId, file);
  }
}
