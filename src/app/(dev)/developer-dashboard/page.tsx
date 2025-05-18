
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation'; // For redirection
import {
  getAllPendingInvestments,
  approveInvestment,
  rejectInvestment,
  getAllApprovedInvestments,
  type InvestmentSubmission,
} from '@/lib/investment-store';
import {
  getPendingWithdrawalRequests,
  updateWithdrawalStatus,    
  type WithdrawalRequest,
} from '@/lib/withdrawal-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isPast } from 'date-fns';
import Image from 'next/image';
import { Loader2, CheckCircle, XCircle, ExternalLink, Download, Send, Ban, ShieldAlert } from 'lucide-react';
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
import { getCurrentUser, type User } from '@/lib/auth-store'; // Import auth functions
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: amount > 1000 ? 0 : 2, maximumFractionDigits: 2 })}`;
};


export default function DeveloperDashboardPage() {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const router = useRouter();

  const [pendingInvestments, setPendingInvestments] = React.useState<InvestmentSubmission[]>([]);
  const [activeInvestments, setActiveInvestments] = React.useState<InvestmentSubmission[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = React.useState<WithdrawalRequest[]>([]);
  const [isLoadingInvestments, setIsLoadingInvestments] = React.useState(true);
  const [isLoadingActive, setIsLoadingActive] = React.useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = React.useState(true);
  const [isProcessingInvestment, setIsProcessingInvestment] = React.useState<Record<string, boolean>>({});
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = React.useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [withdrawalAction, setWithdrawalAction] = React.useState<{ type: 'complete' | 'reject', request: WithdrawalRequest | null }>({ type: 'complete', request: null });
  const [transactionId, setTransactionId] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');

  const { toast } = useToast();

  React.useEffect(() => {
    const user = getCurrentUser();
    if (user && user.userType === 'developer') {
      setCurrentUser(user);
    } else {
      // Optionally redirect or just show access denied
      // router.push('/'); // Redirect to home if not developer
    }
    setIsCheckingAuth(false);
  }, [router]);


  const fetchPendingInvestments = React.useCallback(() => {
    if (!currentUser) return;
    setIsLoadingInvestments(true);
    const pending = getAllPendingInvestments();
    setPendingInvestments(pending);
    setIsLoadingInvestments(false);
  }, [currentUser]);

  const fetchActiveInvestments = React.useCallback(() => {
    if (!currentUser) return;
    setIsLoadingActive(true);
    const active = getAllApprovedInvestments();
    setActiveInvestments(active);
    setIsLoadingActive(false);
  }, [currentUser]);

  const fetchPendingWithdrawals = React.useCallback(() => {
    if (!currentUser) return;
    setIsLoadingWithdrawals(true);
    const pending = getPendingWithdrawalRequests();
    setPendingWithdrawals(pending);
    setIsLoadingWithdrawals(false);
  }, [currentUser]);

  React.useEffect(() => {
    if (currentUser) { // Only fetch if user is a developer
      fetchPendingInvestments();
      fetchActiveInvestments();
      fetchPendingWithdrawals();

      const interval = setInterval(() => {
          fetchPendingInvestments();
          fetchActiveInvestments();
          fetchPendingWithdrawals();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchPendingInvestments, fetchActiveInvestments, fetchPendingWithdrawals]);


  const handleApproveInvestment = async (submissionId: string) => {
    setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await approveInvestment(submissionId);
      toast({ title: 'Investment Approved', description: `Investment ID ${submissionId} has been approved.` });
      fetchPendingInvestments(); 
      fetchActiveInvestments();
    } catch (error) {
      console.error('Approval error:', error);
      toast({ title: 'Approval Failed', description: `Could not approve investment ${submissionId}.`, variant: 'destructive' });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleRejectInvestment = async (submissionId: string) => {
    setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await rejectInvestment(submissionId);
      toast({ title: 'Investment Rejected', description: `Investment ID ${submissionId} has been rejected.`, variant: 'destructive' });
      fetchPendingInvestments();
    } catch (error) {
      console.error('Rejection error:', error);
      toast({ title: 'Rejection Failed', description: `Could not reject investment ${submissionId}.`, variant: 'destructive' });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const openWithdrawalActionModal = (type: 'complete' | 'reject', request: WithdrawalRequest) => {
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

  const openImageModal = (imageDataUrl: string) => setSelectedImage(imageDataUrl);
  const closeImageModal = () => setSelectedImage(null);

  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verifying access...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-xl font-semibold">Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page. This area is for developers only.
            Please login with a developer account or contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-6">Go to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
        Developer Dashboard
      </h1>

      <Tabs defaultValue="pending-investments" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending-investments">Pending Investments ({pendingInvestments.length})</TabsTrigger>
              <TabsTrigger value="active-investments">Active Investments ({activeInvestments.length})</TabsTrigger>
              <TabsTrigger value="pending-withdrawals">Pending Withdrawals ({pendingWithdrawals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending-investments">
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
                                          <TableCell>{format(new Date(submission.submissionDate), 'Pp')}</TableCell>
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

          <TabsContent value="active-investments">
              <Card>
                  <CardHeader>
                      <CardTitle>Active Investments</CardTitle>
                      <CardDescription>Overview of all currently active investments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isLoadingActive ? (
                          <div className="flex justify-center items-center min-h-[200px]">
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          </div>
                      ) : activeInvestments.length === 0 ? (
                          <p className="text-center text-muted-foreground mt-6">No active investments found.</p>
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
                                      const startDate = new Date(investment.approvalDate!);
                                      const endDate = addDays(startDate, investment.duration);
                                      const isComplete = isPast(endDate);

                                      return (
                                          <TableRow key={investment.id}>
                                              <TableCell>
                                                  <div>{investment.userName}</div>
                                                  <div className="text-xs text-muted-foreground">{investment.userId}</div>
                                              </TableCell>
                                              <TableCell>{investment.title}</TableCell>
                                              <TableCell className="text-right font-medium">{formatCurrency(investment.investmentAmount)}</TableCell>
                                              <TableCell>{format(startDate, 'Pp')}</TableCell>
                                              <TableCell>{format(endDate, 'Pp')}</TableCell>
                                              <TableCell>
                                                  <Badge variant={isComplete ? "secondary" : "default"}>
                                                      {isComplete ? "Completed" : "Active"}
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
                                              <div className="text-xs text-muted-foreground">{request.userId}</div>
                                          </TableCell>
                                          <TableCell>
                                                <div>{request.investmentTitle}</div>
                                                <div className="text-xs text-muted-foreground">{request.investmentId}</div>
                                          </TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(request.withdrawalAmount)}</TableCell>
                                          <TableCell className="capitalize">{request.paymentMethod}</TableCell>
                                          <TableCell>{request.accountNumber}</TableCell>
                                          <TableCell>{format(new Date(request.requestDate), 'Pp')}</TableCell>
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
              />
            )}
          </div>
          <DialogFooter className="mt-4 sm:justify-between items-center">
             {selectedImage && (
                <a
                    href={selectedImage}
                    download={`transaction_proof_${Date.now()}.png`}
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
