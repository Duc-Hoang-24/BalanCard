"use client";
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase-config';
import { User, LogIn, LogOut, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function AuthHeader() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: ''});

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          setShowAuthModal (false);
        }
    });

    return () => unsubscribe();
  }, []);

const handleGoogleSignIn = async () => {
  setSigningIn(true);
  try {
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);
    setShowAuthModal(false);
  } catch (error) {
    console.error('Sign-in error:', error);
    alert('Google Sign-in failed. Please try again.');
  } finally {
    setSigningIn(false);
  }
};

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setSigningIn(true);

    try {
      let result;
      if (isLogin) {
        result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      }
      setUser(result.user);
      setShowAuthModal(false);
      setFormData({ email: '', password: '' });
    } catch (error) {
      console.error('Email auth error:', error);
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Try signing in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      alert(errorMessage);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setShowDropdown(false);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const openAuthModal = () => {
    setShowAuthModal(true);
    setFormData({ email: '', password: '' });
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setFormData({ email: '', password: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-end p-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className='flex justify-between items-center'>
        <div className='w-auto border-b-3 rounded-md ml-15 md:ml-20 lg:ml-25 p-2 bg-blue-200 text-green-700 font-bold text-xl flex flex-row gap-1'>
          <img src='/logo.png' alt='logo' className='w-8 h-auto'/>
          <span><b className='text-sky-700'>B</b>alanCard</span>
        </div>
        <div className='flex items-end justify-end m-5'>
        {/* Right side - Auth section */}
          <div className="flex items-center space-x-4">
            {!user ? (
                
              // Not signed in - show sign-in button
              <button
                onClick={openAuthModal}
                className="flex items-end justify-end space-x-2 px-4 py-2 bg-cyan-700 text-purple-300 font-bold rounded-md text-sm hover:bg-blue-300 hover:text-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            ) : (
                
              // Signed in - show user profile dropdown
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {/* profile image */}
                  <div className='flex items-center justify-center flex-col'>
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random`}
                      alt="Profile"
                      className="w-8 h-8 rounded-full m-2 hover:opacity-60 border-2"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random`
                      }}
                    />
                  </div>
                </button>

                {/* Dropdown menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-auto bg-cyan-50 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-500 border-b border-blue-500 flex items-center justify-center flex-col">
                            <img
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random`}
                          alt="Profile"
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}background=random`
                          }}
                        />
                        Welcome:<br />
                        <div className="font-medium text-blue-800">_ {user.displayName || 'User'} _</div>
                        <div className="font-medium text-gray-900">{user.email}</div>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center justify-center w-full py-1.5 text-sm text-purple-500 hover:bg-blue-300 transition-colors"
                      >
                        <LogOut className="w-4.5 h-4.5 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

        {/* Click outside to close dropdown */}
        {showDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          ></div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {isLogin ? 'Sign In' : 'Create Account'}
              </h2>
              <button
                onClick={closeAuthModal}
                className="text-gray-600 hover:text-gray-900 text-5xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-3 text-black py-2 border border-gray-300 hover:bg-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2 border text-black border-gray-300 hover:bg-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full bg-cyan-700 text-white py-2 px-4 rounded-md hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {signingIn ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-gray-500">or</span>
            </div>
          
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className='w-full flex items-center justify-center mt-3 space-x-2 px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-400 transition-colors'
            >
              <div className="w-4 h-4 bg-red-500 rounded-sm text-white text-xs font-bold">G</div>
              <div className='text-black'>Continue with Google</div>
            </button>

            <div className="mt-4 text-center">
              {isLogin ? (
                <span className="text-sm text-gray-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Create one
                  </button>
                </span>
              ) : (
                <span className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign in
                  </button>
                </span>
              )}
           </div>
        </div>
      </div>
      )}
    </>
  );
}