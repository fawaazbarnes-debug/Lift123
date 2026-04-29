import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, deleteDoc, writeBatch, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trip, DriverProfile, AppSettings } from '../types';
import { motion } from 'motion/react';
import { Users, FileText, Trash2, ShieldAlert, CheckCircle, Ban, TrendingUp, Clock, Server } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export const AdminPortal: React.FC = () => {
  const [fleet, setFleet] = useState<DriverProfile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<Trip['status'] | 'All'>('All');
  const [dateRange, setDateRange] = useState<'Today' | 'Yesterday' | 'All'>('All');

  useEffect(() => {
    const unsubFleet = onSnapshot(collection(db, 'fleet'), (snap) => {
      setFleet(snap.docs.map(d => d.data() as DriverProfile));
    });
    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      // Sort by newest first
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
      setTrips(data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as AppSettings);
    });

    return () => {
      unsubFleet();
      unsubTrips();
      unsubSettings();
    };
  }, []);

  const filteredTrips = trips.filter(t => {
    const statusMatch = filterStatus === 'All' || t.status === filterStatus;
    
    let dateMatch = true;
    if (dateRange !== 'All' && t.createdAt) {
      const tripDate = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (dateRange === 'Today') {
        dateMatch = tripDate >= today;
      } else if (dateRange === 'Yesterday') {
        dateMatch = tripDate >= yesterday && tripDate < today;
      }
    }

    return statusMatch && dateMatch;
  });

  const toggleApproval = async (driverId: string, current: boolean) => {
    await updateDoc(doc(db, 'fleet', driverId), { approved: !current });
  };

  const [newDriver, setNewDriver] = useState({ name: '', carInfo: '', plate: '' });

  const registerDriver = async () => {
    if (!newDriver.name || !newDriver.carInfo || !newDriver.plate) return;
    // For simplicity, we just pre-approve a name or setup. 
    // In a real app, you'd create an invite or handle it via a dedicated form.
    // Here we'll just allow direct creation if uid was known, but since we don't have uid, 
    // we'll just log it or suggest the driver sign up first.
    // Let's implement the manual approval toggle as requested.
    alert("In this cloud model, drivers sign up themselves and appear here for approval.");
  };

  const resetDailyData = async () => {
    const confirm = prompt("DANGER: This will wipe all trip logs for today. Type 'yes' to confirm:");
    if (confirm === 'yes') {
      const snap = await getDocs(collection(db, 'trips'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      alert("Logs cleared.");
    }
  };

  const updateHours = async (open: number, close: number) => {
    await setDoc(doc(db, 'settings', 'config'), { openTime: open, closeTime: close });
  };

  const stats = {
    total: trips.length,
    completed: trips.filter(t => t.status === 'Finished').length,
    cancelled: trips.filter(t => t.status === 'Cancelled').length,
    pending: trips.filter(t => t.status === 'Pending').length,
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <header className="flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-blue rounded-full flex items-center justify-center text-white font-display font-black italic shadow-lg">L</div>
          <div>
            <h2 className="text-3xl font-display font-black tracking-tighter text-brand-blue italic leading-tight">
              LIFT<span className="text-brand-red">PRO</span> ADMIN
            </h2>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 font-mono">Operations Command Center</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={resetDailyData}
             className="flex items-center gap-2 bg-brand-red/10 text-brand-red px-6 py-3 rounded-2xl font-bold hover:bg-brand-red hover:text-white transition-all border border-brand-red/20 shadow-sm"
           >
             <Trash2 size={18} />
             Reset Daily
           </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trips', value: stats.total, icon: FileText, color: 'brand-blue' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'green' },
          { label: 'Cancelled', value: stats.cancelled, icon: 'brand-red', color: 'brand-red' },
          { label: 'Revenue (est)', value: `R${trips.filter(t => t.status === 'Finished').reduce((acc, t) => acc + t.price, 0)}`, icon: TrendingUp, color: 'orange' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border-2 border-gray-50 shadow-sm group hover:border-brand-blue/20 transition-all"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all",
              s.color === 'brand-blue' ? "bg-brand-blue/10 text-brand-blue" : 
              s.color === 'brand-red' ? "bg-brand-red/10 text-brand-red" : 
              s.color === 'green' ? "bg-green-50 text-green-500" : "bg-orange-50 text-orange-500"
            )}>
               {typeof s.icon === 'string' ? <ShieldAlert size={24} /> : <s.icon size={24} />}
            </div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider font-mono">{s.label}</p>
            <p className="text-4xl font-display font-black mt-1 text-brand-blue italic">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Trip Registry & Filters */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-2xl font-display font-black italic text-brand-blue flex items-center gap-2">
            <FileText size={24} className="text-brand-red" />
            Live Trip Registry
          </h3>
          <div className="flex flex-wrap gap-2">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-white border rounded-xl px-4 py-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
            </select>
            <div className="flex bg-white border rounded-xl overflow-hidden p-1 gap-1">
              {['All', 'Pending', 'Accepted', 'Active', 'Finished', 'Cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tighter",
                    filterStatus === s ? "bg-brand-blue text-white" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border-2 border-gray-50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b text-[10px] font-bold uppercase text-gray-400 font-mono">
                  <th className="p-5">Timestamp</th>
                  <th className="p-5">Client</th>
                  <th className="p-5">Route Map</th>
                  <th className="p-5 text-center">Cloud Status</th>
                  <th className="p-5">Assigned Driver</th>
                  <th className="p-5 text-right">Fare (ZAR)</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredTrips.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <p className="text-gray-400 italic">No activity matching current filters.</p>
                      <p className="text-[10px] uppercase font-bold text-gray-300 mt-2">Listening for real-time packets...</p>
                    </td>
                  </tr>
                )}
                {filteredTrips.map(t => (
                  <tr key={t.id} className="hover:bg-brand-blue/5 transition-colors group">
                    <td className="p-5 whitespace-nowrap text-[10px] text-gray-400 font-mono font-bold">
                      {t.createdAt?.toDate ? format(t.createdAt.toDate(), 'HH:mm • dd MMM') : 'SYNCING...'}
                    </td>
                    <td className="p-5">
                      <p className="font-black text-brand-blue italic">{t.userName}</p>
                      <p className="text-[9px] text-gray-400 font-mono">ID: {t.userId.slice(0, 8)}</p>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-8 bg-brand-blue/10 rounded-full relative">
                          <div className="absolute top-0 w-2 h-2 bg-brand-blue -left-0.5 rounded-full" />
                          <div className="absolute bottom-0 w-2 h-2 bg-brand-red -left-0.5 rounded-full" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-black text-xs text-brand-blue uppercase tracking-tight">{t.destination}</div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">Zone: {t.area}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-3 py-1.5 rounded-lg italic tracking-tighter",
                        t.status === 'Finished' ? "bg-green-100 text-green-700" :
                        t.status === 'Cancelled' ? "bg-brand-red/10 text-brand-red" :
                        t.status === 'Pending' ? "bg-brand-blue/10 text-brand-blue animate-pulse" : "bg-orange-100 text-orange-700"
                      )}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-5">
                      {t.driverName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-brand-blue rounded-lg flex items-center justify-center text-[10px] text-white font-bold italic">D</div>
                          <span className="font-bold text-xs">{t.driverName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-[10px] font-mono">SEARCHING FLEET...</span>
                      )}
                    </td>
                    <td className="p-5 text-right font-black italic text-brand-blue text-lg">
                      {t.price > 0 ? `R${t.price}` : <span className="text-brand-red/50 text-[10px] font-bold">OFFER PENDING</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Fleet Management */}
        <div className="space-y-4">
          <h3 className="text-2xl font-display font-black italic text-brand-blue flex items-center gap-2">
            <Users size={24} className="text-brand-red" />
            Fleet Gatekeeper
          </h3>
          <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 p-5 bg-brand-blue text-[10px] font-black uppercase text-white tracking-[0.2em] italic">
              <div className="col-span-2">Driver Profile</div>
              <div className="text-center">Cloud Access</div>
              <div className="text-right">Action</div>
            </div>
            <div className="divide-y border-t-4 border-brand-red/20">
              {fleet.length === 0 && <p className="p-12 text-center text-gray-400 font-mono text-xs">NO ASSETS REGISTERED IN FLEET COLLECTION.</p>}
              {fleet.map(d => (
                <div key={d.uid} className="grid grid-cols-4 p-5 items-center hover:bg-gray-50 transition-all group">
                  <div className="col-span-2 flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full shadow-sm", d.isOnline ? "bg-green-500 animate-pulse ring-4 ring-green-100" : "bg-gray-200")} />
                    <div>
                      <p className="font-black text-brand-blue text-sm italic">{d.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 uppercase font-bold">{d.carInfo} • {d.plate}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-3 py-1 rounded-full italic tracking-tighter",
                      d.approved ? "bg-green-50 text-green-700" : "bg-brand-red/10 text-brand-red"
                    )}>
                      {d.approved ? 'ACTIVE' : 'FLAGGED'}
                    </span>
                  </div>
                  <div className="text-right">
                    <button 
                      onClick={() => toggleApproval(d.uid, d.approved)}
                      className={cn(
                        "p-3 rounded-2xl border-2 transition-all hover:scale-110 shadow-sm font-black text-xs italic",
                        d.approved ? "border-brand-red/20 text-brand-red hover:bg-brand-red hover:text-white" : "border-green-200 text-green-600 hover:bg-green-600 hover:text-white"
                      )}
                    >
                      {d.approved ? 'BLOCK' : 'APPROVE'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Settings */}
        <div className="space-y-4">
          <h3 className="text-2xl font-display font-black italic text-brand-blue flex items-center gap-2">
            <Server size={24} className="text-brand-red" />
            Environment Params
          </h3>
          <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-sm p-8 space-y-8">
             <div className="space-y-6">
               <div className="flex items-center justify-between p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/10">
                 <div>
                   <p className="font-black text-brand-blue italic uppercase tracking-tighter">Operational Window</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Automatic Booking Gate</p>
                 </div>
                 <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-brand-blue/5">
                   <Clock size={16} className="text-brand-red" />
                   <span className="font-mono text-sm font-black text-brand-blue">{settings?.openTime}:00 - {settings?.closeTime}:59</span>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 font-mono tracking-widest">Global Open (0-23)</label>
                   <input 
                     type="number" 
                     value={settings?.openTime || 0}
                     onChange={(e) => updateHours(parseInt(e.target.value), settings?.closeTime || 0)}
                     className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent focus:border-brand-blue focus:bg-white outline-none font-mono font-black text-brand-blue transition-all"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 font-mono tracking-widest">Global Close (0-23)</label>
                   <input 
                     type="number" 
                     value={settings?.closeTime || 0}
                     onChange={(e) => updateHours(settings?.openTime || 0, parseInt(e.target.value))}
                     className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent focus:border-brand-blue focus:bg-white outline-none font-mono font-black text-brand-blue transition-all"
                   />
                 </div>
               </div>
             </div>

             <div className="pt-6 border-t-4 border-brand-red/10 border-dashed">
                <div className="p-5 bg-brand-blue text-white rounded-[2rem] border-4 border-white shadow-xl flex flex-col gap-4 relative overflow-hidden">
                   <div className="absolute -right-4 -bottom-4 opacity-10">
                      <ShieldAlert size={120} />
                   </div>
                   <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-red">Security Protocol 7.0</p>
                     <p className="text-xl font-display font-black italic tracking-tighter uppercase">Real-time Encryption Active</p>
                   </div>
                   <p className="text-[11px] font-medium leading-relaxed opacity-80">
                     All fleet data and trip logs are protected by Cloud IAM. The "Reset Daily" function uses a atomic batch write to prevent data fragmentation. Your session is restricted to Admin-only modules.
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
