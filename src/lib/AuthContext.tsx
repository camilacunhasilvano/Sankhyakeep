/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from './firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (email: string, name: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  isCloudSyncActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'sankhya_keep_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCloudSyncActive, setIsCloudSyncActive] = useState(false);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      setError(null);
      if (firebaseUser) {
        try {
          const email = (firebaseUser.email || '').trim().toLowerCase();
          const uid = firebaseUser.uid;
          const name = firebaseUser.displayName || email.split('@')[0];

          // Domain check
          const isValidDomain = 
            email.endsWith('@sankhya.com') || 
            email.endsWith('@sankhya.com.br') || 
            email === 'camilahcunha2013@gmail.com';

          if (!isValidDomain) {
            setError('Acesso restrito. Apenas colaboradores do domínio @sankhya.com ou @sankhya.com.br podem fazer login.');
            await signOut(auth);
            setUser(null);
            setIsCloudSyncActive(false);
            setIsLoading(false);
            return;
          }

          // Role assignment
          let role: 'admin' | 'editor' | 'viewer' = 'editor';
          if (
            email === 'camila.silvano@sankhya.com' || 
            email === 'camila.silvano@sankhya.com.br' ||
            email === 'camilahcunha2013@gmail.com' ||
            email.includes('admin')
          ) {
            role = 'admin';
          } else if (email.includes('view') || email.includes('vis') || email.includes('viewer')) {
            role = 'viewer';
          }

          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let currentUser: User;

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            currentUser = {
              id: uid,
              email: data.email || email,
              name: data.name || name,
              role: data.role || role
            };
          } else {
            currentUser = {
              id: uid,
              email,
              name,
              role
            };
            await setDoc(userDocRef, currentUser);
          }

          setUser(currentUser);
          setIsCloudSyncActive(true);
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(currentUser));
        } catch (e: any) {
          console.error('Error loading Firestore profile:', e);
          setError('Erro ao carregar seu perfil na central cloud do Firebase.');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Fallback: Check if there is a local mock/saved user from mock login
        try {
          const savedUser = localStorage.getItem(LOCAL_USER_KEY);
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            // Verify if it looks like a mock/simulated user
            setUser(parsed);
            setIsCloudSyncActive(false);
          } else {
            setUser(null);
            setIsCloudSyncActive(false);
          }
        } catch (e) {
          console.error('Error recovering session', e);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const email = (result.user.email || '').trim().toLowerCase();
      const isValid = 
        email.endsWith('@sankhya.com') || 
        email.endsWith('@sankhya.com.br') || 
        email === 'camilahcunha2013@gmail.com';

      if (!isValid) {
        await signOut(auth);
        setError('Acesso restrito. Apenas colaboradores do domínio @sankhya.com ou @sankhya.com.br podem fazer login.');
        setIsLoading(false);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      // Suppress code closed-by-user or cancel errors gracefully
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Erro ao realizar login via Google.');
      }
      setIsLoading(false);
      return false;
    }
  };

  const login = async (email: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    // Domain validation check strictly enforced
    const trimmedEmail = email.trim().toLowerCase();
    const isValidDomain = 
      trimmedEmail.endsWith('@sankhya.com') || 
      trimmedEmail.endsWith('@sankhya.com.br') ||
      trimmedEmail === 'camilahcunha2013@gmail.com';
    
    if (!isValidDomain) {
      setError('Acesso restrito. Apenas colaboradores do domínio @sankhya.com ou @sankhya.com.br podem fazer login.');
      setIsLoading(false);
      return false;
    }

    // Role assignment logic based on email
    let role: 'admin' | 'editor' | 'viewer' = 'editor';
    if (
      trimmedEmail === 'camila.silvano@sankhya.com' || 
      trimmedEmail === 'camila.silvano@sankhya.com.br' ||
      trimmedEmail === 'camilahcunha2013@gmail.com' ||
      trimmedEmail.includes('admin')
    ) {
      role = 'admin';
    } else if (trimmedEmail.includes('view') || trimmedEmail.includes('vis') || trimmedEmail.includes('viewer')) {
      role = 'viewer';
    }

    const newUser: User = {
      id: btoa(trimmedEmail).replace(/=/g, '').slice(0, 16), // simple unique derived id
      email: trimmedEmail,
      name: name.trim() || trimmedEmail.split('@')[0].replace(/\./g, ' '),
      role: role
    };

    setUser(newUser);
    setIsCloudSyncActive(false);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Failed to sign out from Firebase', e);
    }
    setUser(null);
    setIsCloudSyncActive(false);
    localStorage.removeItem(LOCAL_USER_KEY);
    setIsLoading(false);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithGoogle, 
      logout, 
      isLoading, 
      error, 
      clearError,
      isCloudSyncActive
    }}>
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
