
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc, orderBy, limit } from 'firebase/firestore';

export interface WithdrawalRequestFirestore {
    id?: string; 
    userId: string; 
    userName: string; // Denormalized for admin convenience
    userPhoneNumber: string; // Denormalized for admin convenience
    investmentId: string; // ID of the UserPlanData document this withdrawal is for
    investmentTitle: string; // Denormalized from UserPlanData
    withdrawalAmount: number; 
    paymentMethod: 'easypaisa' | 'jazzcash';
    accountNumber: string; 
    requestDate: Timestamp; // Firestore Timestamp
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    processedDate?: Timestamp | null; 
    rejectionReason?: string | null; 
    transactionId?: string | null; 
}

// For User Dashboard: Fetches withdrawal request for a specific completed investment
export const getWithdrawalRequestForInvestmentFromFirestore = async (investmentId: string, userId: string): Promise<WithdrawalRequestFirestore | null> => {
  if (!db) {
    console.error("Firestore not initialized for getWithdrawalRequestForInvestmentFromFirestore");
    return null;
  }
  try {
    const q = query(
      collection(db, "withdrawals"), 
      where("investmentId", "==", investmentId),
      where("userId", "==", userId),
      orderBy("requestDate", "desc"), 
      limit(1) // Assuming only one active/pending request per investment
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      return { id: querySnapshot.docs[0].id, ...docData } as WithdrawalRequestFirestore;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching withdrawal request for investment ${investmentId}, user ${userId}: `, error);
    return null;
  }
};

// For User Dashboard: Adds a new withdrawal request
export const addWithdrawalRequestToFirestore = async (request: Omit<WithdrawalRequestFirestore, 'id' | 'status' | 'requestDate' | 'processedDate' | 'rejectionReason' | 'transactionId'>): Promise<WithdrawalRequestFirestore> => {
  if (!db) {
    console.error("Firestore not initialized for addWithdrawalRequestToFirestore");
    throw new Error("Firestore not initialized");
  }
  try {
    const newRequestData = {
      ...request,
      requestDate: Timestamp.now(),
      status: 'pending' as 'pending',
      processedDate: null,
      rejectionReason: null,
      transactionId: null,
    };
    const docRef = await addDoc(collection(db, "withdrawals"), newRequestData);
    return { id: docRef.id, ...newRequestData } as WithdrawalRequestFirestore;
  } catch (error) {
    console.error("Error adding withdrawal request: ", error);
    throw error;
  }
};

// For Developer Dashboard: Fetches all pending withdrawal requests
export const getPendingWithdrawalRequestsFromFirestore = async (): Promise<WithdrawalRequestFirestore[]> => {
  if (!db) {
    console.error("Firestore not initialized for getPendingWithdrawalRequestsFromFirestore");
    return [];
  }
  try {
    const q = query(collection(db, "withdrawals"), where("status", "==", "pending"), orderBy("requestDate", "asc"));
    const querySnapshot = await getDocs(q);
    const requests: WithdrawalRequestFirestore[] = [];
    querySnapshot.forEach((docSnap) => {
      requests.push({ id: docSnap.id, ...docSnap.data() } as WithdrawalRequestFirestore);
    });
    return requests;
  } catch (error) {
    console.error("Error fetching pending withdrawal requests: ", error);
    return [];
  }
};

// For Developer Dashboard: Updates status of a withdrawal request
export const updateWithdrawalStatusInFirestore = async (
  requestId: string,
  status: 'completed' | 'rejected',
  details: { transactionId?: string; rejectionReason?: string }
): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized for updateWithdrawalStatusInFirestore");
    throw new Error("Firestore not initialized");
  }
  try {
    const requestRef = doc(db, "withdrawals", requestId);
    const updateData: Partial<WithdrawalRequestFirestore> = {
      status: status,
      processedDate: Timestamp.now(),
    };
    if (status === 'completed' && details.transactionId) {
      updateData.transactionId = details.transactionId;
      updateData.rejectionReason = null; // Clear rejection reason if completing
    }
    if (status === 'rejected' && details.rejectionReason) {
      updateData.rejectionReason = details.rejectionReason;
      updateData.transactionId = null; // Clear transaction ID if rejecting
    }
    await updateDoc(requestRef, updateData);
  } catch (error) {
    console.error(`Error updating withdrawal status for request ${requestId}: `, error);
    throw error;
  }
};
