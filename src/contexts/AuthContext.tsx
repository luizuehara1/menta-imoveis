import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
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

  // Handle Redirect Result on Mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("%c[Auth] Login via Redirect SUCCESS:", "color: #4CAF50; font-weight: bold;", result.user.email);
        }
      })
      .catch((error) => {
        console.error("%c[Auth] Redirect Login Error:", "color: #f44336; font-weight: bold;", error);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser?.email) {
        const email = currentUser.email.toLowerCase();
        console.log("[Auth] User detected:", email);
        
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
            console.log("[Auth] Seeding initial admin access for developer.");
            await setDoc(adminDocRef, {
              email: devEmail,
              role: 'admin',
              ativo: true,
              nome: currentUser.displayName || 'Admin Inicial',
              criadoEm: new Date().toISOString()
            }, { merge: true });
            hasAdminAccess = true;
          }

          console.log("[Auth] Admin status:", hasAdminAccess ? "AUTHORIZED" : "NOT AUTHORIZED");
          setIsAdmin(hasAdminAccess);
        } catch (error: any) {
          console.error("[Auth] Error checking admin permissions:", error);
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
      console.log("%c[Auth] Attempting Google Auth (Popup)...", "color: #E5BC53; font-weight: bold;");
      console.log("[Auth] Context:", {
        hostname: window.location.hostname,
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain
      });

      await signInWithPopup(auth, googleProvider);
      console.log("%c[Auth] Popup Login SUCCESS", "color: #4CAF50; font-weight: bold;");
    } catch (error: any) {
      console.error("%c[Auth] Popup Login Error:", "color: #f44336; font-weight: bold;", error.code, error.message);
      
      // Fallback strategies
      const isBlocked = error.code === 'auth/popup-blocked' || 
                        error.code === 'auth/cancelled-popup-request' ||
                        error.code === 'auth/popup-closed-by-user' ||
                        error.code === 'auth/operation-not-supported-in-this-environment';

      if (isBlocked) {
        console.warn("[Auth] Popup was blocked or failed. Attempting REDIRECT fallback...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("[Auth] Redirect Fallback failed:", redirectError);
          throw redirectError;
        }
      } else if (error.code === 'auth/unauthorized-domain') {
        alert(`ERRO DE CONFIGURAÇÃO: Domínio não autorizado (${window.location.hostname}).\n\nAdicione este domínio no Firebase Console > Authentication > Settings > Authorized domains.`);
        throw error;
      } else {
        // For mystery errors (like blank popup hanging), we still might want to try redirect if user tries again
        console.warn("[Auth] Unknown login error. If this persists, try using a different browser or allowing popups.");
        throw error;
      }
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
