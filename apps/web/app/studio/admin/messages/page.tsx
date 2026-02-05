'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Send, 
  Users, 
  User, 
  RefreshCw, 
  Trash2, 
  ChevronLeft,
  Search,
  CheckSquare,
  Square,
  MessageSquare
} from 'lucide-react';
import type { Message, UserForSelect } from '@/lib/messages/types';
import * as messagesApi from '@/lib/messages/messagesApi';

type TabType = 'compose' | 'sent';

export default function AdminMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('compose');
  const [users, setUsers] = useState<UserForSelect[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Compose form state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const data = await messagesApi.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  const fetchSentMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messagesApi.getSentMessages();
      setSentMessages(data.messages);
    } catch (err) {
      console.error('Failed to fetch sent messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (activeTab === 'sent') {
      fetchSentMessages();
    }
  }, [activeTab, fetchSentMessages]);

  const handleSendMessage = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message body are required');
      return;
    }

    if (!isBroadcast && selectedUserIds.length === 0) {
      setError('Please select at least one recipient or choose broadcast');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      await messagesApi.sendMessage({
        subject: subject.trim(),
        body: body.trim(),
        isBroadcast,
        recipientIds: isBroadcast ? undefined : selectedUserIds,
      });

      setSuccess(
        isBroadcast
          ? `Message sent to all ${users.length} users!`
          : `Message sent to ${selectedUserIds.length} user(s)!`
      );

      // Reset form
      setSubject('');
      setBody('');
      setSelectedUserIds([]);
      setIsBroadcast(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await messagesApi.deleteMessage(messageId);
      setSentMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleSelectMessage = async (message: Message) => {
    try {
      const fullMessage = await messagesApi.getMessage(message.id);
      setSelectedMessage(fullMessage);
    } catch (err) {
      console.error('Failed to fetch message:', err);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUserIds(users.map(u => u.id));
  };

  const deselectAllUsers = () => {
    setSelectedUserIds([]);
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-sky-400" />
            <h1 className="text-2xl font-bold text-slate-100">Admin Messages</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'compose'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="h-4 w-4" />
            Compose
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Sent Messages
          </button>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recipients Selection */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
                <Users className="h-5 w-5 text-sky-400" />
                Recipients
              </h2>

              {/* Broadcast Toggle */}
              <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <input
                  type="checkbox"
                  checked={isBroadcast}
                  onChange={(e) => {
                    setIsBroadcast(e.target.checked);
                    if (e.target.checked) {
                      setSelectedUserIds([]);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <p className="font-medium text-slate-200">Broadcast to all users</p>
                  <p className="text-xs text-slate-400">
                    Send this message to all {users.length} registered users
                  </p>
                </div>
              </label>

              {!isBroadcast && (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {/* Select All / Deselect All */}
                  <div className="mb-3 flex gap-2">
                    <button
                      onClick={selectAllUsers}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Select All
                    </button>
                    <button
                      onClick={deselectAllUsers}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Deselect All
                    </button>
                    {selectedUserIds.length > 0 && (
                      <span className="ml-auto text-xs text-sky-400">
                        {selectedUserIds.length} selected
                      </span>
                    )}
                  </div>

                  {/* User List */}
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700">
                    {filteredUsers.length === 0 ? (
                      <p className="p-4 text-center text-sm text-slate-500">No users found</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-3 border-b border-slate-800 px-4 py-2.5 last:border-b-0 hover:bg-slate-800/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500"
                          />
                          <User className="h-4 w-4 text-slate-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-200">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">{user.email}</p>
                          </div>
                          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
                            {user.role}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Message Compose */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
                <Send className="h-5 w-5 text-sky-400" />
                Message
              </h2>

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  {success}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter message subject..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message here..."
                    rows={8}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={sending || (!isBroadcast && selectedUserIds.length === 0) || !subject.trim() || !body.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sent Messages Tab */}
        {activeTab === 'sent' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900">
            {selectedMessage ? (
              /* Message Detail */
              <div className="p-6">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to list
                </button>

                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {selectedMessage.subject}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Sent to: {selectedMessage.recipientEmail || 'Broadcast'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(selectedMessage.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="whitespace-pre-wrap rounded-lg bg-slate-800 p-4 text-sm text-slate-300">
                  {selectedMessage.body}
                </div>

                {/* Replies */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-medium text-slate-400">
                      Replies ({selectedMessage.replies.length})
                    </h4>
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
                              {formatDate(reply.createdAt)}
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
            ) : (
              /* Message List */
              <>
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                  <h2 className="font-semibold text-slate-100">Sent Messages</h2>
                  <button
                    onClick={fetchSentMessages}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
                  </div>
                ) : sentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Mail className="mb-2 h-12 w-12" />
                    <p>No sent messages yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {sentMessages.map((message) => (
                      <button
                        key={message.id}
                        onClick={() => handleSelectMessage(message)}
                        className="flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-800/50"
                      >
                        <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium text-slate-200">
                              {message.subject}
                            </p>
                            <span className="flex-shrink-0 text-xs text-slate-500">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            To: {message.isBroadcast ? 'All Users (Broadcast)' : message.recipientEmail}
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(message.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
