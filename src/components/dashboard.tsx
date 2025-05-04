"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp as EarningsIcon, ArrowDownCircle } from "lucide-react"; // Icons for dashboard items

// Mock data - replace with actual data fetching later
const mockUserData = {
  walletBalance: 12500.75,
  totalEarnings: 5800.50,
  withdrawalHistory: [
    { id: "W001", date: "2024-07-15", amount: 1500.00, status: "Completed", method: "Easypaisa" },
    { id: "W002", date: "2024-07-01", amount: 2000.00, status: "Completed", method: "JazzCash" },
    { id: "W003", date: "2024-06-20", amount: 1000.00, status: "Pending", method: "Easypaisa" },
    { id: "W004", date: "2024-06-05", amount: 1300.50, status: "Failed", method: "JazzCash" },
  ],
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to get status badge variant
const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'default'; // Green (using primary color)
        case 'pending':
            return 'secondary'; // Yellow/Grayish
        case 'failed':
            return 'destructive'; // Red
        default:
            return 'outline';
    }
};

export function Dashboard() {
  // TODO: Fetch actual user data using state and effects when auth/API is ready
  const [userData] = React.useState(mockUserData);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(userData.walletBalance)}</div>
            <p className="text-xs text-muted-foreground">Available funds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <EarningsIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(userData.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">From investments & referrals</p>
          </CardContent>
        </Card>
         <Card className="lg:col-span-1"> {/* Placeholder or add another metric */}
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
             <EarningsIcon className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">3</div> {/* Mock data */}
             <p className="text-xs text-muted-foreground">Current active plans</p>
           </CardContent>
         </Card>
      </div>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5" />
            Withdrawal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userData.withdrawalHistory.length > 0 ? (
                userData.withdrawalHistory.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">{withdrawal.id}</TableCell>
                    <TableCell>{withdrawal.date}</TableCell>
                     <TableCell>{withdrawal.method}</TableCell>
                    <TableCell className="text-right">{formatCurrency(withdrawal.amount)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusVariant(withdrawal.status)}>{withdrawal.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No withdrawal history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
