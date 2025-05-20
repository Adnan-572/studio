
// This file previously handled localStorage for withdrawal requests.
// With Firebase, this logic will be moved to Firestore interactions.
// For now, we'll keep the type definitions and clear out old functions.

export interface WithdrawalRequestFirestore {
    id?: string; // Firestore document ID
    userId: string; // Firebase Auth User UID
    userPhoneNumber: string; // User's phone number
    investmentId: string; // Firestore ID of the InvestmentSubmissionFirestore document
    investmentTitle: string; 
    withdrawalAmount: number; 
    paymentMethod: 'easypaisa' | 'jazzcash';
    accountNumber: string; 
    requestDate: string; // ISO string
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    processedDate?: string | null; 
    rejectionReason?: string | null; 
    transactionId?: string | null; // For admin to enter after payment
}

// Old localStorage functions are removed.
// New functions will interact with Firestore. Example (to be implemented later):
// export const addWithdrawalRequestToFirestore = async (request: WithdrawalRequestFirestore) => { /* ... */ };
// export const getWithdrawalRequestsFromFirestore = async () => { /* ... */ };
// export const updateWithdrawalStatusInFirestore = async (docId: string, status: string, details: any) => { /* ... */ };

export {}; // Keep as a module
