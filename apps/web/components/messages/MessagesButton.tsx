'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail } from 'lucide-react';
import { MessagesInbox } from './MessagesInbox';
import * as messagesApi from '@/lib/messages/messagesApi';

export function MessagesButton() {
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await messagesApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silently fail - user might not be logged in
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new messages every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setInboxOpen(true)}
        className="relative rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
      >
        <span className="flex items-center gap-1.5">
          <Mail className="h-4 w-4" />
          Messages
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <MessagesInbox
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}
