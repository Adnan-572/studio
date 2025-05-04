
'use client'; // Indicate this runs client-side for localStorage access

// Define the structure for a withdrawal request
export interface WithdrawalRequest {
    id: string; // Unique ID for the withdrawal request
    userId: string;
    userName: string;
    investmentId: string; // Link back to the completed investment
    investmentTitle: string; // Plan title for easy reference
    withdrawalAmount: number; // The amount requested (usually total return)
    paymentMethod: 'easypaisa' | 'jazzcash';
    accountNumber: string; // User's Easypaisa/JazzCash account number
    requestDate: string; // ISO string date when requested
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    processedDate?: string | null; // ISO string date when completed/rejected
    rejectionReason?: string | null; // Reason if rejected
    transactionId?: string | null; // Optional transaction ID from payment gateway after processing
}

// --- Helper Functions (similar to investment-store) ---
const WITHDRAWALS_KEY = 'rupay_withdrawal_requests';

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
 * Adds a new withdrawal request to the list.
 * Assigns a unique ID.
 */
export const addWithdrawalRequest = async (requestData: Omit<WithdrawalRequest, 'id'>): Promise<WithdrawalRequest> => {
    return new Promise((resolve) => {
        const requests = getFromLocalStorage<WithdrawalRequest>(WITHDRAWALS_KEY);
        const newRequest: WithdrawalRequest = {
            ...requestData,
            id: `wd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        };
        requests.push(newRequest);
        setToLocalStorage(WITHDRAWALS_KEY, requests);
        console.log("Added withdrawal request:", newRequest);
        resolve(newRequest);
    });
};

/**
 * Retrieves all withdrawal requests (primarily for the developer dashboard).
 */
export const getAllWithdrawalRequests = (): WithdrawalRequest[] => {
    return getFromLocalStorage<WithdrawalRequest>(WITHDRAWALS_KEY);
};

/**
 * Retrieves pending withdrawal requests.
 */
export const getPendingWithdrawalRequests = (): WithdrawalRequest[] => {
    const all = getAllWithdrawalRequests();
    return all.filter(req => req.status === 'pending');
};


/**
 * Retrieves a specific withdrawal request by its ID.
 */
export const getWithdrawalRequestById = (id: string): WithdrawalRequest | undefined => {
    const requests = getAllWithdrawalRequests();
    return requests.find(req => req.id === id);
};

/**
 * Retrieves withdrawal requests for a specific user.
 */
export const getWithdrawalRequestsForUser = (userId: string): WithdrawalRequest[] => {
    const requests = getAllWithdrawalRequests();
    return requests.filter(req => req.userId === userId);
};

/**
 * Retrieves the withdrawal request associated with a specific investment ID.
 * Assumes only one withdrawal per investment.
 */
export const getWithdrawalRequestForInvestment = (investmentId: string): WithdrawalRequest | null => {
    const requests = getAllWithdrawalRequests();
    return requests.find(req => req.investmentId === investmentId) ?? null;
};


/**
 * Updates the status of a withdrawal request (e.g., 'processing', 'completed', 'rejected').
 * Used by the developer dashboard.
 */
export const updateWithdrawalStatus = async (
    requestId: string,
    status: 'processing' | 'completed' | 'rejected',
    details?: { transactionId?: string; rejectionReason?: string }
): Promise<WithdrawalRequest | null> => {
     return new Promise((resolve, reject) => {
        const requests = getFromLocalStorage<WithdrawalRequest>(WITHDRAWALS_KEY);
        const index = requests.findIndex(req => req.id === requestId);

        if (index === -1) {
            console.error("Withdrawal request not found:", requestId);
            return reject(new Error('Withdrawal request not found'));
        }

        requests[index].status = status;
        requests[index].processedDate = new Date().toISOString();
        if (status === 'completed' && details?.transactionId) {
            requests[index].transactionId = details.transactionId;
        }
        if (status === 'rejected' && details?.rejectionReason) {
            requests[index].rejectionReason = details.rejectionReason;
        } else if (status !== 'rejected') {
             requests[index].rejectionReason = null; // Clear reason if not rejected
        }


        setToLocalStorage(WITHDRAWALS_KEY, requests);
        console.log(`Updated withdrawal request ${requestId} status to ${status}`);
        resolve(requests[index]);
     });
};
