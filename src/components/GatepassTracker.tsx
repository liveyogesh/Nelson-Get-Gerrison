import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
      const { data } = await axios.get('/api/gatepass/my-requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchBlacklist(); }, []);

  const [escalatingId, setEscalatingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [targetRole, setTargetRole] = useState('HOD');

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED': 
        return { 
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200', 
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Authorized'
        };
      case 'REJECTED': 
        return { 
          color: 'text-rose-700 bg-rose-50 border-rose-200', 
          icon: <XCircle className="w-4 h-4" />,
          label: 'Denied'
        };
      case 'CANCELLED': 
        return { 
          color: 'text-rose-700 bg-rose-50 border-rose-200', 
          icon: <XCircle className="w-4 h-4" />,
          label: 'Cancelled'
        };
      case 'PENDING': 
      case 'UNDER_REVIEW':
      case 'PRIORITY_PENDING':
      case 'EMERGENCY_PENDING':
        return { 
          color: 'text-amber-700 bg-amber-50 border-amber-200', 
          icon: <Clock className="w-4 h-4" />,
          label: status.replace('_', ' ')
        };
      case 'MANUALLY_ESCALATED':
      case 'ESCALATED':
      case 'ESCALATED_TO_HR':
        return {
          color: 'text-purple-700 bg-purple-50 border-purple-200',
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Escalated'
        }
      case 'OUT': 
        return { 
          color: 'text-blue-700 bg-blue-50 border-blue-200', 
          icon: <LogOut className="w-4 h-4 rotate-180" />,
          label: 'Off-site'
        };
      case 'RETURNED': 
        return { 
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200', 
          icon: <RotateCcw className="w-4 h-4" />,
          label: 'Returned'
        };
      default: 
        return { 
          color: 'text-slate-700 bg-slate-50 border-slate-200', 
          icon: <Shield className="w-4 h-4" />,
          label: status
        };
    }
  };

  const handleEscalate = async (id: number) => {
    if (!reason || !targetRole) return alert('Reason and target role required.');
    try {
      await axios.post(`/api/gatepass/${id}/escalate`, { reason, targetRole });
      setEscalatingId(null);
      setReason('');
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const handleCancel = async (id: number) => {
    if (!reason) return alert('Cancellation reason required.');
    try {
      await axios.post(`/api/gatepass/${id}/cancel`, { reason });
      setCancellingId(null);
      setReason('');
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400 font-medium">Loading your requests...</div>;

  return (
    <div className="space-y-4 md:space-y-5">
      {requests.length === 0 ? (
        <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-10 text-center text-slate-500 font-bold">
          No previous gatepass requests found in our systems.
        </div>
      ) : (
        requests.map((pass) => {
          const config = getStatusConfig(pass.current_status);
          const isExpanded = expandedId === pass.request_id;
          return (
            <div key={pass.request_id} className={`bg-white border-2 transition-all duration-200 ${isExpanded ? 'border-[#002855] shadow-lg' : 'border-slate-100 shadow-sm'} rounded-3xl overflow-hidden`}>
              <div 
                className="p-5 md:p-6 flex items-start justify-between cursor-pointer hover:bg-slate-50 transition-colors active:bg-slate-100" 
                onClick={() => setExpandedId(isExpanded ? null : pass.request_id)}
              >
                <div className="flex items-start gap-4">
                   <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${config.color} border shadow-inner`}>
                      {config.icon}
                   </div>
                   <div>
                      <h5 className="font-bold text-slate-800 text-base mb-0.5 tracking-tight">GP-{pass.request_id}</h5>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">{pass.request_type}</p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{new Date(pass.created_at).toLocaleDateString()}</p>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                   <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm ${config.color}`}>
                      {config.label}
                   </div>
                   <div className="p-2 bg-slate-50 rounded-full text-slate-400">
                     {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                   </div>
                </div>
              </div>

            {isExpanded && (
              <div className="px-5 pb-6 border-t-2 border-slate-50 pt-5 animate-in fade-in slide-in-from-top-4 duration-300">
                {(pass.current_status === 'APPROVED' || pass.current_status === 'OUT') && pass.qr_code_data && (
                  <div className="mb-8 flex flex-col items-center bg-blue-50/50 rounded-3xl p-6 border-2 border-blue-100 relative overflow-hidden">
                     <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-4">Access Credentials</p>
                     
                     <div className="bg-white p-3 rounded-2xl shadow-sm border-2 border-blue-100 mb-4">
                        <img src={pass.qr_code_data} alt="Gatepass QR" className="w-40 h-40" />
                     </div>
                     
                     {pass.secret_pass_code && (
                       <div className="text-center w-full bg-white rounded-2xl p-3 border-2 border-slate-100 shadow-sm">
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Secret Code</p>
                         <p className="text-2xl font-mono font-black text-[#002855] tracking-[0.2em]">{pass.secret_pass_code}</p>
                       </div>
                     )}
                     <p className="text-xs font-medium text-blue-600 mt-4 text-center">Present QR or Code at security gate</p>
                  </div>
                )}
                
                {['PENDING', 'UNDER_REVIEW', 'EMERGENCY_PENDING', 'PRIORITY_PENDING', 'ESCALATED', 'MANUALLY_ESCALATED'].includes(pass.current_status) && (
                  <div className="mb-6 space-y-4">
                    {escalatingId === pass.request_id ? (
                      <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
                        <p className="text-sm font-bold text-purple-800 mb-2">Escalate Request</p>
                        <select className="w-full p-2 mb-2 rounded border border-purple-200" value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                          <option value="HOD">HOD</option>
                          <option value="HR_MANAGER">HR Manager</option>
                          <option value="SECURITY_HOD">Security HOD</option>
                          <option value="FACILITY_ADMIN">Facility Admin</option>
                        </select>
                        <textarea className="w-full p-2 mb-2 rounded border border-purple-200" placeholder="Reason for escalation" value={reason} onChange={e => setReason(e.target.value)}></textarea>
                        <div className="flex gap-2">
                          <button onClick={() => handleEscalate(pass.request_id)} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Submit</button>
                          <button onClick={() => { setEscalatingId(null); setReason(''); }} className="bg-white text-purple-600 px-4 py-2 rounded-xl text-sm font-bold border border-purple-200">Cancel</button>
                        </div>
                      </div>
                    ) : cancellingId === pass.request_id ? (
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
                        <p className="text-sm font-bold text-rose-800 mb-2">Cancel Request</p>
                        <textarea className="w-full p-2 mb-2 rounded border border-rose-200" placeholder="Reason for cancellation" value={reason} onChange={e => setReason(e.target.value)}></textarea>
                        <div className="flex gap-2">
                          <button onClick={() => handleCancel(pass.request_id)} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Submit</button>
                          <button onClick={() => { setCancellingId(null); setReason(''); }} className="bg-white text-rose-600 px-4 py-2 rounded-xl text-sm font-bold border border-rose-200">Close</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        {['PENDING', 'UNDER_REVIEW', 'EMERGENCY_PENDING', 'PRIORITY_PENDING'].includes(pass.current_status) && (!pass.approvals || pass.approvals.length === 0) && (
                          <button onClick={() => { setEscalatingId(pass.request_id); setCancellingId(null); setReason(''); setTargetRole('HOD'); }} className="flex-1 border py-2.5 rounded-xl text-sm font-bold border-purple-200 text-purple-600 hover:bg-purple-50">Escalate Now</button>
                        )}
                        <button onClick={() => { setCancellingId(pass.request_id); setEscalatingId(null); setReason(''); }} className="flex-1 border py-2.5 rounded-xl text-sm font-bold border-rose-200 text-rose-600 hover:bg-rose-50">Cancel Request</button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mb-6">
                   <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Clock className="w-4 h-4 text-slate-400" />
                     Approval Timeline
                   </p>
                   <div className="space-y-6 relative ml-3 border-l-2 border-slate-200 pl-6 pb-2">
                      <div className="relative">
                        <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white ring-4 ring-slate-50"></div>
                        <h6 className="text-sm font-bold text-slate-800">Request Submitted</h6>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date(pass.created_at).toLocaleString()}</p>
                      </div>

                      {pass.approvals?.map((app: any, idx: number) => (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white ring-4 ${app.action === 'APPROVED' ? 'bg-emerald-500 ring-emerald-50' : 'bg-rose-500 ring-rose-50'}`}></div>
                          <h6 className="text-sm font-bold text-slate-800">
                             Level {app.approval_level}: {app.action}
                          </h6>
                          <p className="text-xs text-slate-600 font-medium my-1">by {app.approver_name || 'Department Head'}</p>
                          {app.remarks && (
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm italic text-slate-600 my-2">
                               &quot;{app.remarks}&quot;
                             </div>
                          )}
                          <p className="text-xs text-slate-500 mt-1">{new Date(app.action_time).toLocaleString()}</p>
                        </div>
                      ))}

                      {pass.current_status === 'PENDING' && (
                        <div className="relative">
                           <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-50 animate-pulse"></div>
                           <h6 className="text-sm font-bold text-blue-600">Awaiting Next Approval...</h6>
                        </div>
                      )}
                   </div>
                </div>

                {pass.movements?.length > 0 && (
                   <div className="mt-8">
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <MapPin className="w-4 h-4 text-slate-400" />
                         Access Logs
                      </p>
                      <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 space-y-3">
                         {pass.movements.map((mov: any, idx: number) => (
                           <div key={idx} className="flex flex-col gap-3">
                              {mov.exit_time && (
                                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                                     <ChevronRight className="w-5 h-5 text-rose-500 bg-rose-50 rounded" /> EXIT
                                  </div>
                                  <div className="text-slate-500 text-xs font-medium">{new Date(mov.exit_time).toLocaleString()}</div>
                                </div>
                              )}
                              {mov.entry_time && (
                                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                                     <ChevronDown className="w-5 h-5 text-emerald-500 bg-emerald-50 rounded" /> ENTRY
                                  </div>
                                  <div className={`text-right text-xs ${mov.late_return ? 'bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-bold border border-amber-200' : 'text-slate-500 font-medium'}`}>
                                     {new Date(mov.entry_time).toLocaleString()}
                                     {mov.late_return && ' (LATE)'}
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
