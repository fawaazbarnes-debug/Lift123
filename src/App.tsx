import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { UserRole } from './types';
import { UserPortal } from './components/UserPortal';
import { DriverPortal } from './components/DriverPortal';
import { AdminPortal } from './components/AdminPortal';
import { RoleSetup } from './components/RoleSetup';
import { LogOut } from 'lucide-react';
import { auth } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

const Main: React.FC = () => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-[#EB5E28] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return <Login />;

  // Admin override: check if explicit admin role or in admins collection
  if (isAdmin) {
     return (
       <div className="min-h-screen pb-12">
         <Nav />
         <AdminPortal />
       </div>
     );
  }

  if (!profile || !profile.role) return <RoleSetup />;

  return (
    <div className="min-h-screen pb-12">
      <Nav />
      <AnimatePresence mode="wait">
        <motion.div
           key={profile.role}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
        >
          {profile.role === UserRole.USER && <UserPortal />}
          {profile.role === UserRole.DRIVER && <DriverPortal />}
          {profile.role === UserRole.ADMIN && <AdminPortal />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const Nav: React.FC = () => {
   const { profile } = useAuth();
   return (
     <nav className="p-4 bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
           <h1 className="text-xl font-display font-bold tracking-tighter">
             LIFT<span className="text-[#EB5E28]">PRO</span>
           </h1>
           <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold leading-none">{profile?.name}</p>
               <p className="text-[10px] text-gray-400 uppercase font-mono">{profile?.role}</p>
             </div>
             <button 
               onClick={() => auth.signOut()}
               className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-red-500"
             >
               <LogOut size={20} />
             </button>
           </div>
        </div>
     </nav>
   );
};

export default function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}
