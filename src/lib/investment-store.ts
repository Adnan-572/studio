
import type { Plan as PlanUIDetails } from '@/components/investment-plans';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';

export interface InvestmentSubmissionFirestore {
    id?: string; // Firestore document ID
    userId: string; 
    userName: string; 
    userPhoneNumber: string; 
    planId: string;
    planTitle: string;
    investmentAmount: number; 
    minInvestment: number;
    maxInvestment: number;
    dailyProfitMin: number;
    dailyProfitMax: number;
    duration: number;
    iconName: string;
    transactionProofUrl: string; 
    submissionDate: Timestamp; // Firestore Timestamp for submission
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approvalDate?: Timestamp | null; // Firestore Timestamp for approval
    rejectionReason?: string | null;
    completionDate?: Timestamp | null; 
    referralBonusPercent?: number;
}

// Fetches pending investments for the developer dashboard
export const getPendingInvestmentsFromFirestore = async (): Promise<InvestmentSubmissionFirestore[]> => {
  if (!db) {
    console.error("Firestore not initialized");
    return [];
  }
  try {
    const q = query(collection(db, "investments"), where("status", "==", "pending"), orderBy("submissionDate", "desc"));
    const querySnapshot = await getDocs(q);
    const investments: InvestmentSubmissionFirestore[] = [];
    querySnapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() } as InvestmentSubmissionFirestore);
    });
    return investments;
  } catch (error) {
    console.error("Error fetching pending investments: ", error);
    return [];
  }
};

// Fetches approved (active or completed) investments for the developer dashboard
export const getApprovedInvestmentsFromFirestore = async (): Promise<InvestmentSubmissionFirestore[]> => {
  if (!db) {
    console.error("Firestore not initialized");
    return [];
  }
  try {
    // Fetching 'approved' and 'completed' as they were once approved.
    const q = query(
      collection(db, "investments"), 
      where("status", "in", ["approved", "completed"]),
      orderBy("approvalDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    const investments: InvestmentSubmissionFirestore[] = [];
    querySnapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() } as InvestmentSubmissionFirestore);
    });
    return investments;
  } catch (error) {
    console.error("Error fetching approved investments: ", error);
    return [];
  }
};


export const approveInvestmentInFirestore = async (submissionId: string): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized");
    throw new Error("Firestore not initialized");
  }
  try {
    const investmentRef = doc(db, "investments", submissionId);
    await updateDoc(investmentRef, {
      status: 'approved',
      approvalDate: Timestamp.now() 
    });
  } catch (error) {
    console.error("Error approving investment: ", error);
    throw error;
  }
};

export const rejectInvestmentInFirestore = async (submissionId: string, reason: string = "Rejected by admin"): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized");
    throw new Error("Firestore not initialized");
  }
  try {
    const investmentRef = doc(db, "investments", submissionId);
    await updateDoc(investmentRef, {
      status: 'rejected',
      rejectionReason: reason,
      approvalDate: null, // Clear approval date if any
    });
  } catch (error) {
    console.error("Error rejecting investment: ", error);
    throw error;
  }
};

// Fetches active investments for a specific user for their dashboard
export const getActiveInvestmentsForUserFromFirestore = async (userId: string): Promise<InvestmentSubmissionFirestore[]> => {
  if (!db) {
    console.error("Firestore not initialized");
    return [];
  }
  try {
    // An investment is "active" if its status is 'approved' AND its calculated completionDate is in the future.
    // Or status is 'completed'.
    const q = query(
        collection(db, "investments"), 
        where("userId", "==", userId),
        where("status", "in", ["approved", "completed"]), // User dashboard shows both
        orderBy("submissionDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    const investments: InvestmentSubmissionFirestore[] = [];
    querySnapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() } as InvestmentSubmissionFirestore);
    });
    return investments;
  } catch (error) {
    console.error("Error fetching user's active investments: ", error);
    return [];
  }
};

// Placeholder functions to avoid breaking other parts of the app during refactor
// These were the names used in the old localStorage-based system.
// They should be replaced by Firestore-specific functions or removed if not needed.

export const getAllPendingInvestments = (): InvestmentSubmissionFirestore[] => {
  console.warn("getAllPendingInvestments is a placeholder. Use getPendingInvestmentsFromFirestore.");
  return [];
};

export const approveInvestment = async (submissionId: string): Promise<void> => {
  console.warn(`approveInvestment(${submissionId}) is a placeholder. Use approveInvestmentInFirestore.`);
  return Promise.resolve();
};

export const rejectInvestment = async (submissionId: string): Promise<void> => {
  console.warn(`rejectInvestment(${submissionId}) is a placeholder. Use rejectInvestmentInFirestore.`);
  return Promise.resolve();
};

export const getAllApprovedInvestments = (): InvestmentSubmissionFirestore[] => {
  console.warn("getAllApprovedInvestments is a placeholder. Use getApprovedInvestmentsFromFirestore.");
  return [];
};
