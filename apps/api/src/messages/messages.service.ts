import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMessageDto {
  recipientId?: string;
  recipientIds?: string[];
  subject: string;
  body: string;
  isBroadcast?: boolean;
  parentId?: string;
}

export interface MessageWithSender {
  id: string;
  senderId: string;
  senderEmail: string | null;
  senderName: string | null;
  recipientId: string | null;
  recipientEmail: string | null;
  subject: string;
  body: string;
  isRead: boolean;
  readAt: Date | null;
  isArchived: boolean;
  parentId: string | null;
  isBroadcast: boolean;
  createdAt: Date;
  updatedAt: Date;
  repliesCount?: number;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a message from admin to one or more users
   */
  async sendMessage(
    senderId: string,
    senderEmail: string,
    senderName: string,
    dto: SendMessageDto,
  ): Promise<MessageWithSender[]> {
    const messages: MessageWithSender[] = [];

    // Broadcast to all users
    if (dto.isBroadcast) {
      const users = await this.prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: { id: true, email: true },
      });

      for (const user of users) {
        const msg = await this.prisma.message.create({
          data: {
            senderId,
            senderEmail,
            senderName,
            recipientId: user.id,
            recipientEmail: user.email,
            subject: dto.subject,
            body: dto.body,
            isBroadcast: true,
            parentId: dto.parentId || null,
          },
        });
        messages.push(msg as MessageWithSender);
      }

      this.logger.log(`Broadcast message sent to ${users.length} users by ${senderEmail}`);
      return messages;
    }

    // Send to specific users
    if (dto.recipientIds && dto.recipientIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: dto.recipientIds } },
        select: { id: true, email: true },
      });

      for (const user of users) {
        const msg = await this.prisma.message.create({
          data: {
            senderId,
            senderEmail,
            senderName,
            recipientId: user.id,
            recipientEmail: user.email,
            subject: dto.subject,
            body: dto.body,
            isBroadcast: false,
            parentId: dto.parentId || null,
          },
        });
        messages.push(msg as MessageWithSender);
      }

      this.logger.log(`Message sent to ${users.length} users by ${senderEmail}`);
      return messages;
    }

    // Send to single user
    if (dto.recipientId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.recipientId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new NotFoundException('Recipient not found');
      }

      const msg = await this.prisma.message.create({
        data: {
          senderId,
          senderEmail,
          senderName,
          recipientId: user.id,
          recipientEmail: user.email,
          subject: dto.subject,
          body: dto.body,
          isBroadcast: false,
          parentId: dto.parentId || null,
        },
      });

      this.logger.log(`Message sent to ${user.email} by ${senderEmail}`);
      return [msg as MessageWithSender];
    }

    throw new Error('No recipient specified');
  }

  /**
   * Get inbox messages for a user
   */
  async getInbox(
    userId: string,
    options: { includeArchived?: boolean; limit?: number; offset?: number } = {},
  ) {
    const { includeArchived = false, limit = 50, offset = 0 } = options;

    const where: any = {
      recipientId: userId,
      parentId: null, // Only top-level messages, not replies
    };

    if (!includeArchived) {
      where.isArchived = false;
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { replies: true },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      messages: messages.map((m) => ({
        ...m,
        repliesCount: m._count.replies,
        _count: undefined,
      })),
      total,
      unreadCount: await this.getUnreadCount(userId),
    };
  }

  /**
   * Get sent messages for admin
   */
  async getSentMessages(
    senderId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 50, offset = 0 } = options;

    const where = {
      senderId,
      parentId: null, // Only top-level messages
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { replies: true },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      messages: messages.map((m) => ({
        ...m,
        repliesCount: m._count.replies,
        _count: undefined,
      })),
      total,
    };
  }

  /**
   * Get a single message with its replies
   */
  async getMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
        parent: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user has access to this message
    if (message.recipientId !== userId && message.senderId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return message;
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.recipientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all messages as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.message.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Archive a message
   */
  async archiveMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.recipientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isArchived: true },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        recipientId: userId,
        isRead: false,
        isArchived: false,
      },
    });
  }

  /**
   * Reply to a message
   */
  async replyToMessage(
    parentId: string,
    senderId: string,
    senderEmail: string,
    senderName: string,
    body: string,
  ) {
    const parent = await this.prisma.message.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException('Parent message not found');
    }

    // Determine recipient - if user is replying, send to original sender
    // If admin is replying, send to original recipient
    const recipientId = parent.senderId === senderId ? parent.recipientId : parent.senderId;
    const recipientEmail = parent.senderId === senderId ? parent.recipientEmail : parent.senderEmail;

    const reply = await this.prisma.message.create({
      data: {
        senderId,
        senderEmail,
        senderName,
        recipientId,
        recipientEmail,
        subject: `Re: ${parent.subject}`,
        body,
        parentId: parent.parentId || parent.id, // Always link to the root message
        isBroadcast: false,
      },
    });

    this.logger.log(`Reply sent by ${senderEmail} to message ${parentId}`);
    return reply;
  }

  /**
   * Get all users for admin to select recipients
   */
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  /**
   * Delete a message (admin only)
   */
  async deleteMessage(messageId: string) {
    // First delete all replies
    await this.prisma.message.deleteMany({
      where: { parentId: messageId },
    });

    // Then delete the message itself
    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }
}
