import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, runTransaction, orderBy, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Trip, Message, DriverProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, MessageCircle, Check, X, ShieldAlert, Send, Power, Car, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export const DriverPortal: React.FC = () => {
  const { profile, user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Lockout check & Profile listener
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'fleet', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DriverProfile;
        setDriverProfile(data);
        if (!data.approved) {
          // Force logout logic handled at App level usually, but here for redundancy
        }
      }
    });
  }, [user]);

  // Pending trips listener
  useEffect(() => {
    if (!driverProfile?.isOnline || activeTrip) {
      setPendingTrips([]);
      return;
    }
    const q = query(collection(db, 'trips'), where('status', '==', 'Pending'));
    return onSnapshot(q, (snapshot) => {
      setPendingTrips(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trip)));
    });
  }, [driverProfile?.isOnline, activeTrip]);

  // Active trip listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'trips'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['Accepted', 'Active'])
    );
    return onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
      setActiveTrip(trips[0] || null);
    });
  }, [user]);

  // Chat listener
  useEffect(() => {
    if (!activeTrip) return;
    const q = query(collection(db, `trips/${activeTrip.id}/messages`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [activeTrip]);

  const toggleOnline = async () => {
    if (!user || !driverProfile) return;
    await updateDoc(doc(db, 'fleet', user.uid), {
      isOnline: !driverProfile.isOnline,
      lastSeen: serverTimestamp(),
    });
  };

  const acceptTrip = async (tripId: string) => {
    if (!user || !profile) return;
    const tripRef = doc(db, 'trips', tripId);

    try {
      await runTransaction(db, async (transaction) => {
        const tripSnap = await transaction.get(tripRef);
        if (!tripSnap.exists()) throw "Trip does not exist";
        
        const data = tripSnap.data();
        if (data.status !== 'Pending') {
           alert("Trip already taken by another driver.");
           throw "Already taken";
        }

        transaction.update(tripRef, {
          status: 'Accepted',
          driverId: user.uid,
          driverName: profile.name,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (e) {
      console.error("Failed to accept trip:", e);
    }
  };

  const [offerPrice, setOfferPrice] = useState('');

  const proposePrice = async () => {
    if (!activeTrip || !offerPrice) return;
    await updateDoc(doc(db, 'trips', activeTrip.id), {
      proposedPrice: parseFloat(offerPrice),
      priceStatus: 'Proposed',
      updatedAt: serverTimestamp(),
    });
    setOfferPrice('');
  };

  const updateStatus = async (newStatus: 'Active' | 'Finished') => {
    if (!activeTrip) return;
    await updateDoc(doc(db, 'trips', activeTrip.id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeTrip || !user || !profile) return;
    await addDoc(collection(db, `trips/${activeTrip.id}/messages`), {
      senderId: user.uid,
      senderName: profile.name,
      text: newMessage,
      createdAt: serverTimestamp(),
    });
    setNewMessage('');
  };

  if (driverProfile && !driverProfile.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-red-600 uppercase tracking-tight">Access Suspended</h2>
          <p className="text-gray-600">Please settle your daily payment with Admin to resume services.</p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-3 bg-[#141414] text-white rounded-xl font-bold"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center py-4">
        <div>
          <h2 className="text-3xl font-display font-bold">Driver Console</h2>
          <p className={cn("text-xs font-bold uppercase tracking-widest", driverProfile?.isOnline ? "text-green-500" : "text-red-400")}>
            {driverProfile?.isOnline ? 'Online & Receiving' : 'Offline'}
          </p>
        </div>
        <button 
          onClick={toggleOnline}
          className={cn(
             "p-4 rounded-2xl shadow-sm border transition-all flex items-center gap-2",
             driverProfile?.isOnline ? "bg-red-50 border-red-100 text-red-500" : "bg-green-50 border-green-100 text-green-500"
          )}
        >
          <Power size={20} />
          <span className="font-bold text-sm uppercase">{driverProfile?.isOnline ? 'Go Offline' : 'Go Online'}</span>
        </button>
      </header>

      <div className="space-y-4">
        {activeTrip ? (
          <div className="space-y-4">
             <div className="bg-[#141414] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-white/10 text-xs font-mono">
                   {activeTrip.status}
                </div>
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <Car size={24} className="text-[#EB5E28]" />
                   </div>
                   <div>
                     <h3 className="font-bold text-xl">{activeTrip.userName}</h3>
                     <p className="text-xs text-gray-400">R{activeTrip.price} • {activeTrip.area}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-white/5 p-4 rounded-2xl">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Pickup</p>
                      <p className="text-sm font-medium">{activeTrip.pickup}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Dropoff</p>
                      <p className="text-sm font-medium">{activeTrip.destination}</p>
                   </div>
                </div>

                <div className="flex gap-3">
                   {activeTrip.status === 'Accepted' && (
                     <>
                       {activeTrip.area.includes('Other') && activeTrip.priceStatus !== 'Accepted' && (
                         <div className="flex-1 flex gap-2">
                            <input 
                              type="number"
                              placeholder="Offer Price"
                              value={offerPrice}
                              onChange={e => setOfferPrice(e.target.value)}
                              className="flex-1 bg-white/10 rounded-2xl px-4 py-2 text-sm outline-none border border-white/20"
                            />
                            <button 
                              onClick={proposePrice}
                              className="bg-white text-[#141414] px-4 py-2 rounded-2xl text-xs font-bold"
                            >
                              Offer
                            </button>
                         </div>
                       )}
                       <button 
                         onClick={() => updateStatus('Active')}
                         disabled={activeTrip.area.includes('Other') && activeTrip.priceStatus !== 'Accepted'}
                         className={cn(
                           "flex-1 py-4 bg-[#EB5E28] text-white rounded-2xl font-bold flex items-center justify-center gap-2",
                           activeTrip.area.includes('Other') && activeTrip.priceStatus !== 'Accepted' && "opacity-50 grayscale cursor-not-allowed"
                         )}
                       >
                         <Check size={20} />
                         I Have Arrived
                       </button>
                     </>
                   )}
                   {activeTrip.status === 'Active' && (
                     <button 
                       onClick={() => updateStatus('Finished')}
                       className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                     >
                       <Check size={20} />
                       Complete Trip
                     </button>
                   )}
                </div>
             </div>

             {/* Chat Section */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border flex flex-col h-[400px]">
               <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                  {messages.map(m => (
                    <div key={m.id} className={cn("flex flex-col", m.senderId === user?.uid ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[80%] p-3 rounded-2xl text-sm",
                        m.senderId === user?.uid ? "bg-[#141414] text-white rounded-tr-none" : "bg-[#F9F9F7] text-[#141414] rounded-tl-none"
                      )}>
                        {m.text}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">{m.senderName}</span>
                    </div>
                  ))}
               </div>
               <div className="flex gap-2">
                 <input
                   placeholder="Type a message..."
                   value={newMessage}
                   onChange={e => setNewMessage(e.target.value)}
                   onKeyPress={e => e.key === 'Enter' && sendMessage()}
                   className="flex-1 bg-[#F9F9F7] p-4 rounded-xl outline-none focus:ring-1 focus:ring-gray-200"
                 />
                 <button 
                   onClick={sendMessage}
                   className="bg-[#141414] text-white p-4 rounded-xl"
                 >
                   <Send size={20} />
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              Available Jobs 
              {pendingTrips.length > 0 && <span className="bg-[#EB5E28] text-white text-[10px] px-2 py-0.5 rounded-full">{pendingTrips.length}</span>}
            </h3>
            
            <div className="grid gap-4">
              {pendingTrips.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-dashed text-center space-y-2">
                  <Clock className="mx-auto text-gray-300" size={32} />
                  <p className="text-gray-400 font-medium">Waiting for new requests...</p>
                </div>
              ) : (
                pendingTrips.map(trip => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border group hover:border-[#EB5E28] transition-all cursor-pointer"
                    onClick={() => acceptTrip(trip.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#F9F9F7] rounded-xl text-[#EB5E28]">
                           <MapPin size={18} />
                        </div>
                        <p className="font-bold">{trip.area}</p>
                      </div>
                      <div className="text-xl font-display font-bold text-[#EB5E28]">R{trip.price}</div>
                    </div>
                    
                    <div className="space-y-1 mb-6">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Destination</p>
                      <p className="text-lg font-semibold">{trip.destination}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 font-medium">{trip.userName}</p>
                      <button className="bg-gray-100 group-hover:bg-[#141414] group-hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                        Accept Trip
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
