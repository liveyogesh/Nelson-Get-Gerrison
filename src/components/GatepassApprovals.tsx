import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, Search, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';

interface Gatepass {
  id: number;
  first_name: string;
  last_name: string;
  facility_name: string;
  request_type: string;
  status: string;
  reason: string;
  is_priority: number;
  requested_at: string;
}

const GatepassApprovals = () => {
    const [requests, setRequests] = useState<Gatepass[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [selectedQrPass, setSelectedQrPass] = useState<number | null>(null);

    const fetchRequests = async () => {
        try {
            const res = await axios.get('/api/gatepass/requests', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setRequests(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch requests', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await axios.post(`/api/gatepass/requests/${id}/${action}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchRequests();
        } catch (err) {
            alert(`Failed to ${action} request`);
        }
    };

    const handleGenerateQR = async (id: number) => {
        try {
            const res = await axios.get(`/api/gatepass/requests/${id}/qr`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const url = await QRCode.toDataURL(res.data.qrData, { width: 256, margin: 2, color: { dark: '#0a0f1e', light: '#ffffff' } });
            setQrCodeDataUrl(url);
            setSelectedQrPass(id);
        } catch (err) {
            alert('Failed to generate QR Code. Ensure gatepass is approved.');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Gatepass Requests...</div>;

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <h1 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-900">
                <Clock className="text-blue-600" />
                Gatepass Approvals
            </h1>
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100/50">
                        <tr>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">ID</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Employee</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Type / Reason</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Facility</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => (
                            <tr key={req.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                <td className="p-4 font-mono text-sm text-slate-500">#{req.id}</td>
                                <td className="p-4 font-bold text-slate-900">{req.first_name} {req.last_name}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{req.request_type}</span>
                                        {req.is_priority === 1 && <span className="text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Priority</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 max-w-[200px] truncate">{req.reason}</p>
                                </td>
                                <td className="p-4 text-sm font-medium text-slate-700">{req.facility_name || '-'}</td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                        req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex items-center justify-end gap-2">
                                    {req.status === 'PENDING' && (
                                        <>
                                            <button onClick={() => handleAction(req.id, 'approve')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve">
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleAction(req.id, 'reject')} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Reject">
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                    {req.status === 'APPROVED' && (
                                         <button onClick={() => handleGenerateQR(req.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center gap-2">
                                             <QrCode className="w-3.5 h-3.5" /> Show QR
                                         </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No requests found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {selectedQrPass && qrCodeDataUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedQrPass(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                       <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center">
                           <h3 className="text-xl font-bold mb-4">Gatepass #{selectedQrPass}</h3>
                           <div className="bg-slate-50 p-4 rounded-3xl border inline-block mb-4">
                              <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48 mx-auto mix-blend-multiply" />
                           </div>
                           <p className="text-sm font-medium text-slate-500 mb-6">Present this code at the security scanner</p>
                           <button onClick={() => setSelectedQrPass(null)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-colors">
                               Close
                           </button>
                       </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GatepassApprovals;
