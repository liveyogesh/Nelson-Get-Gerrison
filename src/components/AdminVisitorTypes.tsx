import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit3, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function AdminVisitorTypes() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState({ type_name: '', description: '', access_level: 'STANDARD', active_status: true });

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/visitors/types`);
      setTypes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/visitors/types/${id}`);
      setShowConfirm(null);
      fetchTypes();
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingType 
      ? `/api/visitors/types/${editingType.type_id}`
      : `/api/visitors/types`;

    try {
      if (editingType) {
        await axios.put(url, formData);
      } else {
        await axios.post(url, formData);
      }
      setShowModal(false);
      setEditingType(null);
      setFormData({ type_name: '', description: '', access_level: 'GUEST', active_status: true });
      fetchTypes();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Visitor Classification</h3>
        <button 
          onClick={() => { setEditingType(null); setFormData({ type_name: '', description: '', access_level: 'STANDARD', active_status: true }); setShowModal(true); }}
          className="bg-[#003366] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Visitor Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((t) => (
          <div key={t.type_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-[#003366]">{t.type_name}</h4>
              <span className={`p-1 rounded-full ${t.active_status ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {t.active_status ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-2 h-10 overflow-hidden">{t.description}</p>
            <div className="mb-4">
               <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${t.access_level === 'HIGH' ? 'bg-red-100 text-red-700' : t.access_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                 Level: {t.access_level || 'STANDARD'}
               </span>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 italic">
               <button 
                 onClick={() => { setEditingType(t); setFormData({ type_name: t.type_name, description: t.description, access_level: t.access_level || 'STANDARD', active_status: !!t.active_status }); setShowModal(true); }}
                 className="p-1.5 text-slate-400 hover:text-blue-600"
               >
                 <Edit3 className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setShowConfirm(t.type_id)}
                 className="p-1.5 text-slate-300 hover:text-rose-600"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <Trash2 className="w-8 h-8 text-rose-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2 tracking-tight">Delete Configuration?</h4>
              <p className="text-xs text-slate-500 font-medium mb-6">Are you sure you want to remove this visitor classification? This action cannot be undone and may affect visitor logs.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowConfirm(null)} className="py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors uppercase tracking-widest">Keep It</button>
                 <button onClick={() => handleDelete(showConfirm)} className="py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all uppercase tracking-widest">Delete Forever</button>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">{editingType ? 'Edit' : 'Add'} Visitor Type</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Type Name</label>
                <input 
                  type="text" 
                  value={formData.type_name}
                  onChange={(e) => setFormData({...formData, type_name: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                  required
                  placeholder="e.g. Consultant, Vendor"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm h-24"
                  placeholder="What is this type for?"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Access Level</label>
                <select 
                  value={formData.access_level}
                  onChange={(e) => setFormData({...formData, access_level: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                >
                   <option value="STANDARD">Standard</option>
                   <option value="MEDIUM">Medium</option>
                   <option value="HIGH">High</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.active_status}
                  onChange={(e) => setFormData({...formData, active_status: e.target.checked})}
                  id="active_status"
                />
                <label htmlFor="active_status" className="text-sm font-medium text-slate-700">Active Status</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-[#003366] text-white rounded-lg text-sm font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
