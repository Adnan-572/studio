
"use client";

import * as React from 'react';
import type { UserPlanData } from '@/lib/investment-store'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, addDays, format, isPast, formatDistanceToNowStrict } from 'date-fns'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, CalendarDays, TrendingUp, Percent, Hourglass, CheckCircle, Banknote, Wallet, Info, Loader2, Gift, AlertCircle } from 'lucide-react'; 
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
import { icons } from 'lucide-react'; // For dynamic icon loading

interface DashboardProps {
  planData: UserPlanData; 
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

export function Dashboard({ planData }: DashboardProps) {
  const { toast } = useToast();
  const startDate = React.useMemo(() => {
    if (!planData.approvalDate) return null;
    return (planData.approvalDate as Timestamp).toDate();
  }, [planData.approvalDate]);

  const referralBonus = React.useMemo(() => planData.referralBonusAppliedPercent ?? 0, [planData.referralBonusAppliedPercent]);
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [dailyProfits, setDailyProfits] = React.useState<DailyProfitEntry[]>([]);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = React.useState(false);
  const [withdrawalMethod, setWithdrawalMethod] = React.useState<'easypaisa' | 'jazzcash' | null>(null);
  const [accountNumber, setAccountNumber] = React.useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = React.useState(false);
  const [existingWithdrawalRequest, setExistingWithdrawalRequest] = React.useState<WithdrawalRequestFirestore | null>(null);
  const [isLoadingWithdrawalStatus, setIsLoadingWithdrawalStatus] = React.useState(true);

  const PlanIconComponent = React.useMemo(() => {
    const LucideIcon = icons[planData.planIconName as keyof typeof icons];
    return LucideIcon || DollarSign; // Fallback icon
  }, [planData.planIconName]);


  React.useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000 * 60); 
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!startDate) return; 
    const calculateProfits = () => {
      const profits: DailyProfitEntry[] = [];
      let cumulativeMin = 0;
      let cumulativeMax = 0;
      const investmentAmount = planData.investmentAmount;

      const effectiveDailyProfitMin = planData.baseDailyProfitMin + referralBonus;
      const effectiveDailyProfitMax = planData.baseDailyProfitMax + referralBonus;

      for (let i = 1; i <= planData.durationInDays; i++) {
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
  }, [planData, startDate, referralBonus]);

  const fetchWithdrawalStatus = React.useCallback(async () => {
    if (planData.id && planData.userId && planData.status !== 'pending') { 
      setIsLoadingWithdrawalStatus(true);
      try {
        const request = await getWithdrawalRequestForInvestmentFromFirestore(planData.id, planData.userId);
        setExistingWithdrawalRequest(request);
      } catch (error) {
        console.error("Error fetching withdrawal status:", error);
        toast({ title: "Error", description: "Could not load withdrawal status.", variant: "destructive" });
      } finally {
        setIsLoadingWithdrawalStatus(false);
      }
    } else {
      setIsLoadingWithdrawalStatus(false); 
    }
  }, [planData.id, planData.userId, planData.status, toast]);

  React.useEffect(() => {
    fetchWithdrawalStatus();
  }, [fetchWithdrawalStatus]);


  if (planData.status === 'pending') {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-amber-600">
                <Hourglass className="h-5 w-5" /> {planData.planTitle} - Pending Approval
            </CardTitle>
            <CardDescription>
                Submitted on: {formatFirestoreTimestamp(planData.submissionDate)}. Your investment of {formatCurrency(planData.investmentAmount)} is awaiting admin approval.
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

  if (planData.status === 'rejected') {
     return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-destructive">
                <AlertCircle className="h-5 w-5" /> {planData.planTitle} - Submission Rejected
            </CardTitle>
            <CardDescription>
                 Submitted on: {formatFirestoreTimestamp(planData.submissionDate)}. Amount: {formatCurrency(planData.investmentAmount)}.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Investment Rejected</AlertTitle>
                <AlertDescription>
                  Unfortunately, your investment submission was rejected. 
                  {planData.rejectionReason && <p className="mt-1"><strong>Reason:</strong> {planData.rejectionReason}</p>}
                  <p className="mt-2">Please review the reason and contact support if you have questions or wish to resubmit with corrections.</p>
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
     )
  }


  if (!startDate) { 
    return (
        <Card>
            <CardHeader><CardTitle>Loading Investment Data...</CardTitle></CardHeader>
            <CardContent><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent>
        </Card>
    );
  }

  const planEndDate = planData.endDate ? (planData.endDate as Timestamp).toDate() : addDays(startDate, planData.durationInDays);
  const isPlanEffectivelyComplete = planData.status === 'completed' || (planData.status === 'approved' && isPast(planEndDate));
  
  const daysElapsed = Math.min(planData.durationInDays, Math.max(0, differenceInDays(currentDate, startDate)));
  const daysRemaining = Math.max(0, planData.durationInDays - daysElapsed);
  const progress = Math.min(100, Math.max(0,(daysElapsed / planData.durationInDays) * 100));

   const currentProfitIndex = Math.min(daysElapsed > 0 ? daysElapsed : 1, planData.durationInDays) - 1;
   const currentCumulativeMin = currentProfitIndex >= 0 && dailyProfits.length > currentProfitIndex ? dailyProfits[currentProfitIndex]?.cumulativeMin ?? 0 : 0;
   const currentCumulativeMax = currentProfitIndex >= 0 && dailyProfits.length > currentProfitIndex ? dailyProfits[currentProfitIndex]?.cumulativeMax ?? 0 : 0;
   const currentCumulativeProfitText = currentCumulativeMin === currentCumulativeMax
     ? formatCurrency(currentCumulativeMin)
     : `${formatCurrency(currentCumulativeMin)} – ${formatCurrency(currentCumulativeMax)}`;

  const finalTotalProfitMin = dailyProfits[planData.durationInDays - 1]?.cumulativeMin ?? 0;
  const finalTotalProfitMax = dailyProfits[planData.durationInDays - 1]?.cumulativeMax ?? 0;
  const finalTotalReturnMin = planData.investmentAmount + finalTotalProfitMin;
  const finalTotalReturnMax = planData.investmentAmount + finalTotalProfitMax;
   const finalTotalReturnText = finalTotalReturnMin === finalTotalReturnMax
    ? formatCurrency(finalTotalReturnMin)
    : `${formatCurrency(finalTotalReturnMin)} – ${formatCurrency(finalTotalReturnMax)}`;
   const finalTotalProfitText = finalTotalProfitMin === finalTotalProfitMax
    ? formatCurrency(finalTotalProfitMin)
    : `${formatCurrency(finalTotalProfitMin)} – ${formatCurrency(finalTotalProfitMax)}`;

   const effectiveDailyProfitMin = planData.baseDailyProfitMin + referralBonus;
   const effectiveDailyProfitMax = planData.baseDailyProfitMax + referralBonus;
   const effectiveDailyProfitRangeText = effectiveDailyProfitMin === effectiveDailyProfitMax
     ? `${effectiveDailyProfitMin.toFixed(1)}%`
     : `${effectiveDailyProfitMin.toFixed(1)}% – ${effectiveDailyProfitMax.toFixed(1)}%`;


  const handleRequestWithdrawal = async () => {
      if (!withdrawalMethod || !accountNumber.trim() || !planData.id || !planData.userId || !planData.userName || !planData.userPhoneNumber) {
          toast({ variant: "destructive", title: "Missing Information", description: "Please select a withdrawal method and enter your account number." });
          return;
      }
      if (!/^\d+$/.test(accountNumber.trim())) {
           toast({ variant: "destructive", title: "Invalid Account Number", description: "Account number should only contain digits." });
          return;
      }
      setIsSubmittingWithdrawal(true);
      try {
          // Use the higher end of the estimated return for withdrawal amount
          const withdrawalAmount = finalTotalReturnMax; 
          const requestData: Omit<WithdrawalRequestFirestore, 'id' | 'status' | 'requestDate' | 'processedDate' | 'rejectionReason' | 'transactionId'> = {
              userId: planData.userId, 
              userName: planData.userName, 
              userPhoneNumber: planData.userPhoneNumber, 
              investmentId: planData.id!, 
              investmentTitle: planData.planTitle, 
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
          fetchWithdrawalStatus(); // Refresh status
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
            <PlanIconComponent className="h-6 w-6" /> {planData.planTitle} Overview
          </CardTitle>
          <CardDescription>
              Approved on {formatFirestoreTimestamp(planData.approvalDate)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
            <DollarSign className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Your Investment</p>
              <p className="text-lg font-semibold">{formatCurrency(planData.investmentAmount)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
             <Percent className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Daily Profit Rate</p>
              <p className="text-lg font-semibold">{effectiveDailyProfitRangeText}</p>
              {referralBonus > 0 && (
                   <p className="text-xs text-muted-foreground">
                       ({planData.baseDailyProfitMin.toFixed(1)}% Base + {referralBonus.toFixed(1)}% Bonus)
                   </p>
               )}
            </div>
          </div>
           <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
             <CalendarDays className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Plan Duration</p>
              <p className="text-lg font-semibold">{planData.durationInDays} days</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
            <Hourglass className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-none">Ends On</p>
              <p className="text-lg font-semibold">{format(planEndDate, 'PPP')}</p>
            </div>
          </div>
           {!isPlanEffectivelyComplete && (
               <div className="flex items-center space-x-3 rounded-md border p-4 bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
                <div>
                  <p className="text-sm font-medium leading-none">Current Profit (Est.)</p>
                  <p className="text-lg font-semibold">{currentCumulativeProfitText}</p>
                </div>
              </div>
           )}
           {isPlanEffectivelyComplete && (
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
                         <p className="text-xs text-muted-foreground">Your daily profit includes an extra {referralBonus.toFixed(1)}%.</p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investment Progress</CardTitle>
          <CardDescription>
            {daysElapsed} of {planData.durationInDays} days completed. {daysRemaining > 0 && !isPlanEffectivelyComplete ? `${formatDistanceToNowStrict(planEndDate, {unit: 'day'})} remaining.` : 'Plan term completed.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full h-4" />
           <p className="text-right text-sm text-muted-foreground mt-1">{progress.toFixed(1)}% complete</p>
           {isPlanEffectivelyComplete && (
                <div className="mt-6 text-center">
                    {isLoadingWithdrawalStatus ? (
                         <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" /> 
                            <span className="text-muted-foreground">Loading withdrawal status...</span>
                         </div>
                    ) : existingWithdrawalRequest ? (
                        <Alert 
                            variant={
                                existingWithdrawalRequest.status === 'completed' ? 'default' : 
                                existingWithdrawalRequest.status === 'rejected' ? 'destructive' : 
                                'default' // 'pending' or 'processing'
                            } 
                            className="max-w-md mx-auto text-left"
                        >
                             <Wallet className="h-4 w-4" />
                            <AlertTitle>Withdrawal Request: {existingWithdrawalRequest.status.charAt(0).toUpperCase() + existingWithdrawalRequest.status.slice(1)}</AlertTitle>
                            <AlertDescription className="space-y-1">
                                <p>Amount: <strong>{formatCurrency(existingWithdrawalRequest.withdrawalAmount)}</strong></p>
                                <p>Method: <strong className="capitalize">{existingWithdrawalRequest.paymentMethod}</strong> (Account: {existingWithdrawalRequest.accountNumber})</p>
                                <p>Requested: {formatFirestoreTimestamp(existingWithdrawalRequest.requestDate)}</p>
                                {existingWithdrawalRequest.status === 'pending' && <p>Your request is awaiting processing. This usually takes 1-3 business days.</p>}
                                {existingWithdrawalRequest.status === 'processing' && <p>Your request is currently being processed.</p>}
                                {existingWithdrawalRequest.status === 'rejected' && existingWithdrawalRequest.rejectionReason && <p className="text-destructive">Reason: {existingWithdrawalRequest.rejectionReason}</p>}
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
                    const entryDate = new Date(entry.date); 
                    entryDate.setHours(23, 59, 59, 999); 
                    const isEntryPastOrToday = currentDate >= entryDate;
                    const dailyProfitText = entry.profitMin === entry.profitMax
                            ? formatCurrency(entry.profitMin)
                            : `${formatCurrency(entry.profitMin)} – ${formatCurrency(entry.profitMax)}`;
                        const cumulativeProfitText = entry.cumulativeMin === entry.cumulativeMax
                            ? formatCurrency(entry.cumulativeMin)
                            : `${formatCurrency(entry.cumulativeMin)} – ${formatCurrency(entry.cumulativeMax)}`;
                    return (
                        <TableRow key={entry.day} className={isEntryPastOrToday && !isPlanEffectivelyComplete && planData.status === 'approved' ? 'bg-muted/30' : ''}>
                        <TableCell className="font-medium">{entry.day}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className={`text-right ${isEntryPastOrToday && !isPlanEffectivelyComplete && planData.status === 'approved' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                            {dailyProfitText}
                        </TableCell>
                        <TableCell className={`text-right ${isEntryPastOrToday && !isPlanEffectivelyComplete && planData.status === 'approved' ? 'font-semibold' : 'text-muted-foreground'}`}>
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

        <Dialog open={isWithdrawalModalOpen} onOpenChange={(open) => { if(!open) {setWithdrawalMethod(null); setAccountNumber('');} setIsWithdrawalModalOpen(open)}}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-primary"/> Request Withdrawal
                    </DialogTitle>
                    <DialogDescription>
                        Your investment plan term is complete! You can request your total estimated return of approximately <strong>{finalTotalReturnText}</strong>.
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
                                <Label htmlFor="r-easypaisa" className="font-normal flex items-center gap-1 cursor-pointer">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v-2m0-4h.01M7.757 14.757l-.707.707M16.243 14.757l.707.707M9.172 10.172a4 4 0 015.656 0M14.828 10.172a4 4 0 01-5.656 0" /></svg>
                                     Easypaisa
                                 </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="jazzcash" id="r-jazzcash" />
                                <Label htmlFor="r-jazzcash" className="font-normal flex items-center gap-1 cursor-pointer">
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
