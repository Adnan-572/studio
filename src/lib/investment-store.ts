
// This file previously handled localStorage for investments.
// With Firebase, this logic will be moved to Firestore interactions.

import type { Plan as PlanUIDetails } from '@/components/investment-plans';

// This will be the structure for data in Firestore.
// It will include the Firebase user's UID.
export interface InvestmentSubmissionFirestore extends Omit<PlanUIDetails, 'icon' | 'badge' | 'primary' | 'investmentRange' | 'id'> {
    id?: string; // Firestore document ID will be set automatically
    userId: string; // Firebase Auth User UID
    userName: string; // User's name (collected at submission)
    userPhoneNumber: string; // User's actual phone number (used as an identifier if not logged in, or from profile)
    investmentAmount: number; 
    transactionProofUrl: string; // URL from Firebase Storage
    submissionDate: string; // ISO string
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approvalDate?: string | null; 
    rejectionReason?: string | null;
    completionDate?: string | null; // When the plan duration ends
    iconName: string; 
    referralBonusPercent?: number; // If applicable
    // Fields from PlanUIDetails that are useful to store directly
    title: string;
    duration: number;
    dailyProfitMin: number;
    dailyProfitMax: number;
    minInvestment: number;
    maxInvestment: number;
}


// Placeholder functions to avoid breaking Developer Dashboard
// These will be replaced with Firestore logic

export const getAllPendingInvestments = (): InvestmentSubmissionFirestore[] => {
  console.warn("getAllPendingInvestments is a placeholder and not fetching from Firestore.");
  // For DeveloperDashboard to not break, it expects:
  // submission.id, submission.userName, submission.userId (phone), submission.title, submission.investmentAmount, submission.submissionDate, submission.transactionProofDataUrl
  // The type used in dashboard is InvestmentSubmission which has transactionProofDataUrl
  // We should map transactionProofUrl to transactionProofDataUrl if needed, or update dashboard
  return [];
};

export const approveInvestment = async (submissionId: string): Promise<void> => {
  console.warn(`approveInvestment(${submissionId}) is a placeholder and not updating Firestore.`);
  return Promise.resolve();
};

export const rejectInvestment = async (submissionId: string): Promise<void> => {
  console.warn(`rejectInvestment(${submissionId}) is a placeholder and not updating Firestore.`);
  return Promise.resolve();
};

export const getAllApprovedInvestments = (): InvestmentSubmissionFirestore[] => {
  console.warn("getAllApprovedInvestments is a placeholder and not fetching from Firestore.");
  // For DeveloperDashboard, it expects:
  // investment.id, investment.userName, investment.userId (phone), investment.title, investment.investmentAmount, investment.approvalDate, investment.duration
  return [];
};

// This function might be needed by other parts if they were using it for user-facing dashboard
export const getInvestmentsForUser = (userPhone: string): InvestmentSubmissionFirestore[] => {
  console.warn(`getInvestmentsForUser(${userPhone}) is a placeholder.`);
  return [];
};

// This function might be needed by investment-plans component for submission
export const addPendingInvestment = async (submission: Omit<InvestmentSubmissionFirestore, 'id' | 'status' | 'submissionDate'>): Promise<InvestmentSubmissionFirestore> => {
  console.warn("addPendingInvestment is a placeholder and not saving to Firestore.");
  const newSubmission: InvestmentSubmissionFirestore = {
    ...submission,
    id: `temp_${Date.now()}`,
    status: 'pending',
    submissionDate: new Date().toISOString(),
  };
  return Promise.resolve(newSubmission);
};
