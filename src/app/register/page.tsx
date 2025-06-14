import { Loader2 } from "lucide-react";
"use client";

import * as React from 'react';
import { AuthForm } from '@/components/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';

// Separate component jo useSearchParams use karta hai
function RegisterContent() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');

  React.useEffect(() => {
    if (!loading && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading || (!loading && currentUser)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/30">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription>Join Rupay Growth and start investing today.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="register" initialReferralCode={referralCodeFromUrl || undefined} />
          
          <p className="mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login here
            </Link>
          </p>
          
          {referralCodeFromUrl && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Referred by: {referralCodeFromUrl.substring(0,10)}...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main component with Suspense
export default function RegisterPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    }>
      <RegisterContent />
    </React.Suspense>
  );
}