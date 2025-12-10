import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TimeLogsService } from './time-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../common/decorators/user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('time-logs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-logs')
export class TimeLogsController {
  constructor(private readonly timeLogsService: TimeLogsService) {}

  @Get('orders/:orderId/items/:itemId')
  async listForItem(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.timeLogsService.listForItem(orderId, itemId);
  }

  @Post('orders/:orderId/items/:itemId/start')
  async start(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @User() user: any,
  ) {
    return this.timeLogsService.start(orderId, itemId, user.sub);
  }

  @Post('orders/:orderId/items/:itemId/stop')
  async stop(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @User() user: any,
  ) {
    return this.timeLogsService.stop(orderId, itemId, user.sub);
  }
}
