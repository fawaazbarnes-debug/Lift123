import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '../types';
import { motion } from 'motion/react';
import { User, Car, Shield } from 'lucide-react';

export const RoleSetup: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: UserRole) => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role,
        setupComplete: true
      });

      if (role === UserRole.DRIVER) {
        await setDoc(doc(db, 'fleet', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Anonymous Driver',
          approved: false, // Must be approved by admin
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F9F9F7]">
      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-display font-bold tracking-tighter">Choose Your Role</h2>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Select how you want to use LIFT PRO MAX</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.button
            whileHover={{ y: -5 }}
            onClick={() => selectRole(UserRole.USER)}
            disabled={loading}
            className="bg-white p-10 rounded-[2.5rem] border shadow-sm group hover:border-[#EB5E28] transition-all text-left space-y-6"
          >
            <div className="w-16 h-16 bg-[#F9F9F7] rounded-3xl flex items-center justify-center text-[#141414] group-hover:bg-[#EB5E28] group-hover:text-white transition-all">
              <User size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-display font-bold">Passenger</h3>
              <p className="text-gray-500 mt-2">Request rides, track drivers, and pay with ease in our real-time network.</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ y: -5 }}
            onClick={() => selectRole(UserRole.DRIVER)}
            disabled={loading}
            className="bg-white p-10 rounded-[2.5rem] border shadow-sm group hover:border-[#EB5E28] transition-all text-left space-y-6"
          >
            <div className="w-16 h-16 bg-[#F9F9F7] rounded-3xl flex items-center justify-center text-[#141414] group-hover:bg-[#EB5E28] group-hover:text-white transition-all">
              <Car size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-display font-bold">Driver</h3>
              <p className="text-gray-500 mt-2">Accept jobs, navigate the city, and earn rewards for every trip completed.</p>
            </div>
          </motion.button>
        </div>
        
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-mono">
           Identity is verified via Google Cloud IAM
        </p>
      </div>
    </div>
  );
};
