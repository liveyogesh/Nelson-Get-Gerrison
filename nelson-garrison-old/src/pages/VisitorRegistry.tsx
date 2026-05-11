import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Search, 
  Camera,
  IdCard,
  History,
  X,
  UserPlus,
  Calendar,
  UserCheck
} from 'lucide-react';

const VisitorRegistry: React.FC = () => {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ startDate: '', endDate: '', type: 'all', status: 'all' });
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<any>(null);
  const [visitorHistory, setVisitorHistory] = useState<any[]>([]);
  const [visitorTypes, setVisitorTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [hostSearch, setHostSearch] = useState('');

  const handleCheckout = async (visitId: number) => {
    if (!confirm('Are you sure you want to log checkout for this visitor?')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/checkout/${visitId}`, {
        method: 'POST'
      });
      if (response.ok) fetchVisitors();
    } catch (e) { console.error(e); }
  };

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    visitor_type: '',
    id_proof_type: 'Aadhar Card',
    id_proof_number: '',
    photo: null as any,
    id_proof: null as any,
    host_employee_id: '',
    purpose: '',
    department_id: ''
  });

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ ...filters, search }).toString();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/registry?${q}`);
      const data = await response.json();
      setVisitors(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchVisitorTypes = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/types`);
      const data = await response.json();
      setVisitorTypes(data.filter((t: any) => t.active_status));
    } catch (e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/employees`);
      const data = await response.json();
      setEmployees(data);
    } catch (e) { console.error(e); }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/hr/departments`);
      const data = await response.json();
      setDepartments(data);
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async (visitorId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/history/${visitorId}`);
      const data = await response.json();
      setVisitorHistory(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchVisitors(); }, [filters, search]);
  useEffect(() => { 
    fetchVisitorTypes(); 
    fetchEmployees();
    fetchDepartments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'id_proof') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visitors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photo_url: formData.photo,
          id_proof_url: formData.id_proof
        })
      });
      const result = await response.json();
      if (result.success) {
        alert(`Visitor entry recorded! Pass #: ${result.passNumber}`);
        setShowEntryModal(false);
        setFormData({
          first_name: '', last_name: '', mobile: '', visitor_type: '',
          id_proof_type: 'Aadhar Card', id_proof_number: '', photo: null, id_proof: null,
          host_employee_id: '', purpose: '', department_id: ''
        });
        fetchVisitors();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Visitor Movement Hub</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight mt-1">Real-time tracking and security clearance for external guests</p>
          </div>
          <button 
            onClick={() => setShowEntryModal(true)}
            className="bg-[#003366] hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> New Visitor Registry
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by Name, Mobile, Pass #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-[#003366] transition-all font-medium text-sm text-slate-700"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none"
              >
                <option value="all">Every Type</option>
                {visitorTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
              </select>
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="CHECKED_IN">On-site</option>
                <option value="CHECKED_OUT">Checked Out</option>
              </select>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="text-xs font-bold text-slate-600 p-2 outline-none" 
                />
                <span className="text-slate-300">-</span>
                <input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="text-xs font-bold text-slate-600 p-2 outline-none" 
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium">Synchronizing records...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visitors.map((visitor) => (
              <div key={visitor.visit_id} className={`bg-white rounded-2xl border ${visitor.blacklist_status ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'} shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all`}>
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {visitor.photo_url ? (
                        <img src={visitor.photo_url} className="w-12 h-12 rounded-xl object-cover border border-slate-200" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#003366] text-lg">
                          {visitor.first_name.charAt(0)}{visitor.last_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-1.5">
                          {visitor.first_name} {visitor.last_name}
                          {visitor.blacklist_status && <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.5 rounded uppercase">Blacklisted</span>}
                        </h4>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#003366] mt-0.5">{visitor.pass_number || 'No Pass'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      visitor.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {visitor.status === 'CHECKED_IN' ? 'On-site' : 'Exited'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 mt-6 pt-5 border-t border-slate-100">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-widest">Type</span>
                      <span className="text-[13px] text-slate-700 font-bold flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" /> {visitor.visitor_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-widest">In-Time</span>
                      <span className="text-[13px] text-slate-700 font-bold">
                        {new Date(visitor.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-widest">Host / Purpose</span>
                      <p className="text-[12px] text-slate-700 font-semibold leading-relaxed">
                        {visitor.host_first} {visitor.host_last} • {visitor.purpose}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { setShowHistoryModal(visitor); fetchHistory(visitor.visitor_id); }}
                      className="text-slate-400 hover:text-[#003366] p-1.5 hover:bg-white rounded transition-colors"
                      title="Visit History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-500 tracking-tighter">{visitor.mobile}</span>
                  </div>
                  {visitor.status === 'CHECKED_IN' && (
                    <button 
                      onClick={() => handleCheckout(visitor.visit_id)}
                      className="text-[10px] font-bold uppercase text-rose-600 hover:text-rose-800 tracking-widest bg-white border border-rose-100 px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Log Exit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showEntryModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg"><UserPlus className="w-5 h-5 text-blue-600" /></div>
                  Visitor Registration Profile
                </h3>
                <button onClick={() => setShowEntryModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              
              <form onSubmit={handleSubmitEntry} className="flex-1 overflow-y-auto p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">First Name</label>
                         <input 
                           required 
                           type="text" 
                           value={formData.first_name}
                           onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none" 
                         />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Name</label>
                         <input 
                           type="text" 
                           value={formData.last_name}
                           onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none" 
                         />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile Number</label>
                       <input 
                         required 
                         type="tel" 
                         value={formData.mobile}
                         onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold tracking-widest focus:ring-2 focus:ring-[#003366] outline-none" 
                         placeholder="+91" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visitor Category</label>
                       <select 
                         value={formData.visitor_type}
                         onChange={(e) => setFormData({...formData, visitor_type: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold focus:ring-2 focus:ring-[#003366] outline-none appearance-none"
                       >
                         <option value="">Select Category</option>
                         {visitorTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID Proof Type</label>
                         <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none">
                           <option>Aadhar Card</option>
                           <option>Voter ID</option>
                           <option>Driving License</option>
                           <option>Passport</option>
                         </select>
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID Number</label>
                         <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block text-center">Capture Visitor Documents</label>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="relative group">
                          <input type="file" onChange={(e) => handleFileChange(e, 'photo')} id="photo-upload" className="hidden" accept="image/*" />
                          <label htmlFor="photo-upload" className="flex flex-col items-center justify-center aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group overflow-hidden">
                            {formData.photo ? (
                              <img src={formData.photo} className="w-full h-full object-cover" alt="Visitor" />
                            ) : (
                              <>
                                <Camera className="w-8 h-8 text-slate-300 group-hover:text-blue-500 mb-2" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Profile Photo</span>
                              </>
                            )}
                          </label>
                        </div>
                        <div className="relative group">
                          <input type="file" onChange={(e) => handleFileChange(e, 'id_proof')} id="id-upload" className="hidden" accept="image/*" />
                          <label htmlFor="id-upload" className="flex flex-col items-center justify-center aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group overflow-hidden">
                            {formData.id_proof ? (
                              <img src={formData.id_proof} className="w-full h-full object-cover" alt="ID Proof" />
                            ) : (
                              <>
                                <IdCard className="w-8 h-8 text-slate-300 group-hover:text-blue-500 mb-2" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID Proof Copy</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Security Clearance</span>
                       </div>
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Host Employee</label>
                            <select 
                              required
                              value={formData.host_employee_id}
                              onChange={(e) => {
                                const emp = employees.find(emp => emp.employee_id === Number(e.target.value));
                                setFormData({
                                  ...formData, 
                                  host_employee_id: e.target.value,
                                  department_id: emp?.department_id || ''
                                });
                              }}
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Host Staff</option>
                              {employees.map(emp => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                  {emp.first_name} {emp.last_name} ({emp.department_name})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Visit Purpose</label>
                            <textarea 
                              required
                              value={formData.purpose}
                              onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                              placeholder="Reason for entry..." 
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none" 
                              rows={2} 
                            />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-end gap-4 border-t border-slate-100 pt-8">
                   <button type="button" onClick={() => setShowEntryModal(false)} className="px-6 py-3 text-sm font-bold text-slate-400 uppercase tracking-widest">Abort Process</button>
                   <button type="submit" className="bg-[#003366] text-white px-10 py-3 rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.02] transition-transform">Authorize Entry</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showHistoryModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-50 rounded-lg"><History className="w-5 h-5 text-blue-600" /></div>
                   <h3 className="font-bold text-slate-800">Visit History: {showHistoryModal.first_name}</h3>
                 </div>
                 <button onClick={() => setShowHistoryModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {visitorHistory.length > 0 ? visitorHistory.map((h, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(h.check_in_time).toLocaleDateString()} {new Date(h.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <h5 className="font-bold text-slate-800 text-sm">Host: {h.host_first} {h.host_last}</h5>
                      <p className="text-[11px] text-slate-500 font-medium">Department: {h.department_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Purpose</p>
                      <p className="text-xs font-bold text-[#003366] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{h.purpose}</p>
                    </div>
                  </div>
                )) : <div className="py-20 text-center text-slate-400 font-medium italic">No previous records found.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VisitorRegistry;
