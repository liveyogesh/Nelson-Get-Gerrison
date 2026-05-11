import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Plus, Search } from 'lucide-react';

export default function AdminBlacklist() {
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ mobile: '', reason: '' });

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/blacklist`);
      const data = await response.json();
      setBlacklist(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchBlacklist(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowModal(false);
        setFormData({ mobile: '', reason: '' });
        fetchBlacklist();
      }
    } catch (e) { console.error(e); }
  };

  const removeFromBlacklist = async (mobile: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/blacklist/${mobile}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setShowConfirm(null);
        fetchBlacklist();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Visitor Blacklist</h3>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Manage restricted individuals across all hospital facilities</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-rose-700 shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" /> Blacklist Person
        </button>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile Number</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Reason for Restriction</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Added By</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Added</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {blacklist.length > 0 ? (
              blacklist.map((item) => (
                <tr key={item.blacklist_id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-700">{item.mobile}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 max-w-xs">{item.reason}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tight">{item.added_by_name || 'System'}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(item.added_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setShowConfirm(item.mobile)}
                      className="text-slate-200 group-hover:text-rose-600 p-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No individuals currently blacklisted.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm focus:outline-none">
           <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center animate-in fade-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100 transform rotate-12 group-hover:rotate-0 transition-transform">
                <AlertTriangle className="w-10 h-10 text-rose-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Revoke Restriction?</h4>
              <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed px-2">Are you sure you want to remove <span className="font-bold text-slate-800">{showConfirm}</span> from the blacklist? This person will be allowed to visit again.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={() => removeFromBlacklist(showConfirm)} className="w-full py-3 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all uppercase tracking-widest">Yes, Remove Restriction</button>
                 <button onClick={() => setShowConfirm(null)} className="w-full py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors uppercase tracking-widest">No, Keep Blocked</button>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-rose-50 flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>
              <h3 className="font-bold text-slate-800 uppercase tracking-tight">Flag Mobile for Blacklist</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Mobile Number</label>
                <input 
                  type="text" 
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold tracking-widest focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Reason to Block</label>
                <textarea 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm h-32 resize-none focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                  placeholder="Detailed justification for security audit..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-200">Confirm Blacklist</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
