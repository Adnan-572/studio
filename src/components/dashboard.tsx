
"use client";

import * as React from 'react';
import type { Plan } from './investment-plans'; // Assuming Plan type is exported
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, addDays, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, CalendarDays, TrendingUp, Percent, Hourglass } from 'lucide-react';

interface DashboardProps {
  plan: Plan;
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
  const [startDate] = React.useState<Date>(new Date()); // Set investment start date to now
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [dailyProfits, setDailyProfits] = React.useState<DailyProfitEntry[]>([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000 * 60); // Update current date every minute for progress

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const calculateProfits = () => {
      const profits: DailyProfitEntry[] = [];
      let cumulativeMin = 0;
      let cumulativeMax = 0;
      const investmentAmount = plan.investmentAmount;

      for (let i = 1; i <= plan.duration; i++) {
        const profitDate = addDays(startDate, i -1 ); // Calculate date for this profit day
        const dailyMin = (investmentAmount * plan.dailyProfitMin) / 100;
        const dailyMax = (investmentAmount * plan.dailyProfitMax) / 100;

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
  }, [plan, startDate]); // Recalculate if plan or start date changes

  const daysElapsed = Math.max(0, differenceInDays(currentDate, startDate));
  const daysRemaining = Math.max(0, plan.duration - daysElapsed);
  const progress = Math.min(100, Math.max(0,(daysElapsed / plan.duration) * 100));

  const endDate = addDays(startDate, plan.duration);

  // Determine current cumulative profit based on days elapsed
  const currentCumulativeMin = daysElapsed >= 1 ? dailyProfits[daysElapsed - 1]?.cumulativeMin ?? 0 : 0;
  const currentCumulativeMax = daysElapsed >= 1 ? dailyProfits[daysElapsed - 1]?.cumulativeMax ?? 0 : 0;
  const currentCumulativeProfitText = currentCumulativeMin === currentCumulativeMax
    ? formatCurrency(currentCumulativeMin)
    : `${formatCurrency(currentCumulativeMin)} – ${formatCurrency(currentCumulativeMax)}`;

  // Final total return calculation
  const finalTotalReturnMin = plan.investmentAmount + (dailyProfits[plan.duration - 1]?.cumulativeMin ?? 0);
  const finalTotalReturnMax = plan.investmentAmount + (dailyProfits[plan.duration - 1]?.cumulativeMax ?? 0);
   const finalTotalReturnText = finalTotalReturnMin === finalTotalReturnMax
    ? formatCurrency(finalTotalReturnMin)
    : `${formatCurrency(finalTotalReturnMin)} – ${formatCurrency(finalTotalReturnMax)}`;


  const dailyProfitRangeText = plan.dailyProfitMin === plan.dailyProfitMax
    ? `${plan.dailyProfitMin.toFixed(1)}%`
    : `${plan.dailyProfitMin.toFixed(1)}% – ${plan.dailyProfitMax.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <plan.icon className="h-6 w-6" /> {plan.title} Overview
          </CardTitle>
          <CardDescription>Your investment started on {format(startDate, 'PPP')}.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              <p className="text-lg font-semibold">{dailyProfitRangeText}</p>
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
          <div className="flex items-center space-x-3 rounded-md border p-4 bg-primary/10 text-primary">
            <TrendingUp className="h-6 w-6" />
            <div>
              <p className="text-sm font-medium leading-none">Current Profit (Est.)</p>
              <p className="text-lg font-semibold">{currentCumulativeProfitText}</p>
            </div>
          </div>
           <div className="flex items-center space-x-3 rounded-md border p-4 bg-green-600/10 text-green-700 dark:text-green-400">
             <DollarSign className="h-6 w-6" />
            <div>
              <p className="text-sm font-medium leading-none">Total Return (Est.)</p>
              <p className="text-lg font-semibold">{finalTotalReturnText}</p>
            </div>
          </div>

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Profit Log (Estimated)</CardTitle>
           <CardDescription>Showing potential profit range for each day.</CardDescription>
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
                   const isPast = differenceInDays(currentDate, new Date(entry.date)) >= 0;
                   const dailyProfitText = entry.profitMin === entry.profitMax
                        ? formatCurrency(entry.profitMin)
                        : `${formatCurrency(entry.profitMin)} – ${formatCurrency(entry.profitMax)}`;
                    const cumulativeProfitText = entry.cumulativeMin === entry.cumulativeMax
                        ? formatCurrency(entry.cumulativeMin)
                        : `${formatCurrency(entry.cumulativeMin)} – ${formatCurrency(entry.cumulativeMax)}`;

                  return (
                    <TableRow key={entry.day} className={isPast ? 'bg-muted/30' : ''}>
                      <TableCell className="font-medium">{entry.day}</TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className={`text-right ${isPast ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {dailyProfitText}
                      </TableCell>
                      <TableCell className={`text-right ${isPast ? 'font-semibold' : 'text-muted-foreground'}`}>
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
    </div>
  );
}
