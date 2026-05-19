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
    // Safety timeout: force clear loading state after 8 seconds
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("%c[Auth] Safety Timeout Reached! Forcing loading = false", "color: #ff9800; font-weight: bold;");
        setLoading(false);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("%c[Auth] State change:", "color: #2196F3; font-weight: bold;", currentUser ? currentUser.email : "NO USER");
      setUser(currentUser);
      
      try {
        if (currentUser?.email) {
          const email = currentUser.email.toLowerCase();
          
          console.log("[Auth] Verifying admin status for:", email);
          
          // Check both collections as per requirement
          const adminRef1 = doc(db, 'admins', email);
          const adminRef2 = doc(db, 'administradores', email);
          
          const [snap1, snap2] = await Promise.all([
            getDoc(adminRef1),
            getDoc(adminRef2)
          ]);
          
          const data1 = snap1.exists() ? snap1.data() : null;
          const data2 = snap2.exists() ? snap2.data() : null;
          
          console.log("[Auth] admins collection:", snap1.exists() ? "Found" : "Not Found", data1);
          console.log("[Auth] administradores collection:", snap2.exists() ? "Found" : "Not Found", data2);

          const adminValido = 
            (data1?.ativo === true || data1?.role === 'admin') ||
            (data2?.ativo === true || data2?.role === 'admin');

          // Auto-seed for developer if not found
          const devEmail = 'luiz.uehara1@gmail.com';
          if (!adminValido && email === devEmail) {
            console.log("[Auth] SEEDING: Creating admin doc for developer.");
            await setDoc(adminRef2, {
              email: devEmail,
              role: 'admin',
              ativo: true,
              nome: currentUser.displayName || 'Luiz Admin',
              updatedAt: new Date().toISOString()
            }, { merge: true });
            setIsAdmin(true);
          } else {
            setIsAdmin(adminValido);
            
            if (currentUser && !adminValido) {
              console.warn("[Auth] USER LOGGED IN BUT NOT AUTHORIZED AS ADMIN.");
            }
          }
        } else {
          setIsAdmin(false);
          console.log("[Auth] No user logged in.");
        }
      } catch (error: any) {
        console.error("[Auth] Permission check failed:", error.code, error.message);
        // Minimal fallback for developer
        const devEmail = 'luiz.uehara1@gmail.com';
        setIsAdmin(currentUser?.email?.toLowerCase() === devEmail);
      } finally {
        setLoading(false);
        clearTimeout(safetyTimeout);
        console.log("[Auth] Loading complete.");
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
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
