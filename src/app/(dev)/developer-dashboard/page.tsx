
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  getPendingInvestmentsFromFirestore, 
  approveInvestmentInFirestore,       
  rejectInvestmentInFirestore,        
  getApprovedInvestmentsFromFirestore, 
  // Add a function to get ALL investments for the user management tab
  // For now, we'll combine pending and approved and then filter in component,
  // but ideally, a dedicated function or more comprehensive fetch would be better.
  type InvestmentSubmissionFirestore, 
} from '@/lib/investment-store';
import {
  getPendingWithdrawalRequestsFromFirestore, 
  updateWithdrawalStatusInFirestore,    
  type WithdrawalRequestFirestore, 
} from '@/lib/withdrawal-store'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isPast } from 'date-fns';
import Image from 'next/image'; 
import { Loader2, CheckCircle, XCircle, ExternalLink, Download, Send, Ban, WalletCards, Users, UserCheck, Eye } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return 'PKR 0.00';
  }
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: amount > 1000 ? 0 : 2, maximumFractionDigits: 2 })}`;
};

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

interface UserSummary {
  userId: string;
  userName: string;
  userPhoneNumber: string;
  investmentCount: number;
}

export default function DeveloperDashboardPage() {
  const router = useRouter();

  const [pendingInvestments, setPendingInvestments] = React.useState<InvestmentSubmissionFirestore[]>([]);
  const [activeInvestments, setActiveInvestments] = React.useState<InvestmentSubmissionFirestore[]>([]);
  const [allInvestments, setAllInvestments] = React.useState<InvestmentSubmissionFirestore[]>([]); // For User Management
  const [uniqueUsers, setUniqueUsers] = React.useState<UserSummary[]>([]);
  const [selectedUserInvestments, setSelectedUserInvestments] = React.useState<InvestmentSubmissionFirestore[]>([]);
  const [selectedUserDetails, setSelectedUserDetails] = React.useState<UserSummary | null>(null);


  const [pendingWithdrawals, setPendingWithdrawals] = React.useState<WithdrawalRequestFirestore[]>([]);
  const [isLoadingInvestments, setIsLoadingInvestments] = React.useState(true);
  const [isLoadingActive, setIsLoadingActive] = React.useState(true);
  const [isLoadingAllInvestments, setIsLoadingAllInvestments] = React.useState(true); // Loading for user management
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = React.useState(true);
  const [isProcessingInvestment, setIsProcessingInvestment] = React.useState<Record<string, boolean>>({});
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = React.useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  
  const [withdrawalAction, setWithdrawalAction] = React.useState<{ type: 'complete' | 'reject', request: WithdrawalRequestFirestore | null }>({ type: 'complete', request: null });
  const [transactionIdInput, setTransactionIdInput] = React.useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = React.useState('');
  
  const [investmentRejectionReason, setInvestmentRejectionReason] = React.useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);
  const [currentInvestmentToReject, setCurrentInvestmentToReject] = React.useState<string | null>(null);

  const { toast } = useToast();

  const fetchAllData = React.useCallback(async () => {
    setIsLoadingInvestments(true);
    setIsLoadingActive(true);
    setIsLoadingWithdrawals(true);
    setIsLoadingAllInvestments(true);

    try {
      const [pending, active, pendingW] = await Promise.all([
        getPendingInvestmentsFromFirestore(),
        getApprovedInvestmentsFromFirestore(), // This fetches 'approved' and 'completed'
        getPendingWithdrawalRequestsFromFirestore()
      ]);
      
      setPendingInvestments(pending);
      setActiveInvestments(active); // Contains approved and completed
      setPendingWithdrawals(pendingW);

      // For User Management Tab: Combine all known investments
      // To get a truly full list including 'rejected', we might need another query or adjust getApproved.
      // For now, using pending + active (which includes completed).
      // A more robust way would be a single query in investment-store.ts: getAllInvestments()
      const combinedInvestments = [...pending, ...active];
      // Let's simulate fetching all investments (including rejected) by combining what we have.
      // In a real scenario, you would add a function like `getRejectedInvestmentsFromFirestore()`
      // or ideally `getAllInvestmentsFromFirestore()`.
      // For demonstration, we'll assume `active` might also contain rejected ones if `getApprovedInvestmentsFromFirestore` was broader
      // or we could filter unique items if `pending` and `active` could overlap.
      // For now, `combinedInvestments` will be used.
      setAllInvestments(combinedInvestments);

      const usersMap = new Map<string, UserSummary>();
      combinedInvestments.forEach(inv => {
        if (!usersMap.has(inv.userId)) {
          usersMap.set(inv.userId, {
            userId: inv.userId,
            userName: inv.userName,
            userPhoneNumber: inv.userPhoneNumber,
            investmentCount: 0,
          });
        }
        usersMap.get(inv.userId)!.investmentCount++;
      });
      setUniqueUsers(Array.from(usersMap.values()));
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      toast({ title: 'Error Fetching Data', description: 'Could not load all dashboard data.', variant: 'destructive' });
    } finally {
      setIsLoadingInvestments(false);
      setIsLoadingActive(false);
      setIsLoadingWithdrawals(false);
      setIsLoadingAllInvestments(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); 
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleViewUserInvestments = (user: UserSummary) => {
    setSelectedUserDetails(user);
    const userInvests = allInvestments.filter(inv => inv.userId === user.userId);
    setSelectedUserInvestments(userInvests.sort((a, b) => (b.submissionDate?.toDate()?.getTime() || 0) - (a.submissionDate?.toDate()?.getTime() || 0)));
  };


  const handleApproveInvestment = async (submissionId: string) => {
    if (!submissionId) return;
    setIsProcessingInvestment((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await approveInvestmentInFirestore(submissionId);
      toast({ title: 'Investment Approved', description: `Investment ID ${submissionId} marked as approved.` });
      fetchAllData(); 
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
      fetchAllData(); 
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
      setTransactionIdInput(''); 
      setRejectionReasonInput('');
  }

  const closeWithdrawalActionModal = () => {
      setWithdrawalAction({ type: 'complete', request: null });
  }

  const handleCompleteWithdrawal = async () => {
      if (!withdrawalAction.request || !transactionIdInput.trim()) {
          toast({ title: "Missing Transaction ID", description: "Please enter the payment transaction ID.", variant: "destructive" });
          return;
      }
      const requestId = withdrawalAction.request.id!;
      setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: true }));
      try {
          await updateWithdrawalStatusInFirestore(requestId, 'completed', { transactionId: transactionIdInput.trim() });
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
       if (!withdrawalAction.request || !rejectionReasonInput.trim()) {
           toast({ title: "Missing Rejection Reason", description: "Please provide a reason for rejection.", variant: "destructive" });
           return;
       }
       const requestId = withdrawalAction.request.id!;
       setIsProcessingWithdrawal((prev) => ({ ...prev, [requestId]: true }));
       try {
           await updateWithdrawalStatusInFirestore(requestId, 'rejected', { rejectionReason: rejectionReasonInput.trim() }); 
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
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary flex items-center justify-center gap-2">
        <WalletCards className="h-8 w-8"/> Developer Dashboard
      </h1>

      <Tabs defaultValue="pending-investments" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pending-investments">Pending Investments ({pendingInvestments.length})</TabsTrigger>
              <TabsTrigger value="active-investments">Active/Completed ({activeInvestments.length})</TabsTrigger>
              <TabsTrigger value="pending-withdrawals">Pending Withdrawals ({pendingWithdrawals.length})</TabsTrigger>
              <TabsTrigger value="user-management">User Management ({uniqueUsers.length})</TabsTrigger>
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
                                      <TableHead className="text-center">Proof</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {activeInvestments.map((investment) => {
                                      const startDate = investment.approvalDate ? (investment.approvalDate as Timestamp).toDate() : new Date();
                                      const endDate = addDays(startDate, investment.duration);
                                      const isPlanConsideredComplete = investment.status === 'completed' || (investment.status === 'approved' && isPast(endDate));
                                      
                                      let displayStatus = investment.status.charAt(0).toUpperCase() + investment.status.slice(1);
                                      if (investment.status === 'approved' && isPast(endDate) && investment.status !== 'completed') {
                                        displayStatus = "Ended (Awaiting Withdrawal)"; 
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
                                                  <Badge variant={isPlanConsideredComplete ? "secondary" : (investment.status === 'approved' ? "default" : (investment.status === 'rejected' ? "destructive" : "outline"))}>
                                                      {displayStatus}
                                                  </Badge>
                                              </TableCell>
                                               <TableCell className="text-center">
                                                {investment.transactionProofUrl ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openImageModal(investment.transactionProofUrl)}
                                                    >
                                                        <ExternalLink className="mr-1 h-4 w-4" /> View
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">N/A</span>
                                                )}
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
                                                <div className="text-xs text-muted-foreground">ID: {request.investmentId.substring(0,10)}...</div>
                                          </TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(request.withdrawalAmount)}</TableCell>
                                          <TableCell className="capitalize">{request.paymentMethod}</TableCell>
                                          <TableCell>{request.accountNumber}</TableCell>
                                          <TableCell>{formatFirestoreTimestamp(request.requestDate)}</TableCell>
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

          <TabsContent value="user-management">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> User Management</CardTitle>
                <CardDescription>View users who have submitted investments and their investment history.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAllInvestments ? (
                  <div className="flex justify-center items-center min-h-[200px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                ) : uniqueUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground mt-6">No users with investments found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <h3 className="text-lg font-semibold mb-2">Users ({uniqueUsers.length})</h3>
                      <ScrollArea className="h-[400px] border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead className="text-center">Inv.</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uniqueUsers.map((user) => (
                              <TableRow 
                                key={user.userId} 
                                className={`cursor-pointer hover:bg-muted/50 ${selectedUserDetails?.userId === user.userId ? 'bg-muted' : ''}`}
                                onClick={() => handleViewUserInvestments(user)}
                              >
                                <TableCell>{user.userName}</TableCell>
                                <TableCell className="text-xs">{user.userPhoneNumber}</TableCell>
                                <TableCell className="text-center text-xs">{user.investmentCount}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => handleViewUserInvestments(user)}>
                                    <Eye className="h-4 w-4"/>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                    <div className="md:col-span-2">
                      {selectedUserDetails ? (
                        <>
                          <h3 className="text-lg font-semibold mb-2">
                            Investments for: {selectedUserDetails.userName} ({selectedUserDetails.userPhoneNumber})
                          </h3>
                          {selectedUserInvestments.length === 0 ? (
                             <p className="text-muted-foreground">No investments found for this user.</p>
                          ) : (
                            <ScrollArea className="h-[400px] border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Plan</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead>Submitted</TableHead>
                                  <TableHead>Approved</TableHead>
                                  <TableHead>Ends</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedUserInvestments.map((inv) => {
                                  const startDate = inv.approvalDate ? (inv.approvalDate as Timestamp).toDate() : (inv.submissionDate as Timestamp).toDate();
                                  const endDate = inv.approvalDate ? addDays(startDate, inv.duration) : null;
                                   let displayStatus = inv.status.charAt(0).toUpperCase() + inv.status.slice(1);
                                    if (inv.status === 'approved' && endDate && isPast(endDate) && inv.status !== 'completed') {
                                      displayStatus = "Ended";
                                    }

                                  return (
                                    <TableRow key={inv.id}>
                                      <TableCell>
                                        {inv.planTitle}
                                        {inv.transactionProofUrl && (
                                          <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => openImageModal(inv.transactionProofUrl)}>
                                             (Proof)
                                          </Button>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">{formatCurrency(inv.investmentAmount)}</TableCell>
                                      <TableCell>{formatFirestoreTimestamp(inv.submissionDate, false)}</TableCell>
                                      <TableCell>{inv.approvalDate ? formatFirestoreTimestamp(inv.approvalDate, false) : 'N/A'}</TableCell>
                                      <TableCell>{endDate ? format(endDate, 'P') : 'N/A'}</TableCell>
                                      <TableCell>
                                        <Badge variant={
                                            inv.status === 'approved' ? 'default' :
                                            inv.status === 'completed' ? 'secondary' :
                                            inv.status === 'pending' ? 'outline' :
                                            inv.status === 'rejected' ? 'destructive' : 'outline'
                                        }>
                                          {displayStatus}
                                          {inv.status === 'rejected' && inv.rejectionReason && (
                                            <span className="ml-1 opacity-70 text-xs">({inv.rejectionReason.substring(0,15)}...)</span>
                                          )}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] border rounded-md bg-muted/30">
                           <UserCheck className="h-16 w-16 text-muted-foreground mb-4"/>
                          <p className="text-muted-foreground">Select a user to view their investment details.</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                    target="_blank" 
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
                            ? `Confirm completion for withdrawal request ID ${withdrawalAction.request?.id?.substring(0,10)}... for ${withdrawalAction.request?.userName}.`
                            : `Provide a reason for rejecting withdrawal request ID ${withdrawalAction.request?.id?.substring(0,10)}... for ${withdrawalAction.request?.userName}.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {withdrawalAction.type === 'complete' && (
                        <div className="space-y-2">
                            <Label htmlFor="transaction-id">Transaction ID</Label>
                            <Input
                                id="transaction-id-input" 
                                value={transactionIdInput}
                                onChange={(e) => setTransactionIdInput(e.target.value)}
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
                                id="rejection-reason-input" 
                                value={rejectionReasonInput}
                                onChange={(e) => setRejectionReasonInput(e.target.value)}
                                placeholder="Enter reason for rejection (e.g., invalid account number, suspected fraud)"
                                required
                                rows={3}
                            />
                        </div>
                    )}
                     {withdrawalAction.request && (
                        <Card className="p-3 bg-muted/50">
                            <CardDescription className="text-xs space-y-0.5">
                                <p><strong>User:</strong> {withdrawalAction.request.userName} ({withdrawalAction.request.userPhoneNumber})</p>
                                <p><strong>Amount:</strong> {formatCurrency(withdrawalAction.request.withdrawalAmount)}</p>
                                <p><strong>Method:</strong> {withdrawalAction.request.paymentMethod} - {withdrawalAction.request.accountNumber}</p>
                                <p><strong>Investment:</strong> {withdrawalAction.request.investmentTitle}</p>
                            </CardDescription>
                        </Card>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    {withdrawalAction.type === 'complete' && (
                        <Button
                            onClick={handleCompleteWithdrawal}
                            disabled={isProcessingWithdrawal[withdrawalAction.request?.id ?? ''] || !transactionIdInput.trim()}
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
                            disabled={isProcessingWithdrawal[withdrawalAction.request?.id ?? ''] || !rejectionReasonInput.trim()}
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


    