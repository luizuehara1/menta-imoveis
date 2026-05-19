import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser?.email) {
        const email = currentUser.email.toLowerCase();
        console.log("Checking admin status for:", email);
        
        try {
          // Check both collections as per user request
          const adminDocRef = doc(db, 'administradores', email);
          const adminsLegacyRef = doc(db, 'admins', email);
          
          const [adminDoc, adminsLegacyDoc] = await Promise.all([
            getDoc(adminDocRef),
            getDoc(adminsLegacyRef)
          ]);
          
          let hasAdminAccess = false;
          
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            hasAdminAccess = data?.ativo === true || data?.role === 'admin';
          }
          
          if (!hasAdminAccess && adminsLegacyDoc.exists()) {
            const data = adminsLegacyDoc.data();
            hasAdminAccess = data?.ativo === true || data?.role === 'admin';
          }

          // Auto-seed first admin for the main developer
          const devEmail = 'luiz.uehara1@gmail.com';
          if (!hasAdminAccess && email === devEmail) {
            console.log("Seeding initial admin...");
            await setDoc(adminDocRef, {
              email: devEmail,
              role: 'admin',
              ativo: true,
              nome: currentUser.displayName || 'Admin Inicial',
              criadoEm: new Date().toISOString()
            });
            hasAdminAccess = true;
          }

          console.log("Admin status determined:", hasAdminAccess);
          setIsAdmin(hasAdminAccess);
        } catch (error: any) {
          console.error("Error in onAuthStateChanged checking status:", error);
          const devEmail = 'luiz.uehara1@gmail.com';
          setIsAdmin(email === devEmail);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
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
