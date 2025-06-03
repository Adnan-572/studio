
"use client";

import * as React from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard as UserInvestmentDashboard } from '@/components/dashboard'; // Renamed import
import { getActiveInvestmentsForUserFromFirestore, type InvestmentSubmissionFirestore } from '@/lib/investment-store';
import { Loader2, AlertTriangle, PlusCircle } from 'lucide-react'; // Added AlertTriangle
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardPage() {
  const { currentUser, logoutUser } = useAuth();
  const router = useRouter();
  const [userInvestments, setUserInvestments] = React.useState<InvestmentSubmissionFirestore[]>([]);
  const [isLoadingInvestments, setIsLoadingInvestments] = React.useState(true);

  React.useEffect(() => {
    if (currentUser?.uid) {
      setIsLoadingInvestments(true);
      getActiveInvestmentsForUserFromFirestore(currentUser.uid)
        .then(investments => {
          setUserInvestments(investments);
        })
        .catch(error => {
          console.error("Error fetching user investments:", error);
          // Optionally show a toast message
        })
        .finally(() => {
          setIsLoadingInvestments(false);
        });
    } else {
      setIsLoadingInvestments(false); // No user, so not loading
    }
  }, [currentUser?.uid]);

  const hasActiveOrPendingInvestment = userInvestments.some(
    inv => inv.status === 'approved' || inv.status === 'pending'
  );

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-primary">
                Welcome, {currentUser?.email?.split('@')[0] || 'Investor'}!
              </CardTitle>
              <CardDescription>
                Manage your investments and track your financial growth with Rupay Growth.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => {
              logoutUser().then(() => router.push('/login'));
            }}>
              Logout
            </Button>
          </CardHeader>
        </Card>

        {isLoadingInvestments ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your investments...</p>
          </div>
        ) : userInvestments.length > 0 ? (
          <div className="space-y-6">
            {userInvestments.map(investment => (
               <UserInvestmentDashboard key={investment.id} plan={investment} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Active Investments Found</AlertTitle>
                <AlertDescription>
                  You currently don&apos;t have any active or pending investments. Explore our plans to start growing your capital.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {!hasActiveOrPendingInvestment && !isLoadingInvestments && (
          <section id="explore-plans" className="pt-8">
             <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                        <PlusCircle className="mr-2 h-5 w-5 text-primary" />
                        Explore New Investment Opportunities
                    </CardTitle>
                    <CardDescription>
                        Ready to grow your capital? Choose from our tailored investment plans.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <InvestmentPlans isAuthenticated={!!currentUser} />
                </CardContent>
            </Card>
          </section>
        )}
      </div>
    </ProtectedRoute>
  );
}
