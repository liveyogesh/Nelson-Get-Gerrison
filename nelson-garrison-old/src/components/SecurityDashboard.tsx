import React, { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { Search, UserCircle, QrCode } from 'lucide-react';
import axios from 'axios';

export default function SecurityDashboard() {
  const { user } = useAuthStore();
  const [passNumber, setPassNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [searchMode, setSearchMode] = useState<'qr' | 'code' | 'manual'>('qr');
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // In a real app, this might come from a selected context
  const currentGateId = 1; 

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setScanResult(null);

    try {
      let url = '';
      if (searchMode === 'qr') url = `/api/gatepass/lookup?qr=${encodeURIComponent(passNumber)}`;
      else if (searchMode === 'code') url = `/api/gatepass/lookup?code=${encodeURIComponent(secretCode)}`;
      else url = `/api/gatepass/lookup?empId=${encodeURIComponent(employeeId)}`;
      
      const { data } = await axios.get(url);
      setScanResult(data);
    } catch (e: any) {
      setScanResult({ error: e.response?.data?.error || 'Pass not found or invalid' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkMovement = async (movementType: 'EXIT' | 'ENTRY') => {
    try {
      let vMode = searchMode === 'code' ? 'MANUAL_CODE' : searchMode === 'qr' ? 'QR_SCAN' : 'ADMIN_OVERRIDE';
      await axios.post(`/api/gatepass/${scanResult.id}/movement`, { movementType, securityGuardId: user?.id, verificationMode: vMode });
      alert(`Marked ${movementType} for ${scanResult.employeeName}`);
      setPassNumber('');
      setEmployeeId('');
      setSecretCode('');
      setScanResult(null);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to mark movement');
    }
  };

  if (!user || (user.role !== 'SECURITY_GUARD' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have permission to view the Security Dashboard.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-[#003366] mb-8">Security Gateway</h1>
      
      <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-semibold flex items-center text-gray-800">
            <Search className="w-6 h-6 mr-3 text-[#28a745]" />
            Lookup Pass
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-lg mt-4 sm:mt-0 flex-wrap">
            <button 
              onClick={() => setSearchMode('qr')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 ${searchMode === 'qr' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <QrCode className="w-4 h-4" /> QR / ID
            </button>
            <button 
              onClick={() => setSearchMode('code')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 ${searchMode === 'code' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Search className="w-4 h-4" /> Secret Code
            </button>
            <button 
              onClick={() => setSearchMode('manual')}
              className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 ${searchMode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <UserCircle className="w-4 h-4" /> Emp ID
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
          {searchMode === 'qr' ? (
            <input
              type="text"
              placeholder="Enter or scan pass number..."
              value={passNumber}
              onChange={(e) => setPassNumber(e.target.value)}
              required
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none text-lg"
              autoFocus
            />
          ) : searchMode === 'code' ? (
             <input
              type="text"
              placeholder="Enter 8-character Secret Code (e.g. NLG-XXXX)..."
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
              required
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-mono tracking-widest focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none text-lg uppercase"
              autoFocus
            />
          ) : (
             <input
              type="text"
              placeholder="Enter Employee ID (e.g. E101)..."
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none text-lg"
              autoFocus
            />
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#003366] text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors shadow-md disabled:bg-blue-400"
          >
            {loading ? 'Searching...' : 'Verify'}
          </button>
        </form>
        {searchMode === 'manual' && (
          <p className="text-xs text-slate-500 mb-8 ml-2">Use Manual Search when the staff's mobile device is unavailable.</p>
        )}

        {scanResult && (
          <div className={`mt-6 rounded-xl border p-6 ${scanResult.error ? 'border-red-200 bg-red-50' : scanResult.is_priority || scanResult.status === 'OUT' ? 'border-amber-200 bg-amber-50' : scanResult.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            {scanResult.error ? (
               <div className="flex items-center text-red-600">
                 <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <p className="font-medium text-lg">{scanResult.error}</p>
               </div>
            ) : (
               <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-3 py-1 bg-[#003366] text-white text-xs font-bold rounded-full tracking-wide uppercase">
                          {scanResult.type}
                        </span>
                        {scanResult.is_priority === 1 && (
                          <span className="inline-block px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full tracking-wide uppercase">
                            PRIORITY
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{scanResult.employeeName}</h3>
                      <p className="text-gray-500 mt-1">Status: <span className={`font-bold ${scanResult.status === 'APPROVED' ? 'text-emerald-600' : scanResult.status === 'OUT' ? 'text-amber-600' : 'text-slate-600'}`}>{scanResult.status}</span></p>
                    </div>
                  </div>
                  
                  <div className={`flex gap-4 border-t pt-6 ${scanResult.is_priority || scanResult.status === 'OUT' ? 'border-amber-200' : 'border-emerald-200'}`}>
                     <button 
                       onClick={() => handleMarkMovement('EXIT')}
                       disabled={scanResult.status !== 'APPROVED'}
                       className="flex-1 bg-white border-2 border-[#ff4d4d] text-[#ff4d4d] py-4 rounded-xl font-bold text-lg hover:bg-red-50 transition-colors disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-50"
                     >
                       MARK EXIT
                     </button>
                     <button 
                       onClick={() => handleMarkMovement('ENTRY')}
                       disabled={scanResult.status !== 'OUT'}
                       className="flex-1 bg-[#28a745] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                     >
                       MARK ENTRY
                     </button>
                  </div>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
