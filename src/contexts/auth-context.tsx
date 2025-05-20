
"use client";

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { auth } from '@/lib/firebase'; // Ensure this path is correct

interface User {
  uid: string;
  email: string | null; // Firebase uses email; we'll store phone number here
  // Add other user properties as needed
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  registerUser: (phoneAsEmail: string, pass: string) => Promise<FirebaseUser | AuthError>;
  loginUser: (phoneAsEmail: string, pass: string) => Promise<FirebaseUser | AuthError>;
  logoutUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    if (!auth) {
      console.error("AuthContext: Firebase auth instance is not available. Check Firebase initialization.");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({ uid: user.uid, email: user.email });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const registerUser = async (phoneAsEmail: string, pass: string): Promise<FirebaseUser | AuthError> => {
    if (!auth) return { code: 'auth/internal-error', message: 'Firebase auth not initialized' } as AuthError;
    setLoading(true);
    try {
      // Firebase expects an email format, so we treat the phone number as such.
      // Add a dummy domain if phoneAsEmail doesn't look like an email.
      const emailToRegister = phoneAsEmail.includes('@') ? phoneAsEmail : `${phoneAsEmail}@example.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, emailToRegister, pass);
      // The email stored in Firebase will be `phoneAsEmail@example.com`
      // The `currentUser.email` will reflect this.
      setCurrentUser({ uid: userCredential.user.uid, email: userCredential.user.email });
      setLoading(false);
      return userCredential.user;
    } catch (error) {
      setLoading(false);
      return error as AuthError;
    }
  };

  const loginUser = async (phoneAsEmail: string, pass: string): Promise<FirebaseUser | AuthError> => {
    if (!auth) return { code: 'auth/internal-error', message: 'Firebase auth not initialized' } as AuthError;
    setLoading(true);
    try {
      const emailToLogin = phoneAsEmail.includes('@') ? phoneAsEmail : `${phoneAsEmail}@example.com`;
      const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, pass);
      setCurrentUser({ uid: userCredential.user.uid, email: userCredential.user.email });
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
      router.push('/login'); // Redirect to login after logout
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
