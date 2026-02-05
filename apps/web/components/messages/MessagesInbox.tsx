'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, MailOpen, Archive, Reply, ChevronLeft, RefreshCw, CheckCheck } from 'lucide-react';
import type { Message } from '@/lib/messages/types';
import * as messagesApi from '@/lib/messages/messagesApi';

interface MessagesInboxProps {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function MessagesInbox({ open, onClose, onUnreadCountChange }: MessagesInboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messagesApi.getInbox();
      setMessages(data.messages);
      setUnreadCount(data.unreadCount);
      onUnreadCountChange?.(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (open) {
      fetchInbox();
    }
  }, [open, fetchInbox]);

  const handleSelectMessage = async (message: Message) => {
    try {
      const fullMessage = await messagesApi.getMessage(message.id);
      setSelectedMessage(fullMessage);
      
      if (!message.isRead) {
        await messagesApi.markAsRead(message.id);
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, isRead: true } : m
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        onUnreadCountChange?.(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Failed to fetch message:', error);
    }
  };

  const handleArchive = async (messageId: string) => {
    try {
      await messagesApi.archiveMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Failed to archive message:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await messagesApi.markAllAsRead();
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const reply = await messagesApi.replyToMessage(selectedMessage.id, replyText.trim());
      
      // Update the selected message with the new reply
      setSelectedMessage(prev => prev ? {
        ...prev,
        replies: [...(prev.replies || []), reply],
      } : null);
      
      setReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            {selectedMessage && (
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <Mail className="h-6 w-6 text-sky-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              {selectedMessage ? selectedMessage.subject : 'Messages'}
            </h2>
            {!selectedMessage && unreadCount > 0 && (
              <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs font-medium text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!selectedMessage && (
              <>
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
                <button
                  onClick={fetchInbox}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {selectedMessage ? (
            /* Message Detail View */
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                {/* Original Message */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-medium text-white">
                        {selectedMessage.senderName?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {selectedMessage.senderName || 'Admin'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleArchive(selectedMessage.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap rounded-lg bg-slate-800 p-4 text-sm text-slate-300">
                    {selectedMessage.body}
                  </div>
                </div>

                {/* Replies */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-400">Replies</h3>
                    {selectedMessage.replies.map((reply) => (
                      <div key={reply.id} className="ml-4 border-l-2 border-slate-700 pl-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-xs font-medium text-white">
                            {reply.senderName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-300">
                              {reply.senderName || reply.senderEmail}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(reply.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="whitespace-pre-wrap rounded-lg bg-slate-800/50 p-3 text-sm text-slate-300">
                          {reply.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Input */}
              <div className="border-t border-slate-700 p-4">
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    rows={3}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sendingReply}
                    className="flex items-center gap-2 self-end rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Reply className="h-4 w-4" />
                    {sendingReply ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Message List View */
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-500">
                  <MailOpen className="mb-2 h-12 w-12" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {messages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => handleSelectMessage(message)}
                      className={`flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-slate-800/50 ${
                        !message.isRead ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 pt-0.5">
                        {message.isRead ? (
                          <MailOpen className="h-5 w-5 text-slate-500" />
                        ) : (
                          <Mail className="h-5 w-5 text-sky-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm ${!message.isRead ? 'font-semibold text-slate-100' : 'text-slate-300'}`}>
                            {message.subject}
                          </p>
                          <span className="flex-shrink-0 text-xs text-slate-500">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          From: {message.senderName || 'Admin'}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                          {message.body}
                        </p>
                        {(message.repliesCount ?? 0) > 0 && (
                          <p className="mt-1 text-xs text-sky-400">
                            {message.repliesCount} {message.repliesCount === 1 ? 'reply' : 'replies'}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
