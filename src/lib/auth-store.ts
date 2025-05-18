
'use client';

// IMPORTANT: This is a basic in-memory/localStorage store for demonstration.
// For production, use a secure backend database and proper authentication mechanisms.
// Storing passwords (even "hashed" lightly here) in localStorage is NOT secure for production.

export interface User {
  id: string;
  phoneNumber: string;
  passwordHash: string; // In a real app, this would be a strong hash
  userName?: string; // Optional username
  userType?: 'user' | 'developer'; // Simple user type
}

const USERS_KEY = 'rupay_users';
const CURRENT_USER_KEY = 'rupay_current_user';

// Developer account (hardcoded for now)
const DEV_PHONE = '03121145736'; // Developer's phone number
const DEV_PASSWORD = 'developer'; // Developer's password

const getStoredUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    const users = usersJson ? JSON.parse(usersJson) : [];
    
    // Ensure developer account exists
    const devExists = users.some((u: User) => u.phoneNumber === DEV_PHONE);
    if (!devExists) {
      users.push({
        id: `dev_${Date.now()}`,
        phoneNumber: DEV_PHONE,
        passwordHash: DEV_PASSWORD, // Storing plain for simplicity, BAD for production
        userName: 'Developer Admin',
        userType: 'developer',
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return users;

  } catch (error) {
    console.error("Error reading users from localStorage:", error);
    return [];
  }
};

const saveUsers = (users: User[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving users to localStorage:", error);
  }
};

const setCurrentLoggedInUser = (user: User | null): void => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const registerUser = async (phoneNumber: string, password: string, userName?: string): Promise<User | null> => {
  return new Promise((resolve) => {
    const users = getStoredUsers();
    if (users.find(u => u.phoneNumber === phoneNumber)) {
      console.warn("User already exists with this phone number.");
      resolve(null); // Or throw new Error("User already exists");
      return;
    }

    // Simple "hashing" for demo - REPLACE with bcrypt/argon2 in production
    const passwordHash = password; // Vulnerable: Store a proper hash

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      phoneNumber,
      passwordHash,
      userName: userName || phoneNumber, // Default username to phone if not provided
      userType: 'user',
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentLoggedInUser(newUser);
    resolve(newUser);
  });
};

export const loginUser = async (phoneNumber: string, password: string): Promise<User | null> => {
  return new Promise((resolve) => {
    const users = getStoredUsers();
    const user = users.find(u => u.phoneNumber === phoneNumber);

    if (user) {
      // Simple password check for demo - REPLACE with hash comparison in production
      if (user.passwordHash === password) {
        setCurrentLoggedInUser(user);
        resolve(user);
      } else {
        console.warn("Invalid password for user:", phoneNumber);
        resolve(null);
      }
    } else {
      console.warn("User not found:", phoneNumber);
      resolve(null);
    }
  });
};

export const logoutUser = (): void => {
  setCurrentLoggedInUser(null);
};

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Error reading current user from localStorage:", error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};

// Initialize developer account if not present on first load in client
if (typeof window !== 'undefined') {
  getStoredUsers(); 
}
