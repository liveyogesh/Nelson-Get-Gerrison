import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User,
  MoreVertical
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/auth';

export default function HodDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'escalations'>('pending');

  // Mock data for display purposes
  const [pendingRequests, setPendingRequests] = useState([
    { id: 1, name: 'Dr. Sarah Jenkins', dept: 'Cardiology', type: 'Short Leave', reason: 'Personal emergency', time: '2 Hours', priority: true },
    { id: 2, name: 'Mark Anthony', dept: 'ICU', type: 'Official Duty', reason: 'Medical supplies pickup from warehouse central', time: '4 Hours', priority: false },
    { id: 3, name: 'Priya Sharma', dept: 'Pediatrics', type: 'Short Leave', reason: 'Bank work', time: '1 Hour', priority: false }
  ]);

  const escalations = [
    { id: 10, name: 'Rahul Desai', dept: 'Radiology', type: 'Late Return', timeOverdue: '45 mins', date: 'Today, 14:30' }
  ];

  const handleApprove = (id: number) => {
    setPendingRequests(prev => prev.filter(req => req.id !== id));
  };

  const handleReject = (id: number) => {
    setPendingRequests(prev => prev.filter(req => req.id !== id));
  };

  const handleDragEnd = (event: any, info: any, id: number) => {
    if (info.offset.x > 100) {
      handleApprove(id);
    } else if (info.offset.x < -100) {
      handleReject(id);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 -mx-4 -my-8 md:mx-0 md:my-0 md:rounded-xl md:border md:border-slate-200 lg:min-h-0 overflow-hidden">
      {/* Sticky Header with Tabs */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="p-4 pb-0">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Approvals</h1>
          <p className="text-sm text-slate-500 font-medium mb-4">Department Head ({user?.department || 'Cardiology'})</p>
          
          <div className="flex gap-4 border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-1 text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'pending' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Pending ({pendingRequests.length})
              {activeTab === 'pending' && (
                <motion.div layoutId="hod-tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('escalations')}
              className={`pb-3 px-1 text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'escalations' ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Escalations (1)
              {activeTab === 'escalations' && (
                <motion.div layoutId="hod-tab-indicator" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-amber-600 rounded-t-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 pb-32 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {activeTab === 'pending' ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
               {pendingRequests.length === 0 && (
                  <div className="text-center p-8 text-slate-400 font-bold uppercase tracking-widest">
                    No pending requests
                  </div>
               )}
               {pendingRequests.map(req => (
                 <div key={req.id} className="relative rounded-2xl overflow-hidden bg-slate-200 shadow-sm border border-slate-200">
                    {/* Background swipe indicators */}
                    <div className="absolute inset-0 flex justify-between items-center px-6">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest"><CheckCircle/> Approve</div>
                      <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-widest">Reject <XCircle/></div>
                    </div>

                    <motion.div 
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(e, info) => handleDragEnd(e, info, req.id)}
                      className="bg-white p-4 relative z-10 w-full touch-pan-y"
                      whileDrag={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                    >
                        {req.priority && (
                          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                            Priority
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-slate-500" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 leading-tight">{req.name}</h3>
                                <p className="text-xs text-slate-500 font-medium">{req.dept} • {req.type}</p>
                              </div>
                          </div>
                          <button className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                          <p className="text-sm text-slate-700 line-clamp-2">{req.reason}</p>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">Requested Time: {req.time}</span>
                          </div>
                        </div>

                        <div className="text-center pb-2 text-[10px] uppercase font-bold text-slate-300 tracking-[0.2em]">
                          ← Swipe to Reject | Swipe to Approve →
                        </div>
                    </motion.div>
                 </div>
               ))}
            </motion.div>
          ) : (
            <motion.div
              key="escalations"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
               {escalations.map(esc => (
                 <div key={esc.id} className="bg-amber-50 rounded-2xl p-4 shadow-sm border border-amber-200 relative">
                    <div className="flex items-start gap-3">
                       <div className="p-2 bg-amber-100 text-amber-600 rounded-full shrink-0">
                         <AlertCircle className="w-6 h-6" />
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <h3 className="font-bold text-amber-900">{esc.name}</h3>
                             <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{esc.date}</span>
                          </div>
                          <p className="text-sm font-medium text-amber-700 mt-0.5">{esc.type}</p>
                          
                          <div className="mt-3 bg-white/60 p-3 rounded-lg border border-amber-200/50">
                             <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Overdue By: {esc.timeOverdue}</p>
                             <p className="text-xs text-amber-700 mt-1">Employee has not marked entry at security gate. Immediate action required.</p>
                          </div>

                          <button className="w-full mt-4 py-3 bg-amber-600 text-white font-bold text-sm rounded-xl shadow-sm hover:bg-amber-700 transition-colors">
                             Contact Employee
                          </button>
                       </div>
                    </div>
                 </div>
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Quick Action Footer for Batch Approvals (Desktop/Tablet) */}
      {activeTab === 'pending' && pendingRequests.length > 0 && (
         <div className="fixed bottom-16 left-0 right-0 md:absolute md:bottom-0 p-4 border-t border-slate-200 bg-white/90 backdrop-blur-md shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-30">
            <button 
              onClick={() => setPendingRequests([])}
              className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest bg-[#003366] text-white shadow-xl flex justify-center items-center gap-2 active:scale-95 transition-transform"
            >
               <CheckCircle className="w-6 h-6" />
               Approve All ({pendingRequests.length})
            </button>
         </div>
      )}
    </div>
  );
}
