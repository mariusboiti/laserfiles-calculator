'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Plus, Ban, Search, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminInvite {
  id: string;
  email: string;
  status: 'PENDING' | 'REDEEMED' | 'REVOKED' | 'EXPIRED';
  note: string | null;
  creditsGrant: number;
  durationDays: number;
  tokenLast4: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
}

export default function AdminInvitesPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formCredits, setFormCredits] = useState(200);
  const [formDuration, setFormDuration] = useState(30);
  const [formNote, setFormNote] = useState('');
  const [formValidity, setFormValidity] = useState(14);

  const fetchInvites = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/admin/invites?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch invites');

      const data = await res.json();
      setInvites(data);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
      toast.error('Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [statusFilter, searchQuery]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formEmail,
          creditsGrant: formCredits,
          durationDays: formDuration,
          note: formNote || undefined,
          inviteValidityDays: formValidity,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create invite');
      }

      const data = await res.json();
      setLastCreatedUrl(data.redeemUrl);
      toast.success('Invite created successfully!');

      // Reset form
      setFormEmail('');
      setFormNote('');
      setFormCredits(200);
      setFormDuration(30);
      setFormValidity(14);

      // Refresh list
      fetchInvites();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    try {
      const res = await fetch(`/api/admin/invites/${inviteId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to revoke invite');

      toast.success('Invite revoked');
      fetchInvites();
    } catch (error) {
      toast.error('Failed to revoke invite');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'REDEEMED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Redeemed</Badge>;
      case 'REVOKED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
      case 'EXPIRED':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Edition Invites</h1>
          <p className="text-muted-foreground">Manage community admin invites for PRO access + AI credits</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Invite
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Invite</CardTitle>
            <CardDescription>
              Generate a one-time invite link for a Facebook group admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Recipient Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (Group Name)</Label>
                  <Input
                    id="note"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="e.g., Laser Cutting Enthusiasts"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">AI Credits Grant</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={formCredits}
                    onChange={(e) => setFormCredits(Number(e.target.value))}
                    min={0}
                    max={10000}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">PRO Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    min={1}
                    max={365}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validity">Invite Validity (days)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={formValidity}
                    onChange={(e) => setFormValidity(Number(e.target.value))}
                    min={1}
                    max={90}
                  />
                  <p className="text-xs text-muted-foreground">How long the invite link is valid</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Invite'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>

            {/* Show created URL */}
            {lastCreatedUrl && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  ✅ Invite created! Copy this link (shown only once):
                </p>
                <div className="flex items-center gap-2">
                  <Input value={lastCreatedUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(lastCreatedUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="REDEEMED">Redeemed</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Invites Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : invites.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No invites found. Create your first invite above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Note</th>
                    <th className="px-4 py-3 text-left font-medium">Credits</th>
                    <th className="px-4 py-3 text-left font-medium">Duration</th>
                    <th className="px-4 py-3 text-left font-medium">Expires</th>
                    <th className="px-4 py-3 text-left font-medium">Token</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{invite.email}</td>
                      <td className="px-4 py-3">{getStatusBadge(invite.status)}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate">{invite.note || '-'}</td>
                      <td className="px-4 py-3">{invite.creditsGrant}</td>
                      <td className="px-4 py-3">{invite.durationDays}d</td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">...{invite.tokenLast4}</td>
                      <td className="px-4 py-3">
                        {invite.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(invite.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
