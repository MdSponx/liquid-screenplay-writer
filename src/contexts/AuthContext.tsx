import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  occupation?: string;
  profileImage?: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
}

type PersistenceType = 'session' | 'remember';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>; 
  signIn: (email: string, password: string, persistence?: PersistenceType) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!mounted) return;

          if (firebaseUser) {
            try {
              const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
              const userData = userDoc.data();
              
              if (mounted) {
                const fullUser = {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  firstName: userData?.firstName,
                  lastName: userData?.lastName,
                  nickname: userData?.nickname,
                  occupation: userData?.occupation,
                  profileImage: userData?.profileImage || firebaseUser.photoURL || undefined
                };
                
                setUser(fullUser);
                setIsAuthenticated(true);
                setLoading(false);
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
              if (mounted) {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
              }
            }
          } else {
            if (mounted) {
              setUser(null);
              setIsAuthenticated(false);
              setLoading(false);
            }
          }
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user: firebaseUser } = userCredential;

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: firebaseUser.email,
        createdAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (
    email: string, 
    password: string, 
    persistence: PersistenceType = 'session'
  ): Promise<AuthResult> => {
    setLoading(true);
    
    try {
      const persistenceType = persistence === 'remember' 
        ? browserLocalPersistence 
        : browserSessionPersistence;
      
      await setPersistence(auth, persistenceType);
      
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      let errorMessage = 'Invalid email or password';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      }
      
      setLoading(false);
      return { success: false, message: errorMessage };
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback(async (data: Partial<User>) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }

    setLoading(true);
    
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (data.firstName || data.lastName || data.profileImage) {
        await updateProfile(auth.currentUser, {
          displayName: data.firstName && data.lastName 
            ? `${data.firstName} ${data.lastName}`
            : undefined,
          photoURL: data.profileImage
        });
      }

      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};