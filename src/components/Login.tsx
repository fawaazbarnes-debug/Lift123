import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Initial setup - default to 'user' role
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email || '',
          role: UserRole.USER,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-6xl font-display font-bold tracking-tighter text-[#141414]">
            LIFT<span className="text-[#EB5E28]">PRO</span>MAX
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">
            Personal Mobility Services
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E6E6E6] space-y-6">
          <p className="text-gray-600">
            Welcome to the future of urban mobility. Connect with drivers in real-time.
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#141414] hover:bg-[#2A2A2A] text-white py-4 px-6 rounded-2xl font-semibold transition-all group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            Continue with Google
          </button>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
            SECURE CLOUD AUTHENTICATION
          </div>
        </div>
      </motion.div>
    </div>
  );
};
