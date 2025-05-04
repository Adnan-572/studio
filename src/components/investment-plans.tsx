
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Zap, Gem, Crown, Milestone, UploadCloud, Copy } from "lucide-react"; // Added Milestone, UploadCloud, Copy icons

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
  // Add specific investment amount for simplicity in the modal
  investmentAmount: number;
}

// Add specific investment amount for each plan
const plans: Plan[] = [
  {
    title: "Basic Plan",
    icon: TrendingUp,
    investmentRange: "PKR 500",
    investmentAmount: 500, // Specific amount
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
    investmentAmount: 10000, // Example amount for modal display
    duration: "25 days",
    dailyProfit: "1.5% – 2.0%",
    totalReturn: "37.5% – 50%",
    exampleInvestment: "PKR 10,000",
    exampleDaily: "PKR 150 – 200",
    exampleTotal: "PKR 12,500 – 15,000",
    badge: "Popular",
    primary: true,
  },
  {
    title: "Premium Plan",
    icon: Gem,
    investmentRange: "PKR 1,000 – 100,000",
    investmentAmount: 20000, // Example amount for modal display
    duration: "50 days",
    dailyProfit: "2.0% – 2.5%",
    totalReturn: "100% – 125%",
    exampleInvestment: "PKR 20,000",
    exampleDaily: "PKR 400 – 500",
    exampleTotal: "PKR 40,000 – 50,000",
  },
  {
    title: "Expert Plan",
    icon: Crown,
    investmentRange: "PKR 50,000 – 500,000",
    investmentAmount: 100000, // Example amount for modal display
    duration: "75 days",
    dailyProfit: "2.5% – 3.0%",
    totalReturn: "187.5% – 225%",
    exampleInvestment: "PKR 100,000",
    exampleDaily: "PKR 2,500 – 3,000",
    exampleTotal: "PKR 287,500 – 325,000",
  },
  {
    title: "Master Plan",
    icon: Milestone,
    investmentRange: "PKR 1,000 – 100,000",
    investmentAmount: 50000, // Example amount for modal display
    duration: "90 days",
    dailyProfit: "3.0% – 4.5%",
    totalReturn: "270% – 405%",
    exampleInvestment: "PKR 50,000",
    exampleDaily: "PKR 1,500 – 2,250",
    exampleTotal: "PKR 185,000 – 252,500",
  },
];

// Placeholder Payment Details
const paymentDetails = {
  easypaisa: {
    accountName: "Rupay Growth Finance",
    accountNumber: "03123456789",
  },
  jazzcash: {
    accountName: "Rupay Growth Investment",
    accountNumber: "03012345678",
  },
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function InvestmentPlans() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [transactionProof, setTransactionProof] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleInvestClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
    setTransactionProof(null); // Reset file input when opening modal
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input visually
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setTransactionProof(event.target.files[0]);
    } else {
        setTransactionProof(null);
    }
  };

  const handleSubmitProof = async () => {
    if (!transactionProof || !selectedPlan) {
      toast({
        variant: "destructive",
        title: "Upload Required",
        description: "Please upload your transaction proof screenshot.",
      });
      return;
    }

    setIsSubmitting(true);

    // --- TODO: Implement actual upload and backend submission logic here ---
    // Example: Convert file to data URI or use FormData
    console.log("Submitting proof for plan:", selectedPlan.title);
    console.log("File:", transactionProof.name, transactionProof.size);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // On Success:
    toast({
      title: "Proof Submitted",
      description: `Your investment proof for the ${selectedPlan.title} has been submitted for review.`,
    });
    setIsModalOpen(false); // Close modal on success
    // --- End of TODO ---

    // On Error (Example):
    // toast({
    //   variant: "destructive",
    //   title: "Submission Failed",
    //   description: "Could not submit proof. Please try again.",
    // });

    setIsSubmitting(false);
  };

   const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard.`,
        variant: "default",
      });
    }).catch(err => {
      console.error(`Failed to copy ${fieldName}: `, err);
      toast({
        title: "Error",
        description: `Failed to copy ${fieldName}.`,
        variant: "destructive",
      });
    });
  };


  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.title} className={`flex flex-col ${plan.primary ? 'border-primary ring-2 ring-primary shadow-lg' : ''}`}>
            <CardHeader className="items-center pb-4 relative">
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
              {/* Use DialogTrigger to open the modal */}
              <Button
                className="w-full"
                variant={plan.primary ? "default" : "outline"}
                onClick={() => handleInvestClick(plan)}
              >
                Invest Now
              </Button>
            </CardFooter>
          </Card>
        ))}
         {/* Adjust span to fit 3 columns */}
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

      {/* Investment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-primary">Invest in {selectedPlan.title}</DialogTitle>
                <DialogDescription>
                  To activate the {selectedPlan.title} ({formatCurrency(selectedPlan.investmentAmount)} for {selectedPlan.duration}), please send the exact amount to one of the accounts below and upload the transaction proof.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Payment Details */}
                <div className="space-y-4">
                   <h3 className="font-semibold text-lg mb-2">Payment Accounts:</h3>
                   {/* Easypaisa */}
                   <Card className="bg-muted/50">
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                            <CardTitle className="text-base font-medium">Easypaisa</CardTitle>
                            {/* Placeholder Logo */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v-2m0-4h.01M7.757 14.757l-.707.707M16.243 14.757l.707.707M9.172 10.172a4 4 0 015.656 0M14.828 10.172a4 4 0 01-5.656 0" /></svg>
                       </CardHeader>
                       <CardContent className="px-4 pb-4 text-sm space-y-1">
                            <p>Account Name: {paymentDetails.easypaisa.accountName}</p>
                            <div className="flex items-center gap-2">
                                <p>Account Number: <span className="font-mono">{paymentDetails.easypaisa.accountNumber}</span></p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(paymentDetails.easypaisa.accountNumber, 'Easypaisa Number')}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                       </CardContent>
                   </Card>
                    {/* JazzCash */}
                   <Card className="bg-muted/50">
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                            <CardTitle className="text-base font-medium">JazzCash</CardTitle>
                             {/* Placeholder Logo */}
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10s5 2 5 2 1 .5 1 1 .5 1 1 1-1 .5-1 1-.5 1-1 1-2 1-2 1-2.47 2-4.529 2M12 18a6 6 0 006-6M12 18a6 6 0 01-6-6" /></svg>
                       </CardHeader>
                       <CardContent className="px-4 pb-4 text-sm space-y-1">
                           <p>Account Name: {paymentDetails.jazzcash.accountName}</p>
                            <div className="flex items-center gap-2">
                                <p>Account Number: <span className="font-mono">{paymentDetails.jazzcash.accountNumber}</span></p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(paymentDetails.jazzcash.accountNumber, 'JazzCash Number')}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                       </CardContent>
                   </Card>
                </div>

                {/* Upload Proof */}
                <div className="space-y-2">
                  <Label htmlFor="transaction-proof" className="text-base font-semibold flex items-center gap-2">
                     <UploadCloud className="h-5 w-5"/> Upload Transaction Proof
                  </Label>
                  <Input
                    id="transaction-proof"
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg" // Accept common image types
                    onChange={handleFileChange}
                    className="file:border-0 file:bg-primary file:text-primary-foreground file:hover:bg-primary/90 file:mr-4 file:py-2 file:px-4 file:rounded-md file:text-sm file:font-semibold cursor-pointer"
                    required
                  />
                   {transactionProof && (
                     <p className="text-xs text-muted-foreground">Selected file: {transactionProof.name}</p>
                   )}
                  <p className="text-xs text-muted-foreground">
                    Please upload a clear screenshot of your successful transaction.
                  </p>
                </div>
              </div>
              <DialogFooter>
                 <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                 </DialogClose>
                <Button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={isSubmitting || !transactionProof}
                >
                  {isSubmitting ? "Submitting..." : "Submit Proof"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
