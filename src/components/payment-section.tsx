
"use client";

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, CheckCircle, WalletCards, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PaymentMethodId = 'easypaisa' | 'sadapay' | 'nayapay';

interface PaymentMethodInfo {
  id: PaymentMethodId;
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  icon: React.ElementType;
}

const paymentMethods: PaymentMethodInfo[] = [
  {
    id: 'easypaisa',
    name: 'EasyPaisa',
    accountName: 'Rupay Growth Investments',
    accountNumber: '03411167577',
    instructions: '1. Open your EasyPaisa app.\n2. Select "Send Money" to Bank Account or CNIC.\n3. Enter the account details provided.\n4. After payment, enter the Transaction ID (TID/TRX ID) below.',
    icon: WalletCards,
  },
  {
    id: 'sadapay',
    name: 'SadaPay',
    accountName: 'Rupay Growth',
    accountNumber: 'PK92SADA0000003121145736',
    instructions: '1. Open your SadaPay app or any bank app.\n2. Select "Send Money" to Bank Account (Raast or IBFT).\n3. Choose "SadaPay" as the bank and enter the IBAN provided.\n4. After payment, enter the Transaction ID below.',
    icon: WalletCards,
  },
  {
    id: 'nayapay',
    name: 'NayaPay',
    accountName: 'Rupay Growth Inc.',
    accountNumber: 'username@nayapay',
    instructions: '1. Open your NayaPay app.\n2. Select "Send Money" to another NayaPay user.\n3. Enter the NayaPay ID provided.\n4. After payment, enter the Transaction ID below.',
    icon: WalletCards,
  },
];

export function PaymentSection() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethodInfo | null>(null);
  const [transactionId, setTransactionId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleMethodSelect = (methodId: PaymentMethodId) => {
    setSelectedMethod(paymentMethods.find(m => m.id === methodId) || null);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `${fieldName} copied to clipboard.`, duration: 2000 });
    }).catch(err => {
      toast({ title: "Error", description: `Failed to copy ${fieldName}.`, variant: "destructive" });
    });
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      toast({ title: "Error", description: "Please select a payment method.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to submit payment proof.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData = {
        userId: currentUser.uid,
        paymentMethod: selectedMethod.id,
        accountNameUsed: selectedMethod.accountName,
        accountNumberUsed: selectedMethod.accountNumber,
        transactionId: transactionId.trim() || null, // Store null if empty
        submittedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "paymentSubmissions"), submissionData);

      toast({
        title: "Submission Successful",
        description: "Your payment information has been submitted for verification.",
        variant: "default",
      });
      setSelectedMethod(null);
      setTransactionId('');
    } catch (error) {
      console.error("Error submitting payment proof:", error);
      let errorMessage = "Could not submit payment information.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({ title: "Submission Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Submit Payment Proof</CardTitle>
        <CardDescription>Choose a payment method, make your payment, and submit the details below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-semibold">1. Select Payment Method</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {paymentMethods.map((method) => {
              const IconComponent = method.icon;
              return (
                <Button
                  key={method.id}
                  variant={selectedMethod?.id === method.id ? "default" : "outline"}
                  onClick={() => handleMethodSelect(method.id)}
                  className="flex flex-col items-center justify-center h-auto py-4 space-y-1 text-center"
                >
                  <IconComponent className={`h-6 w-6 mb-1 ${selectedMethod?.id === method.id ? 'text-primary-foreground' : 'text-primary'}`} />
                  <span className="text-sm">{method.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {selectedMethod && (
          <div className="p-4 border rounded-md bg-muted/50 space-y-4">
            <h3 className="text-lg font-semibold text-primary">Pay to: {selectedMethod.name}</h3>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Account Name</Label>
              <div className="flex items-center justify-between">
                <p className="font-medium">{selectedMethod.accountName}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(selectedMethod.accountName, 'Account Name')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Account Number / ID</Label>
              <div className="flex items-center justify-between">
                <p className="font-medium break-all">{selectedMethod.accountNumber}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(selectedMethod.accountNumber, 'Account Number')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Instructions</Label>
              <p className="text-sm whitespace-pre-line">{selectedMethod.instructions}</p>
            </div>
          </div>
        )}

        {selectedMethod && (
          <div className="space-y-2">
            <Label htmlFor="transactionId" className="text-base font-semibold">2. Enter Transaction ID (Optional)</Label>
            <Input
              id="transactionId"
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g., TID1234567890"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter the Transaction ID (TID/TRX ID) you received after making the payment. If you don't have one, you can leave this blank.
            </p>
          </div>
        )}
        
        {!currentUser && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Not Logged In</AlertTitle>
                <AlertDescription>
                You need to be logged in to submit payment proof. Please log in or register.
                </AlertDescription>
            </Alert>
        )}

      </CardContent>
      {selectedMethod && currentUser && (
        <CardFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedMethod || !currentUser}
            className="w-full"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Submit Payment Proof
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
