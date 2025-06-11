
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Zap, Gem, Crown, Milestone, Calculator, Copy } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context'; // For checking authentication status

export interface Plan {
  id: string; 
  title: string;
  icon: React.ElementType;
  iconName: string; // For storing in Firestore if needed, e.g., "TrendingUp"
  investmentRange: string;
  duration: number; // in days
  dailyProfitMin: number; // percentage
  dailyProfitMax: number; // percentage
  badge?: string;
  primary?: boolean;
  minInvestment: number;
  maxInvestment: number;
}

// Export plansData so it can be used by submit-proof page
export const plansData: Plan[] = [
   {
    id: "plan_basic_15d",
    title: "Basic Plan",
    icon: TrendingUp,
    iconName: "TrendingUp",
    investmentRange: "PKR 500 – 5,000",
    duration: 15,
    dailyProfitMin: 1.0,
    dailyProfitMax: 1.5,
    minInvestment: 500,
    maxInvestment: 5000,
  },
  {
    id: "plan_advance_25d",
    title: "Advance Plan",
    icon: Zap,
    iconName: "Zap",
    investmentRange: "PKR 5,000 – 50,000",
    duration: 25,
    dailyProfitMin: 1.5,
    dailyProfitMax: 2.0,
    badge: "Popular",
    primary: true,
    minInvestment: 5000,
    maxInvestment: 50000,
  },
  {
    id: "plan_premium_50d",
    title: "Premium Plan",
    icon: Gem,
    iconName: "Gem",
    investmentRange: "PKR 10,000 – 100,000",
    duration: 50,
    dailyProfitMin: 2.0,
    dailyProfitMax: 2.5,
    minInvestment: 10000,
    maxInvestment: 100000,
  },
  {
    id: "plan_expert_75d",
    title: "Expert Plan",
    icon: Crown,
    iconName: "Crown",
    investmentRange: "PKR 20,000 – 200,000",
    duration: 75,
    dailyProfitMin: 2.5,
    dailyProfitMax: 3.0,
    minInvestment: 20000,
    maxInvestment: 200000,
  },
  {
    id: "plan_master_90d",
    title: "Master Plan",
    icon: Milestone,
    iconName: "Milestone",
    investmentRange: "PKR 50,000 – 500,000",
    duration: 90,
    dailyProfitMin: 3.0,
    dailyProfitMax: 4.5,
    minInvestment: 50000,
    maxInvestment: 500000,
  },
];

const formatCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const ProfitCalculator: React.FC<{ plan: Plan, inputAmount?: string }> = ({ plan, inputAmount }) => {
    const [amount, setAmount] = React.useState<string>(inputAmount || plan.minInvestment.toString());
    const [dailyProfitMin, setDailyProfitMin] = React.useState<number>(0);
    const [dailyProfitMax, setDailyProfitMax] = React.useState<number>(0);
    const [totalReturnMin, setTotalReturnMin] = React.useState<number>(0);
    const [totalReturnMax, setTotalReturnMax] = React.useState<number>(0);
    const [isValidAmount, setIsValidAmount] = React.useState<boolean>(true);

    React.useEffect(() => {
      if (inputAmount !== undefined) {
        setAmount(inputAmount);
      }
    }, [inputAmount]);
    
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
        // Allow only numbers and ensure it doesn't start with multiple zeros if not just "0"
        if (value === '' || /^[0-9]*$/.test(value)) {
           if (value.length > 1 && value.startsWith('0') && value !== '0') {
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
            <Label htmlFor={`calc-amount-${plan.id}`} className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Calculator className="h-3 w-3" /> Profit Calculator
            </Label>
            <Input
                id={`calc-amount-${plan.id}`}
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
  isAuthenticated: boolean; 
}

export function InvestmentPlans({ isAuthenticated }: InvestmentPlansProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth(); // Get current user

  const handleInvestClick = (planId: string) => {
    if (currentUser && isAuthenticated) { // Check both currentUser and isAuthenticated
      router.push(`/submit-proof?planId=${encodeURIComponent(planId)}`);
    } else {
      toast({
        title: "Login Required",
        description: "Please login or register to invest.",
        variant: "default",
      });
      router.push('/login');
    }
  };
  
  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plansData.map((plan) => {
          const PlanIconComponent = plan.icon;
          const dailyProfitText = plan.dailyProfitMin === plan.dailyProfitMax
            ? `${plan.dailyProfitMin.toFixed(1)}%`
            : `${plan.dailyProfitMin.toFixed(1)}% – ${plan.dailyProfitMax.toFixed(1)}%`;

          const totalReturnMinPercent = plan.dailyProfitMin * plan.duration;
          const totalReturnMaxPercent = plan.dailyProfitMax * plan.duration;
          const totalReturnText = totalReturnMinPercent === totalReturnMaxPercent
            ? `${totalReturnMinPercent.toFixed(1)}%`
            : `${totalReturnMinPercent.toFixed(1)}% – ${totalReturnMaxPercent.toFixed(1)}%`;

           const displayInvestment = plan.investmentRange;

          return (
            <Card key={plan.id} className={`flex flex-col ${plan.primary ? 'border-primary ring-2 ring-primary shadow-lg' : ''}`}>
              <CardHeader className="items-center pb-4 relative">
                {plan.badge && (
                  <Badge variant={plan.primary ? "default" : "secondary"} className="absolute -top-3 right-3">{plan.badge}</Badge>
                )}
                <PlanIconComponent className={`h-10 w-10 mb-2 ${plan.primary ? 'text-primary' : 'text-accent'}`} />
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
                  onClick={() => handleInvestClick(plan.id)}
                >
                   {isAuthenticated ? 'Invest Now' : 'Invest'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
         <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-secondary border-dashed">
            <CardHeader>
                <CardTitle className="text-lg">Payment & Withdrawal Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
                {/* Payment account details are now shown on the submit-proof page */}
                <p>✅ Profits and principal (capital) are credited back at the end of the chosen plan's duration.</p>
                <p>✅ Withdrawals can be requested via Easypaisa or JazzCash once the plan is complete.</p>
                <p>❗ Please note: Early withdrawal is not available. Funds are locked for the entire duration of the investment plan.</p>
            </CardContent>
         </Card>
      </div>
    </>
  );
}
