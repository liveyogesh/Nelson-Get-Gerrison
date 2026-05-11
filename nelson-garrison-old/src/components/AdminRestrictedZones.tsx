import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Key, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function AdminRestrictedZones() {
  const [zones, setZones] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    zone_code: '', zone_name: '', facility_id: '', description: '', approval_required: false, active_status: true
  });
  const [editingId, setEditingId] = useState(null);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/zones');
      setZones(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const { data } = await axios.get('/api/admin/facilities'); // let's assume this exists or use org_facilities
      setFacilities(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchZones();
    fetchFacilities();
  }, []);

  const handleCreateOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/zones/${editingId}`, formData);
      } else {
        await axios.post('/api/zones', formData);
      }
      setShowModal(false);
      setFormData({ zone_code: '', zone_name: '', facility_id: '', description: '', approval_required: false, active_status: true });
      setEditingId(null);
      fetchZones();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save zone');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this zone?')) {
      try {
        await axios.delete(`/api/zones/${id}`);
        fetchZones();
      } catch (e) {
        alert('Failed to delete zone');
      }
    }
  };

  const openEdit = (zone: any) => {
    setEditingId(zone.zone_id);
    setFormData({
      zone_code: zone.zone_code,
      zone_name: zone.zone_name,
      facility_id: zone.facility_id || '',
      description: zone.description || '',
      approval_required: !!zone.approval_required,
      active_status: !!zone.active_status
    });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Restricted Zones</h3>
          <p className="text-sm text-slate-500 font-medium">Manage highly secure areas</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="bg-slate-800 text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Code</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Name</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Facility</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Approval Reqd</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zones.map((z: any) => (
              <tr key={z.zone_id} className="hover:bg-slate-50/50">
                <td className="p-4 font-mono text-sm text-indigo-600 font-bold bg-indigo-50/30">
                  {z.zone_code}
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800 text-sm">{z.zone_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{z.description}</div>
                </td>
                <td className="p-4 text-sm font-medium text-slate-700">
                  {z.facility_name || `ID: ${z.facility_id}`}
                </td>
                <td className="p-4">
                  {z.approval_required ? <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-bold">Yes</span> : <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold">No</span>}
                </td>
                <td className="p-4">
                  <button onClick={() => openEdit(z)} className="p-1.5 text-slate-400 hover:text-blue-600 mr-2"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(z.zone_id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
               <h4 className="font-bold text-slate-800 text-lg">{editingId ? 'Edit Zone' : 'Add New Zone'}</h4>
            </div>
            <form onSubmit={handleCreateOrEdit} className="p-5 space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Zone Code</label>
                  <input required value={formData.zone_code} onChange={e => setFormData({...formData, zone_code: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase bg-slate-50" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Zone Name</label>
                  <input required value={formData.zone_name} onChange={e => setFormData({...formData, zone_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Facility ID</label>
                  <input required type="number" value={formData.facility_id} onChange={e => setFormData({...formData, facility_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm h-20"></textarea>
               </div>
               <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="ar" checked={formData.approval_required} onChange={e => setFormData({...formData, approval_required: e.target.checked})} className="rounded text-blue-600 w-4 h-4" />
                  <label htmlFor="ar" className="text-sm font-bold text-slate-700">Approval Required for Entry</label>
               </div>
               
               <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 py-2 text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 rounded-lg">{editingId ? 'Save Changes' : 'Create Zone'}</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
