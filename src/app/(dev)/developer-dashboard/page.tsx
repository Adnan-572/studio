
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  getPendingInvestmentsFromFirestore, // Use new Firestore function
  approveInvestmentInFirestore,       // Use new Firestore function
  rejectInvestmentInFirestore,        // Use new Firestore function
  getApprovedInvestmentsFromFirestore, // Use new Firestore function
  type InvestmentSubmissionFirestore, 
} from '@/lib/investment-store';
import {
  getPendingWithdrawalRequests, // Assuming this will also come from Firestore later
  updateWithdrawalStatus,    
  type WithdrawalRequestFirestore, 
} from '@/lib/withdrawal-store'; // Keep withdrawal store as is for now
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isPast } from 'date-fns';
import Image from 'next/image'; // For displaying screenshots
import { Loader2, CheckCircle, XCircle, ExternalLink, Download, Send, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Timestamp } from 'firebase/firestore';

const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: amount > 1000 ? 0 : 2, maximumFractionDigits: 2 })}`;
};

// Helper to convert Firestore Timestamp to readable date string
const formatFirestoreTimestamp = (timestamp: Timestamp | string | undefined | null, includeTime: boolean = true): string => {
  if (!timestamp) return 'N/A';
  let date: Date;
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    date = (timestamp as Timestamp).toDate();
  } else {
     return 'Invalid Date';
  }
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  return includeTime ? format(date, 'Pp') : format(date, 'P');
};


export default function DeveloperDashboardPage() {
  const router = useRouter();

  const [pendingInvestments, setPendingInvestments] = React.useState<InvestmentSubmissionFirestore[]>([]);
  const [activeInvestments, setActiveInvestments] = React.useState<InvestmentSubmissionFirestore[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = React.useState<WithdrawalRequestFirestore[]>([]);
  const [isLoadingInvestments, setIsLoadingInvestments] = React.useState(true);
  const [isLoadingActive, setIsLoadingActive] = React.useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = React.useState(true);
  const [isProcessingInvestment, setIsProcessingInvestment] = React.useState<Record<string, boolean>>({});
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = React.useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [withdrawalAction, setWithdrawalAction] = React.useState<{ type: 'complete' | 'reject', request: WithdrawalRequestFirestore | null }>({ type: 'complete', request: null });
  const [transactionId, setTransactionId] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [investmentRejectionReason, setInvestmentRejectionReason] = React.useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);
  const [currentInvestmentToReject, setCurrentInvestmentToReject] = React.useState<string | null>(null);

  const { toast } = useToast();

  const fetchAllData = React.useCallback(async () => {
    setIsLoadingInvestments(true);
    try {
      const pending = await getPendingInvestmentsFromFirestore(); 
      setPendingInvestments(pending);
    } catch (err) {
      toast({ title: 'Error Fetching Pending', description: 'Could not load pending investments.', variant: 'destructive' });
    }
    setIsLoadingInvestments(false);

    setIsLoadingActive(true);
    try {
      const active = await getApprovedInvestmentsFromFirestore(); 
      setActiveInvestments(active);
    } catch (err) {
       toast({ title: 'Error Fetching Active', description: 'Could not load active investments.', variant: 'destructive' });
    }
    setIsLoadingActive(false);

    setIsLoadingWithdrawals(true);
    try {
      // TODO: Replace with actual Firestore call for withdrawals
      const pendingW = getPendingWithdrawalRequests(); 
      setPendingWithdrawals(pendingW);
    } catch (err) {
      toast({ title: 'Error Fetching Withdrawals', description: 'Could not load pending withdrawals.', variant: 'destructive' });
    }
    setIsLoadingWithdrawals(false);
  }, [toast]);

  React.useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchAllData]);


  const handleApproveInvestment = async (submissionId: string) => {
    if (!submissionId) return;
    setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await approveInvestmentInFirestore(submissionId);
      toast({ title: 'Investment Approved', description: `Investment ID ${submissionId} marked as approved.` });
      fetchAllData(); // Refresh data
    } catch (error) {
      console.error('Approval error:', error);
      toast({ title: 'Approval Failed', description: `Could not approve investment ${submissionId}.`, variant: 'destructive' });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: false }));
    }
  };
  
  const openRejectInvestmentModal = (submissionId: string) => {
    setCurrentInvestmentToReject(submissionId);
    setInvestmentRejectionReason('');
    setIsRejectionModalOpen(true);
  };

  const handleConfirmRejectInvestment = async () => {
    if (!currentInvestmentToReject || !investmentRejectionReason.trim()) {
       toast({ title: "Missing Reason", description: "Please provide a reason for rejection.", variant: "destructive" });
       return;
    }
    const submissionId = currentInvestmentToReject;
    setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await rejectInvestmentInFirestore(submissionId, investmentRejectionReason.trim());
      toast({ title: 'Investment Rejected', description: `Investment ID ${submissionId} marked as rejected.`, variant: 'destructive' });
      fetchAllData(); // Refresh data
      setIsRejectionModalOpen(false);
      setCurrentInvestmentToReject(null);
    } catch (error) {
      console.error('Rejection error:', error);
      toast({ title: 'Rejection Failed', description: `Could not reject investment ${submissionId}.`, variant: 'destructive' });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: false }));
    }
  };


  const openWithdrawalActionModal = (type: 'complete' | 'reject', request: WithdrawalRequestFirestore) => {
      setWithdrawalAction({ type, request });
      setTransactionId(''); 
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
      const requestId = withdrawalAction.request.id!;
      setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: true }));
      try {
          await updateWithdrawalStatus(requestId, 'completed', { transactionId: transactionId.trim() }); // Placeholder
          toast({ title: 'Withdrawal Completed', description: `Withdrawal ${requestId} marked as completed.` });
          fetchAllData();
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
       const requestId = withdrawalAction.request.id!;
       setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: true }));
       try {
           await updateWithdrawalStatus(requestId, 'rejected', { rejectionReason: rejectionReason.trim() }); // Placeholder
           toast({ title: 'Withdrawal Rejected', description: `Withdrawal ${requestId} has been rejected.`, variant: 'destructive' });
           fetchAllData();
           closeWithdrawalActionModal();
       } catch (error) {
           console.error('Withdrawal rejection error:', error);
           toast({ title: 'Rejection Failed', description: `Could not reject withdrawal ${requestId}.`, variant: 'destructive' });
       } finally {
           setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: false }));
       }
   };

  const openImageModal = (imageDataUrl: string) => setSelectedImage(imageDataUrl);
  const closeImageModal = () => setSelectedImage(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
        Developer Dashboard
      </h1>

      <Tabs defaultValue="pending-investments" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending-investments">Pending Investments ({pendingInvestments.length})</TabsTrigger>
              <TabsTrigger value="active-investments">Active/Completed Investments ({activeInvestments.length})</TabsTrigger>
              <TabsTrigger value="pending-withdrawals">Pending Withdrawals ({pendingWithdrawals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending-investments">
              <Card>
                  <CardHeader>
                      <CardTitle>Review Investment Submissions</CardTitle>
                      <CardDescription>Approve or reject pending investment proofs from Firestore.</CardDescription>
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
                                              <div className="text-xs text-muted-foreground">{submission.userPhoneNumber}</div> 
                                          </TableCell>
                                          <TableCell>{submission.planTitle}</TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(submission.investmentAmount)}</TableCell>
                                          <TableCell>{formatFirestoreTimestamp(submission.submissionDate)}</TableCell>
                                          <TableCell className="text-center">
                                              {submission.transactionProofUrl ? (
                                                  <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => openImageModal(submission.transactionProofUrl)}
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
                                                  onClick={() => openRejectInvestmentModal(submission.id!)}
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

          <TabsContent value="active-investments">
              <Card>
                  <CardHeader>
                      <CardTitle>Active & Completed Investments</CardTitle>
                      <CardDescription>Overview of all approved or completed investments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isLoadingActive ? (
                          <div className="flex justify-center items-center min-h-[200px]">
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          </div>
                      ) : activeInvestments.length === 0 ? (
                          <p className="text-center text-muted-foreground mt-6">No active or completed investments found.</p>
                      ) : (
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>User</TableHead>
                                      <TableHead>Plan</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                      <TableHead>Approved On</TableHead>
                                      <TableHead>Ends On</TableHead>
                                      <TableHead>Status</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {activeInvestments.map((investment) => {
                                      const startDate = investment.approvalDate ? (investment.approvalDate as Timestamp).toDate() : new Date();
                                      const endDate = addDays(startDate, investment.duration);
                                      const isPlanComplete = investment.status === 'completed' || (investment.status === 'approved' && isPast(endDate));
                                      
                                      let displayStatus = investment.status.charAt(0).toUpperCase() + investment.status.slice(1);
                                      if (investment.status === 'approved' && isPast(endDate) && investment.status !== 'completed') {
                                        displayStatus = "Ended (Awaiting Withdrawal)"; // Or similar
                                      }


                                      return (
                                          <TableRow key={investment.id}>
                                              <TableCell>
                                                  <div>{investment.userName}</div>
                                                  <div className="text-xs text-muted-foreground">{investment.userPhoneNumber}</div>
                                              </TableCell>
                                              <TableCell>{investment.planTitle}</TableCell>
                                              <TableCell className="text-right font-medium">{formatCurrency(investment.investmentAmount)}</TableCell>
                                              <TableCell>{formatFirestoreTimestamp(investment.approvalDate)}</TableCell>
                                              <TableCell>{format(endDate, 'P')}</TableCell>
                                              <TableCell>
                                                  <Badge variant={isPlanComplete ? "secondary" : (investment.status === 'approved' ? "default" : "outline")}>
                                                      {displayStatus}
                                                  </Badge>
                                              </TableCell>
                                          </TableRow>
                                      );
                                  })}
                              </TableBody>
                          </Table>
                      )}
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="pending-withdrawals">
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
                                              <div className="text-xs text-muted-foreground">{request.userPhoneNumber}</div>
                                          </TableCell>
                                          <TableCell>
                                                <div>{request.investmentTitle}</div>
                                                <div className="text-xs text-muted-foreground">{request.investmentId}</div>
                                          </TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(request.withdrawalAmount)}</TableCell>
                                          <TableCell className="capitalize">{request.paymentMethod}</TableCell>
                                          <TableCell>{request.accountNumber}</TableCell>
                                          <TableCell>{formatFirestoreTimestamp(request.requestDate as unknown as Timestamp)}</TableCell>
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
                                                      <Send className="mr-1 h-4 w-4" />
                                                  )}
                                                  Complete
                                              </Button>
                                               <Button
                                                  variant="destructive"
                                                  size="sm"
                                                  onClick={() => openWithdrawalActionModal('reject', request)}
                                                  disabled={isProcessingWithdrawal[request.id!]}
                                              >
                                                  {isProcessingWithdrawal[request.id!] ? (
                                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  ) : (
                                                      <Ban className="mr-1 h-4 w-4" />
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
                fill 
                style={{ objectFit: 'contain' }} 
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized // Add this if images are from Firebase Storage and not on a whitelisted domain
              />
            )}
          </div>
          <DialogFooter className="mt-4 sm:justify-between items-center">
             {selectedImage && (
                <a
                    href={selectedImage}
                    download={`transaction_proof_${Date.now()}.png`} // Consider more specific naming
                    target="_blank" // Open in new tab to download
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3"
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

      <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Investment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this investment submission. This will be visible to the user if implemented.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="investment-rejection-reason">Rejection Reason</Label>
              <Textarea
                id="investment-rejection-reason"
                value={investmentRejectionReason}
                onChange={(e) => setInvestmentRejectionReason(e.target.value)}
                placeholder="e.g., Invalid proof, amount mismatch"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmRejectInvestment}
              disabled={isProcessingInvestment[currentInvestmentToReject!] || !investmentRejectionReason.trim()}
            >
              {isProcessingInvestment[currentInvestmentToReject!] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

