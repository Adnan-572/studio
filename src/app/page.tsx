
"use client";

import * as React from 'react';
import type { Plan } from '@/components/investment-plans';
import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard } from '@/components/dashboard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { getApprovedInvestmentForUser, getPendingInvestmentForUser, type InvestmentSubmission } from '@/lib/investment-store';
import { Button } from '@/components/ui/button'; // Keep Button for potential future use
import { Separator } from '@/components/ui/separator'; // Import Separator

// Simulate a logged-in user ID
const USER_ID = "user123";
const USER_NAME = "Test User"; // Simulate user name

export default function Home() {
  const [activeInvestment, setActiveInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [pendingInvestment, setPendingInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Fetch user's investment status on mount and periodically (or use a better state management)
  React.useEffect(() => {
    const checkInvestmentStatus = () => {
       console.log("Checking investment status for user:", USER_ID);
      const approved = getApprovedInvestmentForUser(USER_ID);
      const pending = getPendingInvestmentForUser(USER_ID);
       console.log("Found Approved:", approved);
       console.log("Found Pending:", pending);

      setActiveInvestment(approved);
      setPendingInvestment(pending);
      setIsLoading(false);
    };

    checkInvestmentStatus();

    // Optional: Poll for updates every 10 seconds if no better mechanism exists
     const interval = setInterval(checkInvestmentStatus, 10000);
     return () => clearInterval(interval);

  }, []);


  const handleStartNewInvestment = () => {
    // This function might need more logic if we want to truly reset/cancel pending
    // For now, it just allows viewing the plans again if the user is on the dashboard
    setActiveInvestment(null);
    setPendingInvestment(null); // Also clear pending view
    setIsLoading(false); // Stop loading if we switch back
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {activeInvestment ? (
        // User has an active, approved investment
        <section id="dashboard">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Your Investment Dashboard
            </h1>
            {/* Allow starting a new one *after* the current one potentially finishes */}
            {/* <Button onClick={handleStartNewInvestment} variant="outline">
              Start New Investment
            </Button> */}
          </div>
          <Dashboard plan={activeInvestment} />
        </section>
      ) : pendingInvestment ? (
        // User has submitted proof, waiting for approval
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <Alert className="max-w-md text-center">
            <AlertTitle className="text-xl font-semibold">Investment Pending Approval</AlertTitle>
            <AlertDescription>
              Your investment proof for the <strong>{pendingInvestment.title}</strong> (Amount: <strong>PKR {pendingInvestment.investmentAmount.toLocaleString()}</strong>) has been submitted and is awaiting review by our team. Your dashboard will become active once it's approved.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        // No active or pending investment, show plans
        <>
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
            Welcome to Rupay Growth
          </h1>
          <p className="mb-12 text-center text-muted-foreground">
            Choose an investment plan below to get started.
          </p>
          <section id="investment-plans">
             {/* Pass USER_ID and USER_NAME to InvestmentPlans */}
            <InvestmentPlans userId={USER_ID} userName={USER_NAME} />
          </section>
           {/* Removed Separator and ReferralSystem section as ReferralSystem component is missing */}
        </>
      )}
    </div>
  );
}
