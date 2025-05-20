
"use client";

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, CheckCircle, AlertTriangle, Copy, Info } from 'lucide-react';
import { plansData, type Plan } from '@/components/investment-plans'; // Assuming plansData is exported
import Image from 'next/image';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const paymentDetails = {
  easypaisa: {
    accountName: "Adnan Tariq",
    accountNumber: "03411167577",
    icon: "/payment-icons/easypaisa.png", // Add actual icon path
  },
  jazzcash: {
    accountName: "Rupay Growth Investment",
    accountNumber: "03012345678",
    icon: "/payment-icons/jazzcash.png", // Add actual icon path
  },
  sadapay: {
    accountName: "Rupay Growth",
    accountNumber: "03121145736", // Example, replace with actual
    icon: "/payment-icons/sadapay.png", // Add actual icon path
  },
};

const formatCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) return 'PKR 0.00';
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function SubmitProofPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const planId = searchParams.get('planId');
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [investmentAmount, setInvestmentAmount] = React.useState<string>('');
  const [amountError, setAmountError] = React.useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (planId) {
      const plan = plansData.find(p => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
        setInvestmentAmount(plan.minInvestment.toString()); // Default to min investment
      } else {
        toast({ title: "Error", description: "Invalid investment plan selected.", variant: "destructive" });
        router.push('/');
      }
    } else {
      toast({ title: "Error", description: "No investment plan specified.", variant: "destructive" });
      router.push('/');
    }
  }, [planId, router, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File Too Large", description: "Please upload an image under 5MB.", variant: "destructive" });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload a JPG, PNG, or GIF image.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (document.getElementById('transactionProof')) {
      (document.getElementById('transactionProof') as HTMLInputElement).value = "";
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]*$/.test(value)) {
      setInvestmentAmount(value);
      if (selectedPlan) {
        const numAmount = parseInt(value, 10);
        if (isNaN(numAmount) || numAmount < selectedPlan.minInvestment || numAmount > selectedPlan.maxInvestment) {
          setAmountError(`Amount must be between ${formatCurrency(selectedPlan.minInvestment)} and ${formatCurrency(selectedPlan.maxInvestment)}.`);
        } else {
          setAmountError(null);
        }
      }
    }
  };
  
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `${fieldName} copied to clipboard.`, variant: "default", duration: 2000 });
    }).catch(err => {
      toast({ title: "Error", description: `Failed to copy ${fieldName}.`, variant: "destructive" });
    });
  };

  const handleSubmit = async () => {
    if (!currentUser || !selectedPlan || !selectedFile || !investmentAmount || amountError) {
      toast({ title: "Missing Information", description: "Please fill all fields correctly and upload proof.", variant: "destructive" });
      return;
    }

    const numericAmount = parseInt(investmentAmount, 10);
    if (isNaN(numericAmount) || numericAmount < selectedPlan.minInvestment || numericAmount > selectedPlan.maxInvestment) {
        toast({ title: "Invalid Amount", description: `Investment amount must be between ${formatCurrency(selectedPlan.minInvestment)} and ${formatCurrency(selectedPlan.maxInvestment)}.`, variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      const storageRef = ref(storage, `investmentProofs/${currentUser.uid}/${Date.now()}_${selectedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
          setIsUploading(false);
          setIsSubmitting(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const investmentData = {
            userId: currentUser.uid,
            userPhoneNumber: currentUser.email?.split('@')[0] || 'N/A', // Assuming phone is local part of email
            userName: currentUser.email?.split('@')[0] || currentUser.uid, // Placeholder for userName
            planId: selectedPlan.id,
            planTitle: selectedPlan.title,
            investmentAmount: numericAmount,
            minInvestment: selectedPlan.minInvestment,
            maxInvestment: selectedPlan.maxInvestment,
            dailyProfitMin: selectedPlan.dailyProfitMin,
            dailyProfitMax: selectedPlan.dailyProfitMax,
            duration: selectedPlan.duration,
            iconName: selectedPlan.iconName, // Ensure Plan interface includes iconName
            transactionProofUrl: downloadURL,
            submissionDate: serverTimestamp(), // Firestore server timestamp
            status: 'pending',
            referralBonusPercent: 0, // Default or implement referral logic
          };

          await addDoc(collection(db, "investments"), investmentData);

          toast({ title: "Submission Successful!", description: "Your investment proof has been submitted for review." });
          setIsUploading(false);
          setIsSubmitting(false);
          router.push('/dashboard'); // Redirect to user dashboard
        }
      );
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({ title: "Submission Failed", description: error.message || "Could not submit your investment proof.", variant: "destructive" });
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  if (!selectedPlan) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4">Loading plan details...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Submit Investment Proof</CardTitle>
            <CardDescription>You are investing in the <strong className="text-foreground">{selectedPlan.title}</strong>.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Payment Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please make your payment to one of the following accounts and upload a screenshot of the transaction proof.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(paymentDetails).map(([key, detail]) => (
                  <Card key={key} className="p-4 bg-muted/50">
                    <div className="flex items-center mb-2">
                       {/* Placeholder for icons - replace with actual Image components if you have icons */}
                      <span className="text-lg font-semibold capitalize text-primary">{key}</span>
                    </div>
                    <p className="text-xs">Account Name: <strong className="text-foreground">{detail.accountName}</strong></p>
                    <div className="flex items-center">
                      <p className="text-xs">Account Number: <strong className="text-foreground">{detail.accountNumber}</strong></p>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyToClipboard(detail.accountNumber, `${key} Number`)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
               <Alert variant="default" className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Important Payment Note</AlertTitle>
                  <AlertDescription>
                    Ensure the payment is made for the exact investment amount you enter below.
                    Your investment will be activated after proof verification (usually within 24 hours).
                  </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investmentAmount" className="font-semibold">Investment Amount (PKR)</Label>
              <Input
                id="investmentAmount"
                type="text"
                inputMode="numeric"
                value={investmentAmount}
                onChange={handleAmountChange}
                placeholder={`e.g., ${selectedPlan.minInvestment}`}
                className={amountError ? 'border-destructive' : ''}
              />
              {amountError && <p className="text-sm text-destructive">{amountError}</p>}
               <p className="text-xs text-muted-foreground">
                Min: {formatCurrency(selectedPlan.minInvestment)}, Max: {formatCurrency(selectedPlan.maxInvestment)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionProof" className="font-semibold">Transaction Screenshot</Label>
              <Input
                id="transactionProof"
                type="file"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {previewUrl && selectedFile && (
                <div className="mt-4 p-2 border rounded-md relative max-w-xs">
                   <p className="text-xs text-muted-foreground truncate mb-1">{selectedFile.name}</p>
                  <Image src={previewUrl} alt="Proof preview" width={200} height={200} className="rounded-md object-contain max-h-40 w-auto" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-destructive/20 hover:bg-destructive/40 text-destructive-foreground"
                    onClick={handleRemoveFile}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </Button>
                </div>
              )}
            </div>
            {isUploading && (
              <div className="space-y-1">
                <Label>Upload Progress: {uploadProgress.toFixed(0)}%</Label>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedFile || !!amountError || !investmentAmount.trim()}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Submit Investment Proof
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

