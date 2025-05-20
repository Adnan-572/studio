
"use client";

import * as React from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { InvestmentPlans } from '@/components/investment-plans'; // For exploring new plans

// This will be the main user dashboard after login.
// For now, it's a simple placeholder.
// Later, it will fetch and display user's active investments from Firestore.

export default function DashboardPage() {
  const { currentUser, logoutUser } = useAuth();
  const router = useRouter();

  // Placeholder: Fetch active investment data here
  // For now, we'll just show a welcome and an option to explore plans.

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">
              Welcome to Your Dashboard, {currentUser?.email?.split('@')[0] || 'User'}!
            </CardTitle>
            <CardDescription>
              Manage your investments and track your growth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Your active investment details will appear here soon.
              Currently, this section is under development.
            </p>
            {/* Placeholder for active investment display */}
            <div className="p-6 border rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-semibold">No Active Investment Found</p>
              <p className="text-sm text-muted-foreground mb-4">Explore our plans to start growing your capital.</p>
            </div>
          </CardContent>
        </Card>
        
        <section id="explore-plans">
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-8">
            Explore Investment Opportunities
          </h2>
          <InvestmentPlans isAuthenticated={!!currentUser} />
        </section>

        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => {
            logoutUser().then(() => router.push('/login'));
          }}>
            Logout
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
