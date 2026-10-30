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
  checkAdminAccess: (user: User | null) => Promise<boolean>;
}

export async function checkAdminAccess(currentUser: User | null): Promise<boolean> {
  if (!currentUser || !currentUser.email) return false;
  const email = currentUser.email.toLowerCase().trim();
  const allowedEmails = ['luiz.uehara1@gmail.com', 'edson.menta@hotmail.com', 'anamariamenta@hotmail.com'];
  if (allowedEmails.includes(email)) return true;

  const cachedAdmin = sessionStorage.getItem("adminVerified");
  const cachedEmail = sessionStorage.getItem("adminEmail");
  if (cachedAdmin === "true" && cachedEmail === email) {
    return true;
  }

  try {
    const [adminSnap, administradorSnap] = await Promise.all([
      getDoc(doc(db, "admins", email)),
      getDoc(doc(db, "administradores", email))
    ]);

    const adminValido = 
      (adminSnap.data()?.ativo === true) || 
      (administradorSnap.data()?.ativo === true);

    if (adminValido) {
      sessionStorage.setItem("adminVerified", "true");
      sessionStorage.setItem("adminEmail", email);
    }
    return adminValido;
  } catch (error) {
    console.error("[Auth] Erro em checkAdminAccess:", error);
    return allowedEmails.includes(email);
  }
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
    // Safety timeout: force clear loading state after 5 seconds
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("%c[Auth] Safety Timeout Reached! Forcing loading = false", "color: #ff9800; font-weight: bold;");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("%c[Auth] Verificando acesso administrativo...", "color: #2196F3; font-weight: bold;");
      const startTime = performance.now();
      
      setUser(currentUser);
      
      try {
        if (currentUser?.email) {
          const email = currentUser.email.toLowerCase().trim();
          console.log("[Auth] Usuário:", email);

          // Local session cache check for faster UX
          const cachedAdmin = sessionStorage.getItem("adminVerified");
          const cachedEmail = sessionStorage.getItem("adminEmail");
          
          if (cachedAdmin === "true" && cachedEmail === email) {
            console.log("[Auth] Cache de sessão encontrado. Liberando painel antecipadamente.");
            setIsAdmin(true);
            setLoading(false); // Fast path
          }
          
          console.log("[Auth] Buscando administradores e admins...");
          
          // Check both collections as per requirement (Optimized with Promise.all)
          const [adminSnap, administradorSnap] = await Promise.all([
            getDoc(doc(db, "admins", email)),
            getDoc(doc(db, "administradores", email))
          ]);
          
          let adminValido = 
            (adminSnap.data()?.ativo === true) || 
            (administradorSnap.data()?.ativo === true);

          // Test and fail-safe fallback for the requested core administrators
          const allowedEmails = ['luiz.uehara1@gmail.com', 'edson.menta@hotmail.com', 'anamariamenta@hotmail.com'];
          if (!adminValido && allowedEmails.includes(email)) {
            console.log("[Auth] E-mail de administrador de segurança detectado. Forçando liberação de acesso.");
            adminValido = true;
          }

          // Required test logs
          console.log("Usuário logado:", currentUser.email);
          console.log("Email normalizado:", email);
          console.log("Buscando em admins:", `admins/${email}`);
          console.log("Existe em admins:", adminSnap.exists());
          console.log("Dados admins:", adminSnap.data());
          console.log("Buscando em administradores:", `administradores/${email}`);
          console.log("Existe em administradores:", administradorSnap.exists());
          console.log("Dados administradores:", administradorSnap.data());
          console.log("Admin válido:", adminValido);

          const endTime = performance.now();
          console.log(`[Auth] Verificação finalizada em ${(endTime - startTime).toFixed(2)}ms`);
          
          setIsAdmin(adminValido);

          if (adminValido) {
            sessionStorage.setItem("adminVerified", "true");
            sessionStorage.setItem("adminEmail", email);
          } else {
            sessionStorage.removeItem("adminVerified");
            sessionStorage.removeItem("adminEmail");
            console.warn("Acesso negado. Este e-mail não possui permissão administrativa.");
          }
        } else {
          setIsAdmin(false);
          sessionStorage.removeItem("adminVerified");
          sessionStorage.removeItem("adminEmail");
          console.log("[Auth] Nenhum usuário logado.");
        }
      } catch (error: any) {
        console.error("Erro ao verificar admin:", error.code, error.message);
        
        // Safety fallback for developer/admins in case of Firestore breakdown
        const allowedEmails = ['luiz.uehara1@gmail.com', 'edson.menta@hotmail.com', 'anamariamenta@hotmail.com'];
        if (currentUser?.email && allowedEmails.includes(currentUser.email.toLowerCase().trim())) {
          console.log("[Auth] Fallback especial para administrador ativo.");
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } finally {
        setLoading(false);
        clearTimeout(safetyTimeout);
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
      sessionStorage.removeItem("adminVerified");
      sessionStorage.removeItem("adminEmail");
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, checkAdminAccess }}>
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
