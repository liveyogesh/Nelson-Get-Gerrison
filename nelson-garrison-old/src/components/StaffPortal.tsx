import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { ClipboardList, PlusCircle, QrCode, X, Scan } from 'lucide-react';
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

  // QR Scanner Logic
  useEffect(() => {
    if (activeTab === 'scan') {
      const scanner = new Html5QrcodeScanner(
        "staff-qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(async (decodedText) => {
        scanner.clear();
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gatepass/scan-entry`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ qr: decodedText })
          });
          const result = await response.json();
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gatepass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: requestType,
          reason,
          isPriority: isUrgent,
          priorityReason,
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setLastPass({ 
          id: result.id, 
          type: requestType,
          qr: result.qr,
          secret_pass_code: result.secret_pass_code
        });
        // Clear form
        setReason('');
        setIsUrgent(false);
        setPriorityReason('');
      } else {
        alert('Failed to submit: ' + result.error);
      }
    } catch (e: any) {
      alert('Error submitting gatepass: ' + e.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 bg-white sm:shadow-lg sm:rounded-2xl sm:mt-8 mb-20 md:mb-8">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Staff Portal</h1>
          <p className="text-gray-500 text-sm mt-1">{activeTab === 'new' ? 'New Gatepass Request' : 'My Requests & Status'}</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('new')}
            className={`p-2 rounded-md transition-all ${activeTab === 'new' ? 'bg-white shadow-sm text-[#003366]' : 'text-slate-400'}`}
            title="New Request"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`p-2 rounded-md transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-[#003366]' : 'text-slate-400'}`}
            title="History"
          >
            <ClipboardList className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('scan')}
            className={`p-2 rounded-md transition-all ${activeTab === 'scan' ? 'bg-white shadow-sm text-[#003366]' : 'text-slate-400'}`}
            title="Scan QR"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTab === 'scan' ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
           {scannedResult ? (
             <div className={`${scannedResult.late_return ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} border rounded-2xl p-8 text-center`}>
                <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border ${scannedResult.late_return ? 'border-amber-100 text-amber-600' : 'border-emerald-100 text-emerald-600'} shadow-sm`}>
                   <Scan className="w-10 h-10" />
                </div>
                <h4 className={`${scannedResult.late_return ? 'text-amber-900' : 'text-emerald-900'} font-bold text-xl mb-1`}>Pass Validated {scannedResult.late_return && '(Late)'}</h4>
                <p className={`${scannedResult.late_return ? 'text-amber-700' : 'text-emerald-700'} font-medium text-sm mb-4`}>{scannedResult.id}</p>
                <div className={`inline-flex items-center gap-2 ${scannedResult.late_return ? 'bg-amber-600' : 'bg-emerald-600'} text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest`}>
                   Access Logged • {scannedResult.time}
                </div>
                {scannedResult.late_return && (
                   <p className="text-xs text-amber-700 mt-4 font-bold">A late return violation has been logged.</p>
                )}
                <button 
                  onClick={() => setScannedResult(null)}
                  className={`w-full mt-8 bg-white border ${scannedResult.late_return ? 'border-amber-200 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-100'} font-bold py-3 rounded-xl transition-colors`}
                >
                  Scan Another
                </button>
             </div>
           ) : (
             <div className="space-y-4">
                <div id="staff-qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50"></div>
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Align pass QR within frame</p>
                <button 
                  onClick={() => setActiveTab('new')}
                  className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                   Cancel Scanning
                </button>
             </div>
           )}
        </div>
      ) : activeTab === 'new' ? (
        <>
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
            <div>
               <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Personal Quota</p>
               <p className="text-sm text-blue-900 mt-1">This Month</p>
            </div>
            <div className="text-right">
               <span className="text-2xl font-bold text-[#003366]">{personalPassesLimit - personalPassesUsed}</span>
               <span className="text-blue-700 text-sm ml-1">left</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pass Type</label>
          <div className="grid grid-cols-2 gap-3">
            {['PERSONAL', 'OFFICIAL', 'EMERGENCY', 'NIGHT'].map(type => (
              <label 
                key={type} 
                className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer text-sm font-medium transition-colors
                  ${requestType === type ? 'bg-[#003366] text-white border-[#003366]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}
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
                {type}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason for Request</label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] outline-none text-sm resize-none"
            placeholder="Please provide details..."
          />
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
             <label className="flex items-center gap-2 cursor-pointer">
               <input 
                 type="checkbox" 
                 checked={isUrgent} 
                 onChange={(e) => setIsUrgent(e.target.checked)}
                 className="w-4 h-4 text-[#ff4d4d] rounded focus:ring-[#ff4d4d]"
               />
               <span className={`text-sm font-bold ${isUrgent ? 'text-[#ff4d4d]' : 'text-gray-700'}`}>Priority / Urgent Flag</span>
             </label>
          </div>
          {isUrgent && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-semibold text-red-800 mb-1">Priority Justification</label>
              <textarea
                required={isUrgent}
                rows={2}
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 bg-white rounded-lg focus:ring-2 focus:ring-[#ff4d4d] outline-none text-sm resize-none"
                placeholder="Bypasses normal queue..."
              />
              <p className="text-[10px] text-red-600 mt-1.5">* Priority requests are dual-notified immediately to HOD & HR.</p>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#003366] text-white py-3.5 rounded-xl font-bold tracking-wide shadow-md hover:bg-blue-800 transition-colors mt-4"
        >
          Submit Request
        </button>
      </form>

          {lastPass && (
            <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-100">
                 <img src={lastPass.qr} className="w-40 h-40" alt="Gatepass QR" />
              </div>
              <div className="text-center">
                <h4 className="text-emerald-800 font-bold text-sm mb-1">Request Submitted!</h4>
                <p className="text-[10px] text-emerald-700 font-mono font-bold uppercase tracking-widest">Pass ID: GP-{lastPass.id}</p>
                {lastPass.secret_pass_code && (
                  <p className="text-sm font-mono font-black text-slate-800 tracking-wider bg-white px-3 py-1 rounded border shadow-sm mt-3">{lastPass.secret_pass_code}</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <GatepassTracker />
      )}
    </div>
  );
}
