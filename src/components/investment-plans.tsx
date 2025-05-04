"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Gem, Crown } from "lucide-react"; // Added Crown icon

interface Plan {
  title: string;
  icon: React.ElementType;
  investmentRange: string;
  duration: string;
  dailyProfit: string;
  totalReturn: string;
  exampleInvestment: string;
  exampleDaily: string;
  exampleTotal: string;
  badge?: string;
  primary?: boolean;
}

const plans: Plan[] = [
  {
    title: "Basic Plan",
    icon: TrendingUp,
    investmentRange: "PKR 500",
    duration: "15 days",
    dailyProfit: "1.0% – 1.5%",
    totalReturn: "15% – 22.5%",
    exampleInvestment: "PKR 500",
    exampleDaily: "PKR 5 – 7.5",
    exampleTotal: "PKR 575 – 622.5",
  },
  {
    title: "Advance Plan",
    icon: Zap,
    investmentRange: "PKR 500 – 50,000",
    duration: "25 days",
    dailyProfit: "1.5% – 2.0%",
    totalReturn: "37.5% – 50%",
    exampleInvestment: "PKR 10,000",
    exampleDaily: "PKR 150 – 200",
    exampleTotal: "PKR 12,500 – 15,000",
    badge: "Popular",
    primary: true, // Highlight this plan
  },
  {
    title: "Premium Plan",
    icon: Gem,
    investmentRange: "PKR 1,000 – 100,000",
    duration: "50 days",
    dailyProfit: "2.0% – 2.5%",
    totalReturn: "100% – 125%",
    exampleInvestment: "PKR 20,000",
    exampleDaily: "PKR 400 – 500",
    exampleTotal: "PKR 40,000 – 50,000",
  },
  {
    title: "Expert Plan",
    icon: Crown, // Added Crown icon
    investmentRange: "PKR 50,000 – 500,000",
    duration: "75 days", // Assuming duration
    dailyProfit: "2.5% – 3.0%",
    totalReturn: "187.5% – 225%", // Calculated: 75 * 2.5% and 75 * 3.0%
    exampleInvestment: "PKR 100,000", // Example within range
    exampleDaily: "PKR 2,500 – 3,000", // Calculated: 100k * 2.5% and 100k * 3.0%
    exampleTotal: "PKR 287,500 – 325,000", // Calculated: 100k + (daily * 75)
  },
];

export function InvestmentPlans() {
  // TODO: Add state and logic for investment actions when auth is implemented
  // const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null);
  // const handleInvest = (planTitle: string) => {
  //   console.log(`Investing in ${planTitle}`);
  //   // Add investment logic here (e.g., open modal, API call)
  // };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"> {/* Changed lg:grid-cols-3 to lg:grid-cols-4 */}
      {plans.map((plan) => (
        <Card key={plan.title} className={`flex flex-col ${plan.primary ? 'border-primary ring-2 ring-primary shadow-lg' : ''}`}>
          <CardHeader className="items-center pb-4 relative"> {/* Added relative positioning */}
            {plan.badge && (
              <Badge variant={plan.primary ? "default" : "secondary"} className="absolute -top-3 right-3">{plan.badge}</Badge>
            )}
            <plan.icon className={`h-10 w-10 mb-2 ${plan.primary ? 'text-primary' : 'text-accent'}`} />
            <CardTitle className="text-xl">{plan.title}</CardTitle>
            <CardDescription className="text-center">Invest {plan.investmentRange}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{plan.duration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Profit:</span>
              <span className="font-medium text-primary">{plan.dailyProfit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Return:</span>
              <span className="font-medium">{plan.totalReturn}</span>
            </div>
            <div className="pt-3 mt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">Example:</p>
              <p className="text-xs">Invest {plan.exampleInvestment}, get {plan.exampleDaily} daily.</p>
              <p className="text-xs">Receive <span className="font-semibold">{plan.exampleTotal}</span> at the end.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant={plan.primary ? "default" : "outline"}
              onClick={() => alert(`Invest action for ${plan.title} (to be implemented)`)} // Placeholder action
            >
              Invest Now
            </Button>
          </CardFooter>
        </Card>
      ))}
       {/* Adjust span to fit 4 columns */}
       <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-secondary border-dashed">
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
  );
}
