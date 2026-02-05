import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService, SendMessageDto } from './messages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('messages')
@Controller('messages')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  private getUserFromRequest(req: any) {
    const userId = req?.user?.sub ?? req?.user?.id ?? req?.user?.userId;
    const email = req?.user?.email;
    const name = req?.user?.name || email?.split('@')[0] || 'User';
    const role = req?.user?.role;

    if (!userId) {
      throw new UnauthorizedException('Missing user id in token');
    }

    return { userId, email, name, role };
  }

  /**
   * Get inbox messages for current user
   */
  @Get('inbox')
  @ApiOperation({ summary: 'Get inbox messages for current user' })
  async getInbox(
    @Req() req: any,
    @Query('includeArchived') includeArchived?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { userId } = this.getUserFromRequest(req);

    return this.messagesService.getInbox(userId, {
      includeArchived: includeArchived === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * Get unread count for current user
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  async getUnreadCount(@Req() req: any) {
    const { userId } = this.getUserFromRequest(req);
    const count = await this.messagesService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Get a single message with replies
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single message with replies' })
  async getMessage(@Req() req: any, @Param('id') id: string) {
    const { userId } = this.getUserFromRequest(req);
    return this.messagesService.getMessage(id, userId);
  }

  /**
   * Mark a message as read
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a message as read' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const { userId } = this.getUserFromRequest(req);
    return this.messagesService.markAsRead(id, userId);
  }

  /**
   * Mark all messages as read
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all messages as read' })
  async markAllAsRead(@Req() req: any) {
    const { userId } = this.getUserFromRequest(req);
    return this.messagesService.markAllAsRead(userId);
  }

  /**
   * Archive a message
   */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a message' })
  async archiveMessage(@Req() req: any, @Param('id') id: string) {
    const { userId } = this.getUserFromRequest(req);
    return this.messagesService.archiveMessage(id, userId);
  }

  /**
   * Reply to a message
   */
  @Post(':id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a message' })
  async replyToMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    const { userId, email, name } = this.getUserFromRequest(req);

    if (!body.body?.trim()) {
      throw new BadRequestException('Reply body is required');
    }

    return this.messagesService.replyToMessage(id, userId, email, name, body.body);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin-only endpoints
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send a message (admin only)
   */
  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to users (admin only)' })
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    const { userId, email, name } = this.getUserFromRequest(req);

    if (!dto.subject?.trim()) {
      throw new BadRequestException('Subject is required');
    }

    if (!dto.body?.trim()) {
      throw new BadRequestException('Body is required');
    }

    if (!dto.isBroadcast && !dto.recipientId && (!dto.recipientIds || dto.recipientIds.length === 0)) {
      throw new BadRequestException('At least one recipient is required');
    }

    return this.messagesService.sendMessage(userId, email, name, dto);
  }

  /**
   * Get sent messages (admin only)
   */
  @Get('admin/sent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get sent messages (admin only)' })
  async getSentMessages(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { userId } = this.getUserFromRequest(req);

    return this.messagesService.getSentMessages(userId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * Get all users for recipient selection (admin only)
   */
  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all users for recipient selection (admin only)' })
  async getAllUsers() {
    return this.messagesService.getAllUsers();
  }

  /**
   * Delete a message (admin only)
   */
  @Post(':id/delete')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message (admin only)' })
  async deleteMessage(@Param('id') id: string) {
    return this.messagesService.deleteMessage(id);
  }
}
