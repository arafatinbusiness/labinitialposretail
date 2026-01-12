import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  ChevronRight, 
  Store,
  ShieldAlert,
  Eye,
  EyeOff,
  Building,
  User,
  Users
} from 'lucide-react';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import StoreApp from './components/StoreApp';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { StoreAccount, UserStoreAssociation, UserRole } from './types';
import { authService, migrationService } from './services/firebaseService';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';

// --- Security Constants ---
// SHA-256 Hash for 'lab5360' (calculated correctly)
const ADMIN_HASH = "296befd00254a6dcc6ba6c5df4f51136d08d40048c182d0ce03242ecbcc71fa4";

// --- Helper Functions ---
const hashString = async (text: string) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- SUPER ADMIN & AUTH CONTAINER ---

export default function App() {
  const [view, setView] = useState<'home' | 'login' | 'superadmin' | 'app' | 'blocked'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Stores Registry Persistence (for super admin view)
  const [stores, setStores] = useState<StoreAccount[]>(() => {
    const saved = localStorage.getItem('store_registry');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [currentStore, setCurrentStore] = useState<StoreAccount | null>(null);
  const [userStores, setUserStores] = useState<UserStoreAssociation[]>([]);
  const [selectedStore, setSelectedStore] = useState<UserStoreAssociation | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showStoreSelection, setShowStoreSelection] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const [isJoiningStore, setIsJoiningStore] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Helper function to add debug logs
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
  };

  useEffect(() => {
    localStorage.setItem('store_registry', JSON.stringify(stores));
  }, [stores]);

  // Check for existing Firebase auth state on app load and handle refresh
  useEffect(() => {
    // Check for admin session in localStorage first (for persistence across refreshes)
    const adminSession = localStorage.getItem('admin_session');
    const adminEmail = localStorage.getItem('admin_email');
    
    if (adminSession === 'true' && adminEmail) {
      console.log('Admin session found in localStorage, redirecting to superadmin dashboard');
      setView('superadmin');
      return;
    }
    
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? `User ${user.email} logged in` : 'No user');
      
      if (user) {
        // Check if user is admin (email ends with @labinitial.com)
        if (user.email && user.email.toLowerCase().endsWith('@labinitial.com')) {
          console.log('Admin user detected, redirecting to superadmin dashboard');
          // Store admin session in localStorage for persistence
          localStorage.setItem('admin_session', 'true');
          localStorage.setItem('admin_email', user.email);
          // Admin user - redirect to superadmin dashboard
          setView('superadmin');
          return;
        }
        
        // Check if user is a store owner
        const existingStores = JSON.parse(localStorage.getItem('store_registry') || '[]');
        const store = existingStores.find((s: StoreAccount) => s.id === user.uid);
        
        if (store) {
          console.log('Store owner detected, redirecting to app');
          setCurrentStore({ ...store, role: 'admin' as UserRole });
          setView('app');
          return;
        }
        
        // Check if user is a store user (non-owner)
        try {
          // Get user stores by email
          const userStores = await authService.getUserStoresByEmail(user.email || '');
          if (userStores.length > 0) {
            console.log('Store user detected with', userStores.length, 'stores');
            setUserStores(userStores);
            
            if (userStores.length === 1) {
              // Auto-select if only one store
              const storeAssoc = userStores[0];
              setSelectedStore(storeAssoc);
              const store: StoreAccount = {
                id: storeAssoc.storeId,
                name: storeAssoc.storeName,
                email: user.email || '',
                password: '',
                status: 'active',
                expiryDate: null,
                joinedDate: new Date().toISOString().split('T')[0],
                role: storeAssoc.role
              };
              setCurrentStore(store);
              setView('app');
            } else {
              // Show store selection for multiple stores
              setShowStoreSelection(true);
              setView('login'); // Stay on login view to show store selection
            }
            return;
          }
        } catch (error) {
          console.error('Error getting user stores:', error);
        }
        
        // If we get here, user is authenticated but not associated with any store
        console.log('User authenticated but not associated with any store');
        setView('login');
      } else {
        // No user is signed in
        console.log('No user signed in');
        // Don't change view - let user stay on current view or go to home
        if (view === 'superadmin' || view === 'app') {
          // If user was on protected page, redirect to home
          setView('home');
        }
      }
    });

    return () => unsubscribe();
  }, [view]);

  // Security: Console hacking protection
  useEffect(() => {
    // Detect if console is opened (basic protection)
    const handleDevTools = () => {
      if (view === 'superadmin') {
        console.log('%c⚠️ SECURITY WARNING ⚠️', 'color: red; font-size: 24px; font-weight: bold;');
        console.log('%cThis is a browser feature intended for developers.', 'color: orange; font-size: 16px;');
        console.log('%cIf someone told you to copy-paste something here, it is a scam.', 'color: orange; font-size: 16px;');
      }
    };

    // Check for common devtools opening methods
    const checkDevTools = () => {
      const threshold = 160; // Width/height threshold for devtools
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        handleDevTools();
      }
    };

    // Add event listeners
    window.addEventListener('resize', checkDevTools);
    
    // Initial check
    checkDevTools();
    
    return () => {
      window.removeEventListener('resize', checkDevTools);
    };
  }, [view]);

  // Security: Obfuscate admin hash in memory
  const getAdminHash = () => {
    // Split and reconstruct hash to make it harder to find in memory
    const parts = [
      'f1d5b1e3c7a8b9d0',
      'e2f4a6c8b0d2e4f6',
      'a8c9b1d3e5f7a9c1',
      'b3d5e7f9a1c3b5d7'
    ];
    return parts.join('');
  };

  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    setNeedsEmailVerification(false);
    setShowStoreSelection(false);
    setUserStores([]);
    setSelectedStore(null);
    
    try {
      if (authMode === 'login') {
        // Try Firebase login first
        try {
          const result = await authService.signIn(email, password);
          
              // Check email verification
              if (!authService.isEmailVerified()) {
                setNeedsEmailVerification(true);
                setAuthError('Please verify your email before logging in. Check your inbox (including spam folder) for verification link.');
                setIsLoading(false);
                return;
              }
          
          // Handle store owner login
          if (result.store) {
            const store = result.store;
            
            // Check Access
            if (store.status === 'paused') {
              setBlockReason('Your account has been paused by the administrator. Please contact support.');
              setView('blocked');
              setIsLoading(false);
              return;
            }
            if (store.expiryDate && new Date(store.expiryDate) < new Date()) {
              setBlockReason('Your subscription has expired. Please renew your subscription to continue.');
              setView('blocked');
              setIsLoading(false);
              return;
            }

            setCurrentStore(store);
            setView('app');
            
            // Check if we need to migrate existing localStorage data to Firebase
            const hasLocalData = localStorage.getItem(`store_${store.id}_products`) !== null;
            if (hasLocalData) {
              try {
                await migrationService.migrateStoreToFirebase(store.id, store);
                console.log('Data migration completed successfully');
              } catch (migrationError) {
                console.warn('Data migration failed:', migrationError);
                // Continue anyway - user can still use the app
              }
            }
          } 
          // Handle non-store owner (store user) login
          else if (result.userStores.length > 0) {
            setUserStores(result.userStores);
            
            if (result.userStores.length === 1) {
              // Auto-select if only one store
              const storeAssoc = result.userStores[0];
              setSelectedStore(storeAssoc);
              // Create a minimal store object for StoreApp
              const store: StoreAccount = {
                id: storeAssoc.storeId,
                name: storeAssoc.storeName,
                email: email,
                password: '', // Not needed
                status: 'active',
                expiryDate: null,
                joinedDate: new Date().toISOString().split('T')[0],
                role: storeAssoc.role
              };
              setCurrentStore(store);
              setView('app');
            } else {
              // Show store selection for multiple stores
              setShowStoreSelection(true);
            }
          }
        } catch (firebaseError: any) {
          // If Firebase fails with operation-not-allowed, try localStorage fallback
          if (firebaseError.code === 'auth/operation-not-allowed') {
            // Fallback to localStorage authentication
            const existingStores = JSON.parse(localStorage.getItem('store_registry') || '[]');
            const store = existingStores.find((s: StoreAccount) => 
              s.email === email && s.password === password
            );
            
            if (store) {
              setCurrentStore({ ...store, role: 'admin' as UserRole });
              setView('app');
            } else {
              setAuthError('Invalid credentials. Please check your email and password.');
            }
          } else {
            throw firebaseError;
          }
        }
      } else {
        // SIGNUP LOGIC - Check if user is joining existing store or creating new store
        
        if (!email || !password) {
          setAuthError('Please fill in all fields');
          setIsLoading(false);
          return;
        }
        
        if (isJoiningStore) {
          // User is joining existing store - try to sign in first, then create if needed
          try {
            // FIRST: Try to sign in with existing account
            addDebugLog(`Attempting to sign in existing user: ${email}`);
            const result = await authService.signIn(email, password);
            
            // Check email verification
            if (!authService.isEmailVerified()) {
              setNeedsEmailVerification(true);
              setAuthError('Please verify your email before logging in. Check your inbox (including spam folder) for verification link.');
              setIsLoading(false);
              return;
            }
            
            // Handle successful sign in
            if (result.userStores.length > 0) {
              setUserStores(result.userStores);
              
              if (result.userStores.length === 1) {
                // Auto-select if only one store
                const storeAssoc = result.userStores[0];
                setSelectedStore(storeAssoc);
                // Create a minimal store object for StoreApp
                const store: StoreAccount = {
                  id: storeAssoc.storeId,
                  name: storeAssoc.storeName,
                  email: email,
                  password: '', // Not needed
                  status: 'active',
                  expiryDate: null,
                  joinedDate: new Date().toISOString().split('T')[0],
                  role: storeAssoc.role
                };
                setCurrentStore(store);
                setView('app');
              } else {
                // Show store selection for multiple stores
                setShowStoreSelection(true);
              }
              setIsLoading(false);
              return;
            }
          } catch (signInError: any) {
            // If sign in fails with "user-not-found", "wrong-password", or "invalid-credential", create new account
            if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
              addDebugLog(`User not found, wrong password, or invalid credential, creating new account: ${email}`);
              
              // Create Firebase account only (no store creation)
              const authInstance = getAuth();
              addDebugLog(`Creating Firebase account for: ${email}`);
              const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
              const userId = userCredential.user.uid;
              addDebugLog(`Firebase account created with UID: ${userId}`);
              
              // Send email verification
              try {
                addDebugLog(`Sending email verification to: ${email}`);
                await authService.sendEmailVerification();
                addDebugLog(`Email verification sent successfully`);
                
                // Show email verification required message for staff
                setNeedsEmailVerification(true);
                setAuthError('Account created successfully! Please check your email (including spam folder) for verification link. You must verify your email before accessing the dashboard.');
                setIsLoading(false);
                return;
                
              } catch (verificationError: any) {
                addDebugLog(`Could not send email verification: ${verificationError.message}`);
                // If we can't send verification, still require verification but show different message
                setNeedsEmailVerification(true);
                setAuthError('Account created successfully! However, we could not send verification email. Please try logging in and requesting verification again.');
                setIsLoading(false);
                return;
              }
            } else {
              // Other sign in errors
              addDebugLog(`Sign in error: ${signInError.message}`);
              throw signInError;
            }
          }
        } else {
          // User is creating a new store (store owner)
          if (!signupName) {
            setAuthError('Please enter your business name');
            setIsLoading(false);
            return;
          }
          
          // Firebase signup (store owner registration)
          const storeData: Omit<StoreAccount, 'id' | 'email' | 'password'> = {
            name: signupName,
            status: 'active',
            expiryDate: null,
            joinedDate: new Date().toISOString().split('T')[0]
          };
          
          try {
            addDebugLog(`Creating store for: ${email}`);
            const store = await authService.signUp(email, password, storeData);
            addDebugLog(`Store created with ID: ${store.id}`);
            
            // Send email verification for store owner
            try {
              addDebugLog(`Sending email verification to: ${email}`);
              await authService.sendEmailVerification();
              addDebugLog(`Email verification sent successfully`);
              
              // Show email verification required message
              setNeedsEmailVerification(true);
              setAuthError('Account created successfully! Please check your email (including spam folder) for verification link. You must verify your email before accessing the dashboard.');
              setIsLoading(false);
              return;
              
            } catch (verificationError: any) {
              addDebugLog(`Could not send email verification: ${verificationError.message}`);
              // If we can't send verification, still require verification but show different message
              setNeedsEmailVerification(true);
              setAuthError('Account created successfully! However, we could not send verification email. Please try logging in and requesting verification again.');
              setIsLoading(false);
              return;
            }
          } catch (firebaseError: any) {
            // If Firebase signup fails, create local store
            if (firebaseError.code === 'auth/operation-not-allowed') {
              // Create local store
              const store: StoreAccount = {
                id: `local_${Date.now()}`,
                email,
                password,
                ...storeData,
                role: 'admin' as UserRole
              };
              
              const existingStores = JSON.parse(localStorage.getItem('store_registry') || '[]');
              localStorage.setItem('store_registry', JSON.stringify([...existingStores, store]));
              
              setCurrentStore(store);
              setView('app');
            } else {
              throw firebaseError;
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // User-friendly error messages
      if (error.code === 'auth/invalid-email') {
        setAuthError('Invalid email address');
      } else if (error.code === 'auth/user-not-found') {
        setAuthError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setAuthError('Incorrect password');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('Email already registered');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password should be at least 6 characters');
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError('Network error. Please check your connection');
      } else if (error.code === 'auth/operation-not-allowed') {
        // This should be handled in the try-catch above
        setAuthError('Using local storage mode. Data will be stored locally only.');
      } else if (error.message === 'User not associated with any store') {
        setAuthError('You are not associated with any store. Please contact store administrator.');
      } else {
        setAuthError(error.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreSelection = (storeAssoc: UserStoreAssociation) => {
    setSelectedStore(storeAssoc);
    // Create a minimal store object for StoreApp
    const store: StoreAccount = {
      id: storeAssoc.storeId,
      name: storeAssoc.storeName,
      email: email,
      password: '', // Not needed
      status: 'active',
      expiryDate: null,
      joinedDate: new Date().toISOString().split('T')[0],
      role: storeAssoc.role
    };
    setCurrentStore(store);
    setShowStoreSelection(false);
    setView('app');
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    
    try {
      // Admin uses special email ending with @labinitial.com
      // Default admin email: admin@labinitial.com
      const adminEmail = 'admin@labinitial.com';
      const adminPassword = 'lab5360';
      
      // Check if user entered "admin" as username
      if (email.toLowerCase() === 'admin') {
        // Use Firebase authentication with admin email
        try {
          const result = await authService.signIn(adminEmail, adminPassword);
          
          // Check if user is authenticated
          if (authService.getCurrentUser()) {
            // Store admin session in localStorage for persistence
            localStorage.setItem('admin_session', 'true');
            localStorage.setItem('admin_email', adminEmail);
            setView('superadmin');
          } else {
            setAuthError('Admin authentication failed');
          }
        } catch (firebaseError: any) {
          console.error('Admin Firebase login error:', firebaseError);
          
          // Fallback to hash check if Firebase fails
          const inputHash = await hashString(password);
          if (inputHash === ADMIN_HASH) {
            // Store admin session in localStorage for persistence
            localStorage.setItem('admin_session', 'true');
            localStorage.setItem('admin_email', 'admin');
            setView('superadmin');
          } else {
            setAuthError('Invalid Admin Credentials');
          }
        }
      } else {
        // User entered email directly - try Firebase login
        const inputHash = await hashString(password);
        if (inputHash === ADMIN_HASH && email.toLowerCase().endsWith('@labinitial.com')) {
          // Try Firebase login with provided email
          try {
            await authService.signIn(email, password);
            // Store admin session in localStorage for persistence
            localStorage.setItem('admin_session', 'true');
            localStorage.setItem('admin_email', email);
            setView('superadmin');
          } catch (error) {
            // If Firebase fails, still allow access with hash check
            localStorage.setItem('admin_session', 'true');
            localStorage.setItem('admin_email', email);
            setView('superadmin');
          }
        } else {
          setAuthError('Invalid Admin Credentials');
        }
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      setAuthError('Admin authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    if (isAdminLogin) {
      await handleAdminLogin(e);
    } else {
      await handleFirebaseLogin(e);
    }
  };

  const handleLogout = async () => {
    if (!isAdminLogin && authService.getCurrentUser()) {
      try {
        await authService.signOut();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear admin session from localStorage
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_email');
    
    // Clear all Firebase cache for the current store
    if (currentStore) {
      // Import dataService dynamically to avoid circular dependency
      import('./services/firebaseService').then(({ dataService }) => {
        dataService.clearCache(currentStore.id);
      }).catch(console.error);
    }
    
    // Clear all localStorage cache keys
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('firebase_cache_') || key.startsWith('firebase_cache_timestamp_')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    setView('home');
    setCurrentStore(null);
    setUserStores([]);
    setSelectedStore(null);
    setShowStoreSelection(false);
    setNeedsEmailVerification(false);
    setEmail('');
    setPassword('');
    setSignupName('');
    setIsAdminLogin(false);
    setAuthError('');
  };

  // --- Views ---

  if (view === 'superadmin') {
     return (
        <SuperAdminDashboard 
           stores={stores} 
           setStores={setStores} 
           onLogout={handleLogout} 
        />
     );
  }

  if (view === 'blocked') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-t-4 border-red-500">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">{blockReason}</p>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 mb-6">
            Developer Contact: <br/>
            <span className="font-bold text-gray-800">dev@soft.com</span>
          </div>
          <Button onClick={() => setView('login')} className="w-full">Back to Login</Button>
        </div>
      </div>
    );
  }
  if (view === 'app' && currentStore) {
     return <StoreApp 
              storeId={currentStore.id} 
              storeName={currentStore.name} 
              onLogout={handleLogout} 
              userRole={currentStore.role || 'admin'}
            />;
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden border border-gray-100">
          {/* Modern Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Store className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {isAdminLogin ? 'Admin Portal' : (authMode === 'login' ? 'Welcome Back' : 'Get Started')}
            </h2>
            <p className="text-gray-500 mt-2">
              {isAdminLogin 
                ? 'System administration dashboard' 
                : (authMode === 'login' ? 'Sign in to your business dashboard' : 'Create your business account')}
            </p>
          </div>

          {/* Simple Admin Access Link */}
          <div className="text-center mb-6">
            <button
              onClick={() => setIsAdminLogin(!isAdminLogin)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
            >
              {isAdminLogin ? '← Back to Business Login' : 'Admin Access →'}
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {!isAdminLogin && authMode === 'signup' && !isJoiningStore && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Business Name
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter your business name"
                  required
                />
              </div>
            )}
            
            {!isAdminLogin && authMode === 'signup' && isJoiningStore && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-medium">Important Note</span>
                </div>
                <p>You must be added to a store by the store administrator first. If you haven't been added, please contact your store admin.</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {isAdminLogin ? "Admin Username" : "Email Address"}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder={isAdminLogin ? "Enter admin username" : "you@business.com"}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
              </div>
            </div>
            
            {authError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Authentication Error</span>
                </div>
                <p>{authError}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className={`w-full py-3.5 text-lg mt-2 ${isAdminLogin 
                ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                isAdminLogin ? 'Access Admin Dashboard' : (authMode === 'login' ? 'Sign In' : 'Create Account')
              )}
            </Button>
            
            {!isAdminLogin && authMode === 'login' && (
              <div className="text-center pt-2">
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!email) {
                      setAuthError('Please enter your email address first');
                      return;
                    }
                    
                    setIsLoading(true);
                    setAuthError('');
                    
                    try {
                      await authService.sendPasswordResetEmail(email);
                      setAuthError(`Password reset email sent to ${email}. Please check your inbox (including spam folder).`);
                    } catch (error: any) {
                      console.error('Password reset error:', error);
                      if (error.code === 'auth/user-not-found') {
                        setAuthError('No account found with this email address');
                      } else if (error.code === 'auth/invalid-email') {
                        setAuthError('Invalid email address');
                      } else if (error.code === 'auth/network-request-failed') {
                        setAuthError('Network error. Please check your connection');
                      } else {
                        setAuthError(`Failed to send reset email: ${error.message}`);
                      }
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>
            )}
            
            {!isAdminLogin && (
              <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
                {authMode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => {
                        setAuthMode('signup');
                        setIsJoiningStore(false);
                        setAuthError('');
                      }} 
                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => {
                        setAuthMode('login');
                        setIsJoiningStore(false);
                        setAuthError('');
                      }} 
                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            )}
          </form>
          
          {/* Store Selection Modal */}
          {showStoreSelection && userStores.length > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold mb-4">Select Store</h3>
                <p className="text-gray-600 mb-6">You have access to multiple stores. Please select one to continue:</p>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {userStores.map((storeAssoc) => (
                    <button
                      key={storeAssoc.storeId}
                      onClick={() => handleStoreSelection(storeAssoc)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedStore?.storeId === storeAssoc.storeId 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Building className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{storeAssoc.storeName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            storeAssoc.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : storeAssoc.role === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {storeAssoc.role}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 flex gap-3">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setShowStoreSelection(false);
                      setUserStores([]);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Email Verification Notice */}
          {needsEmailVerification && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-600">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Email Verification Required</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-yellow-800 font-medium mb-1">Important: Check your spam folder</p>
                      <p className="text-yellow-700 text-sm">
                        Verification emails sometimes go to spam/junk folders. Please check there if you don't see it in your inbox.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  We've sent a verification link to your email address. Click the link in the email to verify your account and continue.
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={() => {
                      setNeedsEmailVerification(false);
                      setAuthError('');
                    }}
                    className="w-full"
                  >
                    OK, I'll check my email
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await authService.sendEmailVerification();
                        setAuthError('Verification email resent! Please check your inbox AND spam folder.');
                        setNeedsEmailVerification(false);
                      } catch (error: any) {
                        addDebugLog(`Error resending verification email: ${error.message}`);
                        setAuthError(`Failed to resend verification email: ${error.message}. Please try signing up again.`);
                      }
                    }}
                    className="w-full"
                  >
                    Resend Verification Email
                  </Button>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Still not receiving the email? Try:
                  </p>
                  <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      Wait a few minutes
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      Check spam/junk folders
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      Ensure email address is correct
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Debug Panel */}
          {debugLogs.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Debug Logs</h4>
                <button 
                  onClick={() => setDebugLogs([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto text-xs font-mono">
                {debugLogs.map((log, index) => (
                  <div key={index} className="text-gray-600 py-1 border-b border-gray-200 last:border-b-0">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setView('home')} 
            className="mt-6 text-sm text-gray-400 w-full hover:text-gray-600 flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Home View - Simplified
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Simple Header */}
        <header className="p-6 md:p-8 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                Labinitial POS
              </h1>
              <p className="text-sm text-gray-500">Complete Point of Sale System</p>
            </div>
          </div>
        </header>

        {/* Simple Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-12 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Manage Your
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Business Efficiently
              </span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-10">
              Complete POS, inventory, invoicing, and analytics in one simple platform.
            </p>

            {/* Simple Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                onClick={() => {
                  setView('login');
                  setAuthMode('login');
                  setIsAdminLogin(false);
                }}
                className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Sign In
              </Button>
              
              <div className="relative">
                <Button 
                  onClick={() => {
                    setView('login');
                    setAuthMode('signup');
                    setIsAdminLogin(false);
                  }}
                  variant="outline"
                  className="px-8 py-4 text-lg border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Create Account
                </Button>
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                  Store Owner
                </div>
              </div>
            </div>
            
            {/* Staff Signup Option */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl shadow-sm border border-emerald-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Staff Member?</h3>
                    <p className="text-gray-600 text-sm">Join an existing store as manager, cashier, or staff</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setView('login');
                    setAuthMode('signup');
                    setIsAdminLogin(false);
                    setIsJoiningStore(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all font-medium"
                >
                  Join Existing Store
                </button>
                <p className="text-center text-sm text-gray-500 mt-4">
                  Must be added by store admin first. Email verification required.
                </p>
              </div>
            </div>
            
            {/* Target Businesses Section */}
            <div className="mt-16 max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">
                Perfect For These Businesses
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Retail Stores */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Retail Stores</h3>
                  </div>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Clothing & Fashion
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Electronics & Gadgets
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Gift & Souvenir Shops
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Bookstores
                    </li>
                  </ul>
                </div>
                
                {/* Food & Grocery */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Food & Grocery</h3>
                  </div>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      Supermarkets
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      Restaurants & Cafes
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      Fast Food Outlets
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      Vegetable Markets
                    </li>
                  </ul>
                </div>
                
                {/* Specialty Stores */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Specialty Stores</h3>
                  </div>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      Pharmacies
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      Hardware Stores
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      Beauty & Cosmetics
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      Stationery Shops
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-10 text-center">
                <p className="text-gray-600">
                  <span className="font-semibold text-blue-600">Labinitial POS</span> is designed for small to medium businesses 
                  that need barcode scanning, inventory management, and simple invoicing.
                </p>
                <p className="text-gray-500 text-sm mt-4">
                  Not sure if it's right for your business? <button 
                    onClick={() => setView('login')}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    Try it free
                  </button>
                </p>
              </div>
            </div>
            
            <p className="text-gray-500 text-sm mt-12">
              One platform for all your business needs. Simple, powerful, and easy to use.
            </p>
          </div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
            <p className="text-gray-500 text-sm">
              © 2024 Labinitial POS. Complete Point of Sale System
            </p>
          </div>
        </footer>
    </div>
  );
}
