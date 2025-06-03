
"use client";

import * as React from 'react';
import type { InvestmentSubmissionFirestore } from '@/lib/investment-store'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, addDays, format, isPast, formatDistanceToNowStrict } from 'date-fns'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, CalendarDays, TrendingUp, Percent, Hourglass, User, CheckCircle, Banknote, Wallet, Info, Loader2, Gift, AlertCircle } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
    addWithdrawalRequestToFirestore, 
    getWithdrawalRequestForInvestmentFromFirestore, 
    type WithdrawalRequestFirestore 
} from '@/lib/withdrawal-store'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Timestamp } from 'firebase/firestore';

interface DashboardProps {
  plan: InvestmentSubmissionFirestore; 
}

const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatFirestoreTimestamp = (timestamp: Timestamp | string | undefined | null, includeTime: boolean = true): string => {
  if (!timestamp) return 'N/A';
  let date: Date;
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    date = (timestamp as Timestamp).toDate();
  } else {
     return 'Invalid Date';
  }
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  return includeTime ? format(date, 'Pp') : format(date, 'P');
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
  // Ensure plan.approvalDate is a Date object for calculations
  const startDate = React.useMemo(() => {
    if (!plan.approvalDate) return null;
    return (plan.approvalDate as Timestamp).toDate();
  }, [plan.approvalDate]);

  const referralBonus = React.useMemo(() => plan.referralBonusPercent ?? 0, [plan.referralBonusPercent]);
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [dailyProfits, setDailyProfits] = React.useState<DailyProfitEntry[]>([]);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = React.useState(false);
  const [withdrawalMethod, setWithdrawalMethod] = React.useState<'easypaisa' | 'jazzcash' | null>(null);
  const [accountNumber, setAccountNumber] = React.useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = React.useState(false);
  const [existingWithdrawalRequest, setExistingWithdrawalRequest] = React.useState<WithdrawalRequestFirestore | null>(null);
  const [isLoadingWithdrawalStatus, setIsLoadingWithdrawalStatus] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000 * 60); // Refresh current time every minute
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!startDate) return; // Don't calculate if plan isn't approved yet
    const calculateProfits = () => {
      const profits: DailyProfitEntry[] = [];
      let cumulativeMin = 0;
      let cumulativeMax = 0;
      const investmentAmount = plan.investmentAmount;

      const effectiveDailyProfitMin = plan.dailyProfitMin + referralBonus;
      const effectiveDailyProfitMax = plan.dailyProfitMax + referralBonus;

      for (let i = 1; i <= plan.duration; i++) {
        const profitDate = addDays(startDate, i - 1);
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
  }, [plan, startDate, referralBonus]);

  React.useEffect(() => {
    const fetchWithdrawalStatus = async () => {
      if (plan.id && plan.userId && plan.status !== 'pending') { // Only fetch if plan is active/completed and has ID
        setIsLoadingWithdrawalStatus(true);
        try {
          const request = await getWithdrawalRequestForInvestmentFromFirestore(plan.id, plan.userId);
          setExistingWithdrawalRequest(request);
        } catch (error) {
          console.error("Error fetching withdrawal status:", error);
          toast({ title: "Error", description: "Could not load withdrawal status.", variant: "destructive" });
        } finally {
          setIsLoadingWithdrawalStatus(false);
        }
      } else {
        setIsLoadingWithdrawalStatus(false); // No need to load if plan not suitable for withdrawal check
      }
    };
    fetchWithdrawalStatus();
  }, [plan.id, plan.userId, plan.status, toast]);


  if (plan.status === 'pending') {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-amber-600">
                <Hourglass className="h-5 w-5" /> {plan.planTitle} - Pending Approval
            </CardTitle>
            <CardDescription>
                Submitted on: {formatFirestoreTimestamp(plan.submissionDate)}. Your investment of {formatCurrency(plan.investmentAmount)} is awaiting admin approval.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>Verification in Progress</AlertTitle>
                <AlertDescription>
                Your investment proof has been submitted and is currently under review. 
                This usually takes a few hours, up to 24 hours. 
                Once approved, your plan will become active, and you&apos;ll see detailed progress here.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    )
  }

  if (plan.status === 'rejected') {
     return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-destructive">
                <AlertCircle className="h-5 w-5" /> {plan.planTitle} - Submission Rejected
            </CardTitle>
            <CardDescription>
                 Submitted on: {formatFirestoreTimestamp(plan.submissionDate)}. Amount: {formatCurrency(plan.investmentAmount)}.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Investment Rejected</AlertTitle>
                <AlertDescription>
                  Unfortunately, your investment submission was rejected. 
                  {plan.rejectionReason && <p className="mt-1"><strong>Reason:</strong> {plan.rejectionReason}</p>}
                  <p className="mt-2">Please review the reason and contact support if you have questions or wish to resubmit with corrections.</p>
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
     )
  }


  if (!startDate) { // Should only happen if status is approved but approvalDate is missing (data inconsistency)
    return (
        <Card>
            <CardHeader><CardTitle>Loading Investment Data...</CardTitle></CardHeader>
            <CardContent><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent>
        </Card>
    );
  }

  const endDate = addDays(startDate, plan.duration);
  const isPlanComplete = plan.status === 'completed' || (plan.status === 'approved' && isPast(endDate));
  
  const daysElapsed = Math.min(plan.duration, Math.max(0, differenceInDays(currentDate, startDate)));
  const daysRemaining = Math.max(0, plan.duration - daysElapsed);
  const progress = Math.min(100, Math.max(0,(daysElapsed / plan.duration) * 100));

   const currentProfitIndex = Math.min(daysElapsed > 0 ? daysElapsed : 1, plan.duration) - 1;
   const currentCumulativeMin = currentProfitIndex >= 0 && dailyProfits.length > currentProfitIndex ? dailyProfits[currentProfitIndex]?.cumulativeMin ?? 0 : 0;
   const currentCumulativeMax = currentProfitIndex >= 0 && dailyProfits.length > currentProfitIndex ? dailyProfits[currentProfitIndex]?.cumulativeMax ?? 0 : 0;
   const currentCumulativeProfitText = currentCumulativeMin === currentCumulativeMax
     ? formatCurrency(currentCumulativeMin)
     : `${formatCurrency(currentCumulativeMin)} – ${formatCurrency(currentCumulativeMax)}`;

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

   const effectiveDailyProfitMin = plan.dailyProfitMin + referralBonus;
   const effectiveDailyProfitMax = plan.dailyProfitMax + referralBonus;
   const effectiveDailyProfitRangeText = effectiveDailyProfitMin === effectiveDailyProfitMax
     ? `${effectiveDailyProfitMin.toFixed(1)}%`
     : `${effectiveDailyProfitMin.toFixed(1)}% – ${effectiveDailyProfitMax.toFixed(1)}%`;

  const PlanIconComponent = plan.iconName ? TrendingUp : DollarSign; // Simple fallback

  const handleRequestWithdrawal = async () => {
      if (!withdrawalMethod || !accountNumber.trim() || !plan.id || !plan.userId || !plan.userName || !plan.userPhoneNumber) {
          toast({ variant: "destructive", title: "Missing Information", description: "Please select a withdrawal method and enter your account number." });
          return;
      }
      if (!/^\d+$/.test(accountNumber.trim())) {
           toast({ variant: "destructive", title: "Invalid Account Number", description: "Account number should only contain digits." });
          return;
      }
      setIsSubmittingWithdrawal(true);
      try {
          // Use the maximum potential return for withdrawal amount, or adjust as per business logic
          const withdrawalAmount = finalTotalReturnMax; 
          const requestData: Omit<WithdrawalRequestFirestore, 'id' | 'status' | 'requestDate' | 'processedDate' | 'rejectionReason' | 'transactionId'> = {
              userId: plan.userId, 
              userName: plan.userName,
              userPhoneNumber: plan.userPhoneNumber,
              investmentId: plan.id,
              investmentTitle: plan.planTitle, // use planTitle from investment
              withdrawalAmount: withdrawalAmount,
              paymentMethod: withdrawalMethod,
              accountNumber: accountNumber.trim(),
          };
          const newRequest = await addWithdrawalRequestToFirestore(requestData);
          setExistingWithdrawalRequest(newRequest); 
          toast({ title: "Withdrawal Requested", description: `Your request to withdraw ${formatCurrency(withdrawalAmount)} has been submitted.`, variant: "default" });
          setIsWithdrawalModalOpen(false);
          setWithdrawalMethod(null);
          setAccountNumber('');
      } catch (error) {
          console.error("Withdrawal request error:", error);
          toast({ variant: "destructive", title: "Request Failed", description: "Could not submit your withdrawal request." });
      } finally {
          setIsSubmittingWithdrawal(false);
      }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <PlanIconComponent className="h-6 w-6" /> {plan.planTitle} Overview
          </CardTitle>
          <CardDescription>
              Approved on {formatFirestoreTimestamp(plan.approvalDate)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
            <DollarSign className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Your Investment</p>
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
                       ({plan.dailyProfitMin.toFixed(1)}% Base + {referralBonus.toFixed(1)}% Bonus)
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
           {!isPlanComplete && (
               <div className="flex items-center space-x-3 rounded-md border p-4 bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
                <div>
                  <p className="text-sm font-medium leading-none">Current Profit (Est.)</p>
                  <p className="text-lg font-semibold">{currentCumulativeProfitText}</p>
                </div>
              </div>
           )}
           {isPlanComplete && (
              <div className="flex items-center space-x-3 rounded-md border p-4 bg-primary/10 text-primary">
                 <TrendingUp className="h-6 w-6" />
                  <div>
                      <p className="text-sm font-medium leading-none">Final Profit (Est.)</p>
                      <p className="text-lg font-semibold">{finalTotalProfitText}</p>
                  </div>
              </div>
           )}
           <div className="flex items-center space-x-3 rounded-md border p-4 bg-green-600/10 text-green-700 dark:text-green-400 md:col-span-full lg:col-span-1">
             <CheckCircle className="h-6 w-6" />
            <div>
              <p className="text-sm font-medium leading-none">Total Return (Est.)</p>
              <p className="text-lg font-semibold">{finalTotalReturnText}</p>
            </div>
          </div>
            {referralBonus > 0 && (
                <div className="flex items-center space-x-3 rounded-md border p-4 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 md:col-span-full">
                    <Gift className="h-6 w-6" />
                    <div>
                        <p className="text-sm font-medium leading-none">Referral Bonus Applied</p>
                        <p className="text-lg font-semibold">+{referralBonus.toFixed(1)}% Daily Profit</p>
                         <p className="text-xs text-muted-foreground">Your daily profit includes an extra {referralBonus.toFixed(1)}% (details may vary).</p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investment Progress</CardTitle>
          <CardDescription>
            {daysElapsed} of {plan.duration} days completed. {daysRemaining > 0 ? `${formatDistanceToNowStrict(endDate, {unit: 'day'})} remaining.` : 'Plan completed.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full h-4" />
           <p className="text-right text-sm text-muted-foreground mt-1">{progress.toFixed(1)}% complete</p>
           {isPlanComplete && (
                <div className="mt-6 text-center">
                    {isLoadingWithdrawalStatus ? (
                         <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    ) : existingWithdrawalRequest ? (
                        <Alert 
                            variant={existingWithdrawalRequest.status === 'completed' ? 'default' : (existingWithdrawalRequest.status === 'rejected' ? 'destructive' : 'default')} 
                            className="max-w-md mx-auto text-left"
                        >
                             <Wallet className="h-4 w-4" />
                            <AlertTitle>Withdrawal Request: {existingWithdrawalRequest.status.charAt(0).toUpperCase() + existingWithdrawalRequest.status.slice(1)}</AlertTitle>
                            <AlertDescription className="space-y-1">
                                <p>Amount: <strong>{formatCurrency(existingWithdrawalRequest.withdrawalAmount)}</strong></p>
                                <p>Method: <strong>{existingWithdrawalRequest.paymentMethod}</strong> (Account: {existingWithdrawalRequest.accountNumber})</p>
                                <p>Requested: {formatFirestoreTimestamp(existingWithdrawalRequest.requestDate)}</p>
                                {existingWithdrawalRequest.status === 'pending' && <p>Processing typically takes 1-3 business days.</p>}
                                {existingWithdrawalRequest.status === 'rejected' && existingWithdrawalRequest.rejectionReason && <p>Reason: {existingWithdrawalRequest.rejectionReason}</p>}
                                {existingWithdrawalRequest.status === 'completed' && existingWithdrawalRequest.transactionId && <p>Transaction ID: {existingWithdrawalRequest.transactionId}</p>}
                                {existingWithdrawalRequest.status === 'completed' && existingWithdrawalRequest.processedDate && <p>Processed: {formatFirestoreTimestamp(existingWithdrawalRequest.processedDate)}</p>}
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

      {dailyProfits.length > 0 && (
        <Card>
            <CardHeader>
            <CardTitle>Daily Profit Log (Estimated)</CardTitle>
            <CardDescription>Showing potential profit range for each day (includes {referralBonus > 0 ? `${referralBonus.toFixed(1)}% referral bonus` : 'base rate'}).</CardDescription>
            </CardHeader>
            <CardContent>
            <ScrollArea className="h-[300px] w-full">
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
                    const entryDate = new Date(entry.date); // Assumes entry.date is a parseable string
                    entryDate.setHours(23, 59, 59, 999); 
                    const isEntryPastOrToday = currentDate >= entryDate;
                    const dailyProfitText = entry.profitMin === entry.profitMax
                            ? formatCurrency(entry.profitMin)
                            : `${formatCurrency(entry.profitMin)} – ${formatCurrency(entry.profitMax)}`;
                        const cumulativeProfitText = entry.cumulativeMin === entry.cumulativeMax
                            ? formatCurrency(entry.cumulativeMin)
                            : `${formatCurrency(entry.cumulativeMin)} – ${formatCurrency(entry.cumulativeMax)}`;
                    return (
                        <TableRow key={entry.day} className={isEntryPastOrToday && !isPlanComplete ? 'bg-muted/30' : ''}>
                        <TableCell className="font-medium">{entry.day}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className={`text-right ${isEntryPastOrToday && !isPlanComplete ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                            {dailyProfitText}
                        </TableCell>
                        <TableCell className={`text-right ${isEntryPastOrToday && !isPlanComplete ? 'font-semibold' : 'text-muted-foreground'}`}>
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
      )}


        <Dialog open={isWithdrawalModalOpen} onOpenChange={setIsWithdrawalModalOpen}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-primary"/> Request Withdrawal
                    </DialogTitle>
                    <DialogDescription>
                        Your investment plan is complete! Request your total estimated return of approximately <strong>{finalTotalReturnText}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
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
                                     {/* Replace with actual Easypaisa icon if available */}
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v-2m0-4h.01M7.757 14.757l-.707.707M16.243 14.757l.707.707M9.172 10.172a4 4 0 015.656 0M14.828 10.172a4 4 0 01-5.656 0" /></svg>
                                     Easypaisa
                                 </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="jazzcash" id="r-jazzcash" />
                                <Label htmlFor="r-jazzcash" className="font-normal flex items-center gap-1">
                                     {/* Replace with actual JazzCash icon if available */}
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10s5 2 5 2 1 .5 1 1 .5 1 1 1-1 .5-1 1-.5 1-1 1-2 1-2 1-2.47 2-4.529 2M12 18a6 6 0 006-6M12 18a6 6 0 01-6-6" /></svg>
                                     JazzCash
                                 </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="account-number" className="text-base font-semibold">Account Number</Label>
                        <Input
                            id="account-number"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Enter your account number"
                            required
                         />
                    </div>
                    <Alert variant="default">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Important Note</AlertTitle>
                        <AlertDescription>
                            Withdrawals are typically processed within <strong>1-3 business days</strong>. Funds will be sent to the account number provided. Please double-check details before submitting.
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
