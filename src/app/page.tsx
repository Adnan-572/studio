
"use client";

import * as React from 'react';
import type { Plan } from '@/components/investment-plans';
import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard } from '@/components/dashboard';
import { ReferralSystem } from '@/components/referral-system'; // Import ReferralSystem
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle } from 'lucide-react'; // Added CheckCircle
import { getApprovedInvestmentForUser, getPendingInvestmentForUser, type InvestmentSubmission } from '@/lib/investment-store';
import { getWithdrawalRequestForInvestment, type WithdrawalRequest } from '@/lib/withdrawal-store'; // Import withdrawal check
import { Button } from '@/components/ui/button'; // Keep Button for potential future use
import { Separator } from '@/components/ui/separator'; // Import Separator

// Simulate a logged-in user ID
const USER_ID = "user123";
const USER_NAME = "Test User"; // Simulate user name

export default function Home() {
  const [activeInvestment, setActiveInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [pendingInvestment, setPendingInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [withdrawalRequest, setWithdrawalRequest] = React.useState<WithdrawalRequest | null>(null); // State for withdrawal status
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Fetch user's investment and withdrawal status on mount and periodically
  React.useEffect(() => {
    const checkStatus = () => {
       console.log("Checking status for user:", USER_ID);
      const approved = getApprovedInvestmentForUser(USER_ID);
      const pending = getPendingInvestmentForUser(USER_ID);
      let withdrawal: WithdrawalRequest | null = null;

      if (approved) {
        // If there's an approved investment, check for a related withdrawal request
        withdrawal = getWithdrawalRequestForInvestment(approved.id!);
        console.log("Found Withdrawal Request:", withdrawal);
      }

       console.log("Found Approved Investment:", approved);
       console.log("Found Pending Investment:", pending);


      setActiveInvestment(approved);
      setPendingInvestment(pending);
      setWithdrawalRequest(withdrawal); // Store withdrawal status
      setIsLoading(false);
    };

    checkStatus();

    // Poll for updates every 10 seconds
     const interval = setInterval(checkStatus, 10000);
     return () => clearInterval(interval);

  }, []);


  const handleStartNewInvestment = () => {
    // Allow starting new only if there's no active/pending investment AND no pending/processing withdrawal
    if (!activeInvestment && !pendingInvestment && (!withdrawalRequest || withdrawalRequest.status === 'completed' || withdrawalRequest.status === 'rejected')) {
        setActiveInvestment(null);
        setPendingInvestment(null);
        setWithdrawalRequest(null); // Clear withdrawal view
        setIsLoading(false); // Stop loading if we switch back
    } else {
        // Optionally show a message preventing new investment while withdrawal is active
        console.log("Cannot start new investment while another is active or withdrawal is pending/processing.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-12"> {/* Added space-y */}
      {activeInvestment ? (
        // User has an active, approved investment -> Show Dashboard
        <section id="dashboard">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Your Investment Dashboard
            </h1>
            {/* Conditionally show button to start new investment */}
             {(!withdrawalRequest || withdrawalRequest.status === 'completed' || withdrawalRequest.status === 'rejected') && (
                 <Button onClick={handleStartNewInvestment} variant="outline" size="sm">
                    Start New Investment
                 </Button>
             )}
          </div>
          {/* Dashboard component now handles withdrawal display */}
          <Dashboard plan={activeInvestment} />
        </section>
      ) : pendingInvestment ? (
        // User has submitted proof, waiting for approval
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]"> {/* Adjusted height */}
          <Alert className="max-w-md text-center">
             <CheckCircle className="h-4 w-4" /> {/* Icon */}
            <AlertTitle className="text-xl font-semibold">Investment Pending Approval</AlertTitle>
            <AlertDescription>
              Your investment proof for the <strong>{pendingInvestment.title}</strong> (Amount: <strong>PKR {pendingInvestment.investmentAmount.toLocaleString()}</strong>) has been submitted and is awaiting review. Your dashboard will become active once approved.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        // No active or pending investment, show plans
        <>
           <section id="welcome" className="text-center">
                <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary"> {/* Increased size */}
                  Welcome to Rupay Growth
                </h1>
                <p className="mb-8 text-lg text-muted-foreground"> {/* Increased size */}
                  Choose an investment plan below to get started and grow your capital.
                </p>
           </section>

            <Separator />

          <section id="investment-plans">
             <h2 className="text-2xl font-semibold tracking-tight text-center mb-6">Investment Plans</h2>
            <InvestmentPlans userId={USER_ID} userName={USER_NAME} />
          </section>
        </>
      )}

       {/* Always show Referral System if not loading */}
        {!isLoading && (
             <>
                <Separator />
                <section id="referral-system">
                    <ReferralSystem userId={USER_ID} />
                </section>
             </>
        )}
    </div>
  );
}
