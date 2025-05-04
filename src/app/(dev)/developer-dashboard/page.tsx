
'use client';

import * as React from 'react';
import {
  getAllPendingInvestments,
  approveInvestment,
  rejectInvestment,
  type InvestmentSubmission,
} from '@/lib/investment-store';
import {
  getPendingWithdrawalRequests, // Import function to get pending withdrawals
  updateWithdrawalStatus,      // Import function to update withdrawal status
  type WithdrawalRequest,
} from '@/lib/withdrawal-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image'; // Use next/image for optimization
import { Loader2, CheckCircle, XCircle, ExternalLink, Download, Send, Clock, Ban, Wallet } from 'lucide-react'; // Added icons
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
import { Input } from '@/components/ui/input'; // For transaction ID/reason
import { Label } from '@/components/ui/label'; // For transaction ID/reason
import { Textarea } from '@/components/ui/textarea';


// Helper to format currency
const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  // Consistent formatting (0 decimal places for investments, 2 for withdrawals)
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: amount > 1000 ? 0 : 2, maximumFractionDigits: 2 })}`;
};


export default function DeveloperDashboardPage() {
  const [pendingInvestments, setPendingInvestments] = React.useState<InvestmentSubmission[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = React.useState<WithdrawalRequest[]>([]);
  const [isLoadingInvestments, setIsLoadingInvestments] = React.useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = React.useState(true);
  const [isProcessingInvestment, setIsProcessingInvestment] = React.useState<Record<string, boolean>>({});
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = React.useState<Record<string, boolean>>({}); // Track withdrawal processing
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null); // For image modal
  const [withdrawalAction, setWithdrawalAction] = React.useState<{ type: 'complete' | 'reject', request: WithdrawalRequest | null }>({ type: 'complete', request: null });
  const [transactionId, setTransactionId] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');

  const { toast } = useToast();

  // Fetch Pending Investments
  const fetchPendingInvestments = React.useCallback(() => {
    setIsLoadingInvestments(true);
    const pending = getAllPendingInvestments();
    console.log("Fetched pending investments:", pending);
    setPendingInvestments(pending);
    setIsLoadingInvestments(false);
  }, []);

  // Fetch Pending Withdrawals
  const fetchPendingWithdrawals = React.useCallback(() => {
    setIsLoadingWithdrawals(true);
    const pending = getPendingWithdrawalRequests();
    console.log("Fetched pending withdrawals:", pending);
    setPendingWithdrawals(pending);
    setIsLoadingWithdrawals(false);
  }, []);

  React.useEffect(() => {
    fetchPendingInvestments();
    fetchPendingWithdrawals();

    // Refresh every 15 seconds
    const interval = setInterval(() => {
        fetchPendingInvestments();
        fetchPendingWithdrawals();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchPendingInvestments, fetchPendingWithdrawals]);


  // --- Investment Handlers ---
  const handleApproveInvestment = async (submissionId: string) => {
    setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await approveInvestment(submissionId);
      toast({
        title: 'Investment Approved',
        description: `Investment ID ${submissionId} has been approved.`,
      });
      fetchPendingInvestments(); // Refresh the list
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Approval Failed', description: `Could not approve investment ${submissionId}.`, variant: 'destructive',
      });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleRejectInvestment = async (submissionId: string) => {
    setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await rejectInvestment(submissionId);
      toast({
        title: 'Investment Rejected', description: `Investment ID ${submissionId} has been rejected.`, variant: 'destructive',
      });
      fetchPendingInvestments(); // Refresh the list
    } catch (error) {
      console.error('Rejection error:', error);
      toast({
        title: 'Rejection Failed', description: `Could not reject investment ${submissionId}.`, variant: 'destructive',
      });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  // --- Withdrawal Handlers ---
  const openWithdrawalActionModal = (type: 'complete' | 'reject', request: WithdrawalRequest) => {
      setWithdrawalAction({ type, request });
      setTransactionId(''); // Reset fields
      setRejectionReason('');
  }

  const closeWithdrawalActionModal = () => {
      setWithdrawalAction({ type: 'complete', request: null });
  }

  const handleCompleteWithdrawal = async () => {
      if (!withdrawalAction.request || !transactionId.trim()) {
          toast({ title: "Missing Transaction ID", description: "Please enter the payment transaction ID.", variant: "destructive" });
          return;
      }
      const requestId = withdrawalAction.request.id;
      setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: true }));
      try {
          await updateWithdrawalStatus(requestId, 'completed', { transactionId: transactionId.trim() });
          toast({ title: 'Withdrawal Completed', description: `Withdrawal ${requestId} marked as completed.` });
          fetchPendingWithdrawals();
          closeWithdrawalActionModal();
      } catch (error) {
          console.error('Withdrawal completion error:', error);
          toast({ title: 'Completion Failed', description: `Could not mark withdrawal ${requestId} as completed.`, variant: 'destructive' });
      } finally {
          setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: false }));
      }
  };

   const handleRejectWithdrawal = async () => {
       if (!withdrawalAction.request || !rejectionReason.trim()) {
           toast({ title: "Missing Rejection Reason", description: "Please provide a reason for rejection.", variant: "destructive" });
           return;
       }
       const requestId = withdrawalAction.request.id;
       setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: true }));
       try {
           await updateWithdrawalStatus(requestId, 'rejected', { rejectionReason: rejectionReason.trim() });
           toast({ title: 'Withdrawal Rejected', description: `Withdrawal ${requestId} has been rejected.`, variant: 'destructive' });
           fetchPendingWithdrawals();
           closeWithdrawalActionModal();
       } catch (error) {
           console.error('Withdrawal rejection error:', error);
           toast({ title: 'Rejection Failed', description: `Could not reject withdrawal ${requestId}.`, variant: 'destructive' });
       } finally {
           setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: false }));
       }
   };


  // --- Image Modal ---
  const openImageModal = (imageDataUrl: string) => {
    setSelectedImage(imageDataUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
        Developer Dashboard
      </h1>

      <Tabs defaultValue="investments" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="investments">Pending Investments ({pendingInvestments.length})</TabsTrigger>
              <TabsTrigger value="withdrawals">Pending Withdrawals ({pendingWithdrawals.length})</TabsTrigger>
          </TabsList>

          {/* Investments Tab */}
          <TabsContent value="investments">
              <Card>
                  <CardHeader>
                      <CardTitle>Review Investment Submissions</CardTitle>
                      <CardDescription>Approve or reject pending investment proofs.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isLoadingInvestments ? (
                          <div className="flex justify-center items-center min-h-[200px]">
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          </div>
                      ) : pendingInvestments.length === 0 ? (
                          <p className="text-center text-muted-foreground mt-6">No pending investments found.</p>
                      ) : (
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
                                          <TableCell>{format(new Date(submission.submissionDate), 'PPp')}</TableCell>
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
                                                  onClick={() => handleApproveInvestment(submission.id!)}
                                                  disabled={isProcessingInvestment[submission.id!]}
                                              >
                                                  {isProcessingInvestment[submission.id!] ? (
                                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  ) : (
                                                      <CheckCircle className="mr-1 h-4 w-4" />
                                                  )}
                                                  Approve
                                              </Button>
                                              <Button
                                                  variant="destructive"
                                                  size="sm"
                                                  onClick={() => handleRejectInvestment(submission.id!)}
                                                  disabled={isProcessingInvestment[submission.id!]}
                                              >
                                                  {isProcessingInvestment[submission.id!] ? (
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
                      )}
                  </CardContent>
              </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
               <Card>
                  <CardHeader>
                      <CardTitle>Review Withdrawal Requests</CardTitle>
                      <CardDescription>Mark pending withdrawal requests as completed or rejected.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isLoadingWithdrawals ? (
                          <div className="flex justify-center items-center min-h-[200px]">
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          </div>
                      ) : pendingWithdrawals.length === 0 ? (
                          <p className="text-center text-muted-foreground mt-6">No pending withdrawal requests found.</p>
                      ) : (
                           <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>User</TableHead>
                                      <TableHead>Investment</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                      <TableHead>Method</TableHead>
                                      <TableHead>Account No.</TableHead>
                                      <TableHead>Requested</TableHead>
                                      <TableHead className="text-center">Actions</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {pendingWithdrawals.map((request) => (
                                      <TableRow key={request.id}>
                                          <TableCell>
                                              <div>{request.userName}</div>
                                              <div className="text-xs text-muted-foreground">{request.userId}</div>
                                          </TableCell>
                                          <TableCell>
                                                <div>{request.investmentTitle}</div>
                                                <div className="text-xs text-muted-foreground">{request.investmentId}</div>
                                          </TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(request.withdrawalAmount)}</TableCell>
                                          <TableCell className="capitalize">{request.paymentMethod}</TableCell>
                                          <TableCell>{request.accountNumber}</TableCell>
                                          <TableCell>{format(new Date(request.requestDate), 'PPp')}</TableCell>
                                          <TableCell className="text-center space-x-2">
                                              <Button
                                                  variant="default"
                                                  size="sm"
                                                  onClick={() => openWithdrawalActionModal('complete', request)}
                                                  disabled={isProcessingWithdrawal[request.id!]}
                                                  className="bg-green-600 hover:bg-green-700"
                                              >
                                                  {isProcessingWithdrawal[request.id!] ? (
                                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  ) : (
                                                      <Send className="mr-1 h-4 w-4" /> // Use Send icon
                                                  )}
                                                  Complete
                                              </Button>
                                               <Button
                                                  variant="destructive"
                                                  size="sm"
                                                  onClick={() => openWithdrawalActionModal('reject', request)} // Open reject modal
                                                  disabled={isProcessingWithdrawal[request.id!]}
                                              >
                                                  {isProcessingWithdrawal[request.id!] ? (
                                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  ) : (
                                                      <Ban className="mr-1 h-4 w-4" /> // Use Ban icon
                                                  )}
                                                  Reject
                                              </Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      )}
                  </CardContent>
              </Card>
          </TabsContent>
      </Tabs>


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

       {/* Withdrawal Action Modal */}
        <Dialog open={!!withdrawalAction.request} onOpenChange={(open) => !open && closeWithdrawalActionModal()}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>
                        {withdrawalAction.type === 'complete' ? 'Complete Withdrawal' : 'Reject Withdrawal'}
                    </DialogTitle>
                    <DialogDescription>
                        {withdrawalAction.type === 'complete'
                            ? `Confirm completion for withdrawal request ${withdrawalAction.request?.id}.`
                            : `Provide a reason for rejecting withdrawal request ${withdrawalAction.request?.id}.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {withdrawalAction.type === 'complete' && (
                        <div className="space-y-2">
                            <Label htmlFor="transaction-id">Transaction ID</Label>
                            <Input
                                id="transaction-id"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="Enter payment transaction ID"
                                required
                            />
                            <p className="text-xs text-muted-foreground">Enter the ID from Easypaisa/JazzCash after sending payment.</p>
                        </div>
                    )}
                    {withdrawalAction.type === 'reject' && (
                        <div className="space-y-2">
                            <Label htmlFor="rejection-reason">Rejection Reason</Label>
                             <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter reason for rejection (e.g., invalid account number, suspected fraud)"
                                required
                                rows={3}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    {withdrawalAction.type === 'complete' && (
                        <Button
                            onClick={handleCompleteWithdrawal}
                            disabled={isProcessingWithdrawal[withdrawalAction.request?.id ?? ''] || !transactionId.trim()}
                             className="bg-green-600 hover:bg-green-700"
                         >
                            {isProcessingWithdrawal[withdrawalAction.request?.id ?? ''] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Mark as Completed
                        </Button>
                    )}
                     {withdrawalAction.type === 'reject' && (
                        <Button
                            variant="destructive"
                            onClick={handleRejectWithdrawal}
                            disabled={isProcessingWithdrawal[withdrawalAction.request?.id ?? ''] || !rejectionReason.trim()}
                        >
                             {isProcessingWithdrawal[withdrawalAction.request?.id ?? ''] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Rejection
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>


    </div>
  );
}
