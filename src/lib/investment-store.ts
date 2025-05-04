
'use client'; // Indicate this runs client-side for localStorage access

import type { Plan } from '@/components/investment-plans';
import { TrendingUp, Zap, Gem, Crown, Milestone } from 'lucide-react'; // Import icons

// Define the structure for investment submission data, extending the Plan
export interface InvestmentSubmission extends Omit<Plan, 'icon' | 'badge' | 'primary' | 'investmentRange' > {
    id?: string; // Optional ID, assigned on storage
    userId: string;
    userName: string;
    investmentAmount: number; // The actual amount invested by the user
    transactionProofDataUrl: string; // Store image as base64 data URL
    submissionDate: string; // ISO string date
    status: 'pending' | 'approved' | 'rejected';
    approvalDate?: string | null; // ISO string date when approved
    rejectionReason?: string | null; // Reason for rejection
    // Re-include icon name or a way to map it back if needed on dashboard/dev-dashboard
    iconName: string;
    referralBonusPercent?: number; // Optional: Bonus percentage from referrals at time of approval
}

// --- Helper Functions ---
const PENDING_KEY = 'rupay_pending_investments';
const APPROVED_KEY = 'rupay_approved_investments';

// Function to get the icon component based on its name
const getIconComponent = (iconName: string): React.ElementType => {
    switch (iconName) {
        case 'TrendingUp': return TrendingUp;
        case 'Zap': return Zap;
        case 'Gem': return Gem;
        case 'Crown': return Crown;
        case 'Milestone': return Milestone;
        default: return TrendingUp; // Default icon
    }
};


// Helper to safely get data from localStorage
const getFromLocalStorage = <T>(key: string): T[] => {
    if (typeof window === 'undefined') {
        return []; // Return empty array if on server-side
    }
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return [];
    }
};

// Helper to safely set data to localStorage
const setToLocalStorage = <T>(key: string, data: T[]): void => {
    if (typeof window === 'undefined') {
        return; // Do nothing if on server-side
    }
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};


// --- Store Functions ---

/**
 * Adds a new investment submission to the pending list.
 * Assigns a unique ID.
 */
export const addPendingInvestment = async (submission: Omit<InvestmentSubmission, 'id' | 'icon'> & {icon: React.ElementType}): Promise<void> => {
    return new Promise((resolve) => {
        const pending = getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
        const newSubmission: InvestmentSubmission = {
            ...submission,
            id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            iconName: submission.icon.displayName || submission.icon.name || 'TrendingUp', // Store icon name
            referralBonusPercent: 0, // Initialize referral bonus
        };
        pending.push(newSubmission);
        setToLocalStorage(PENDING_KEY, pending);
         console.log("Added pending investment:", newSubmission);
        resolve();
    });
};

/**
 * Retrieves all pending investment submissions.
 */
export const getAllPendingInvestments = (): InvestmentSubmission[] => {
    return getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
};

/**
 * Retrieves a specific pending investment by ID.
 */
export const getPendingInvestmentById = (id: string): InvestmentSubmission | undefined => {
    const pending = getAllPendingInvestments();
    return pending.find(sub => sub.id === id);
};


/**
 * Retrieves the pending investment for a specific user.
 * Assumes one pending investment per user for simplicity.
 */
export const getPendingInvestmentForUser = (userId: string): InvestmentSubmission | null => {
    const pending = getAllPendingInvestments();
    const investment = pending.find(sub => sub.userId === userId);
     // Add icon component back when retrieving
     if (investment) {
         return { ...investment, icon: getIconComponent(investment.iconName) };
     }
     return null;
};


/**
 * Approves a pending investment: moves it from pending to approved and sets approval date.
 * TODO: Implement logic to calculate actual referral bonus here.
 */
export const approveInvestment = async (submissionId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        let pending = getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
        const approved = getFromLocalStorage<InvestmentSubmission>(APPROVED_KEY);

        const index = pending.findIndex(sub => sub.id === submissionId);
        if (index === -1) {
             console.error("Investment not found in pending:", submissionId);
             return reject(new Error('Pending investment not found'));
        }

        const [submissionToApprove] = pending.splice(index, 1); // Remove from pending

        // --- Referral Bonus Calculation Placeholder ---
        // Replace this with actual logic to check referred users
        // and calculate the bonus percentage based on active investments
        // of those referred users.
        const calculatedReferralBonus = 0; // Placeholder: Assume 0 for now
        // --- End Placeholder ---

        submissionToApprove.status = 'approved';
        submissionToApprove.approvalDate = new Date().toISOString();
        submissionToApprove.referralBonusPercent = calculatedReferralBonus; // Assign calculated bonus


        approved.push(submissionToApprove); // Add to approved

        setToLocalStorage(PENDING_KEY, pending);
        setToLocalStorage(APPROVED_KEY, approved);
         console.log("Approved investment:", submissionToApprove);
        resolve();
    });
};

/**
 * Rejects a pending investment: Removes it from pending (or moves to a rejected list).
 * For simplicity, this example removes it. Consider moving to a 'rejected' list
 * if you need to track rejected submissions.
 */
export const rejectInvestment = async (submissionId: string, reason: string = "Rejected by admin"): Promise<void> => {
    return new Promise((resolve, reject) => {
        let pending = getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
        const initialLength = pending.length;
        pending = pending.filter(sub => sub.id !== submissionId);

        if (pending.length === initialLength) {
            console.error("Investment not found for rejection:", submissionId);
            return reject(new Error('Pending investment not found for rejection'));
        }

        // Optionally, add to a rejected list here instead of just removing
        // rejectedSubmission.status = 'rejected';
        // rejectedSubmission.rejectionReason = reason;
        // const rejected = getFromLocalStorage('rupay_rejected_investments');
        // rejected.push(rejectedSubmission);
        // setToLocalStorage('rupay_rejected_investments', rejected);

        setToLocalStorage(PENDING_KEY, pending);
         console.log("Rejected investment:", submissionId);
        resolve();
    });
};


/**
 * Retrieves the currently active/approved investment for a specific user.
 * Assumes only one active investment per user for simplicity.
 */
export const getApprovedInvestmentForUser = (userId: string): InvestmentSubmission | null => {
    const approved = getFromLocalStorage<InvestmentSubmission>(APPROVED_KEY);
    const investment = approved.find(sub => sub.userId === userId && sub.status === 'approved');
     // Add icon component back when retrieving
    if (investment) {
         return { ...investment, icon: getIconComponent(investment.iconName) };
    }
    return null;
};

/**
 * Retrieves all approved investments (for potential admin views).
 */
export const getAllApprovedInvestments = (): InvestmentSubmission[] => {
    return getFromLocalStorage<InvestmentSubmission>(APPROVED_KEY);
};
