import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { Search, UserCircle, QrCode, Scan, ShieldAlert, ArrowRightCircle, ArrowLeftCircle, XCircle, CheckCircle2, Clock, MapPin, Briefcase, FileText, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function SecurityDashboard() {
  const { user } = useAuthStore();
  const [passNumber, setPassNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [searchMode, setSearchMode] = useState<'qr_cam' | 'code' | 'manual' | 'emergency'>('qr_cam');
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emergencyRequests, setEmergencyRequests] = useState<any[]>([]);
  const [movementConfirmation, setMovementConfirmation] = useState<'ENTRY' | 'EXIT' | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [timeNow, setTimeNow] = useState(new Date());

  // Update time for late return calculation in UI
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);


  const fetchEmergencyRequests = async () => {
    try {
      const { data } = await axios.get('/api/gatepass/emergency-pending');
      setEmergencyRequests(data);
    } catch (e) { console.error(e); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lookupPass = async (query: string, type: 'qr' | 'code' | 'empId') => {
    setLoading(true);
    setScanResult(null);

    try {
      let url = `/api/gatepass/lookup?${type}=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url);
      setScanResult(data);
    } catch (err: any) {
      let errText = err.response?.data?.error;
      if (!errText && err.message === 'Network Error') errText = 'CONNECTION OFFLINE. RETRYING...';
      setScanResult({ error: errText || 'Pass lookup failed' });
      if (searchMode === 'qr_cam' && scannerRef.current) {
         setTimeout(() => {
           try {
             scannerRef.current?.resume();
             setScanResult(null); // auto resume
           } catch (e) {}
         }, 4000);
      }
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (searchMode === 'emergency') {
      fetchEmergencyRequests();
    }
  }, [searchMode]);

  // Initialize camera scanner
  useEffect(() => {
    if (searchMode === 'qr_cam') {
      scannerRef.current = new Html5QrcodeScanner(
        "security-qr-reader",
        { fps: 15, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0 },
        false
      );

      scannerRef.current.render(async (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.pause(true);
        }
        await lookupPass(decodedText, 'qr');
      }, (err) => {});

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.error("Scanner clear fail", e));
        }
      };
    }
  }, [searchMode]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (searchMode === 'code') {
      const codeStr = secretCode.trim().toUpperCase();
      if (!codeStr || codeStr.length < 4 || /[^A-Z0-9-]/.test(codeStr)) {
        alert('Invalid secret code format.');
        return;
      }
      lookupPass(codeStr, 'code');
    }
    
    if (searchMode === 'manual') {
      const empStr = employeeId.trim();
      if (!empStr) return;
      lookupPass(empStr, 'empId');
    }
  };

  const handleProvisionalOverride = async (movementType: 'EXIT' | 'ENTRY') => {
    const reason = prompt('PROVISIONAL OVERRIDE REASON (Required):');
    if (!reason) return;
    
    setLoading(true);
    try {
      await axios.post(`/api/gatepass/${scanResult.id}/provisional-override`, { 
        movementType, 
        reason 
      });
      
      setScanResult({
        ...scanResult,
        status: movementType === 'EXIT' ? 'OUT' : 'RETURNED',
        successMsg: `PROVISIONAL ${movementType} recorded successfully.`
      });
      fetchEmergencyRequests();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to record provisional movement');
    } finally {
      setLoading(false);
    }
  };

  const getLateStatus = () => {
    if (!scanResult || !scanResult.expectedReturnTime) return false;
    // Assume 15 minute grace period for UI logic if not fetched specifically, backend governs Truth
    const threshold = new Date(new Date(scanResult.expectedReturnTime).getTime() + 15 * 60000); 
    return timeNow > threshold;
  };

  const handleMarkMovement = async (movementType: 'EXIT' | 'ENTRY') => {
    if (loading) return;
    setLoading(true);
    
    try {
      const vMode = searchMode === 'code' ? 'MANUAL_CODE' : searchMode === 'qr_cam' ? 'QR_SCAN' : 'ADMIN_OVERRIDE';
      const { data } = await axios.post(`/api/gatepass/${scanResult.id}/movement`, { 
        movementType, 
        securityGuardId: user?.id, 
        verificationMode: vMode 
      });
      
      const isLate = data.late_return;
      setScanResult({
        ...scanResult,
        status: movementType === 'EXIT' ? 'OUT' : 'RETURNED',
        successMsg: isLate ? `ENTRY LOGGED WITH LATE VIOLATION.` : `${movementType} logged successfully.`,
        isLate: isLate
      });
      setMovementConfirmation(null);
      
    } catch (e: any) {
      setScanResult((prev: any) => ({
        ...prev,
        error: e.response?.data?.error || 'Failed to mark movement'
      }));
      setMovementConfirmation(null);
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setSearchMode('qr_cam');
    setSecretCode('');
    setEmployeeId('');
    setMovementConfirmation(null);
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {}
    }
  };

  if (!user || (user.role !== 'SECURITY_GUARD' && user.role !== 'SUPER_ADMIN')) {
    return <div className="p-8 text-center text-gray-500 font-bold">Access Denied: Security Personnel Only.</div>;
  }

  // Calculate dynamic colors based on state
  let resultBg = 'bg-slate-900 border-slate-800';
  let resultText = 'text-white';
  const isCurrentlyLate = getLateStatus();
  
  if (scanResult) {
    if (scanResult.error) {
      resultBg = 'bg-rose-600 border-rose-700'; // RED
    } else if (scanResult.status === 'OUT' || scanResult.status === 'RETURNED' && scanResult.successMsg) {
      resultBg = scanResult.successMsg && scanResult.successMsg.includes('LATE') ? 'bg-amber-500 border-amber-600' : 'bg-blue-600 border-blue-700'; // BLUE for OUT/Success
    } else if (isCurrentlyLate && scanResult.status !== 'RETURNED') {
      resultBg = 'bg-amber-500 border-amber-600'; // YELLOW
      resultText = 'text-slate-900';
    } else if (scanResult.isLate || scanResult.is_priority) {
      resultBg = 'bg-amber-500 border-amber-600'; // YELLOW
      resultText = 'text-slate-900';
    } else if (scanResult.successMsg || scanResult.status === 'APPROVED') {
      resultBg = 'bg-emerald-500 border-emerald-600'; // GREEN
    } else if (['REJECTED', 'VOID'].includes(scanResult.status)) {
      resultBg = 'bg-rose-600 border-rose-700'; // RED
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans -mx-4 -my-8 md:mx-0 md:my-0 md:min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center shrink-0 shadow-lg z-10">
         <div>
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">Gate Security</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Terminal 1 • Nominal</p>
         </div>
         <div className="flex bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => { setScanResult(null); setSearchMode('qr_cam'); }}
              className={`p-3 rounded-lg flex items-center justify-center transition-all ${searchMode === 'qr_cam' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
            >
               <Scan className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { setScanResult(null); setSearchMode('code'); }}
              className={`p-3 rounded-lg flex items-center justify-center transition-all ${searchMode === 'code' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
            >
               <QrCode className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { setScanResult(null); setSearchMode('manual'); }}
              className={`p-3 rounded-lg flex items-center justify-center transition-all ${searchMode === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
            >
               <UserCircle className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { setScanResult(null); setSearchMode('emergency'); }}
              className={`p-3 rounded-lg flex items-center justify-center transition-all ${searchMode === 'emergency' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-500 hover:text-rose-400'}`}
            >
               <ShieldAlert className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
        
        {!scanResult && searchMode === 'qr_cam' && (
           <div className="flex-1 flex flex-col h-full bg-black rounded-3xl overflow-hidden border-2 border-slate-800 relative shadow-2xl animate-in fade-in zoom-in-95">
              <div id="security-qr-reader" className="w-full h-full object-cover"></div>
              <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                 <p className="inline-block bg-black/60 backdrop-blur px-6 py-2 rounded-full text-white font-bold tracking-[0.2em] uppercase text-xs border border-white/10 shadow-xl">
                   Ready to Scan
                 </p>
              </div>
           </div>
        )}

        {!scanResult && searchMode !== 'qr_cam' && searchMode !== 'emergency' && (
           <div className="flex-1 flex flex-col justify-center items-center px-4 animate-in fade-in slide-in-from-bottom-8">
              <form onSubmit={handleManualSearch} className="w-full max-w-sm space-y-6 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                 <div className="text-center mb-6">
                    <h2 className="text-white font-bold text-xl uppercase tracking-wider">{searchMode === 'code' ? 'Secret Code' : 'Employee ID'}</h2>
                    <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Manual entry fallback</p>
                 </div>
                 
                 {searchMode === 'code' ? (
                   <input
                     type="text"
                     placeholder="NLG-XXXX"
                     value={secretCode}
                     onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                     className="w-full bg-slate-950 border-2 border-slate-700 text-white text-center text-3xl font-mono font-black py-4 rounded-xl focus:border-blue-500 focus:ring-0 outline-none uppercase tracking-[0.2em]"
                     autoFocus
                     required
                   />
                 ) : (
                   <input
                     type="text"
                     placeholder="E.g. E101"
                     value={employeeId}
                     onChange={(e) => setEmployeeId(e.target.value)}
                     className="w-full bg-slate-950 border-2 border-slate-700 text-white text-center text-3xl font-mono font-black py-4 rounded-xl focus:border-blue-500 focus:ring-0 outline-none uppercase tracking-[0.2em]"
                     autoFocus
                     required
                   />
                 )}
                 <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full bg-blue-600 text-white py-5 rounded-xl font-black text-xl uppercase tracking-widest hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50"
                 >
                   {loading ? 'Verifying...' : 'Verify Pass'}
                 </button>
              </form>
           </div>
        )}

        {!scanResult && searchMode === 'emergency' && (
          <div className="flex-1 flex flex-col px-4 py-8 animate-in fade-in slide-in-from-bottom-8">
            <h2 className="text-rose-500 font-black text-2xl uppercase tracking-wider mb-6 flex items-center justify-center gap-3">
              <ShieldAlert className="w-8 h-8" />
              EMERGENCY REQUESTS PENDING
            </h2>
            {emergencyRequests.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">No pending emergency requests.</div>
            ) : (
              <div className="grid gap-4 w-full max-w-4xl mx-auto">
                {emergencyRequests.map((req) => (
                  <div key={req.request_id} className="bg-rose-950 border border-rose-900 rounded-2xl p-6 flex justify-between items-center shadow-lg">
                    <div>
                       <h3 className="text-white text-xl font-bold uppercase">{req.first_name} {req.last_name}</h3>
                       <p className="text-rose-400 text-sm font-medium tracking-wider">{req.employee_code} • GP-{req.request_id}</p>
                       <p className="text-slate-300 mt-2 text-sm max-w-md">{req.reason}</p>
                    </div>
                    <button 
                      onClick={() => setScanResult({
                        id: req.request_id,
                        type: req.request_type,
                        employeeName: req.first_name + ' ' + req.last_name,
                        status: req.current_status,
                        is_emergency: true
                      })}
                      className="bg-rose-600 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-rose-500 active:scale-95"
                    >
                      Provisional
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Massive Validation Card */}
        {scanResult && (
           <div className={`absolute inset-4 z-20 flex flex-col rounded-3xl border-4 ${resultBg} ${resultText} shadow-2xl animate-in zoom-in-90 slide-in-from-bottom-12 duration-300 overflow-hidden`}>
              
              {/* Header result */}
              <div className="px-6 pt-8 pb-6 text-center shrink-0 border-b border-black/10 flex-col flex items-center relative gap-2">
                 {scanResult.error ? (
                    <div className="flex flex-col items-center gap-4">
                      <XCircle className="w-20 h-20 text-white" />
                      <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">FAILED</h2>
                      <p className="text-xl font-bold bg-black/20 px-4 py-2 rounded-lg backdrop-blur">{scanResult.error}</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center w-full">
                       {scanResult.successMsg ? (
                         <div className="flex flex-col items-center animate-in zoom-in-50 fade-in duration-300">
                           <CheckCircle2 className="w-16 h-16 mb-2 opacity-90" />
                           <h2 className="text-2xl font-black uppercase tracking-widest">{scanResult.successMsg}</h2>
                         </div>
                       ) : (
                         <div className="flex flex-col w-full h-full max-w-lg mx-auto">
                           <div className="flex justify-between items-start mb-6">
                             <div className="bg-black/10 px-4 py-1.5 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-2">
                               {scanResult.type} PASS
                               <span className="opacity-50">|</span>
                               GP-{scanResult.id}
                             </div>
                             <div className="bg-black/10 px-4 py-1.5 rounded-xl font-bold uppercase tracking-widest text-sm text-right">
                               <div className="opacity-70 text-xs">STATUS</div>
                               {scanResult.status}
                             </div>
                           </div>
                           
                           {/* Employee Info Block */}
                           <div className="flex flex-col md:flex-row items-center md:items-start gap-6 w-full bg-black/5 p-6 rounded-2xl border border-black/10">
                              {scanResult.photoUrl ? (
                                <img src={scanResult.photoUrl} alt="Employee" className="w-28 h-28 object-cover rounded-2xl shadow-lg bg-black/10 border-2 border-white/20 shrink-0" />
                              ) : (
                                <div className="w-28 h-28 bg-black/20 rounded-2xl flex items-center justify-center border-2 border-white/20 shrink-0">
                                  <UserCircle className="w-16 h-16 opacity-50" />
                                </div>
                              )}
                              
                              <div className="text-center md:text-left flex-1 w-full space-y-2">
                                 <h2 className="text-3xl font-black tracking-tight leading-none mb-1">{scanResult.employeeName}</h2>
                                 <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold opacity-80 uppercase tracking-widest">
                                   <Briefcase className="w-4 h-4" /> {scanResult.employeeCode || 'N/A'} • {scanResult.department || 'DEPT'}
                                 </div>
                                 <div className="text-sm font-bold opacity-80 flex items-center justify-center md:justify-start gap-2">
                                   <FileText className="w-4 h-4" /> {scanResult.reason || 'No Reason Provided'}
                                 </div>
                                 
                                 {scanResult.expectedReturnTime && (
                                   <div className="mt-4 inline-flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-lg text-sm font-bold">
                                     <Clock className="w-4 h-4" /> Expected return: {new Date(scanResult.expectedReturnTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </div>
                                 )}
                              </div>
                           </div>

                           {/* Late Return Warning */}
                           {isCurrentlyLate && scanResult.status !== 'RETURNED' && !scanResult.successMsg && (
                              <div className="mt-4 bg-rose-500 text-white p-4 rounded-xl flex items-center gap-4 font-bold uppercase tracking-widest shadow-lg border-2 border-rose-600 animate-pulse border-dashed">
                                 <AlertTriangle className="w-8 h-8 shrink-0" />
                                 <div className="text-left flex-1 w-full">
                                   <div className="text-xl">LATE RETURN WARNING</div>
                                   <div className="text-xs opacity-90 mt-1 max-w-[250px]">Expected: {new Date(scanResult.expectedReturnTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Actual: {timeNow.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                 </div>
                              </div>
                           )}
                           
                           {/* Priority / Emergency Banner */}
                           {(scanResult.is_emergency || scanResult.is_priority) && !scanResult.successMsg && (
                              <div className="mt-4 bg-amber-500 text-slate-900 px-4 py-3 rounded-xl flex items-center gap-3 font-black uppercase tracking-widest border-2 border-amber-600">
                                <AlertCircle className="w-6 h-6" /> {scanResult.is_emergency ? 'EMERGENCY' : 'PRIORITY'} PASS ACTIVE
                              </div>
                           )}
                         </div>
                       )}
                    </div>
                 )}
              </div>

              {/* Action Area */}
              <div className="flex-1 flex flex-col justify-end p-6 bg-black/10 overflow-hidden relative">
                 {loading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-b-2xl">
                       <Loader2 className="w-16 h-16 animate-spin text-white" />
                    </div>
                 )}
                 
                 {!scanResult.error && !scanResult.successMsg && (
                    <div className="flex flex-col gap-4 h-full justify-end max-w-lg mx-auto w-full">
                       
                       {/* Pre-Confirmation Screen */}
                       {!movementConfirmation && (
                         <>
                           {scanResult.is_emergency ? (
                             <>
                                <div className="text-center font-bold uppercase mb-2 tracking-widest text-sm opacity-80">Emergency Override Action</div>
                                <button 
                                  onClick={() => setMovementConfirmation('EXIT')}
                                  className="flex-1 max-h-24 bg-rose-600 text-white rounded-2xl font-black text-2xl md:text-3xl uppercase tracking-widest flex items-center justify-center gap-4 shadow-[0_8px_0_#be123c] active:translate-y-2 active:shadow-none transition-all"
                                >
                                  <ArrowRightCircle className="w-8 h-8 md:w-10 md:h-10 shrink-0" /> OVERRIDE OUT
                                </button>
                                <button 
                                  onClick={() => setMovementConfirmation('ENTRY')}
                                  className="flex-1 max-h-24 bg-emerald-600 text-white rounded-2xl font-black text-2xl md:text-3xl uppercase tracking-widest flex items-center justify-center gap-4 shadow-[0_8px_0_#047857] active:translate-y-2 active:shadow-none transition-all"
                                >
                                  <ArrowLeftCircle className="w-8 h-8 md:w-10 md:h-10 shrink-0" /> OVERRIDE IN
                                </button>
                             </>
                           ) : (
                             <>
                                <button 
                                  onClick={() => setMovementConfirmation('EXIT')}
                                  disabled={scanResult.status !== 'APPROVED'}
                                  className="flex-1 max-h-28 bg-[#ff4d4d] text-white rounded-2xl font-black text-3xl md:text-4xl uppercase tracking-widest flex items-center justify-center gap-4 shadow-[0_8px_0_#cc0000] active:translate-y-2 active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  <ArrowRightCircle className="w-10 h-10 shrink-0" /> CHECK OUT
                                </button>
                                <button 
                                  onClick={() => setMovementConfirmation('ENTRY')}
                                  disabled={scanResult.status !== 'OUT'}
                                  className="flex-1 max-h-28 bg-[#28a745] text-white rounded-2xl font-black text-3xl md:text-4xl uppercase tracking-widest flex items-center justify-center gap-4 shadow-[0_8px_0_#1e7e34] active:translate-y-2 active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  <ArrowLeftCircle className="w-10 h-10 shrink-0" /> CHECK IN
                                </button>
                             </>
                           )}
                         </>
                       )}

                       {/* Confirmation Screen */}
                       {movementConfirmation && (
                         <div className="flex-1 flex flex-col justify-end animate-in slide-in-from-bottom-8">
                           <div className="bg-white/10 backdrop-blur border border-white/20 p-6 rounded-3xl mb-4 text-center">
                             <h3 className="font-black text-2xl tracking-widest uppercase mb-2">Confirm {movementConfirmation}</h3>
                             <p className="font-bold opacity-80 uppercase text-sm">Verify employee identity before proceeding.</p>
                           </div>
                           <div className="flex gap-4">
                             <button
                               onClick={() => setMovementConfirmation(null)}
                               className="flex-1 py-6 bg-black/20 rounded-2xl font-black text-xl uppercase tracking-widest border-2 border-black/10 hover:bg-black/30 active:scale-95 transition-all"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={() => scanResult.is_emergency ? handleProvisionalOverride(movementConfirmation) : handleMarkMovement(movementConfirmation)}
                               className={`flex-1 py-6 rounded-2xl font-black text-3xl uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${movementConfirmation === 'ENTRY' ? 'bg-[#28a745]' : 'bg-[#ff4d4d]'}`}
                             >
                               CONFIRM
                             </button>
                           </div>
                         </div>
                       )}

                    </div>
                 )}

                 {/* Reset Button */}
                 {(!movementConfirmation || scanResult.error || scanResult.successMsg) && (
                   <button 
                     onClick={resetScan}
                     disabled={loading}
                     className={`w-full max-w-lg mx-auto py-6 rounded-2xl font-black text-xl uppercase tracking-widest mt-auto border-4 transition-all active:scale-95 ${scanResult.error || scanResult.successMsg ? 'bg-black/20 border-transparent hover:bg-black/30' : 'bg-transparent border-black/20 text-current hover:bg-black/10'}`}
                   >
                     {scanResult.successMsg || scanResult.error ? 'Scan Next Pass' : 'Cancel Lookup'}
                   </button>
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
