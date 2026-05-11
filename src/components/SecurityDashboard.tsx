import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { Search, UserCircle, QrCode, Scan, ShieldAlert, ArrowRightCircle, ArrowLeftCircle, XCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function SecurityDashboard() {
  const { user } = useAuthStore();
  const [passNumber, setPassNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [searchMode, setSearchMode] = useState<'qr_cam' | 'code' | 'manual'>('qr_cam');
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

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

  const lookupPass = async (query: string, type: 'qr' | 'code' | 'empId') => {
    setLoading(true);
    setScanResult(null);

    try {
      let url = `/api/gatepass/lookup?${type}=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url);
      setScanResult(data);
    } catch (e: any) {
      setScanResult({ error: e.response?.data?.error || 'Pass not found or invalid' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === 'code') lookupPass(secretCode.toUpperCase(), 'code');
    if (searchMode === 'manual') lookupPass(employeeId, 'empId');
  };

  const handleMarkMovement = async (movementType: 'EXIT' | 'ENTRY') => {
    try {
      const vMode = searchMode === 'code' ? 'MANUAL_CODE' : searchMode === 'qr_cam' ? 'QR_SCAN' : 'ADMIN_OVERRIDE';
      const { data } = await axios.post(`/api/gatepass/${scanResult.id}/movement`, { 
        movementType, 
        securityGuardId: user?.id, 
        verificationMode: vMode 
      });
      
      const isLate = data.lateReturn;
      setScanResult({
        ...scanResult,
        status: movementType === 'EXIT' ? 'OUT' : 'RETURNED',
        successMsg: `${movementType} logged successfully.`,
        isLate: isLate
      });
      
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to mark movement');
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setSearchMode('qr_cam');
    setSecretCode('');
    setEmployeeId('');
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  if (!user || (user.role !== 'SECURITY_GUARD' && user.role !== 'SUPER_ADMIN')) {
    return <div className="p-8 text-center text-gray-500 font-bold">Access Denied: Security Personnel Only.</div>;
  }

  // Calculate dynamic colors based on state
  let resultBg = 'bg-slate-900 border-slate-800';
  let resultText = 'text-white';
  
  if (scanResult) {
    if (scanResult.error) {
      resultBg = 'bg-rose-600 border-rose-700'; // RED
    } else if (scanResult.isLate || scanResult.status === 'OUT' || scanResult.is_priority) {
      resultBg = 'bg-amber-500 border-amber-600'; // YELLOW
      resultText = 'text-slate-900';
    } else if (scanResult.successMsg || scanResult.status === 'APPROVED') {
      resultBg = 'bg-emerald-500 border-emerald-600'; // GREEN
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

        {!scanResult && searchMode !== 'qr_cam' && (
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

        {/* Massive Validation Card */}
        {scanResult && (
           <div className={`absolute inset-4 z-20 flex flex-col rounded-3xl border-4 ${resultBg} ${resultText} shadow-2xl animate-in zoom-in-90 slide-in-from-bottom-12 duration-300 overflow-hidden`}>
              
              {/* Header result */}
              <div className="px-6 pt-10 pb-6 text-center shrink-0 border-b border-black/10">
                 {scanResult.error ? (
                    <div className="flex flex-col items-center gap-4">
                      <XCircle className="w-20 h-20 text-white" />
                      <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">INVALID PASS</h2>
                      <p className="text-xl font-bold bg-black/20 px-4 py-2 rounded-lg backdrop-blur">{scanResult.error}</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center">
                       {scanResult.successMsg ? (
                         <CheckCircle2 className="w-16 h-16 mb-4 opacity-90" />
                       ) : (
                         <div className="bg-black/10 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-sm mb-4">
                           Pass Found • GP-{scanResult.id}
                         </div>
                       )}
                       
                       <h2 className="text-4xl font-black tracking-tight leading-none mb-2">{scanResult.employeeName}</h2>
                       <p className="text-lg font-bold opacity-80 uppercase tracking-widest">{scanResult.type} PASS</p>
                       
                       {scanResult.isLate && (
                          <div className="mt-4 bg-black/20 text-black px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-widest border-2 border-black/10">
                             <ShieldAlert className="w-5 h-5" />
                             Late Return Flagged
                          </div>
                       )}
                    </div>
                 )}
              </div>

              {/* Action Area */}
              <div className="flex-1 flex flex-col justify-end p-6 bg-black/5">
                 {!scanResult.error && !scanResult.successMsg && (
                    <div className="flex flex-col gap-4 h-full justify-center">
                       <button 
                         onClick={() => handleMarkMovement('EXIT')}
                         disabled={scanResult.status !== 'APPROVED'}
                         className="flex-1 max-h-32 bg-[#ff4d4d] text-white rounded-2xl font-black text-3xl uppercase tracking-widest flex items-center justify-center gap-4 shadow-[0_8px_0_#cc0000] active:translate-y-2 active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none"
                       >
                         <ArrowRightCircle className="w-10 h-10" /> OUT
                       </button>
                       <button 
                         onClick={() => handleMarkMovement('ENTRY')}
                         disabled={scanResult.status !== 'OUT'}
                         className="flex-1 max-h-32 bg-[#28a745] text-white rounded-2xl font-black text-3xl uppercase tracking-widest flex items-center justify-center gap-4 shadow-[0_8px_0_#1e7e34] active:translate-y-2 active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none"
                       >
                         <ArrowLeftCircle className="w-10 h-10" /> IN
                       </button>
                    </div>
                 )}

                 {/* Reset Button */}
                 <button 
                   onClick={resetScan}
                   className={`w-full py-6 rounded-2xl font-black text-xl uppercase tracking-widest mt-auto border-4 transition-all active:scale-95 ${scanResult.error || scanResult.successMsg ? 'bg-black/20 border-transparent hover:bg-black/30' : 'bg-transparent border-black/20 text-current hover:bg-black/10'}`}
                 >
                   {scanResult.successMsg || scanResult.error ? 'Scan Next' : 'Cancel'}
                 </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
