
'use client'; 

import type { Plan } from '@/components/investment-plans'; // Assuming Plan interface is still relevant for plan details
import { TrendingUp, Zap, Gem, Crown, Milestone } from 'lucide-react';

// Structure for investment submission, now directly takes userName and userId (phone number)
export interface InvestmentSubmission extends Omit<Plan, 'icon' | 'badge' | 'primary' | 'investmentRange' > {
    id?: string; 
    userId: string; // This will be the user's phone number
    userName: string; // User's provided name
    investmentAmount: number; 
    transactionProofDataUrl: string; 
    submissionDate: string; 
    status: 'pending' | 'approved' | 'rejected';
    approvalDate?: string | null; 
    rejectionReason?: string | null;
    iconName: string; 
    referralBonusPercent?: number;
}

const PENDING_KEY = 'rupay_pending_investments';
const APPROVED_KEY = 'rupay_approved_investments';

const getIconComponent = (iconName: string): React.ElementType => {
    switch (iconName) {
        case 'TrendingUp': return TrendingUp;
        case 'Zap': return Zap;
        case 'Gem': return Gem;
        case 'Crown': return Crown;
        case 'Milestone': return Milestone;
        default: return TrendingUp;
    }
};

const getFromLocalStorage = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return [];
    }
};

const setToLocalStorage = <T>(key: string, data: T[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};

export const addPendingInvestment = async (submission: Omit<InvestmentSubmission, 'id' | 'icon'> & {icon: React.ElementType}): Promise<void> => {
    return new Promise((resolve) => {
        const pending = getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
        const newSubmission: InvestmentSubmission = {
            ...submission,
            id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            iconName: submission.icon.displayName || submission.icon.name || 'TrendingUp',
            referralBonusPercent: 0,
        };
        pending.push(newSubmission);
        setToLocalStorage(PENDING_KEY, pending);
        console.log("Added pending investment (no login):", newSubmission);
        resolve();
    });
};

export const getAllPendingInvestments = (): InvestmentSubmission[] => {
    return getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
};

export const getPendingInvestmentById = (id: string): InvestmentSubmission | undefined => {
    return getAllPendingInvestments().find(sub => sub.id === id);
};

// userId is now phone number
export const getPendingInvestmentForUser = (userId: string): InvestmentSubmission | null => {
    const pending = getAllPendingInvestments();
    const investment = pending.find(sub => sub.userId === userId);
     if (investment) {
         return { ...investment, icon: getIconComponent(investment.iconName) };
     }
     return null;
};

export const approveInvestment = async (submissionId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        let pending = getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
        const approved = getFromLocalStorage<InvestmentSubmission>(APPROVED_KEY);
        const index = pending.findIndex(sub => sub.id === submissionId);

        if (index === -1) {
             console.error("Investment not found in pending:", submissionId);
             return reject(new Error('Pending investment not found'));
        }
        const [submissionToApprove] = pending.splice(index, 1);
        
        // Simple referral bonus logic (placeholder)
        // In a no-login system, referral tracking is more complex.
        // This might be tied to the submitting user's phone if they were referred by another phone.
        const calculatedReferralBonus = submissionToApprove.userName.toLowerCase().includes("referral") ? 0.5 : 0; 

        submissionToApprove.status = 'approved';
        submissionToApprove.approvalDate = new Date().toISOString();
        submissionToApprove.referralBonusPercent = calculatedReferralBonus;
        approved.push(submissionToApprove);
        setToLocalStorage(PENDING_KEY, pending);
        setToLocalStorage(APPROVED_KEY, approved);
        console.log("Approved investment (no login):", submissionToApprove);
        resolve();
    });
};

export const rejectInvestment = async (submissionId: string, reason: string = "Rejected by admin"): Promise<void> => {
    return new Promise((resolve, reject) => {
        let pending = getFromLocalStorage<InvestmentSubmission>(PENDING_KEY);
        const initialLength = pending.length;
        pending = pending.filter(sub => sub.id !== submissionId);

        if (pending.length === initialLength) {
            console.error("Investment not found for rejection:", submissionId);
            return reject(new Error('Pending investment not found for rejection'));
        }
        setToLocalStorage(PENDING_KEY, pending);
        console.log("Rejected investment (no login):", submissionId);
        resolve();
    });
};

// userId is now phone number
export const getApprovedInvestmentForUser = (userId: string): InvestmentSubmission | null => {
    const approved = getFromLocalStorage<InvestmentSubmission>(APPROVED_KEY);
    const investment = approved.find(sub => sub.userId === userId && sub.status === 'approved');
    if (investment) {
         return { ...investment, icon: getIconComponent(investment.iconName) };
    }
    return null;
};

export const getAllApprovedInvestments = (): InvestmentSubmission[] => {
    return getFromLocalStorage<InvestmentSubmission>(APPROVED_KEY);
};
