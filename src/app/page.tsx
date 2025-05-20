
"use client";

import * as React from 'react';
import { InvestmentPlans } from '@/components/investment-plans';
import { ReferralSystem } from '@/components/referral-system';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/dashboard'); // Redirect to dashboard if logged in
    }
  }, [currentUser, loading, router]);

  if (loading || (!loading && currentUser)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading user session...</p>
      </div>
    );
  }

  // If not loading and no user, show homepage content
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <section id="welcome" className="text-center py-12">
        <h1 className="mb-4 text-4xl md:text-5xl font-bold tracking-tight text-primary">
          Welcome to Rupay Growth!
        </h1>
        <p className="mb-8 text-lg text-muted-foreground max-w-xl mx-auto">
          Your trusted partner for crypto investments in Pakistan. Explore our plans and start growing your capital today.
        </p>
        <div className="space-x-4">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </section>

      <Separator />

      <section id="investment-plans" className="pt-8">
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-8">
          Our Investment Opportunities
        </h2>
        {/* Pass isAuthenticated. If false, "Invest" buttons will lead to login. */}
        {/* If true (though user is redirected if logged in), it would lead to submit-proof. */}
        <InvestmentPlans isAuthenticated={!!currentUser} />
      </section>

      <Separator />
      <section id="referral-system">
        <ReferralSystem />
      </section>
    </div>
  );
}
