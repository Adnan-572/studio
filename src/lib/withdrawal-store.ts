
'use client'; 

export interface WithdrawalRequest {
    id: string; 
    userId: string; // User's phone number
    userName: string; // User's name
    investmentId: string; 
    investmentTitle: string; 
    withdrawalAmount: number; 
    paymentMethod: 'easypaisa' | 'jazzcash';
    accountNumber: string; 
    requestDate: string; 
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    processedDate?: string | null; 
    rejectionReason?: string | null; 
    transactionId?: string | null; 
}

const WITHDRAWALS_KEY = 'rupay_withdrawal_requests';

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

export const addWithdrawalRequest = async (requestData: Omit<WithdrawalRequest, 'id'>): Promise<WithdrawalRequest> => {
    return new Promise((resolve) => {
        const requests = getFromLocalStorage<WithdrawalRequest>(WITHDRAWALS_KEY);
        const newRequest: WithdrawalRequest = {
            ...requestData,
            id: `wd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        };
        requests.push(newRequest);
        setToLocalStorage(WITHDRAWALS_KEY, requests);
        console.log("Added withdrawal request (no login):", newRequest);
        resolve(newRequest);
    });
};

export const getAllWithdrawalRequests = (): WithdrawalRequest[] => {
    return getFromLocalStorage<WithdrawalRequest>(WITHDRAWALS_KEY);
};

export const getPendingWithdrawalRequests = (): WithdrawalRequest[] => {
    return getAllWithdrawalRequests().filter(req => req.status === 'pending');
};

export const getWithdrawalRequestById = (id: string): WithdrawalRequest | undefined => {
    return getAllWithdrawalRequests().find(req => req.id === id);
};

// userId is phone number
export const getWithdrawalRequestsForUser = (userId: string): WithdrawalRequest[] => {
    return getAllWithdrawalRequests().filter(req => req.userId === userId);
};

export const getWithdrawalRequestForInvestment = (investmentId: string): WithdrawalRequest | null => {
    return getAllWithdrawalRequests().find(req => req.investmentId === investmentId) ?? null;
};

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
             requests[index].rejectionReason = null;
        }

        setToLocalStorage(WITHDRAWALS_KEY, requests);
        console.log(`Updated withdrawal request ${requestId} status to ${status} (no login)`);
        resolve(requests[index]);
     });
};
