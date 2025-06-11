
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
  getDoc,
  runTransaction
} from 'firebase/firestore';
import type { UserProfile } from '@/contexts/auth-context'; // Import UserProfile

export interface UserPlanData {
  id?: string; 
  userId: string;
  userName: string; 
  userPhoneNumber: string; 
  planDefId: string; 
  planTitle: string; 
  investmentAmount: number;
  transactionProofUrl: string;
  submissionDate: Timestamp;
  baseDailyProfitMin: number; 
  baseDailyProfitMax: number; 
  durationInDays: number; 
  planIconName: string; 
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvalDate?: Timestamp | null;
  rejectionReason?: string | null;
  endDate?: Timestamp | null; 
  referralBonusAppliedPercent: number; // Changed: Ensure this is not optional, default to 0
}

export const addInvestmentProofToUserPlans = async (
  userId: string,
  userName: string, 
  userPhoneNumber: string, 
  planDetails: PlanUIDetails, 
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
      referralBonusAppliedPercent: 0, // Default to 0
    };

    const docRef = await addDoc(userPlansCollectionRef, newPlanData);
    return { id: docRef.id, ...newPlanData } as UserPlanData;

  } catch (error) {
    console.error(`Error adding investment proof for user ${userId}:`, error);
    throw error;
  }
};

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
      const data = doc.data();
      plans.push({ 
        id: doc.id, 
        ...data,
        // Ensure referralBonusAppliedPercent has a default if missing from old data
        referralBonusAppliedPercent: data.referralBonusAppliedPercent ?? 0,
      } as UserPlanData);
    });
    return plans;
  } catch (error) {
    console.error(`Error fetching plans for user ${userId}:`, error);
    return [];
  }
};

export const getAllSubmittedPlansForAdmin = async (): Promise<UserPlanData[]> => {
  if (!db) {
    console.error("Firestore not initialized for getAllSubmittedPlansForAdmin");
    return [];
  }
  try {
    const plansGroupRef = collectionGroup(db, 'plans');
    const q = query(plansGroupRef, orderBy('submissionDate', 'desc'));
    const querySnapshot = await getDocs(q);
    const allPlans: UserPlanData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allPlans.push({ 
        id: doc.id, 
        ...data,
        referralBonusAppliedPercent: data.referralBonusAppliedPercent ?? 0,
      } as UserPlanData);
    });
    return allPlans;
  } catch (error) {
    console.error("Error fetching all submitted plans for admin:", error);
    return [];
  }
};

export const approveSubmittedPlan = async (userIdOfPlanOwner: string, planInvestmentId: string): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized for approveSubmittedPlan");
    throw new Error("Firestore not initialized");
  }
  
  const planDocRef = doc(db, "users", userIdOfPlanOwner, "plans", planInvestmentId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const planDocSnap = await transaction.get(planDocRef);
      if (!planDocSnap.exists()) {
        throw new Error(`Plan document ${planInvestmentId} not found for user ${userIdOfPlanOwner}`);
      }
      const planData = planDocSnap.data() as UserPlanData;

      const approvalTime = Timestamp.now();
      const planEndDate = new Timestamp(
          approvalTime.seconds + (planData.durationInDays * 24 * 60 * 60),
          approvalTime.nanoseconds
      );

      transaction.update(planDocRef, {
        status: 'approved',
        approvalDate: approvalTime,
        endDate: planEndDate,
        rejectionReason: null,
      });

      // --- Referral Bonus Logic ---
      // Check if the plan owner (userIdOfPlanOwner) was referred by someone
      const planOwnerProfileRef = doc(db, "users", userIdOfPlanOwner);
      const planOwnerProfileSnap = await transaction.get(planOwnerProfileRef);

      if (planOwnerProfileSnap.exists()) {
        const planOwnerProfile = planOwnerProfileSnap.data() as UserProfile;
        const referrerUserId = planOwnerProfile.referredByUserId;

        if (referrerUserId) {
          // The plan owner was referred. Now, find an active plan of the referrer.
          const referrerPlansCollectionRef = collection(db, "users", referrerUserId, "plans");
          const activeReferrerPlansQuery = query(
            referrerPlansCollectionRef,
            where("status", "==", "approved"), // Only 'approved' plans can receive bonus
            orderBy("approvalDate", "asc"), // Apply to oldest active plan first, or any one.
            // limit(1) // If bonus applies to only one plan
          );
          
          const activeReferrerPlansSnap = await getDocs(activeReferrerPlansQuery); // Use getDocs directly, not in transaction for reads if possible

          if (!activeReferrerPlansSnap.empty) {
            // For simplicity, apply to the first active plan found.
            // Could be enhanced to choose a specific plan or apply to all.
            activeReferrerPlansSnap.forEach(referrerPlanDoc => {
                const referrerPlanRef = doc(db, "users", referrerUserId, "plans", referrerPlanDoc.id);
                const currentBonus = referrerPlanDoc.data().referralBonusAppliedPercent ?? 0;
                // Add 1% bonus. Consider if there's a cap or if it's additive.
                const newBonus = currentBonus + 1; 
                
                transaction.update(referrerPlanRef, {
                    referralBonusAppliedPercent: newBonus
                });
                console.log(`Applied 1% referral bonus to plan ${referrerPlanDoc.id} for referrer ${referrerUserId}. New bonus: ${newBonus}%`);
            });
          } else {
            console.log(`Referrer ${referrerUserId} has no active plans to apply bonus to.`);
          }
        }
      } else {
        console.warn(`User profile for ${userIdOfPlanOwner} not found. Cannot check for referral.`);
      }
    });
    console.log(`Plan ${planInvestmentId} for user ${userIdOfPlanOwner} approved and referral check completed.`);
  } catch (error) {
    console.error(`Error in transaction for approving plan ${planInvestmentId} for user ${userIdOfPlanOwner}:`, error);
    throw error;
  }
};

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

export const completeUserPlan = async (userId: string, planInvestmentId: string): Promise<void> => {
    if (!db) {
        console.error("Firestore not initialized for completeUserPlan");
        throw new Error("Firestore not initialized");
    }
    try {
        const planDocRef = doc(db, "users", userId, "plans", planInvestmentId);
        await updateDoc(planDocRef, {
            status: 'completed',
        });
    } catch (error) {
        console.error(`Error completing plan ${planInvestmentId} for user ${userId}:`, error);
        throw error;
    }
};


// Legacy functions (kept for reference, should be phased out)
export interface InvestmentSubmissionFirestore {
    id?: string; 
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
    submissionDate: Timestamp; 
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approvalDate?: Timestamp | null; 
    rejectionReason?: string | null;
    completionDate?: Timestamp | null; 
    referralBonusPercent?: number; // This was on the old model
}
// ... (other legacy functions remain unchanged but should be reviewed for removal/refactoring)
export const getPendingInvestmentsFromFirestore = async (): Promise<InvestmentSubmissionFirestore[]> => {
  console.warn("Legacy getPendingInvestmentsFromFirestore called. Use getAllSubmittedPlansForAdmin and filter by status.");
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
        minInvestment: 0, 
        maxInvestment: 0, 
        dailyProfitMin: p.baseDailyProfitMin,
        dailyProfitMax: p.baseDailyProfitMax,
        duration: p.durationInDays,
        iconName: p.planIconName,
        transactionProofUrl: p.transactionProofUrl,
        submissionDate: p.submissionDate,
        status: p.status,
        approvalDate: p.approvalDate,
        rejectionReason: p.rejectionReason,
        referralBonusPercent: p.referralBonusAppliedPercent, // map new field to old
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
        minInvestment: 0, 
        maxInvestment: 0, 
        dailyProfitMin: p.baseDailyProfitMin,
        dailyProfitMax: p.baseDailyProfitMax,
        duration: p.durationInDays,
        iconName: p.planIconName,
        transactionProofUrl: p.transactionProofUrl,
        submissionDate: p.submissionDate,
        status: p.status,
        approvalDate: p.approvalDate,
        rejectionReason: p.rejectionReason,
        referralBonusPercent: p.referralBonusAppliedPercent,
    } as InvestmentSubmissionFirestore));
};

export const getActiveInvestmentsForUserFromFirestore = async (userId: string): Promise<InvestmentSubmissionFirestore[]> => {
  console.warn("Legacy getActiveInvestmentsForUserFromFirestore called. Use getUserPlans and adapt.");
  const userPlans = await getUserPlans(userId);
  return userPlans
    .filter(p => p.status === 'approved' || p.status === 'completed' || p.status === 'pending') 
    .map(p => ({
        id: p.id,
        userId: p.userId,
        userName: p.userName,
        userPhoneNumber: p.userPhoneNumber,
        planId: p.planDefId,
        planTitle: p.planTitle,
        investmentAmount: p.investmentAmount,
        minInvestment: 0, 
        maxInvestment: 0, 
        dailyProfitMin: p.baseDailyProfitMin,
        dailyProfitMax: p.baseDailyProfitMax,
        duration: p.durationInDays,
        iconName: p.planIconName,
        transactionProofUrl: p.transactionProofUrl,
        submissionDate: p.submissionDate,
        status: p.status,
        approvalDate: p.approvalDate,
        rejectionReason: p.rejectionReason,
        referralBonusPercent: p.referralBonusAppliedPercent,
    } as InvestmentSubmissionFirestore));
};


export const approveInvestmentInFirestore = async (submissionId: string): Promise<void> => {
  console.warn(`Legacy approveInvestmentInFirestore(${submissionId}) called. This ID is now relative to a subcollection. Refactor call site.`);
  throw new Error("Legacy approveInvestmentInFirestore called with top-level ID. Requires refactoring to provide userId and planInvestmentId.");
};

export const rejectInvestmentInFirestore = async (submissionId: string, reason: string = "Rejected by admin"): Promise<void> => {
  console.warn(`Legacy rejectInvestmentInFirestore(${submissionId}) called. This ID is now relative to a subcollection. Refactor call site.`);
  throw new Error("Legacy rejectInvestmentInFirestore called with top-level ID. Requires refactoring to provide userId and planInvestmentId.");
};
