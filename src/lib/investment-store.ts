
// This file previously handled localStorage for investments.
// With Firebase, this logic will be moved to Firestore interactions.
// For now, we'll keep the type definitions and clear out old functions
// to avoid conflicts with the new Firebase-based authentication and data storage.

import type { Plan as PlanUIDetails } from '@/components/investment-plans';

// This will be the structure for data in Firestore.
// It will include the Firebase user's UID.
export interface InvestmentSubmissionFirestore extends Omit<PlanUIDetails, 'icon' | 'badge' | 'primary' | 'investmentRange' | 'id'> {
    id?: string; // Firestore document ID will be set automatically
    userId: string; // Firebase Auth User UID
    userPhoneNumber: string; // User's actual phone number (from Firebase Auth or profile)
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

// Old localStorage functions are removed.
// New functions will interact with Firestore. Example (to be implemented later):
// export const addInvestmentToFirestore = async (investment: InvestmentSubmissionFirestore) => { /* ... */ };
// export const getInvestmentsForUserFromFirestore = async (userId: string) => { /* ... */ };
// export const getAllPendingInvestmentsFromFirestore = async () => { /* ... */ };
// export const updateInvestmentStatusInFirestore = async (docId: string, status: string, details: any) => { /* ... */ };

export {}; // Keep as a module
