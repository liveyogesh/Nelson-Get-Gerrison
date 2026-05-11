import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/auth';
import { ClipboardList, PlusCircle, QrCode, X, Scan, Sun, FileClock, ShieldAlert } from 'lucide-react';
import GatepassTracker from './GatepassTracker';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function StaffPortal() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'scan'>('new');
  const [requestType, setRequestType] = useState('PERSONAL');
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [priorityReason, setPriorityReason] = useState('');
  const [lastPass, setLastPass] = useState<any>(null);
  const [scannedResult, setScannedResult] = useState<any>(null);
  const [brightnessBoost, setBrightnessBoost] = useState(false);

  // Auto-brightness simulate
  useEffect(() => {
     if (lastPass && brightnessBoost) {
       document.body.style.backgroundColor = '#ffffff';
     } else {
       document.body.style.backgroundColor = '';
     }
     return () => { document.body.style.backgroundColor = ''; };
  }, [brightnessBoost, lastPass]);

  // QR Scanner Logic
  useEffect(() => {
    if (activeTab === 'scan') {
      const scanner = new Html5QrcodeScanner(
        "staff-qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );

      scanner.render(async (decodedText) => {
        scanner.clear();
        try {
          const { data: result } = await axios.post('/api/gatepass/scan-entry', { qr: decodedText });
          if (result.success) {
            setScannedResult({ id: `GP-${result.requestId}`, time: new Date().toLocaleTimeString(), late_return: result.late_return });
          } else {
            alert(result.error || 'Check-in failed');
            setActiveTab('new');
          }
        } catch (e: any) {
          alert('Error during scan check-in: ' + e.message);
          setActiveTab('new');
        }
      }, (err) => {});

      return () => {
        scanner.clear().catch(e => console.error("Scanner clear fail", e));
      };
    }
  }, [activeTab]);

  // Mock quota tracker
  const personalPassesUsed = 2;
  const personalPassesLimit = 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestType === 'PERSONAL' && personalPassesUsed >= personalPassesLimit && !isUrgent) {
      alert('You have reached your limit of 3 personal passes this month.');
      return;
    }

    try {
      const { data: result } = await axios.post('/api/gatepass', {
        type: requestType,
        reason,
        isPriority: isUrgent,
        priorityReason,
      });
      
      if (result.success) {
        // Clear form
        setReason('');
        setIsUrgent(false);
        setPriorityReason('');
        
        alert('Gatepass request submitted successfully! Please wait for approval.');
        setActiveTab('history');
      } else {
        alert('Failed to submit: ' + result.error);
      }
    } catch (e: any) {
      alert('Error submitting gatepass: ' + e.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto md:bg-white md:shadow-xl md:rounded-3xl md:overflow-hidden md:mt-6 mb-20 md:mb-8 font-sans">
      
      {/* Mobile-friendly Header Tabs */}
      <div className="bg-[#002855] text-white p-5 md:rounded-t-3xl md:p-8 shrink-0">
         <div className="flex justify-between items-center mb-6">
            <div>
               <h1 className="text-2xl font-bold tracking-tight">Gatepass</h1>
               <p className="text-blue-200 text-sm opacity-80 mt-1">
                 {activeTab === 'new' ? 'Create Request' : activeTab === 'history' ? 'My Passes' : 'Scan Access'}
               </p>
            </div>
            
            <div className="bg-[#001D3D] p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
               <button 
                 onClick={() => setActiveTab('new')}
                 className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${activeTab === 'new' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-300 hover:bg-white/10'}`}
               >
                 <PlusCircle className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => setActiveTab('history')}
                 className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${activeTab === 'history' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-300 hover:bg-white/10'}`}
               >
                 <ClipboardList className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => setActiveTab('scan')}
                 className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${activeTab === 'scan' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-300 hover:bg-white/10'}`}
               >
                 <QrCode className="w-5 h-5" />
               </button>
            </div>
         </div>
         
         {/* Quota display for 'new' tab */}
         {activeTab === 'new' && !lastPass && (
            <div className="bg-white/10 rounded-2xl border border-white/10 p-4 flex items-center justify-between backdrop-blur-sm animate-in fade-in">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                   <FileClock className="w-5 h-5 text-blue-200" />
                 </div>
                 <div>
                   <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Personal Passes</p>
                   <p className="text-lg font-bold">{personalPassesLimit - personalPassesUsed} remaining</p>
                 </div>
               </div>
            </div>
         )}
      </div>

      <div className="p-4 md:p-8 min-h-[400px]">
        {activeTab === 'scan' ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
             {scannedResult ? (
               <div className={`${scannedResult.late_return ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'} border-2 rounded-3xl p-8 text-center shadow-sm`}>
                  <div className={`w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 ${scannedResult.late_return ? 'border-rose-100 text-rose-500' : 'border-emerald-100 text-emerald-500'} shadow-inner`}>
                     <Scan className="w-12 h-12" />
                  </div>
                  <h4 className={`${scannedResult.late_return ? 'text-rose-900' : 'text-emerald-900'} font-bold text-2xl mb-2 tracking-tight`}>
                    Pass Validated {scannedResult.late_return && '(Late)'}
                  </h4>
                  <p className={`${scannedResult.late_return ? 'text-rose-700' : 'text-emerald-700'} font-semibold text-lg mb-6 tracking-wide`}>{scannedResult.id}</p>
                  
                  <div className={`inline-flex items-center gap-2 ${scannedResult.late_return ? 'bg-rose-600' : 'bg-emerald-600'} text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-md`}>
                     Access Logged • {scannedResult.time}
                  </div>
                  
                  {scannedResult.late_return && (
                     <div className="mt-6 bg-rose-100 text-rose-800 p-4 rounded-2xl flex items-start gap-3 text-left">
                       <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5 text-rose-600" />
                       <div className="text-sm font-medium">A late return violation has been logged to HR and your HOD.</div>
                     </div>
                  )}
                  
                  <button 
                    onClick={() => setScannedResult(null)}
                    className={`w-full mt-8 bg-white border-2 ${scannedResult.late_return ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'} font-bold py-4 rounded-2xl transition-all active:scale-95 text-lg`}
                  >
                    Scan Another Pass
                  </button>
               </div>
             ) : (
               <div className="space-y-6">
                  <div id="staff-qr-reader" className="w-full rounded-3xl overflow-hidden border-4 border-slate-200 bg-slate-900 shadow-inner"></div>
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Scan className="w-5 h-5 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Align pass QR within frame</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('new')}
                    className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-colors active:scale-95 text-lg border-2 border-slate-200"
                  >
                     Cancel Scanning
                  </button>
               </div>
             )}
          </div>
        ) : activeTab === 'new' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Pass Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['PERSONAL', 'OFFICIAL', 'EMERGENCY', 'NIGHT'].map(type => (
                      <label 
                        key={type} 
                        className={`
                          flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all active:scale-95
                          ${requestType === type ? 'bg-[#002855] text-white border-[#002855] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                        `}
                      >
                        <input 
                          type="radio" 
                          name="type" 
                          value={type} 
                          checked={requestType === type}
                          onChange={(e) => setRequestType(e.target.value)}
                          className="hidden" 
                        />
                        <span className="font-bold tracking-wide">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Reason for Request</label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-slate-200 rounded-2xl focus:border-[#002855] focus:ring-4 focus:ring-blue-50 outline-none text-base resize-none transition-all placeholder:text-slate-400"
                    placeholder="Provide specific details for approval..."
                  />
                </div>

                <div className={`p-5 rounded-3xl border-2 transition-all ${isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-4 cursor-pointer w-full">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors shrink-0 ${isUrgent ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-300'}`}>
                        {isUrgent && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                    </div>
                    <div>
                      <span className={`text-base font-bold block ${isUrgent ? 'text-rose-700' : 'text-slate-700'}`}>Mark as Priority/Urgent</span>
                      <span className="text-xs font-medium text-slate-500">Bypasses normal queue</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isUrgent} 
                      onChange={(e) => setIsUrgent(e.target.checked)}
                      className="hidden"
                    />
                  </label>

                  {isUrgent && (
                    <div className="mt-5 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-rose-800 mb-2 uppercase tracking-wide">Priority Justification</label>
                      <textarea
                        required={isUrgent}
                        rows={2}
                        value={priorityReason}
                        onChange={(e) => setPriorityReason(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-rose-200 bg-white rounded-2xl focus:border-rose-400 focus:ring-4 focus:ring-rose-100 outline-none text-sm resize-none transition-all"
                        placeholder="Why does this need immediate approval?"
                      />
                      <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Triggers emergency notification
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#002855] text-white py-4 rounded-2xl font-bold tracking-wide shadow-xl shadow-[#002855]/20 hover:bg-[#001D3D] hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 text-lg mt-8"
                >
                  Confirm & Submit
                </button>
              </form>
          </div>
        ) : (
          <div className="-mx-4 md:mx-0 animate-in fade-in slide-in-from-right-4 duration-300">
             <GatepassTracker />
          </div>
        )}
      </div>
    </div>
  );
}
