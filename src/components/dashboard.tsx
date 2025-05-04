
"use client";

import * as React from 'react';
import type { InvestmentSubmission } from '@/lib/investment-store'; // Use InvestmentSubmission type
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, addDays, format, isPast } from 'date-fns'; // Import isPast
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, CalendarDays, TrendingUp, Percent, Hourglass, User, CheckCircle, Banknote, Wallet, Info, Loader2, Gift } from 'lucide-react'; // Added Gift icon for bonus
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { addWithdrawalRequest, getWithdrawalRequestForInvestment, type WithdrawalRequest } from '@/lib/withdrawal-store'; // Import withdrawal functions
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface DashboardProps {
  plan: InvestmentSubmission; // Use InvestmentSubmission which includes startDate and approvalDate
}

// Helper function to format currency (ensure it's consistent)
const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface DailyProfitEntry {
  day: number;
  date: string;
  profitMin: number;
  profitMax: number;
  cumulativeMin: number;
  cumulativeMax: number;
}

export function Dashboard({ plan }: DashboardProps) {
  const { toast } = useToast();
  const startDate = React.useMemo(() => new Date(plan.approvalDate!), [plan.approvalDate]);
  const referralBonus = React.useMemo(() => plan.referralBonusPercent ?? 0, [plan.referralBonusPercent]); // Get referral bonus
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [dailyProfits, setDailyProfits] = React.useState<DailyProfitEntry[]>([]);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = React.useState(false);
  const [withdrawalMethod, setWithdrawalMethod] = React.useState<'easypaisa' | 'jazzcash' | null>(null);
  const [accountNumber, setAccountNumber] = React.useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = React.useState(false);
  const [existingWithdrawalRequest, setExistingWithdrawalRequest] = React.useState<WithdrawalRequest | null>(null);
  const [isLoadingWithdrawalStatus, setIsLoadingWithdrawalStatus] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000 * 60); // Update current date every minute

    return () => clearInterval(interval);
  }, []);

  // Recalculate profits when plan or referral bonus changes
  React.useEffect(() => {
    const calculateProfits = () => {
      const profits: DailyProfitEntry[] = [];
      let cumulativeMin = 0;
      let cumulativeMax = 0;
      const investmentAmount = plan.investmentAmount;

      if (!startDate) return; // Don't calculate if start date isn't set

      // Calculate base daily profit + referral bonus
      const effectiveDailyProfitMin = plan.dailyProfitMin + referralBonus;
      const effectiveDailyProfitMax = plan.dailyProfitMax + referralBonus;

      for (let i = 1; i <= plan.duration; i++) {
        const profitDate = addDays(startDate, i - 1); // Calculate date for this profit day
        const dailyMin = (investmentAmount * effectiveDailyProfitMin) / 100;
        const dailyMax = (investmentAmount * effectiveDailyProfitMax) / 100;

        cumulativeMin += dailyMin;
        cumulativeMax += dailyMax;

        profits.push({
          day: i,
          date: format(profitDate, 'MMM dd, yyyy'),
          profitMin: dailyMin,
          profitMax: dailyMax,
          cumulativeMin: cumulativeMin,
          cumulativeMax: cumulativeMax,
        });
      }
      setDailyProfits(profits);
    };

    calculateProfits();
  }, [plan, startDate, referralBonus]); // Add referralBonus dependency

  // Check for existing withdrawal request when component mounts or plan changes
  React.useEffect(() => {
    if (plan.id) {
      setIsLoadingWithdrawalStatus(true);
      const existingRequest = getWithdrawalRequestForInvestment(plan.id);
      setExistingWithdrawalRequest(existingRequest);
      setIsLoadingWithdrawalStatus(false);
    }
  }, [plan.id]);


  if (!startDate) {
    return <p>Loading investment data...</p>; // Or some loading indicator
  }

  const endDate = addDays(startDate, plan.duration);
  const isPlanComplete = isPast(endDate); // Check if the end date is in the past

  const daysElapsed = Math.min(plan.duration, Math.max(0, differenceInDays(currentDate, startDate))); // Cap elapsed days at duration
  const daysRemaining = Math.max(0, plan.duration - daysElapsed);
  const progress = Math.min(100, Math.max(0,(daysElapsed / plan.duration) * 100));


  // Determine current cumulative profit based on days elapsed
   const currentProfitIndex = Math.min(daysElapsed, plan.duration) - 1;
   const currentCumulativeMin = currentProfitIndex >= 0 ? dailyProfits[currentProfitIndex]?.cumulativeMin ?? 0 : 0;
   const currentCumulativeMax = currentProfitIndex >= 0 ? dailyProfits[currentProfitIndex]?.cumulativeMax ?? 0 : 0;
   const currentCumulativeProfitText = currentCumulativeMin === currentCumulativeMax
     ? formatCurrency(currentCumulativeMin)
     : `${formatCurrency(currentCumulativeMin)} – ${formatCurrency(currentCumulativeMax)}`;


  // Final total return calculation
  const finalTotalProfitMin = dailyProfits[plan.duration - 1]?.cumulativeMin ?? 0;
  const finalTotalProfitMax = dailyProfits[plan.duration - 1]?.cumulativeMax ?? 0;
  const finalTotalReturnMin = plan.investmentAmount + finalTotalProfitMin;
  const finalTotalReturnMax = plan.investmentAmount + finalTotalProfitMax;
   const finalTotalReturnText = finalTotalReturnMin === finalTotalReturnMax
    ? formatCurrency(finalTotalReturnMin)
    : `${formatCurrency(finalTotalReturnMin)} – ${formatCurrency(finalTotalReturnMax)}`;
   const finalTotalProfitText = finalTotalProfitMin === finalTotalProfitMax
    ? formatCurrency(finalTotalProfitMin)
    : `${formatCurrency(finalTotalProfitMin)} – ${formatCurrency(finalTotalProfitMax)}`;


  // Calculate effective daily profit range text including bonus
   const effectiveDailyProfitMin = plan.dailyProfitMin + referralBonus;
   const effectiveDailyProfitMax = plan.dailyProfitMax + referralBonus;
   const effectiveDailyProfitRangeText = effectiveDailyProfitMin === effectiveDailyProfitMax
     ? `${effectiveDailyProfitMin.toFixed(1)}%`
     : `${effectiveDailyProfitMin.toFixed(1)}% – ${effectiveDailyProfitMax.toFixed(1)}%`;


  const planIcon = plan.icon ? React.createElement(plan.icon, { className: "h-6 w-6" }) : <DollarSign className="h-6 w-6" />;


  const handleRequestWithdrawal = async () => {
      if (!withdrawalMethod || !accountNumber.trim() || !plan.id) {
          toast({
              variant: "destructive",
              title: "Missing Information",
              description: "Please select a withdrawal method and enter your account number.",
          });
          return;
      }

      // Basic validation for account number (simple check for now)
      if (!/^\d+$/.test(accountNumber.trim())) {
           toast({
              variant: "destructive",
              title: "Invalid Account Number",
              description: "Account number should only contain digits.",
          });
          return;
      }

      setIsSubmittingWithdrawal(true);
      try {
          // Use the maximum potential return as the withdrawal amount for simplicity
          // In a real scenario, this would be the exact calculated final amount.
          const withdrawalAmount = finalTotalReturnMax;

          const request: Omit<WithdrawalRequest, 'id'> = {
              userId: plan.userId,
              userName: plan.userName,
              investmentId: plan.id,
              investmentTitle: plan.title,
              withdrawalAmount: withdrawalAmount,
              paymentMethod: withdrawalMethod,
              accountNumber: accountNumber.trim(),
              requestDate: new Date().toISOString(),
              status: 'pending',
          };

          await addWithdrawalRequest(request);

           // Update the state to reflect the new request
          setExistingWithdrawalRequest({ ...request, id: 'temp-id' }); // Use a temp ID until properly fetched


          toast({
              title: "Withdrawal Requested",
              description: `Your request to withdraw ${formatCurrency(withdrawalAmount)} has been submitted. Processing takes up to 3 business days.`,
              variant: "default",
          });
          setIsWithdrawalModalOpen(false);
          // Reset form state
          setWithdrawalMethod(null);
          setAccountNumber('');

      } catch (error) {
          console.error("Withdrawal request error:", error);
          toast({
              variant: "destructive",
              title: "Request Failed",
              description: "Could not submit your withdrawal request. Please try again later.",
          });
      } finally {
          setIsSubmittingWithdrawal(false);
      }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            {planIcon} {plan.title} Overview
          </CardTitle>
          <CardDescription>
              Investment started on {format(startDate, 'PPP')} by {plan.userName}. Approved on {format(new Date(plan.approvalDate!), 'Pp')}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Existing Info Cards */}
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
              <User className="h-6 w-6 text-muted-foreground" />
              <div>
                  <p className="text-sm font-medium leading-none">Investor</p>
                  <p className="text-lg font-semibold">{plan.userName} ({plan.userId})</p>
              </div>
          </div>
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
            <DollarSign className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Investment Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(plan.investmentAmount)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
             <Percent className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Daily Profit Rate</p>
              <p className="text-lg font-semibold">{effectiveDailyProfitRangeText}</p>
              {referralBonus > 0 && (
                   <p className="text-xs text-muted-foreground">
                       ({plan.dailyProfitMin.toFixed(1)}% Base + {referralBonus.toFixed(1)}% Referral Bonus)
                   </p>
               )}
            </div>
          </div>
           <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
             <CalendarDays className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Plan Duration</p>
              <p className="text-lg font-semibold">{plan.duration} days</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
            <Hourglass className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Ends On</p>
              <p className="text-lg font-semibold">{format(endDate, 'PPP')}</p>
            </div>
          </div>
           {/* Show current profit only if plan is not complete */}
           {!isPlanComplete && (
               <div className="flex items-center space-x-3 rounded-md border p-4 bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
                <div>
                  <p className="text-sm font-medium leading-none">Current Profit (Est.)</p>
                  <p className="text-lg font-semibold">{currentCumulativeProfitText}</p>
                </div>
              </div>
           )}
           {/* Show final profit if plan is complete */}
           {isPlanComplete && (
              <div className="flex items-center space-x-3 rounded-md border p-4 bg-primary/10 text-primary">
                 <TrendingUp className="h-6 w-6" />
                  <div>
                      <p className="text-sm font-medium leading-none">Final Profit (Est.)</p>
                      <p className="text-lg font-semibold">{finalTotalProfitText}</p>
                  </div>
              </div>
           )}

           <div className="flex items-center space-x-3 rounded-md border p-4 bg-green-600/10 text-green-700 dark:text-green-400">
             <CheckCircle className="h-6 w-6" /> {/* Changed icon */}
            <div>
              <p className="text-sm font-medium leading-none">Total Return (Est.)</p>
              <p className="text-lg font-semibold">{finalTotalReturnText}</p>
            </div>
          </div>

            {/* Add Referral Bonus Card if bonus > 0 */}
            {referralBonus > 0 && (
                <div className="flex items-center space-x-3 rounded-md border p-4 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 md:col-span-3">
                    <Gift className="h-6 w-6" />
                    <div>
                        <p className="text-sm font-medium leading-none">Referral Bonus Applied</p>
                        <p className="text-lg font-semibold">+{referralBonus.toFixed(1)}% Daily Profit</p>
                         <p className="text-xs text-muted-foreground">Your daily profit includes an extra {referralBonus.toFixed(1)}% thanks to your referrals!</p>
                    </div>
                </div>
            )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investment Progress</CardTitle>
          <CardDescription>
            {daysElapsed} of {plan.duration} days completed. {daysRemaining} days remaining.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full h-4" />
           <p className="text-right text-sm text-muted-foreground mt-1">{progress.toFixed(1)}% complete</p>
           {/* Withdrawal Button */}
           {isPlanComplete && (
                <div className="mt-6 text-center">
                    {isLoadingWithdrawalStatus ? (
                         <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    ) : existingWithdrawalRequest ? (
                        <Alert variant={existingWithdrawalRequest.status === 'completed' ? 'default' : 'default'} className="max-w-md mx-auto text-left">
                             <Wallet className="h-4 w-4" />
                            <AlertTitle>Withdrawal Request Status: {existingWithdrawalRequest.status.charAt(0).toUpperCase() + existingWithdrawalRequest.status.slice(1)}</AlertTitle>
                            <AlertDescription>
                                Your request for <strong>{formatCurrency(existingWithdrawalRequest.withdrawalAmount)}</strong> via <strong>{existingWithdrawalRequest.paymentMethod}</strong> to account <strong>{existingWithdrawalRequest.accountNumber}</strong> submitted on {format(new Date(existingWithdrawalRequest.requestDate), 'Pp')} is currently {existingWithdrawalRequest.status}.
                                {existingWithdrawalRequest.status === 'pending' && " Processing usually takes up to 3 business days."}
                                {existingWithdrawalRequest.status === 'rejected' && ` Reason: ${existingWithdrawalRequest.rejectionReason || 'Not specified.'}`}
                                {existingWithdrawalRequest.status === 'completed' && ` Transaction ID: ${existingWithdrawalRequest.transactionId || 'N/A'}`}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Button
                            size="lg"
                            onClick={() => setIsWithdrawalModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Banknote className="mr-2 h-5 w-5" /> Request Withdrawal
                        </Button>
                     )}
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Profit Log (Estimated)</CardTitle>
           <CardDescription>Showing potential profit range for each day (including referral bonus).</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full"> {/* Adjust height as needed */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Day</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="text-right">Daily Profit Range</TableHead>
                  <TableHead className="text-right">Cumulative Profit Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyProfits.map((entry) => {
                   // Highlight past/today rows
                   const entryDate = new Date(entry.date);
                   entryDate.setHours(23, 59, 59, 999); // Consider the whole day
                   const isPastOrToday = currentDate >= entryDate;

                   const dailyProfitText = entry.profitMin === entry.profitMax
                        ? formatCurrency(entry.profitMin)
                        : `${formatCurrency(entry.profitMin)} – ${formatCurrency(entry.profitMax)}`;
                    const cumulativeProfitText = entry.cumulativeMin === entry.cumulativeMax
                        ? formatCurrency(entry.cumulativeMin)
                        : `${formatCurrency(entry.cumulativeMin)} – ${formatCurrency(entry.cumulativeMax)}`;

                  return (
                    <TableRow key={entry.day} className={isPastOrToday && !isPlanComplete ? 'bg-muted/30' : ''}> {/* Only highlight if plan not complete */}
                      <TableCell className="font-medium">{entry.day}</TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className={`text-right ${isPastOrToday && !isPlanComplete ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {dailyProfitText}
                      </TableCell>
                      <TableCell className={`text-right ${isPastOrToday && !isPlanComplete ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {cumulativeProfitText}
                      </TableCell>
                    </TableRow>
                  );
                 })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

       {/* Withdrawal Request Modal */}
        <Dialog open={isWithdrawalModalOpen} onOpenChange={setIsWithdrawalModalOpen}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-primary"/> Request Withdrawal
                    </DialogTitle>
                    <DialogDescription>
                        Your investment plan is complete! Request your total return of approximately <strong>{finalTotalReturnText}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Withdrawal Method Selection */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Select Withdrawal Method</Label>
                        <RadioGroup
                            onValueChange={(value: 'easypaisa' | 'jazzcash') => setWithdrawalMethod(value)}
                            value={withdrawalMethod ?? undefined}
                            className="flex space-x-4"
                         >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="easypaisa" id="r-easypaisa" />
                                <Label htmlFor="r-easypaisa" className="font-normal flex items-center gap-1">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v-2m0-4h.01M7.757 14.757l-.707.707M16.243 14.757l.707.707M9.172 10.172a4 4 0 015.656 0M14.828 10.172a4 4 0 01-5.656 0" /></svg>
                                     Easypaisa
                                 </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="jazzcash" id="r-jazzcash" />
                                <Label htmlFor="r-jazzcash" className="font-normal flex items-center gap-1">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10s5 2 5 2 1 .5 1 1 .5 1 1 1-1 .5-1 1-.5 1-1 1-2 1-2 1-2.47 2-4.529 2M12 18a6 6 0 006-6M12 18a6 6 0 01-6-6" /></svg>
                                     JazzCash
                                 </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Account Number Input */}
                    <div className="space-y-2">
                        <Label htmlFor="account-number" className="text-base font-semibold">Account Number</Label>
                        <Input
                            id="account-number"
                            type="text"
                            inputMode="numeric" // Important for mobile keyboards
                            pattern="[0-9]*" // Helps with validation
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))} // Allow only digits
                            placeholder="Enter your account number"
                            required
                         />
                    </div>

                    {/* Important Note */}
                    <Alert variant="default">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Important Note</AlertTitle>
                        <AlertDescription>
                            Withdrawals are typically processed within <strong>3 business days</strong> after the request is submitted. Funds will be sent to the account number provided. Please double-check the details before submitting.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        type="button"
                        onClick={handleRequestWithdrawal}
                        disabled={isSubmittingWithdrawal || !withdrawalMethod || !accountNumber.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSubmittingWithdrawal ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                            </>
                        ) : "Submit Withdrawal Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}
