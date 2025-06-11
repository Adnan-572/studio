
import type { Plan as PlanUIDetails } from '@/components/investment-plans';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  Timestamp, 
  orderBy,
  addDoc,
  collectionGroup,
  writeBatch,
  getDoc // Added getDoc
} from 'firebase/firestore';

export interface UserPlanData {
  id?: string; // Firestore document ID of the plan investment itself

  // Denormalized user info for admin convenience & record keeping
  userId: string;
  userName: string; // Name used at the time of this specific investment
  userPhoneNumber: string; // Phone number used at the time of this specific investment

  // Plan details chosen by user / submitted
  planDefId: string; // From PlanUIDetails (e.g., "plan_basic_15d"), to link back to static plan definitions
  planTitle: string; // From PlanUIDetails (e.g., "Basic Plan")
  investmentAmount: number;
  transactionProofUrl: string;
  submissionDate: Timestamp;

  // Details from the core plan definition (from PlanUIDetails), stored at submission time
  // This "freezes" the plan terms for this specific investment
  baseDailyProfitMin: number; 
  baseDailyProfitMax: number; 
  durationInDays: number; 
  planIconName: string; 

  // Status and operational fields
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvalDate?: Timestamp | null;
  rejectionReason?: string | null;
  endDate?: Timestamp | null; // Calculated upon approval: approvalDate + durationInDays
  
  referralBonusAppliedPercent?: number; // If any referral bonus is active for this investment
}


// Adds a new investment proof/submission to the user's 'plans' subcollection
export const addInvestmentProofToUserPlans = async (
  userId: string,
  userName: string, // Current user's name
  userPhoneNumber: string, // Current user's phone
  planDetails: PlanUIDetails, // The chosen plan from UI
  investmentAmount: number,
  transactionProofUrl: string
): Promise<UserPlanData> => {
  if (!db) {
    console.error("Firestore not initialized for addInvestmentProofToUserPlans");
    throw new Error("Firestore not initialized");
  }
  try {
    const userPlansCollectionRef = collection(db, "users", userId, "plans");
    
    const newPlanData: Omit<UserPlanData, 'id'> = {
      userId,
      userName,
      userPhoneNumber,
      planDefId: planDetails.id,
      planTitle: planDetails.title,
      investmentAmount,
      transactionProofUrl,
      submissionDate: Timestamp.now(),
      baseDailyProfitMin: planDetails.dailyProfitMin,
      baseDailyProfitMax: planDetails.dailyProfitMax,
      durationInDays: planDetails.duration,
      planIconName: planDetails.iconName,
      status: 'pending',
      approvalDate: null,
      rejectionReason: null,
      endDate: null,
      referralBonusAppliedPercent: 0, // TODO: Implement referral bonus logic if needed
    };

    const docRef = await addDoc(userPlansCollectionRef, newPlanData);
    return { id: docRef.id, ...newPlanData } as UserPlanData;

  } catch (error) {
    console.error(`Error adding investment proof for user ${userId}:`, error);
    throw error;
  }
};

// Fetches all investment plans for a specific user
export const getUserPlans = async (userId: string): Promise<UserPlanData[]> => {
  if (!db) {
    console.error("Firestore not initialized for getUserPlans");
    return [];
  }
  try {
    const userPlansCollectionRef = collection(db, "users", userId, "plans");
    const q = query(userPlansCollectionRef, orderBy("submissionDate", "desc"));
    const querySnapshot = await getDocs(q);
    const plans: UserPlanData[] = [];
    querySnapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() } as UserPlanData);
    });
    return plans;
  } catch (error) {
    console.error(`Error fetching plans for user ${userId}:`, error);
    return [];
  }
};

// Fetches all submitted plans from all users for the admin dashboard
// Uses a collection group query
export const getAllSubmittedPlansForAdmin = async (): Promise<UserPlanData[]> => {
  if (!db) {
    console.error("Firestore not initialized for getAllSubmittedPlansForAdmin");
    return [];
  }
  try {
    const plansGroupRef = collectionGroup(db, 'plans');
    // Order by submission date globally. You might add more complex ordering or filtering.
    const q = query(plansGroupRef, orderBy('submissionDate', 'desc'));
    const querySnapshot = await getDocs(q);
    const allPlans: UserPlanData[] = [];
    querySnapshot.forEach((doc) => {
      // doc.ref.parent.parent.id gives the userId
      // but we should have userId already in the document due to denormalization
      allPlans.push({ id: doc.id, ...doc.data() } as UserPlanData);
    });
    return allPlans;
  } catch (error) {
    console.error("Error fetching all submitted plans for admin:", error);
    return [];
  }
};

// Approves a submitted plan for a user
export const approveSubmittedPlan = async (userId: string, planInvestmentId: string): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized for approveSubmittedPlan");
    throw new Error("Firestore not initialized");
  }
  try {
    const planDocRef = doc(db, "users", userId, "plans", planInvestmentId);
    const planDocSnap = await getDoc(planDocRef); // Changed to use getDoc
    
    if (!planDocSnap.exists()) { // Simpler check for document existence
        throw new Error(`Plan document ${planInvestmentId} not found for user ${userId}`);
    }
    const planData = planDocSnap.data() as UserPlanData; // Get data directly

    const approvalTime = Timestamp.now();
    const planEndDate = new Timestamp(
        approvalTime.seconds + (planData.durationInDays * 24 * 60 * 60),
        approvalTime.nanoseconds
    );

    await updateDoc(planDocRef, {
      status: 'approved',
      approvalDate: approvalTime,
      endDate: planEndDate,
      rejectionReason: null,
    });
  } catch (error) {
    console.error(`Error approving plan ${planInvestmentId} for user ${userId}:`, error);
    throw error;
  }
};

// Rejects a submitted plan for a user
export const rejectSubmittedPlan = async (userId: string, planInvestmentId: string, reason: string): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized for rejectSubmittedPlan");
    throw new Error("Firestore not initialized");
  }
  try {
    const planDocRef = doc(db, "users", userId, "plans", planInvestmentId);
    await updateDoc(planDocRef, {
      status: 'rejected',
      rejectionReason: reason,
      approvalDate: null,
      endDate: null,
    });
  } catch (error) {
    console.error(`Error rejecting plan ${planInvestmentId} for user ${userId}:`, error);
    throw error;
  }
};

// Marks an approved plan as "completed"
// This might be triggered by a cron job checking endDates or manually by an admin if needed.
// For now, the user dashboard can derive "completed" status if current date > endDate.
// Explicitly setting it can be useful for archival or specific triggers.
export const completeUserPlan = async (userId: string, planInvestmentId: string): Promise<void> => {
    if (!db) {
        console.error("Firestore not initialized for completeUserPlan");
        throw new Error("Firestore not initialized");
    }
    try {
        const planDocRef = doc(db, "users", userId, "plans", planInvestmentId);
        await updateDoc(planDocRef, {
            status: 'completed',
            // completionDate: Timestamp.now() // Optional: if you want to record exact completion time
        });
    } catch (error) {
        console.error(`Error completing plan ${planInvestmentId} for user ${userId}:`, error);
        throw error;
    }
};


// --- The following are original top-level investment functions, kept for reference ---
// --- or if any part of the app might still call them TEMPORARILY. ---
// --- NEW CODE SHOULD USE THE USER-CENTRIC FUNCTIONS ABOVE. ---

export interface InvestmentSubmissionFirestore {
    id?: string; 
    userId: string; 
    userName: string; 
    userPhoneNumber: string; 
    planId: string; // This was the PlanUIDetails.id
    planTitle: string;
    investmentAmount: number; 
    minInvestment: number; // from PlanUIDetails
    maxInvestment: number; // from PlanUIDetails
    dailyProfitMin: number; // from PlanUIDetails
    dailyProfitMax: number; // from PlanUIDetails
    duration: number; // from PlanUIDetails
    iconName: string; // from PlanUIDetails
    transactionProofUrl: string; 
    submissionDate: Timestamp; 
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approvalDate?: Timestamp | null; 
    rejectionReason?: string | null;
    completionDate?: Timestamp | null; 
    referralBonusPercent?: number;
}

export const getPendingInvestmentsFromFirestore = async (): Promise<InvestmentSubmissionFirestore[]> => {
  console.warn("Legacy getPendingInvestmentsFromFirestore called. Use getAllSubmittedPlansForAdmin and filter by status.");
  // Simulate by fetching all plans and filtering, then adapting to old structure
  const allUserPlans = await getAllSubmittedPlansForAdmin();
  return allUserPlans
    .filter(p => p.status === 'pending')
    .map(p => ({
        id: p.id,
        userId: p.userId,
        userName: p.userName,
        userPhoneNumber: p.userPhoneNumber,
        planId: p.planDefId,
        planTitle: p.planTitle,
        investmentAmount: p.investmentAmount,
        minInvestment: 0, // Placeholder - old structure had this
        maxInvestment: 0, // Placeholder
        dailyProfitMin: p.baseDailyProfitMin,
        dailyProfitMax: p.baseDailyProfitMax,
        duration: p.durationInDays,
        iconName: p.planIconName,
        transactionProofUrl: p.transactionProofUrl,
        submissionDate: p.submissionDate,
        status: p.status,
        approvalDate: p.approvalDate,
        rejectionReason: p.rejectionReason,
    } as InvestmentSubmissionFirestore));
};

export const getApprovedInvestmentsFromFirestore = async (): Promise<InvestmentSubmissionFirestore[]> => {
  console.warn("Legacy getApprovedInvestmentsFromFirestore called. Use getAllSubmittedPlansForAdmin and filter by status.");
  const allUserPlans = await getAllSubmittedPlansForAdmin();
  return allUserPlans
    .filter(p => p.status === 'approved' || p.status === 'completed')
    .map(p => ({
        id: p.id,
        userId: p.userId,
        userName: p.userName,
        userPhoneNumber: p.userPhoneNumber,
        planId: p.planDefId,
        planTitle: p.planTitle,
        investmentAmount: p.investmentAmount,
        minInvestment: 0, // Placeholder
        maxInvestment: 0, // Placeholder
        dailyProfitMin: p.baseDailyProfitMin,
        dailyProfitMax: p.baseDailyProfitMax,
        duration: p.durationInDays,
        iconName: p.planIconName,
        transactionProofUrl: p.transactionProofUrl,
        submissionDate: p.submissionDate,
        status: p.status,
        approvalDate: p.approvalDate,
        rejectionReason: p.rejectionReason,
    } as InvestmentSubmissionFirestore));
};

export const getActiveInvestmentsForUserFromFirestore = async (userId: string): Promise<InvestmentSubmissionFirestore[]> => {
  console.warn("Legacy getActiveInvestmentsForUserFromFirestore called. Use getUserPlans and adapt.");
  const userPlans = await getUserPlans(userId);
  return userPlans
    .filter(p => p.status === 'approved' || p.status === 'completed' || p.status === 'pending') // User dashboard shows pending too
    .map(p => ({
        id: p.id,
        userId: p.userId,
        userName: p.userName,
        userPhoneNumber: p.userPhoneNumber,
        planId: p.planDefId,
        planTitle: p.planTitle,
        investmentAmount: p.investmentAmount,
        minInvestment: 0, // Placeholder
        maxInvestment: 0, // Placeholder
        dailyProfitMin: p.baseDailyProfitMin,
        dailyProfitMax: p.baseDailyProfitMax,
        duration: p.durationInDays,
        iconName: p.planIconName,
        transactionProofUrl: p.transactionProofUrl,
        submissionDate: p.submissionDate,
        status: p.status,
        approvalDate: p.approvalDate,
        rejectionReason: p.rejectionReason,
         // Map durationInDays to duration for compatibility with UserInvestmentDashboard
    } as InvestmentSubmissionFirestore));
};


export const approveInvestmentInFirestore = async (submissionId: string): Promise<void> => {
  console.warn(`Legacy approveInvestmentInFirestore(${submissionId}) called. This ID is now relative to a subcollection. Refactor call site.`);
  // This function is problematic because submissionId was a top-level ID.
  // The caller needs to provide userId and the planInvestmentId (which was submissionId).
  // For now, this will likely fail or do nothing.
  throw new Error("Legacy approveInvestmentInFirestore called with top-level ID. Requires refactoring to provide userId and planInvestmentId.");
};

export const rejectInvestmentInFirestore = async (submissionId: string, reason: string = "Rejected by admin"): Promise<void> => {
  console.warn(`Legacy rejectInvestmentInFirestore(${submissionId}) called. This ID is now relative to a subcollection. Refactor call site.`);
  throw new Error("Legacy rejectInvestmentInFirestore called with top-level ID. Requires refactoring to provide userId and planInvestmentId.");
};

    

    