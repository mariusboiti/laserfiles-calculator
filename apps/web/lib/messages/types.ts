export interface Message {
  id: string;
  senderId: string;
  senderEmail: string | null;
  senderName: string | null;
  recipientId: string | null;
  recipientEmail: string | null;
  subject: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  isArchived: boolean;
  parentId: string | null;
  isBroadcast: boolean;
  createdAt: string;
  updatedAt: string;
  repliesCount?: number;
  replies?: Message[];
  parent?: Message | null;
}

export interface InboxResponse {
  messages: Message[];
  total: number;
  unreadCount: number;
}

export interface SentMessagesResponse {
  messages: Message[];
  total: number;
}

export interface UserForSelect {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface SendMessagePayload {
  recipientId?: string;
  recipientIds?: string[];
  subject: string;
  body: string;
  isBroadcast?: boolean;
  parentId?: string;
}
