
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllSubmittedPlansForAdmin, // New: Fetches all plans from all users' subcollections
  approveSubmittedPlan,       // New: Approves a plan in a user's subcollection
  rejectSubmittedPlan,        // New: Rejects a plan in a user's subcollection
  type UserPlanData,          // New: The type for plan documents in subcollections
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

interface UserSummaryForAdmin {
  userId: string;
  userName: string;
  userPhoneNumber: string;
  investmentCount: number;
}

export default function DeveloperDashboardPage() {
  const router = useRouter();

  const [allUserPlans, setAllUserPlans] = React.useState<UserPlanData[]>([]); // Holds all plans from all users
  const [pendingInvestments, setPendingInvestments] = React.useState<UserPlanData[]>([]);
  const [activeCompletedInvestments, setActiveCompletedInvestments] = React.useState<UserPlanData[]>([]);
  
  const [uniqueUsers, setUniqueUsers] = React.useState<UserSummaryForAdmin[]>([]);
  const [selectedUserInvestments, setSelectedUserInvestments] = React.useState<UserPlanData[]>([]);
  const [selectedUserDetails, setSelectedUserDetails] = React.useState<UserSummaryForAdmin | null>(null);

  const [pendingWithdrawals, setPendingWithdrawals] = React.useState<WithdrawalRequestFirestore[]>([]);
  const [isLoadingAllPlans, setIsLoadingAllPlans] = React.useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = React.useState(true);

  const [isProcessingInvestment, setIsProcessingInvestment] = React.useState<Record<string, boolean>>({}); // Key will be plan.id
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = React.useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  
  const [withdrawalAction, setWithdrawalAction] = React.useState<{ type: 'complete' | 'reject', request: WithdrawalRequestFirestore | null }>({ type: 'complete', request: null });
  const [transactionIdInput, setTransactionIdInput] = React.useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = React.useState('');
  
  const [investmentRejectionReason, setInvestmentRejectionReason] = React.useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);
  const [currentPlanToReject, setCurrentPlanToReject] = React.useState<UserPlanData | null>(null);

  const { toast } = useToast();

  const fetchAllData = React.useCallback(async () => {
    setIsLoadingAllPlans(true);
    setIsLoadingWithdrawals(true);

    try {
      const [allPlansFromDb, pendingW] = await Promise.all([
        getAllSubmittedPlansForAdmin(),
        getPendingWithdrawalRequestsFromFirestore()
      ]);
      
      setAllUserPlans(allPlansFromDb);
      setPendingInvestments(allPlansFromDb.filter(p => p.status === 'pending'));
      setActiveCompletedInvestments(allPlansFromDb.filter(p => p.status === 'approved' || p.status === 'completed'));
      setPendingWithdrawals(pendingW);

      // User Management Tab Data
      const usersMap = new Map<string, UserSummaryForAdmin>();
      allPlansFromDb.forEach(plan => {
        if (!usersMap.has(plan.userId)) {
          usersMap.set(plan.userId, {
            userId: plan.userId,
            userName: plan.userName, // Assumes userName is denormalized in UserPlanData
            userPhoneNumber: plan.userPhoneNumber, // Assumes userPhoneNumber is denormalized
            investmentCount: 0,
          });
        }
        usersMap.get(plan.userId)!.investmentCount++;
      });
      setUniqueUsers(Array.from(usersMap.values()));
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      toast({ title: 'Error Fetching Data', description: 'Could not load all dashboard data.', variant: 'destructive' });
    } finally {
      setIsLoadingAllPlans(false);
      setIsLoadingWithdrawals(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); 
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleViewUserInvestments = (user: UserSummaryForAdmin) => {
    setSelectedUserDetails(user);
    const userInvests = allUserPlans.filter(inv => inv.userId === user.userId);
    setSelectedUserInvestments(userInvests.sort((a, b) => (b.submissionDate?.toDate()?.getTime() || 0) - (a.submissionDate?.toDate()?.getTime() || 0)));
  };

  const handleApproveInvestment = async (planToApprove: UserPlanData) => {
    if (!planToApprove || !planToApprove.id || !planToApprove.userId) return;
    setIsProcessingInvestment((prev) => ({ ...prev, [planToApprove.id!]: true }));
    try {
      await approveSubmittedPlan(planToApprove.userId, planToApprove.id!);
      toast({ title: 'Investment Approved', description: `Investment ID ${planToApprove.id} for user ${planToApprove.userName} marked as approved.` });
      fetchAllData(); 
    } catch (error) {
      console.error('Approval error:', error);
      toast({ title: 'Approval Failed', description: `Could not approve investment ${planToApprove.id}.`, variant: 'destructive' });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [planToApprove.id!]: false }));
    }
  };
  
  const openRejectInvestmentModal = (planToReject: UserPlanData) => {
    setCurrentPlanToReject(planToReject);
    setInvestmentRejectionReason('');
    setIsRejectionModalOpen(true);
  };

  const handleConfirmRejectInvestment = async () => {
    if (!currentPlanToReject || !currentPlanToReject.id || !currentPlanToReject.userId || !investmentRejectionReason.trim()) {
       toast({ title: "Missing Reason", description: "Please provide a reason for rejection.", variant: "destructive" });
       return;
    }
    const planId = currentPlanToReject.id!;
    const userId = currentPlanToReject.userId;

    setIsProcessingInvestment((prev) => ({ ...prev, [planId]: true }));
    try {
      await rejectSubmittedPlan(userId, planId, investmentRejectionReason.trim());
      toast({ title: 'Investment Rejected', description: `Investment ID ${planId} marked as rejected.`, variant: 'destructive' });
      fetchAllData(); 
      setIsRejectionModalOpen(false);
      setCurrentPlanToReject(null);
    } catch (error) {
      console.error('Rejection error:', error);
      toast({ title: 'Rejection Failed', description: `Could not reject investment ${planId}.`, variant: 'destructive' });
    } finally {
      setIsProcessingInvestment((prev) => ({ ...prev, [planId]: false }));
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
              <TabsTrigger value="active-investments">Active/Completed ({activeCompletedInvestments.length})</TabsTrigger>
              <TabsTrigger value="pending-withdrawals">Pending Withdrawals ({pendingWithdrawals.length})</TabsTrigger>
              <TabsTrigger value="user-management">User Management ({uniqueUsers.length})</TabsTrigger>
          </TabsList>

          {/* Pending Investments Tab */}
          <TabsContent value="pending-investments">
              <Card>
                  <CardHeader>
                      <CardTitle>Review Investment Submissions</CardTitle>
                      <CardDescription>Approve or reject pending investment proofs.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isLoadingAllPlans ? (
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
                                  {pendingInvestments.map((plan) => (
                                      <TableRow key={plan.id}>
                                          <TableCell>
                                              <div>{plan.userName}</div>
                                              <div className="text-xs text-muted-foreground">{plan.userPhoneNumber}</div> 
                                          </TableCell>
                                          <TableCell>{plan.planTitle}</TableCell>
                                          <TableCell className="text-right font-medium">{formatCurrency(plan.investmentAmount)}</TableCell>
                                          <TableCell>{formatFirestoreTimestamp(plan.submissionDate)}</TableCell>
                                          <TableCell className="text-center">
                                              {plan.transactionProofUrl ? (
                                                  <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => openImageModal(plan.transactionProofUrl)}
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
                                                  onClick={() => handleApproveInvestment(plan)}
                                                  disabled={isProcessingInvestment[plan.id!]}
                                              >
                                                  {isProcessingInvestment[plan.id!] ? (
                                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  ) : (
                                                      <CheckCircle className="mr-1 h-4 w-4" />
                                                  )}
                                                  Approve
                                              </Button>
                                              <Button
                                                  variant="destructive"
                                                  size="sm"
                                                  onClick={() => openRejectInvestmentModal(plan)}
                                                  disabled={isProcessingInvestment[plan.id!]}
                                              >
                                                  {isProcessingInvestment[plan.id!] ? (
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

          {/* Active/Completed Investments Tab */}
          <TabsContent value="active-investments">
              <Card>
                  <CardHeader>
                      <CardTitle>Active & Completed Investments</CardTitle>
                      <CardDescription>Overview of all approved or completed investments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isLoadingAllPlans ? (
                          <div className="flex justify-center items-center min-h-[200px]">
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          </div>
                      ) : activeCompletedInvestments.length === 0 ? (
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
                                  {activeCompletedInvestments.map((plan) => {
                                      const startDate = plan.approvalDate ? (plan.approvalDate as Timestamp).toDate() : new Date(); // Fallback, though approvalDate should exist
                                      const planEndDate = plan.endDate ? (plan.endDate as Timestamp).toDate() : addDays(startDate, plan.durationInDays);
                                      const isPlanConsideredComplete = plan.status === 'completed' || (plan.status === 'approved' && isPast(planEndDate));
                                      
                                      let displayStatus = plan.status.charAt(0).toUpperCase() + plan.status.slice(1);
                                      if (plan.status === 'approved' && isPast(planEndDate) && plan.status !== 'completed') {
                                        displayStatus = "Ended (Awaiting Withdrawal)"; 
                                      }

                                      return (
                                          <TableRow key={plan.id}>
                                              <TableCell>
                                                  <div>{plan.userName}</div>
                                                  <div className="text-xs text-muted-foreground">{plan.userPhoneNumber}</div>
                                              </TableCell>
                                              <TableCell>{plan.planTitle}</TableCell>
                                              <TableCell className="text-right font-medium">{formatCurrency(plan.investmentAmount)}</TableCell>
                                              <TableCell>{formatFirestoreTimestamp(plan.approvalDate)}</TableCell>
                                              <TableCell>{formatFirestoreTimestamp(plan.endDate, false)}</TableCell>
                                              <TableCell>
                                                  <Badge variant={isPlanConsideredComplete ? "secondary" : (plan.status === 'approved' ? "default" : (plan.status === 'rejected' ? "destructive" : "outline"))}>
                                                      {displayStatus}
                                                  </Badge>
                                              </TableCell>
                                               <TableCell className="text-center">
                                                {plan.transactionProofUrl ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openImageModal(plan.transactionProofUrl)}
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

          {/* Pending Withdrawals Tab - Stays mostly the same */}
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
                                                <div className="text-xs text-muted-foreground">Inv. ID: {request.investmentId.substring(0,10)}...</div>
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

          {/* User Management Tab */}
          <TabsContent value="user-management">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> User Management</CardTitle>
                <CardDescription>View users who have submitted investments and their investment history.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAllPlans ? (
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
                                {selectedUserInvestments.map((plan) => {
                                  const planEndDate = plan.endDate ? (plan.endDate as Timestamp).toDate() : 
                                                     (plan.approvalDate ? addDays((plan.approvalDate as Timestamp).toDate(), plan.durationInDays) : null);
                                  let displayStatus = plan.status.charAt(0).toUpperCase() + plan.status.slice(1);
                                    if (plan.status === 'approved' && planEndDate && isPast(planEndDate) && plan.status !== 'completed') {
                                      displayStatus = "Ended";
                                    }

                                  return (
                                    <TableRow key={plan.id}>
                                      <TableCell>
                                        {plan.planTitle}
                                        {plan.transactionProofUrl && (
                                          <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => openImageModal(plan.transactionProofUrl)}>
                                             (Proof)
                                          </Button>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">{formatCurrency(plan.investmentAmount)}</TableCell>
                                      <TableCell>{formatFirestoreTimestamp(plan.submissionDate, false)}</TableCell>
                                      <TableCell>{plan.approvalDate ? formatFirestoreTimestamp(plan.approvalDate, false) : 'N/A'}</TableCell>
                                      <TableCell>{planEndDate ? format(planEndDate, 'P') : 'N/A'}</TableCell>
                                      <TableCell>
                                        <Badge variant={
                                            plan.status === 'approved' ? 'default' :
                                            plan.status === 'completed' ? 'secondary' :
                                            plan.status === 'pending' ? 'outline' :
                                            plan.status === 'rejected' ? 'destructive' : 'outline'
                                        }>
                                          {displayStatus}
                                          {plan.status === 'rejected' && plan.rejectionReason && (
                                            <span className="ml-1 opacity-70 text-xs">({plan.rejectionReason.substring(0,15)}...)</span>
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

      {/* Image Modal */}
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

      {/* Investment Rejection Modal */}
      <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Investment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this investment submission. This may be visible to the user.
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
             {currentPlanToReject && <p className="text-xs text-muted-foreground">Rejecting plan: {currentPlanToReject.planTitle} for {currentPlanToReject.userName}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmRejectInvestment}
              disabled={isProcessingInvestment[currentPlanToReject?.id!] || !investmentRejectionReason.trim()}
            >
              {isProcessingInvestment[currentPlanToReject?.id!] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
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

    