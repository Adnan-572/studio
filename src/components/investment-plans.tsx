
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Zap, Gem, Crown, Milestone, UploadCloud, Copy, Calculator, Loader2, CheckCircle, X, LogIn } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { addPendingInvestment } from '@/lib/investment-store';

export interface Plan {
  title: string;
  icon: React.ElementType;
  investmentRange: string;
  duration: number;
  dailyProfitMin: number;
  dailyProfitMax: number;
  badge?: string;
  primary?: boolean;
  minInvestment: number;
  maxInvestment: number;
}

const plansData: Omit<Plan, 'investmentAmount'>[] = [
   {
    title: "Basic Plan",
    icon: TrendingUp,
    investmentRange: "PKR 500 – 5,000",
    duration: 15,
    dailyProfitMin: 1.0,
    dailyProfitMax: 1.5,
    minInvestment: 500,
    maxInvestment: 5000,
  },
  {
    title: "Advance Plan",
    icon: Zap,
    investmentRange: "PKR 5,000 – 50,000", // Updated
    duration: 25,
    dailyProfitMin: 1.5,
    dailyProfitMax: 2.0,
    badge: "Popular",
    primary: true,
    minInvestment: 5000, // Updated
    maxInvestment: 50000, // Updated
  },
  {
    title: "Premium Plan",
    icon: Gem,
    investmentRange: "PKR 1,000 – 100,000",
    duration: 50,
    dailyProfitMin: 2.0,
    dailyProfitMax: 2.5,
    minInvestment: 1000,
    maxInvestment: 100000,
  },
  {
    title: "Expert Plan",
    icon: Crown,
    investmentRange: "PKR 50,000 – 500,000",
    duration: 75,
    dailyProfitMin: 2.5,
    dailyProfitMax: 3.0,
    minInvestment: 50000,
    maxInvestment: 500000,
  },
  {
    title: "Master Plan",
    icon: Milestone,
    investmentRange: "PKR 1,000 – 100,000",
    duration: 90,
    dailyProfitMin: 3.0,
    dailyProfitMax: 4.5,
    minInvestment: 1000,
    maxInvestment: 100000,
  },
];

// The `investmentAmount` field in the Plan interface is used as a default or reference.
// The actual investment amount logic is handled by minInvestment and maxInvestment for ranges.
const plans: Plan[] = plansData.map(p => ({
  ...p,
  // Setting a default investmentAmount to minInvestment for all plans here.
  // This property is not directly used for the display of investmentRange on cards.
  investmentAmount: p.minInvestment,
}));


const paymentDetails = {
  easypaisa: {
    accountName: "adnan tariq",
    accountNumber: "03411167577",
  },
  jazzcash: {
    accountName: "Rupay Growth Investment",
    accountNumber: "03012345678",
  },
};

const formatCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const ProfitCalculator: React.FC<{ plan: Plan }> = ({ plan }) => {
    const [amount, setAmount] = React.useState<string>(plan.minInvestment.toString());
    const [dailyProfitMin, setDailyProfitMin] = React.useState<number>(0);
    const [dailyProfitMax, setDailyProfitMax] = React.useState<number>(0);
    const [totalReturnMin, setTotalReturnMin] = React.useState<number>(0);
    const [totalReturnMax, setTotalReturnMax] = React.useState<number>(0);
    const [isValidAmount, setIsValidAmount] = React.useState<boolean>(true);

    React.useEffect(() => {
        const investmentAmount = parseInt(amount, 10);
        if (isNaN(investmentAmount) || investmentAmount < plan.minInvestment || investmentAmount > plan.maxInvestment) {
            setIsValidAmount(false);
            setDailyProfitMin(0);
            setDailyProfitMax(0);
            setTotalReturnMin(0);
            setTotalReturnMax(0);
            return;
        }

        setIsValidAmount(true);
        const dailyMin = (investmentAmount * plan.dailyProfitMin) / 100;
        const dailyMax = (investmentAmount * plan.dailyProfitMax) / 100;
        const totalMin = investmentAmount + (dailyMin * plan.duration);
        const totalMax = investmentAmount + (dailyMax * plan.duration);

        setDailyProfitMin(dailyMin);
        setDailyProfitMax(dailyMax);
        setTotalReturnMin(totalMin);
        setTotalReturnMax(totalMax);

    }, [amount, plan]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || /^[0-9]*$/.test(value)) {
           if (value.length > 1 && value.startsWith('0')) {
             setAmount(value.substring(1));
           } else {
             setAmount(value);
           }
        }
    };

    const dailyProfitText = dailyProfitMin === dailyProfitMax
        ? formatCurrency(dailyProfitMin)
        : `${formatCurrency(dailyProfitMin)} – ${formatCurrency(dailyProfitMax)}`;

    const totalReturnText = totalReturnMin === totalReturnMax
        ? formatCurrency(totalReturnMin)
        : `${formatCurrency(totalReturnMin)} – ${formatCurrency(totalReturnMax)}`;

    return (
        <div className="mt-4 pt-4 border-t">
            <Label htmlFor={`calc-amount-${plan.title}`} className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Calculator className="h-3 w-3" /> Profit Calculator
            </Label>
            <Input
                id={`calc-amount-${plan.title}`}
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder={`Amount (${formatCurrency(plan.minInvestment)} - ${formatCurrency(plan.maxInvestment)})`}
                className={`h-8 text-sm mb-2 ${!isValidAmount && amount !== '' ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
            />
            {!isValidAmount && amount !== '' && (
                 <p className="text-xs text-destructive mb-2">
                     Enter amount between {formatCurrency(plan.minInvestment)} and {formatCurrency(plan.maxInvestment)}.
                </p>
            )}
            {isValidAmount && amount !== '' && (
                <div className="text-xs space-y-1">
                     <div className="flex justify-between">
                         <span className="text-muted-foreground">Daily Profit (Est.):</span>
                         <span className="font-medium text-primary">{dailyProfitText}</span>
                     </div>
                     <div className="flex justify-between">
                         <span className="text-muted-foreground">Total Return (Est. after {plan.duration} days):</span>
                         <span className="font-semibold">{totalReturnText}</span>
                     </div>
                 </div>
            )}
             {amount === '' && (
                 <p className="text-xs text-muted-foreground mb-2">
                     Enter an amount to calculate potential profit.
                 </p>
            )}
        </div>
    );
};

interface InvestmentPlansProps {
  userId: string | null;
  userName: string | null;
  isAuthenticated: boolean;
}

export function InvestmentPlans({ userId, userName, isAuthenticated }: InvestmentPlansProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [investmentAmount, setInvestmentAmount] = React.useState<string>('');
  const [transactionProof, setTransactionProof] = React.useState<File | null>(null);
  const [transactionProofDataUrl, setTransactionProofDataUrl] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleInvestClick = (plan: Plan) => {
    if (!isAuthenticated) {
        toast({
            title: "Login Required",
            description: "Please login or register to invest in a plan.",
            variant: "destructive",
            // Action button to trigger login modal would require parent component interaction
            // action: <Button onClick={() => { /* TODO: Trigger login modal from layout */ }}>Login</Button>
        });
        return;
    }
    setSelectedPlan(plan);
    setInvestmentAmount(plan.minInvestment.toString());
    setAmountError(null);
    setTransactionProof(null);
    setTransactionProofDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsModalOpen(true);
  };

   const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const value = e.target.value;
     if (value === '' || /^[0-9]*$/.test(value)) {
        let finalValue = value;
        if (value.length > 1 && value.startsWith('0')) {
          finalValue = value.substring(1);
        }
        setInvestmentAmount(finalValue);
        if (selectedPlan && finalValue !== '') {
             const numAmount = parseInt(finalValue, 10);
             if (isNaN(numAmount) || numAmount < selectedPlan.minInvestment || numAmount > selectedPlan.maxInvestment) {
                 setAmountError(`Amount must be between ${formatCurrency(selectedPlan.minInvestment)} and ${formatCurrency(selectedPlan.maxInvestment)}.`);
             } else {
                 setAmountError(null);
             }
        } else {
            setAmountError(null);
        }
     }
   };

   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     setTransactionProof(null);
     setTransactionProofDataUrl(null);
     if (event.target.files && event.target.files[0]) {
       const file = event.target.files[0];
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
         toast({ variant: "destructive", title: "File Too Large", description: "Please upload an image smaller than 5MB." });
         if (fileInputRef.current) fileInputRef.current.value = "";
         return;
       }
       const reader = new FileReader();
       reader.onloadend = () => {
          setTransactionProof(file);
          setTransactionProofDataUrl(reader.result as string);
       }
       reader.onerror = (error) => {
           console.error("Error reading file:", error);
           toast({ variant: "destructive", title: "Error Reading File", description: "Could not process the selected file." });
           if (fileInputRef.current) fileInputRef.current.value = "";
       }
       reader.readAsDataURL(file);
     }
   };

  const handleSubmitProof = async () => {
    if (!selectedPlan || !userId || !userName) {
        toast({ variant: "destructive", title: "Error", description: "User not identified. Please login again." });
        return;
    }
     const finalAmount = parseInt(investmentAmount, 10);
      if (isNaN(finalAmount) || finalAmount < selectedPlan.minInvestment || finalAmount > selectedPlan.maxInvestment) {
         setAmountError(`Amount must be between ${formatCurrency(selectedPlan.minInvestment)} and ${formatCurrency(selectedPlan.maxInvestment)}.`);
         toast({ variant: "destructive", title: "Invalid Amount", description: amountError });
         return;
     } else {
         setAmountError(null);
     }
    if (!transactionProofDataUrl) {
      toast({ variant: "destructive", title: "Upload Required", description: "Please select and upload your transaction proof screenshot." });
      return;
    }
     if (amountError) {
       toast({ variant: "destructive", title: "Invalid Amount", description: amountError });
       return;
     }
    setIsSubmitting(true);
    try {
        // Ensure 'icon' is the React.ElementType, and 'iconName' is correctly derived for storage
        const submissionData = {
            ...selectedPlan, // This includes minInvestment, maxInvestment, dailyProfitMin/Max etc.
            investmentAmount: finalAmount,
            userId: userId,
            userName: userName,
            transactionProofDataUrl: transactionProofDataUrl,
            submissionDate: new Date().toISOString(),
            status: 'pending' as const,
            // The 'icon' property from selectedPlan is a React.ElementType.
            // addPendingInvestment expects it and will derive iconName internally.
            icon: selectedPlan.icon, // Pass the icon component itself
        };
        console.log("Submitting investment proof:", submissionData);
        // @ts-ignore - addPendingInvestment expects icon as ElementType which selectedPlan.icon is
        await addPendingInvestment(submissionData);
        toast({
            title: "Proof Submitted Successfully",
            description: `Your investment proof for the ${selectedPlan.title} (${formatCurrency(finalAmount)}) is pending approval.`,
            variant: 'default',
        });
        setIsModalOpen(false);
    } catch (error) {
         console.error("Submission error:", error);
        toast({ variant: "destructive", title: "Submission Failed", description: "There was an error submitting your proof. Please try again." });
    } finally {
       setIsSubmitting(false);
    }
  };

   const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `${fieldName} copied to clipboard.`, variant: "default", duration: 2000 });
    }).catch(err => {
      console.error(`Failed to copy ${fieldName}: `, err);
      toast({ title: "Error", description: `Failed to copy ${fieldName}.`, variant: "destructive" });
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const dailyProfitText = plan.dailyProfitMin === plan.dailyProfitMax
            ? `${plan.dailyProfitMin.toFixed(1)}%`
            : `${plan.dailyProfitMin.toFixed(1)}% – ${plan.dailyProfitMax.toFixed(1)}%`;

          const totalReturnMinPercent = plan.dailyProfitMin * plan.duration;
          const totalReturnMaxPercent = plan.dailyProfitMax * plan.duration;
          const totalReturnText = totalReturnMinPercent === totalReturnMaxPercent
            ? `${totalReturnMinPercent.toFixed(1)}%`
            : `${totalReturnMinPercent.toFixed(1)}% – ${totalReturnMaxPercent.toFixed(1)}%`;

           // Use plan.investmentRange for display on card, as it's already formatted string.
           const displayInvestment = plan.investmentRange;


          return (
            <Card key={plan.title} className={`flex flex-col ${plan.primary ? 'border-primary ring-2 ring-primary shadow-lg' : ''}`}>
              <CardHeader className="items-center pb-4 relative">
                {plan.badge && (
                  <Badge variant={plan.primary ? "default" : "secondary"} className="absolute -top-3 right-3">{plan.badge}</Badge>
                )}
                <plan.icon className={`h-10 w-10 mb-2 ${plan.primary ? 'text-primary' : 'text-accent'}`} />
                <CardTitle className="text-xl">{plan.title}</CardTitle>
                 <CardDescription className="text-center">Invest {displayInvestment}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{plan.duration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Profit:</span>
                  <span className="font-medium text-primary">{dailyProfitText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Return % (Est.):</span>
                  <span className="font-medium">{totalReturnText}</span>
                </div>
                 <ProfitCalculator plan={plan} />
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.primary ? "default" : "outline"}
                  onClick={() => handleInvestClick(plan)}
                >
                   {isAuthenticated ? "Invest Now" : <><LogIn className="mr-2 h-4 w-4" /> Login to Invest</>}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
         <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-secondary border-dashed">
            <CardHeader>
                <CardTitle className="text-lg">Withdrawal Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>✅ Profits and principal (capital) are credited back to your wallet only at the end of the chosen plan's duration.</p>
                <p>✅ Withdrawals can be requested via Easypaisa or JazzCash once the plan is complete.</p>
                <p>❗ Please note: Early withdrawal is not available. Funds are locked for the entire duration of the investment plan.</p>
            </CardContent>
         </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-primary">Invest in {selectedPlan.title}</DialogTitle>
                 <DialogDescription>
                    Enter the amount you wish to invest (within the plan's range), send the payment to one of the accounts below, and upload the transaction proof.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                   <Label htmlFor="investment-amount" className="text-base font-semibold">Investment Amount (PKR)</Label>
                   <Input
                       id="investment-amount"
                       type="text"
                       inputMode="numeric"
                       value={investmentAmount}
                       onChange={handleAmountChange}
                       placeholder={`e.g., ${selectedPlan.minInvestment}`}
                       className={amountError ? 'border-destructive' : ''}
                       required
                   />
                   <p className="text-xs text-muted-foreground">
                      Range: {formatCurrency(selectedPlan.minInvestment)} – {formatCurrency(selectedPlan.maxInvestment)}
                   </p>
                   {amountError && <p className="text-xs text-destructive">{amountError}</p>}
                </div>
                <div className="space-y-4">
                   <h3 className="font-semibold text-lg mb-2">Payment Accounts:</h3>
                   <Card className="bg-muted/50">
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                            <CardTitle className="text-base font-medium">Easypaisa</CardTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v-2m0-4h.01M7.757 14.757l-.707.707M16.243 14.757l.707.707M9.172 10.172a4 4 0 015.656 0M14.828 10.172a4 4 0 01-5.656 0" /></svg>
                       </CardHeader>
                       <CardContent className="px-4 pb-4 text-sm space-y-1">
                            <p>Account Name: <span className="font-medium">{paymentDetails.easypaisa.accountName}</span></p>
                            <div className="flex items-center gap-2">
                                <p>Account Number: <span className="font-mono">{paymentDetails.easypaisa.accountNumber}</span></p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(paymentDetails.easypaisa.accountNumber, 'Easypaisa Number')}>
                                    <Copy className="h-3 w-3" />
                                     <span className="sr-only">Copy Easypaisa Number</span>
                                </Button>
                            </div>
                       </CardContent>
                   </Card>
                   <Card className="bg-muted/50">
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                            <CardTitle className="text-base font-medium">JazzCash</CardTitle>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10s5 2 5 2 1 .5 1 1 .5 1 1 1-1 .5-1 1-.5 1-1 1-2 1-2 1-2.47 2-4.529 2M12 18a6 6 0 006-6M12 18a6 6 0 01-6-6" /></svg>
                       </CardHeader>
                       <CardContent className="px-4 pb-4 text-sm space-y-1">
                           <p>Account Name: <span className="font-medium">{paymentDetails.jazzcash.accountName}</span></p>
                            <div className="flex items-center gap-2">
                                <p>Account Number: <span className="font-mono">{paymentDetails.jazzcash.accountNumber}</span></p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(paymentDetails.jazzcash.accountNumber, 'JazzCash Number')}>
                                    <Copy className="h-3 w-3" />
                                    <span className="sr-only">Copy JazzCash Number</span>
                                </Button>
                            </div>
                       </CardContent>
                   </Card>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="transaction-proof" className="text-base font-semibold flex items-center gap-2">
                        <UploadCloud className="h-5 w-5" /> Upload Transaction Screenshot
                    </Label>
                    <div className="flex items-center space-x-2">
                        <Input
                            id="transaction-proof"
                            type="file"
                            ref={fileInputRef}
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleFileChange}
                            className={`flex-grow file:border-0 file:bg-primary file:text-primary-foreground file:hover:bg-primary/90 file:mr-4 file:py-2 file:px-4 file:rounded-md file:text-sm file:font-semibold cursor-pointer ${
                                transactionProof ? 'hidden' : ''
                            }`}
                            required
                            aria-describedby="file-help-text"
                        />
                         {transactionProof && (
                            <div className="flex items-center justify-between flex-grow rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                                <span className="truncate flex-grow mr-2">{transactionProof.name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                        setTransactionProof(null);
                                        setTransactionProofDataUrl(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    title="Remove file"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove file</span>
                                </Button>
                            </div>
                        )}
                    </div>
                    {!transactionProof && (
                        <p id="file-help-text" className="text-xs text-muted-foreground">
                             Please select a clear screenshot of your successful transaction (max 5MB, JPG/PNG).
                         </p>
                    )}
                      {transactionProof && (
                        <div className="flex items-center text-xs text-green-600 dark:text-green-400 mt-1">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Screenshot selected. Click Submit below.
                        </div>
                     )}
                </div>
              </div>
              <DialogFooter>
                 <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                 </DialogClose>
                <Button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={isSubmitting || !transactionProofDataUrl || !!amountError || investmentAmount === ''}
                  aria-live="polite"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                   ) : "Submit Uploaded Screenshot"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

    