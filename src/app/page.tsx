
"use client";

import * as React from 'react';
import type { Plan } from '@/components/investment-plans';
import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard } from '@/components/dashboard';
import { ReferralSystem } from '@/components/referral-system';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, LogIn } from 'lucide-react';
import { getApprovedInvestmentForUser, getPendingInvestmentForUser, type InvestmentSubmission } from '@/lib/investment-store';
import { getWithdrawalRequestForInvestment, type WithdrawalRequest } from '@/lib/withdrawal-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { User } from '@/lib/auth-store'; // Import User type

interface HomePageProps {
  currentUser: User | null; // Receive currentUser from layout
}

export default function Home({ currentUser }: HomePageProps) {
  const [activeInvestment, setActiveInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [pendingInvestment, setPendingInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [withdrawalRequest, setWithdrawalRequest] = React.useState<WithdrawalRequest | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const checkStatus = React.useCallback(() => {
    if (!currentUser?.id) {
      setActiveInvestment(null);
      setPendingInvestment(null);
      setWithdrawalRequest(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log("Checking status for user:", currentUser.id);
    const approved = getApprovedInvestmentForUser(currentUser.id);
    const pending = getPendingInvestmentForUser(currentUser.id);
    let withdrawal: WithdrawalRequest | null = null;

    if (approved) {
      withdrawal = getWithdrawalRequestForInvestment(approved.id!);
      console.log("Found Withdrawal Request:", withdrawal);
    }

    console.log("Found Approved Investment:", approved);
    console.log("Found Pending Investment:", pending);

    setActiveInvestment(approved);
    setPendingInvestment(pending);
    setWithdrawalRequest(withdrawal);
    setIsLoading(false);
  }, [currentUser]);


  React.useEffect(() => {
    checkStatus(); // Initial check

    const interval = setInterval(checkStatus, 10000); // Periodic check
    return () => clearInterval(interval);

  }, [currentUser, checkStatus]);


  const handleStartNewInvestment = () => {
    if (!activeInvestment && !pendingInvestment && (!withdrawalRequest || withdrawalRequest.status === 'completed' || withdrawalRequest.status === 'rejected')) {
        // This function's purpose is to allow starting a new investment after a previous one is fully completed and withdrawn.
        // It resets the state to show the investment plans again.
        setActiveInvestment(null);
        setPendingInvestment(null);
        setWithdrawalRequest(null);
        setIsLoading(false); // To ensure UI updates if it was stuck in loading
        // Explicitly call checkStatus to ensure the latest state from localStorage is reflected if needed,
        // though setting states to null should be enough to re-render and show plans.
        checkStatus();
    } else {
        console.log("Cannot start new investment while another is active/pending or withdrawal is not completed/rejected.");
    }
  };

  const handleInvestmentSubmissionSuccess = () => {
    console.log("Investment submitted, refreshing status...");
    checkStatus(); // Immediately refresh status after submission
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-lg text-center mx-auto">
          <LogIn className="h-5 w-5" />
          <AlertTitle className="text-xl font-semibold">Please Login</AlertTitle>
          <AlertDescription>
            You need to login or register to invest in our plans.
            You can explore the available plans below. Please use the button in the header to login/register.
          </AlertDescription>
        </Alert>
         <Separator className="my-12" />
          <section id="investment-plans-preview" className="w-full">
             <h2 className="text-2xl font-semibold tracking-tight text-center mb-6">Explore Our Investment Plans</h2>
            <InvestmentPlans
              userId={null}
              userName={null}
              isAuthenticated={false}
              onSubmissionSuccess={() => { /* No action needed for unauthenticated users */ }}
            />
          </section>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {activeInvestment ? (
        <section id="dashboard">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Your Investment Dashboard
            </h1>
            {/* Show "Start New Investment" button only if plan is complete AND withdrawal is completed or rejected */}
            {activeInvestment && (!withdrawalRequest || withdrawalRequest.status === 'completed' || withdrawalRequest.status === 'rejected') && (
                 <Button onClick={handleStartNewInvestment} variant="outline" size="sm">
                    Start New Investment
                 </Button>
             )}
          </div>
          <Dashboard plan={activeInvestment} />
        </section>
      ) : pendingInvestment ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
          <Alert className="max-w-md text-center">
             <CheckCircle className="h-4 w-4" />
            <AlertTitle className="text-xl font-semibold">Investment Pending Approval</AlertTitle>
            <AlertDescription>
              Your investment proof for the <strong>{pendingInvestment.title}</strong> (Amount: <strong>PKR {pendingInvestment.investmentAmount.toLocaleString()}</strong>) has been submitted and is awaiting review. Your dashboard will become active once approved.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
           <section id="welcome" className="text-center">
                <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary">
                  Welcome, {currentUser.userName || currentUser.phoneNumber}!
                </h1>
                <p className="mb-8 text-lg text-muted-foreground">
                  Choose an investment plan below to get started and grow your capital.
                </p>
           </section>
            <Separator />
          <section id="investment-plans">
             <h2 className="text-2xl font-semibold tracking-tight text-center mb-6">Investment Plans</h2>
            <InvestmentPlans
                userId={currentUser.id}
                userName={currentUser.userName || currentUser.phoneNumber}
                isAuthenticated={true}
                onSubmissionSuccess={handleInvestmentSubmissionSuccess}
            />
          </section>
        </>
      )}

      {!isLoading && currentUser && (
         <>
            <Separator />
            <section id="referral-system">
                <ReferralSystem userId={currentUser.id} />
            </section>
         </>
      )}
    </div>
  );
}
