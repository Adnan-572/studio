
'use client';

import * as React from 'react';
import {
  getAllPendingInvestments,
  approveInvestment,
  rejectInvestment, // Assuming a reject function exists or will be added
  type InvestmentSubmission,
} from '@/lib/investment-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image'; // Use next/image for optimization
import { Loader2, CheckCircle, XCircle, ExternalLink, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

// Helper to format currency
const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function DeveloperDashboardPage() {
  const [pendingInvestments, setPendingInvestments] = React.useState<InvestmentSubmission[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState<Record<string, boolean>>({}); // Track processing state per submission ID
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null); // For image modal
  const { toast } = useToast();

  const fetchPendingInvestments = React.useCallback(() => {
    setIsLoading(true);
    const pending = getAllPendingInvestments();
    console.log("Fetched pending investments:", pending);
    setPendingInvestments(pending);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    fetchPendingInvestments();
    // Optional: Set up polling or a WebSocket connection for real-time updates
    const interval = setInterval(fetchPendingInvestments, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchPendingInvestments]);

  const handleApprove = async (submissionId: string) => {
    setIsProcessing((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await approveInvestment(submissionId);
      toast({
        title: 'Investment Approved',
        description: `Investment ID ${submissionId} has been approved.`,
        variant: 'default',
      });
      fetchPendingInvestments(); // Refresh the list
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Approval Failed',
        description: `Could not approve investment ${submissionId}.`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleReject = async (submissionId: string) => {
    setIsProcessing((prev) => ({ ...prev, [submissionId]: true }));
    try {
      // Assuming rejectInvestment exists and removes/updates the entry
      await rejectInvestment(submissionId); // You'll need to implement this in investment-store.ts
      toast({
        title: 'Investment Rejected',
        description: `Investment ID ${submissionId} has been rejected.`,
        variant: 'destructive', // Use destructive variant for rejection toast
      });
      fetchPendingInvestments(); // Refresh the list
    } catch (error) {
      console.error('Rejection error:', error);
      toast({
        title: 'Rejection Failed',
        description: `Could not reject investment ${submissionId}.`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const openImageModal = (imageDataUrl: string) => {
    setSelectedImage(imageDataUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
        Developer Dashboard - Pending Investments
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : pendingInvestments.length === 0 ? (
        <p className="text-center text-muted-foreground mt-10">No pending investments found.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Review Submissions</CardTitle>
            <CardDescription>Approve or reject pending investment proofs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-center">Proof</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvestments.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                        <div>{submission.userName}</div>
                        <div className="text-xs text-muted-foreground">{submission.userId}</div>
                    </TableCell>
                    <TableCell>{submission.title}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(submission.investmentAmount)}</TableCell>
                    <TableCell>{format(new Date(submission.submissionDate), 'PPpp')}</TableCell>
                     <TableCell className="text-center">
                        {submission.transactionProofDataUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openImageModal(submission.transactionProofDataUrl!)}
                          >
                            <ExternalLink className="mr-1 h-4 w-4" /> View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">No Proof</span>
                        )}
                      </TableCell>
                    <TableCell className="text-center space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(submission.id!)}
                        disabled={isProcessing[submission.id!]}
                      >
                        {isProcessing[submission.id!] ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-1 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                       <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(submission.id!)} // Add reject handler
                        disabled={isProcessing[submission.id!]}
                      >
                        {isProcessing[submission.id!] ? (
                           <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-1 h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

       {/* Image Viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && closeImageModal()}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Transaction Proof</DialogTitle>
             <DialogDescription>Review the uploaded transaction proof.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow relative overflow-auto p-0 m-0">
            {selectedImage && (
              <Image
                src={selectedImage}
                alt="Transaction Proof"
                fill // Use fill layout
                style={{ objectFit: 'contain' }} // Ensure image fits within container
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Responsive sizes
              />
            )}
          </div>
          <DialogFooter className="mt-4 sm:justify-between items-center">
             {selectedImage && (
                <a
                    href={selectedImage}
                    download={`transaction_proof_${Date.now()}.png`} // Suggest a filename
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3" // Matches button sm style
                >
                  <Download className="mr-2 h-4 w-4"/> Download Image
                </a>
              )}
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
