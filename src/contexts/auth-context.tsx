
"use client";

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { doc, setDoc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions

// User data stored in Firebase Auth
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null; // Will store the phone number
}

// User profile data stored in Firestore 'users' collection
export interface UserProfile {
  uid: string;
  email: string; // The email used for auth (e.g., phonenumber@example.com)
  phoneNumber: string; // The actual phone number
  userReferralCode: string; // This user's own referral code (their UID)
  referredByUserId?: string; // UID of the user who referred them
  registrationDate: Timestamp;
  // Add other profile fields as needed
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  registerUser: (phone: string, pass: string, referralCodeFromUrl?: string) => Promise<FirebaseUser | AuthError>;
  loginUser: (phone: string, pass: string) => Promise<FirebaseUser | AuthError>;
  logoutUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    if (!auth) {
      console.error("AuthContext: Firebase auth instance is not available.");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({ uid: user.uid, email: user.email, displayName: user.displayName });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const sanitizePhoneNumberForEmail = (phone: string): string => {
    // Remove common non-numeric characters, keep + if it's at the start
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.substring(1).replace(/\+/g, ''); // Ensure only one leading +
    } else {
      cleaned = cleaned.replace(/\+/g, '');
    }
    return cleaned;
  };

  const registerUser = async (phone: string, pass: string, referralCodeFromUrl?: string): Promise<FirebaseUser | AuthError> => {
    if (!auth || !db) return { code: 'auth/internal-error', message: 'Firebase services not initialized' } as AuthError;
    setLoading(true);
    
    const actualPhoneNumber = sanitizePhoneNumberForEmail(phone);
    const emailToRegister = `${actualPhoneNumber}@example.com`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailToRegister, pass);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth user profile
      await updateProfile(firebaseUser, {
        displayName: actualPhoneNumber // Store actual phone number in displayName
      });
      
      // Create user profile in Firestore
      const userProfileData: UserProfile = {
        uid: firebaseUser.uid,
        email: emailToRegister,
        phoneNumber: actualPhoneNumber,
        userReferralCode: firebaseUser.uid, // User's own UID is their referral code
        registrationDate: Timestamp.now(),
      };

      if (referralCodeFromUrl) {
        // Validate if referralCodeFromUrl corresponds to an existing user
        const referrerDocRef = doc(db, "users", referralCodeFromUrl);
        const referrerDocSnap = await getDoc(referrerDocRef);
        if (referrerDocSnap.exists()) {
          userProfileData.referredByUserId = referralCodeFromUrl;
        } else {
          console.warn(`Referral code ${referralCodeFromUrl} does not correspond to an existing user. Not storing referral.`);
        }
      }
      
      await setDoc(doc(db, "users", firebaseUser.uid), userProfileData);

      setCurrentUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: actualPhoneNumber });
      setLoading(false);
      return firebaseUser;
    } catch (error) {
      setLoading(false);
      return error as AuthError;
    }
  };

  const loginUser = async (phone: string, pass: string): Promise<FirebaseUser | AuthError> => {
    if (!auth) return { code: 'auth/internal-error', message: 'Firebase auth not initialized' } as AuthError;
    setLoading(true);

    const actualPhoneNumber = sanitizePhoneNumberForEmail(phone);
    const emailToLogin = `${actualPhoneNumber}@example.com`;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, pass);
      setCurrentUser({ 
        uid: userCredential.user.uid, 
        email: userCredential.user.email,
        displayName: userCredential.user.displayName // Should be the phone number
      });
      setLoading(false);
      return userCredential.user;
    } catch (error) {
      setLoading(false);
      return error as AuthError;
    }
  };

  const logoutUser = async (): Promise<void> => {
    if (!auth) return;
    setLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      router.push('/login'); 
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    registerUser,
    loginUser,
    logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
