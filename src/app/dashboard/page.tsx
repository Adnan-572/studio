
"use client";

import * as React from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard as UserInvestmentDashboard } from '@/components/dashboard'; // Component that displays a single investment plan
import { getUserPlans, type UserPlanData } from '@/lib/investment-store'; // Updated import
import { Loader2, AlertTriangle, PlusCircle, Wallet } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};


export default function DashboardPage() {
  const { currentUser, logoutUser } = useAuth();
  const router = useRouter();
  const [userPlans, setUserPlans] = React.useState<UserPlanData[]>([]); // Updated type
  const [isLoadingInvestments, setIsLoadingInvestments] = React.useState(true);
  const [totalInvested, setTotalInvested] = React.useState(0);

  React.useEffect(() => {
    if (currentUser?.uid) {
      setIsLoadingInvestments(true);
      getUserPlans(currentUser.uid) // Use new function
        .then(plans => {
          setUserPlans(plans);
          const currentTotalInvested = plans
            .filter(p => p.status === 'approved' || p.status === 'completed') // Only sum approved/completed
            .reduce((sum, p) => sum + p.investmentAmount, 0);
          setTotalInvested(currentTotalInvested);
        })
        .catch(error => {
          console.error("Error fetching user investments:", error);
        })
        .finally(() => {
          setIsLoadingInvestments(false);
        });
    } else {
      setIsLoadingInvestments(false); 
    }
  }, [currentUser?.uid]);

  const hasActiveOrPendingInvestment = userPlans.some(
    p => p.status === 'approved' || p.status === 'pending'
  );

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-primary">
                Welcome, {currentUser?.email?.split('@')[0] || 'Investor'}!
              </CardTitle>
              <CardDescription>
                Manage your investments and track your financial growth with Rupay Growth.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 w-full sm:w-auto">
                 {userPlans.length > 0 && !isLoadingInvestments && (
                    <Card className="p-3 bg-muted/50 w-full sm:w-auto">
                        <div className="flex items-center space-x-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Total Active Investment</p>
                                <p className="text-md font-semibold">{formatCurrency(totalInvested)}</p>
                            </div>
                        </div>
                    </Card>
                 )}
                <Button variant="outline" onClick={() => {
                logoutUser().then(() => router.push('/login'));
                }} className="w-full sm:w-auto">
                Logout
                </Button>
            </div>
          </CardHeader>
        </Card>

        {isLoadingInvestments ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your investments...</p>
          </div>
        ) : userPlans.length > 0 ? (
          <div className="space-y-6">
            {userPlans.map(plan => ( // Iterate over userPlans
               <UserInvestmentDashboard key={plan.id} planData={plan} /> // Pass planData
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

        {(!hasActiveOrPendingInvestment || userPlans.length === 0) && !isLoadingInvestments && (
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

    