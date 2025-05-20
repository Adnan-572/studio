
"use client";

import * as React from 'react';
import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard } from '@/components/dashboard';
import { ReferralSystem } from '@/components/referral-system';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle } from 'lucide-react';
import { getApprovedInvestmentForUser, getPendingInvestmentForUser, type InvestmentSubmission } from '@/lib/investment-store';
import { getWithdrawalRequestForInvestment, type WithdrawalRequest } from '@/lib/withdrawal-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input'; // For phone number input
import { Label } from '@/components/ui/label'; // For phone number input

export default function Home() {
  const [activeInvestment, setActiveInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [pendingInvestment, setPendingInvestment] = React.useState<InvestmentSubmission | null>(null);
  const [withdrawalRequest, setWithdrawalRequest] = React.useState<WithdrawalRequest | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [showInvestmentPlans, setShowInvestmentPlans] = React.useState<boolean>(true); // Show plans by default
  const [userPhoneNumber, setUserPhoneNumber] = React.useState<string>(''); // To query investments

  const LOCAL_STORAGE_PHONE_KEY = 'rupay_user_phone';

  React.useEffect(() => {
    // Load phone number from localStorage if previously entered
    const storedPhoneNumber = localStorage.getItem(LOCAL_STORAGE_PHONE_KEY);
    if (storedPhoneNumber) {
      setUserPhoneNumber(storedPhoneNumber);
    }
    setIsLoading(false); // Initial loading is just for phone number
  }, []);

  const checkStatus = React.useCallback(() => {
    if (!userPhoneNumber) {
      // If no phone number entered/stored, can't fetch specific investments
      setActiveInvestment(null);
      setPendingInvestment(null);
      setWithdrawalRequest(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const approved = getApprovedInvestmentForUser(userPhoneNumber); // Query by phone number
    const pending = getPendingInvestmentForUser(userPhoneNumber);   // Query by phone number
    let withdrawal: WithdrawalRequest | null = null;

    if (approved) {
      withdrawal = getWithdrawalRequestForInvestment(approved.id!);
    }

    setActiveInvestment(approved);
    setPendingInvestment(pending);
    setWithdrawalRequest(withdrawal);
    setIsLoading(false);

    if (approved || pending) {
      setShowInvestmentPlans(false); // Hide plans if investment is active/pending
    } else {
      setShowInvestmentPlans(true); // Show plans if no active/pending
    }
  }, [userPhoneNumber]);

  React.useEffect(() => {
    if (userPhoneNumber) { // Only check status if phone number is available
      checkStatus();
      const interval = setInterval(checkStatus, 10000);
      return () => clearInterval(interval);
    } else {
        // No phone number, ensure we are in a state to show plans or prompt for phone
        setActiveInvestment(null);
        setPendingInvestment(null);
        setWithdrawalRequest(null);
        setShowInvestmentPlans(true);
        setIsLoading(false);
    }
  }, [userPhoneNumber, checkStatus]);

  const handleInvestmentSubmissionSuccess = (submittedPhoneNumber: string) => {
    setUserPhoneNumber(submittedPhoneNumber);
    localStorage.setItem(LOCAL_STORAGE_PHONE_KEY, submittedPhoneNumber);
    setShowInvestmentPlans(false);
    checkStatus(); // Immediately refresh status
  };

  const handleStartNewInvestment = () => {
    // This effectively resets the view to show plans again
    // We might want to clear the stored phone number or handle this differently
    setActiveInvestment(null);
    setPendingInvestment(null);
    setWithdrawalRequest(null);
    setShowInvestmentPlans(true);
    setIsLoading(false);
    // If we don't clear userPhoneNumber, checkStatus will run again with it.
    // For a true "new investment cycle for potentially a different user",
    // we might clear userPhoneNumber and localStorage
    // localStorage.removeItem(LOCAL_STORAGE_PHONE_KEY);
    // setUserPhoneNumber('');
  };

  const handlePhoneNumberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneInput = (e.target as HTMLFormElement).elements.namedItem('phone-number-input') as HTMLInputElement;
    if (phoneInput && phoneInput.value) {
      setUserPhoneNumber(phoneInput.value);
      localStorage.setItem(LOCAL_STORAGE_PHONE_KEY, phoneInput.value);
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
    <div className="container mx-auto px-4 py-8 space-y-12">
      {!userPhoneNumber && !activeInvestment && !pendingInvestment && (
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>View Your Investments</CardTitle>
            <CardDescription>Enter your phone number to see your investment status or explore plans below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePhoneNumberSubmit} className="space-y-4">
              <div>
                <Label htmlFor="phone-number-input">Phone Number</Label>
                <Input id="phone-number-input" type="tel" placeholder="e.g., 03001234567" required />
              </div>
              <Button type="submit" className="w-full">View My Status</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {userPhoneNumber && activeInvestment && (
        <section id="dashboard">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Your Investment Dashboard ({userPhoneNumber})
            </h1>
            {activeInvestment && (!withdrawalRequest || withdrawalRequest.status === 'completed' || withdrawalRequest.status === 'rejected') && (
                 <Button onClick={handleStartNewInvestment} variant="outline" size="sm">
                    Start New Investment
                 </Button>
             )}
          </div>
          <Dashboard plan={activeInvestment} />
        </section>
      )}

      {userPhoneNumber && pendingInvestment && !activeInvestment && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
          <Alert className="max-w-md text-center">
             <CheckCircle className="h-4 w-4" />
            <AlertTitle className="text-xl font-semibold">Investment Pending Approval</AlertTitle>
            <AlertDescription>
              Your investment proof for the <strong>{pendingInvestment.title}</strong> (Amount: <strong>PKR {pendingInvestment.investmentAmount.toLocaleString()}</strong>) under phone number <strong>{userPhoneNumber}</strong> has been submitted and is awaiting review.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {showInvestmentPlans && !activeInvestment && !pendingInvestment && (
        <>
          <section id="welcome" className="text-center py-12">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary">
              Welcome to Rupay Growth!
            </h1>
            <p className="mb-8 text-lg text-muted-foreground max-w-xl mx-auto">
              Explore investment options to grow your capital.
              {userPhoneNumber && ` Viewing for phone: ${userPhoneNumber}.`}
            </p>
          </section>
          <Separator />
          <section id="investment-plans" className="pt-8">
            <h2 className="text-3xl font-semibold tracking-tight text-center mb-8">
              Our Investment Opportunities
            </h2>
            <InvestmentPlans
              onSubmissionSuccess={handleInvestmentSubmissionSuccess}
              // userId and userName are now collected within InvestmentPlans
            />
          </section>
        </>
      )}

      <Separator />
      <section id="referral-system">
        <ReferralSystem />
      </section>
    </div>
  );
}
