import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Shield, 
  UserCircle, 
  ChevronDown, 
  ChevronUp, 
  XCircle, 
  LogOut, 
  RotateCcw,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

export default function GatepassTracker() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gatepass/my-requests`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setRequests(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED': 
        return { 
          color: 'text-emerald-600 bg-emerald-50 border-emerald-100', 
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'Authorized'
        };
      case 'REJECTED': 
        return { 
          color: 'text-rose-600 bg-rose-50 border-rose-100', 
          icon: <XCircle className="w-3 h-3" />,
          label: 'Denied'
        };
      case 'PENDING': 
        return { 
          color: 'text-amber-600 bg-amber-50 border-amber-100', 
          icon: <Clock className="w-3 h-3" />,
          label: 'Awaiting Approval'
        };
      case 'OUT': 
        return { 
          color: 'text-blue-600 bg-blue-50 border-blue-100', 
          icon: <LogOut className="w-3 h-3 rotate-180" />,
          label: 'Off-site'
        };
      case 'RETURNED': 
        return { 
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100', 
          icon: <RotateCcw className="w-3 h-3" />,
          label: 'Returned'
        };
      case 'ESCALATED_TO_HR':
        return {
          color: 'text-purple-600 bg-purple-50 border-purple-100',
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Escalated'
        }
      default: 
        return { 
          color: 'text-gray-600 bg-gray-50 border-gray-100', 
          icon: <Shield className="w-3 h-3" />,
          label: status
        };
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading your requests...</div>;

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 italic font-medium">
          No previous gatepass requests found in our systems.
        </div>
      ) : (
        requests.map((pass) => {
          const config = getStatusConfig(pass.current_status);
          return (
            <div key={pass.request_id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === pass.request_id ? null : pass.request_id)}>
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color} border shadow-inner`}>
                      {config.icon}
                   </div>
                   <div>
                      <h5 className="font-bold text-slate-800 text-sm">GP-{pass.request_id} • {pass.request_type}</h5>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(pass.created_at).toLocaleDateString()}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${config.color}`}>
                      {config.icon}
                      {config.label}
                   </div>
                   {expandedId === pass.request_id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

            {expandedId === pass.request_id && (
              <div className="px-4 pb-4 border-t border-slate-50 pt-4 animate-in fade-in slide-in-from-top-2">
                {(pass.current_status === 'APPROVED' || pass.current_status === 'OUT') && pass.qr_code_data && (
                  <div className="mb-6 flex flex-col items-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Your Access Credentials</p>
                     <img src={pass.qr_code_data} alt="Gatepass QR" className="w-32 h-32 bg-white p-2 rounded-lg border shadow-sm mb-3" />
                     {pass.secret_pass_code && (
                       <div className="text-center">
                         <p className="text-[10px] text-slate-400 font-bold uppercase">Secret Pass Code</p>
                         <p className="text-lg font-mono font-black text-slate-800 tracking-wider bg-white px-4 py-1 rounded border shadow-sm mt-1">{pass.secret_pass_code}</p>
                         <p className="text-[9px] text-slate-400 mt-2">Show QR or Security Code at the gate</p>
                       </div>
                     )}
                  </div>
                )}
                <div className="mb-6">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Approval Stages</p>
                   <div className="space-y-4 relative ml-3 border-l-2 border-slate-100 pl-6 pb-2">
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-50"></div>
                        <h6 className="text-[11px] font-bold text-slate-800">Request Submitted</h6>
                        <p className="text-[10px] text-slate-500">{new Date(pass.created_at).toLocaleString()}</p>
                      </div>

                      {pass.approvals?.map((app: any, idx: number) => (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full border-2 border-white ring-4 ${app.status === 'APPROVED' ? 'bg-emerald-500 ring-emerald-50' : 'bg-rose-500 ring-rose-50'}`}></div>
                          <h6 className="text-[11px] font-bold text-slate-800">
                             Level {app.approval_level}: {app.status} by {app.approver_name || 'Department Head'}
                          </h6>
                          {app.remarks && <p className="text-[10px] text-slate-400 italic mt-0.5">&quot;{app.remarks}&quot;</p>}
                          <p className="text-[10px] text-slate-500">{new Date(app.approval_time).toLocaleString()}</p>
                        </div>
                      ))}

                      {pass.current_status === 'PENDING' && (
                        <div className="relative">
                           <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                           <h6 className="text-[11px] font-bold text-slate-400">Awaiting Next Approval...</h6>
                        </div>
                      )}
                   </div>
                </div>

                {pass.movements?.length > 0 && (
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Movement Logs</p>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                         {pass.movements.map((mov: any, idx: number) => (
                           <div key={idx} className="flex flex-col gap-1 text-[10px]">
                              {mov.exit_time && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-bold text-slate-700">
                                     <ChevronRight className="w-3 h-3 text-rose-500" /> EXIT
                                  </div>
                                  <div className="text-slate-400">{new Date(mov.exit_time).toLocaleString()}</div>
                                </div>
                              )}
                              {mov.entry_time && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-bold text-slate-700">
                                     <ChevronDown className="w-3 h-3 text-emerald-500" /> ENTRY
                                  </div>
                                  <div className={`text-right ${mov.late_return ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                     {new Date(mov.entry_time).toLocaleString()}
                                     {mov.late_return ? ' (LATE)' : ''}
                                  </div>
                                </div>
                              )}
                           </div>
                         ))}
                      </div>
                   </div>
                )}
              </div>
            )}
            </div>
          );
        })
      )}
    </div>
  );
}
