
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc, orderBy } from 'firebase/firestore';

export interface WithdrawalRequestFirestore {
    id?: string; 
    userId: string; 
    userName: string; 
    userPhoneNumber: string;
    investmentId: string; 
    investmentTitle: string; 
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
    console.error("Firestore not initialized");
    return null;
  }
  try {
    const q = query(
      collection(db, "withdrawals"), 
      where("investmentId", "==", investmentId),
      where("userId", "==", userId),
      orderBy("requestDate", "desc"), // Get the latest request if multiple somehow exist
      // limit(1) // if you only ever expect one
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // Assuming one withdrawal request per investment for a user. If multiple, take the first.
      const docData = querySnapshot.docs[0].data();
      return { id: querySnapshot.docs[0].id, ...docData } as WithdrawalRequestFirestore;
    }
    return null;
  } catch (error) {
    console.error("Error fetching withdrawal request for investment: ", error);
    return null;
  }
};

// For User Dashboard: Adds a new withdrawal request
export const addWithdrawalRequestToFirestore = async (request: Omit<WithdrawalRequestFirestore, 'id' | 'status' | 'requestDate' | 'processedDate' | 'rejectionReason' | 'transactionId'>): Promise<WithdrawalRequestFirestore> => {
  if (!db) {
    console.error("Firestore not initialized");
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
    console.error("Firestore not initialized");
    return [];
  }
  try {
    const q = query(collection(db, "withdrawals"), where("status", "==", "pending"), orderBy("requestDate", "asc"));
    const querySnapshot = await getDocs(q);
    const requests: WithdrawalRequestFirestore[] = [];
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as WithdrawalRequestFirestore);
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
    console.error("Firestore not initialized");
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
      updateData.rejectionReason = null;
    }
    if (status === 'rejected' && details.rejectionReason) {
      updateData.rejectionReason = details.rejectionReason;
      updateData.transactionId = null;
    }
    await updateDoc(requestRef, updateData);
  } catch (error) {
    console.error("Error updating withdrawal status: ", error);
    throw error;
  }
};


// --- Placeholder functions kept for compatibility during transition if any part still uses them ---
// --- These should ideally be removed once full Firestore migration is confirmed stable ---

export const getPendingWithdrawalRequests = (): WithdrawalRequestFirestore[] => {
  console.warn("Legacy getPendingWithdrawalRequests (non-Firestore) called. Use getPendingWithdrawalRequestsFromFirestore.");
  return []; // Return empty or fetch from a mock if needed during transition
};

export const updateWithdrawalStatus = async (
    requestId: string,
    status: 'completed' | 'rejected',
    details: { transactionId?: string; rejectionReason?: string }
): Promise<void> => {
    console.warn(`Legacy updateWithdrawalStatus(${requestId}, ${status}) (non-Firestore) called. Use updateWithdrawalStatusInFirestore.`);
    // Mock successful promise
    return Promise.resolve();
};

export const addWithdrawalRequest = async (request: Omit<WithdrawalRequestFirestore, 'id' | 'status' | 'requestDate' | 'processedDate' | 'rejectionReason' | 'transactionId' >): Promise<WithdrawalRequestFirestore> => {
    console.warn("Legacy addWithdrawalRequest (non-Firestore) called. Use addWithdrawalRequestToFirestore.");
    // Return a mock request
    const newRequest: WithdrawalRequestFirestore = {
        ...request,
        id: `temp_wd_${Date.now()}`,
        status: 'pending',
        requestDate: Timestamp.now(), // Or new Date().toISOString() if previous type was string
    };
    return Promise.resolve(newRequest);
};

export const getWithdrawalRequestForInvestment = (investmentId: string, userId?: string): WithdrawalRequestFirestore | null => {
    console.warn(`Legacy getWithdrawalRequestForInvestment(${investmentId}, ${userId}) (non-Firestore) called. Use getWithdrawalRequestForInvestmentFromFirestore.`);
    return null;
};
