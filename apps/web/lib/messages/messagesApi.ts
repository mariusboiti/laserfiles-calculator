import type { Message, InboxResponse, SentMessagesResponse, UserForSelect, SendMessagePayload } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const accessToken = window.localStorage.getItem('accessToken');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }
  return headers;
}

export async function getInbox(options?: {
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<InboxResponse> {
  const params = new URLSearchParams();
  if (options?.includeArchived) params.set('includeArchived', 'true');
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const url = `${API_BASE}/api-backend/messages/inbox?${params.toString()}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch inbox');
  }

  return res.json();
}

export async function getUnreadCount(): Promise<number> {
  const url = `${API_BASE}/api-backend/messages/unread-count`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    return 0;
  }

  const data = await res.json();
  return data.count || 0;
}

export async function getMessage(id: string): Promise<Message> {
  const url = `${API_BASE}/api-backend/messages/${id}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch message');
  }

  return res.json();
}

export async function markAsRead(id: string): Promise<Message> {
  const url = `${API_BASE}/api-backend/messages/${id}/read`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to mark message as read');
  }

  return res.json();
}

export async function markAllAsRead(): Promise<void> {
  const url = `${API_BASE}/api-backend/messages/mark-all-read`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to mark all messages as read');
  }
}

export async function archiveMessage(id: string): Promise<Message> {
  const url = `${API_BASE}/api-backend/messages/${id}/archive`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to archive message');
  }

  return res.json();
}

export async function replyToMessage(id: string, body: string): Promise<Message> {
  const url = `${API_BASE}/api-backend/messages/${id}/reply`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    throw new Error('Failed to send reply');
  }

  return res.json();
}

// Admin endpoints
export async function sendMessage(payload: SendMessagePayload): Promise<Message[]> {
  const url = `${API_BASE}/api-backend/messages/send`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to send message');
  }

  return res.json();
}

export async function getSentMessages(options?: {
  limit?: number;
  offset?: number;
}): Promise<SentMessagesResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const url = `${API_BASE}/api-backend/messages/admin/sent?${params.toString()}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch sent messages');
  }

  return res.json();
}

export async function getAllUsers(): Promise<UserForSelect[]> {
  const url = `${API_BASE}/api-backend/messages/admin/users`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
}

export async function deleteMessage(id: string): Promise<void> {
  const url = `${API_BASE}/api-backend/messages/${id}/delete`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to delete message');
  }
}
