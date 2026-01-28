'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Gift, Sparkles, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function AdminEditionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading, refetchUser } = useAuth();
  const token = searchParams.get('token');

  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    email?: string;
    creditsGrant?: number;
    durationDays?: number;
    status?: string;
    expiresAt?: string;
    error?: string;
  } | null>(null);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    proAccessUntil: string;
    creditsAdded: number;
  } | null>(null);

  // Check invite when token is present and user is logged in
  useEffect(() => {
    if (!token) return;
    if (authLoading) return;
    if (!user) return;

    const checkInvite = async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/invites/check?token=${encodeURIComponent(token)}`, {
          credentials: 'include',
        });
        const data = await res.json();
        setInviteInfo(data);
      } catch (error) {
        setInviteInfo({ valid: false, error: 'Failed to check invite' });
      } finally {
        setChecking(false);
      }
    };

    checkInvite();
  }, [token, user, authLoading]);

  const handleRedeem = async () => {
    if (!token) return;

    setRedeeming(true);
    try {
      const res = await fetch('/api/invites/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to redeem invite');
      }

      setRedeemResult(data);
      toast.success('Admin Edition activated!');
      
      // Refresh user data to update header badge
      if (refetchUser) {
        await refetchUser();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to redeem invite');
      setInviteInfo({ valid: false, error: error.message });
    } finally {
      setRedeeming(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle>Missing Invite Token</CardTitle>
            <CardDescription>
              This page requires a valid invite link. Please use the link provided to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/studio">
              <Button variant="outline">Go to Studio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Gift className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle>Admin Edition Invite</CardTitle>
            <CardDescription>
              You've been invited to receive free PRO access! Please log in to redeem your invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">What you'll get:</p>
              <ul className="text-left space-y-1 text-muted-foreground">
                <li>✅ 1 month of PRO access</li>
                <li>✅ 200 AI credits</li>
                <li>✅ Admin Edition badge</li>
              </ul>
            </div>
            <Link href={`/auth/login?returnUrl=${encodeURIComponent(`/studio/admin-edition?token=${token}`)}`}>
              <Button className="w-full">
                <LogIn className="w-4 h-4 mr-2" />
                Log in to Redeem
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading auth
  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Checking your invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redeemed successfully
  if (redeemResult?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full border-green-200 bg-green-50/50">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <CardTitle className="text-green-800">Admin Edition Activated!</CardTitle>
            <CardDescription className="text-green-700">
              Welcome to LaserFilesPro Admin Edition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 space-y-2 border border-green-200">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PRO Access Until</span>
                <span className="font-medium">
                  {new Date(redeemResult.proAccessUntil).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Credits Added</span>
                <span className="font-medium">{redeemResult.creditsAdded}</span>
              </div>
            </div>
            <Link href="/studio" className="block">
              <Button className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Using Studio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid invite
  if (inviteInfo && !inviteInfo.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>
              {inviteInfo.error || 'This invite is no longer valid.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/studio">
              <Button variant="outline">Go to Studio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email mismatch
  if (inviteInfo?.valid && inviteInfo.email && user?.email?.toLowerCase() !== inviteInfo.email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full border-yellow-200">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle>Email Mismatch</CardTitle>
            <CardDescription>
              This invite was created for <strong>{inviteInfo.email}</strong>, but you're logged in as <strong>{user?.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please log in with the correct email to redeem this invite.
            </p>
            <Link href={`/auth/login?returnUrl=${encodeURIComponent(`/studio/admin-edition?token=${token}`)}`}>
              <Button variant="outline" className="w-full">
                Log in with Different Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite - show redeem form
  if (inviteInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md w-full border-primary/20">
          <CardHeader className="text-center">
            <Gift className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle>Admin Edition Invite</CardTitle>
            <CardDescription>
              You're about to receive free PRO access!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PRO Duration</span>
                <span className="font-medium">{inviteInfo.durationDays} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">AI Credits</span>
                <span className="font-medium">{inviteInfo.creditsGrant}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Invite Expires</span>
                <span className="font-medium">
                  {inviteInfo.expiresAt ? new Date(inviteInfo.expiresAt).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>

            <Button
              onClick={handleRedeem}
              disabled={redeeming}
              className="w-full"
              size="lg"
            >
              {redeeming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Activate Admin Edition
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By redeeming, you agree to our Terms of Service
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export default function AdminEditionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <AdminEditionContent />
    </Suspense>
  );
}
