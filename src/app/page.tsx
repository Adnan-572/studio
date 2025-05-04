
"use client";

import * as React from 'react';
import type { Plan } from '@/components/investment-plans'; // Assuming Plan type is exported from investment-plans
import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard } from '@/components/dashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

export default function Home() {
  const [activeInvestment, setActiveInvestment] = React.useState<Plan | null>(null);
  const [showAgreement, setShowAgreement] = React.useState<boolean>(false);
  const [agreementAccepted, setAgreementAccepted] = React.useState<boolean>(false);

  const handleInvestSuccess = (plan: Plan) => {
    setActiveInvestment(plan);
    setShowAgreement(true);
    setAgreementAccepted(false); // Ensure agreement is shown
  };

  const handleAcceptAgreement = () => {
    setAgreementAccepted(true);
    setShowAgreement(false);
  };

  const handleStartNewInvestment = () => {
    setActiveInvestment(null);
    setShowAgreement(false);
    setAgreementAccepted(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {!activeInvestment ? (
        <>
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
            Welcome to Rupay Growth
          </h1>
          <p className="mb-12 text-center text-muted-foreground">
            Choose an investment plan below to get started.
          </p>
          <section id="investment-plans">
            <InvestmentPlans onInvestSuccess={handleInvestSuccess} />
          </section>
        </>
      ) : (
        <>
          {agreementAccepted ? (
             <section id="dashboard">
                <div className="flex justify-between items-center mb-6">
                     <h1 className="text-3xl font-bold tracking-tight text-primary">
                        Your Investment Dashboard
                     </h1>
                     <Button onClick={handleStartNewInvestment} variant="outline">
                        Start New Investment
                     </Button>
                 </div>

                <Dashboard plan={activeInvestment} />
             </section>
          ) : (
            // Optionally show a loading or placeholder while agreement is pending
            // Or just keep showing the investment plans until agreement is accepted
             <div className="text-center p-8">
                <p>Loading your investment details...</p>
                {/* Or redirect back to plans if agreement isn't accepted immediately */}
             </div>
          )}

          {/* Agreement Dialog */}
          <AlertDialog open={showAgreement} onOpenChange={setShowAgreement}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Investment Agreement</AlertDialogTitle>
                <AlertDialogDescription>
                  By clicking "Accept", you acknowledge and agree to the terms and conditions of the{' '}
                  <strong>{activeInvestment?.title}</strong>. Your investment of{' '}
                  <strong>PKR {activeInvestment?.investmentAmount.toLocaleString()}</strong> will be locked for{' '}
                  <strong>{activeInvestment?.duration} days</strong>. Profits and principal will be available for withdrawal only after the plan duration is complete. Daily profits are estimated between{' '}
                  <strong>{activeInvestment?.dailyProfitMin}%</strong> and <strong>{activeInvestment?.dailyProfitMax}%</strong>. Early withdrawal is not permitted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                {/* <AlertDialogCancel onClick={() => setActiveInvestment(null)}>Cancel</AlertDialogCancel> */}
                 {/* We prevent cancelling here, user must accept or start over */}
                 <Button variant="outline" onClick={handleStartNewInvestment}>Go Back</Button>
                <AlertDialogAction onClick={handleAcceptAgreement}>Accept & View Dashboard</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
