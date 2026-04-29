import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Trip, Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, MessageCircle, X, Check, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';

const AREAS = [
  { id: 'mitchells', name: 'Mitchells Plain', prices: { day: 40, night: 50 }, type: 'fixed' },
  { id: 'bayview', name: 'Strandfontein/Bayview', prices: { day: 70, night: 80 }, type: 'fixed' },
  { id: 'other', name: 'Other / Outside', prices: { day: 0, night: 0 }, type: 'negotiable' },
];

export const UserPortal: React.FC = () => {
  const { profile, user } = useAuth();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [area, setArea] = useState(AREAS[0]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'trips'),
      where('userId', '==', user.uid),
      where('status', 'in', ['Pending', 'Accepted', 'Active'])
    );

    return onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
      setActiveTrip(trips[0] || null);
    });
  }, [user]);

  useEffect(() => {
    if (!activeTrip) return;
    const q = query(collection(db, `trips/${activeTrip.id}/messages`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [activeTrip]);

  const calculatePrice = () => {
    if (area.type === 'negotiable') return 0;
    const hour = new Date().getHours();
    const isNight = hour >= 17 && hour < 21;
    return isNight ? area.prices.night : area.prices.day;
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    const hour = new Date().getHours();
    if (hour < 8 || hour >= 21) {
      alert("LIFT PRO MAX is currently closed. We operate from 8:00 AM to 9:00 PM.");
      return;
    }

    try {
      await addDoc(collection(db, 'trips'), {
        userId: user.uid,
        userName: profile.name,
        pickup,
        destination,
        area: area.name,
        price: calculatePrice(),
        priceStatus: area.type === 'fixed' ? 'Fixed' : 'Proposed',
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPickup('');
      setDestination('');
    } catch (e) {
      console.error(e);
    }
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

  const respondToPrice = async (decision: 'Accepted' | 'Rejected') => {
    if (!activeTrip) return;
    await updateDoc(doc(db, 'trips', activeTrip.id), {
      priceStatus: decision,
      price: decision === 'Accepted' ? activeTrip.proposedPrice : 0,
      updatedAt: serverTimestamp(),
    });
  };

  const cancelTrip = async () => {
    if (!activeTrip) return;
    await updateDoc(doc(db, 'trips', activeTrip.id), {
      status: 'Cancelled',
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center text-white font-display font-black italic">L</div>
          <div>
            <h2 className="text-xl font-display font-black tracking-tighter text-brand-blue italic leading-tight">
              LIFT<span className="text-brand-red">PRO</span>
            </h2>
            <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Personal Mobility</p>
          </div>
        </div>
        <div className="text-right">
           <p className="text-xs font-bold">{profile?.name.split(' ')[0]}</p>
           <button onClick={() => auth.signOut()} className="text-[10px] text-brand-red font-bold uppercase tracking-tighter hover:underline">Sign Out</button>
        </div>
      </header>

      {/* Brand Hero Circle - Matching the image */}
      {!activeTrip && (
        <section className="relative overflow-hidden bg-brand-blue rounded-[2rem] aspect-[16/9] flex flex-col items-center justify-center text-center p-8 border-4 border-white shadow-xl">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40"></div>
           
           <div className="relative z-10 space-y-2">
             <h1 className="text-5xl md:text-7xl font-display font-black italic text-white tracking-tighter">
               LIFT
             </h1>
             <div className="w-24 h-1 bg-brand-red mx-auto -rotate-2 rounded-full mb-2"></div>
             <p className="text-white text-xs md:text-sm font-medium tracking-[0.2em] uppercase opacity-80 decoration-brand-red decoration-2">for personal mobility services</p>
           </div>
        </section>
      )}

      {/* Real-time Pricing Board - Exactly matching the user's provided logic and image */}
      {!activeTrip && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Mitchells Plain Column */}
           <div className="bg-white border-2 border-brand-blue/10 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-brand-blue/5 rounded-bl-full transition-all group-hover:scale-150"></div>
              <h3 className="text-brand-blue font-display font-black text-lg mb-3">Mitchells Plain areas:</h3>
              <div className="space-y-2 text-sm font-bold">
                 <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">8am to 5pm</span>
                    <span className="text-brand-blue">R40</span>
                 </div>
                 <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">5pm to 9pm</span>
                    <span className="text-brand-blue">R50</span>
                 </div>
              </div>
           </div>

           {/* Strandfontein Column */}
           <div className="bg-white border-2 border-brand-blue/10 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-brand-red/5 rounded-bl-full transition-all group-hover:scale-150"></div>
              <h3 className="text-brand-blue font-display font-black text-lg mb-3">Strandfontein/Bayview:</h3>
              <div className="space-y-2 text-sm font-bold">
                 <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">8am to 5pm</span>
                    <span className="text-brand-blue">R70</span>
                 </div>
                 <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">5pm to 9pm</span>
                    <span className="text-brand-blue">R80</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="text-center px-6">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
          Any areas outside these zones are totally at <span className="text-brand-red">driver's discretion</span>.<br/>Negotiations happen in real-time via the integrated secure chat.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!activeTrip ? (
          <motion.div
            key="request"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="bg-white rounded-3xl p-6 shadow-sm border"
          >
            <form onSubmit={handleRequest} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    placeholder="Pickup location"
                    value={pickup}
                    onChange={e => setPickup(e.target.value)}
                    required
                    className="w-full bg-[#F9F9F7] py-4 pl-12 pr-4 rounded-2xl border-none focus:ring-2 focus:ring-[#EB5E28] outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    placeholder="Where to?"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    required
                    className="w-full bg-[#F9F9F7] py-4 pl-12 pr-4 rounded-2xl border-none focus:ring-2 focus:ring-[#EB5E28] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {AREAS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setArea(a)}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all",
                      area.id === a.id ? "bg-[#EB5E28] text-white" : "bg-[#F9F9F7] text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-2xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    {area.type === 'fixed' ? 'Fixed Price' : 'Price Status'}
                  </p>
                  <p className="text-2xl font-display font-black text-brand-blue">
                    {area.type === 'fixed' ? `R${calculatePrice()}` : 'Negotiable'}
                  </p>
                </div>
                <button
                  type="submit"
                  className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black uppercase tracking-tighter text-sm hover:bg-opacity-90 transition-all shadow-lg active:scale-95"
                >
                  Request LIFT
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={cn(
              "bg-white rounded-[2.5rem] p-8 shadow-xl border-4 relative overflow-hidden",
              activeTrip.priceStatus === 'Proposed' && activeTrip.proposedPrice ? "border-brand-red animate-pulse" : "border-brand-blue"
            )}>
               <div className="absolute top-0 right-0 p-3 bg-brand-blue text-white text-[10px] font-black uppercase rounded-bl-2xl">
                 {activeTrip.status}
               </div>

               <div className="flex items-center gap-6 mb-8">
                 <div className="w-16 h-16 bg-brand-blue/10 rounded-3xl flex items-center justify-center shrink-0">
                    <Navigation size={32} className="text-brand-blue" />
                 </div>
                 <div>
                   <h3 className="font-display font-black text-2xl text-brand-blue italic">{activeTrip.destination}</h3>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pickup: {activeTrip.pickup}</p>
                 </div>
               </div>

               {/* Negotiation UI */}
               {activeTrip.priceStatus === 'Proposed' && activeTrip.proposedPrice && (
                 <div className="bg-orange-50 p-4 rounded-2xl mb-4 border border-orange-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-orange-800">Driver proposes R{activeTrip.proposedPrice}</p>
                      <span className="text-[9px] font-bold uppercase text-orange-500">Price Negotiation</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => respondToPrice('Accepted')}
                        className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => respondToPrice('Rejected')}
                        className="flex-1 bg-white text-red-500 border border-red-100 py-2 rounded-xl text-xs font-bold"
                      >
                        Reject
                      </button>
                    </div>
                 </div>
               )}

               {activeTrip.driverName && (
                 <div className="flex items-center justify-between p-4 bg-[#F9F9F7] rounded-2xl mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Your Driver</p>
                        <p className="font-bold">{activeTrip.driverName}</p>
                        <p className="text-[10px] font-mono text-[#EB5E28]">
                          PRICE: {activeTrip.price > 0 ? `R${activeTrip.price}` : 'Under Negotiation'}
                        </p>
                      </div>
                    </div>
                 </div>
               )}

               <button 
                 onClick={cancelTrip}
                 className="w-full py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-all"
               >
                 Cancel Request
               </button>
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
                   className="bg-[#141414] text-white p-4 rounded-xl hover:bg-[#2A2A2A]"
                 >
                   <Send size={20} />
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { cn } from '../lib/utils';
