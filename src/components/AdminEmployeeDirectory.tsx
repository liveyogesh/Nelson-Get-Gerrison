import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Mail, Phone, Building2, UserCircle, Edit2, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminEmployeeDirectory() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [desig, setDesig] = useState('all');
  const [status, setStatus] = useState('all');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [editForm, setEditForm] = useState({ photo_url: '', employment_status: 'ACTIVE', reporting_manager_id: '' });
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
     employee_code: '', first_name: '', last_name: '', email: '', mobile: '', 
     department_id: '', designation_id: '', photo_url: '', reporting_manager_id: ''
  });

  const [activeEmployees, setActiveEmployees] = useState<any[]>([]);

  const fetchFilters = async () => {
    try {
      const [deptRes, desRes, actEmpRes] = await Promise.all([
        axios.get(`/api/visitors/hr/departments`),
        axios.get(`/api/visitors/hr/designations`),
        axios.get(`/api/hrms/employees/active`)
      ]);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      setDesignations(Array.isArray(desRes.data) ? desRes.data : []);
      setActiveEmployees(Array.isArray(actEmpRes.data) ? actEmpRes.data : []);
    } catch (e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, departmentId: dept, designationId: desig, status });
      const { data } = await axios.get(`/api/visitors/employees?${params}`);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { fetchEmployees(); }, [dept, desig, status, search, fetchEmployees]); // Added search to dependencies to avoid warnings

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    
    if (value.length > 1) {
      const filtered = employees.filter(emp => 
        emp.first_name.toLowerCase().includes(value.toLowerCase()) || 
        emp.last_name?.toLowerCase().includes(value.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/hrms/employees/${editingEmp.employee_id}`, editForm); // Switched to hrms endpoint for updates
      if (response.status === 200) {
        setEditingEmp(null);
        fetchEmployees();
      }
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/hrms/employees`, createForm); // Switched to hrms endpoint
      if (response.status === 200) {
        setShowCreate(false);
        setCreateForm({
          employee_code: '', first_name: '', last_name: '', email: '', mobile: '', 
          department_id: '', designation_id: '', photo_url: '', reporting_manager_id: ''
        });
        fetchEmployees();
      } else {
         const err = response.data;
         alert(err.error || 'Failed to create employee');
      }
    } catch (e: any) { alert(e.response?.data?.error || e.message); console.error(e); }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Hospital Staff Directory</h3>
          <p className="text-sm text-slate-500 font-medium">Manage and view all registered healthcare professionals</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button 
            onClick={() => setShowCreate(true)}
            className="bg-[#003366] text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-900 transition"
          >
            <UserCircle className="w-5 h-5" /> Add New Staff
          </button>
        </div>
      </div>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search ID, Name..."
              value={search}
              onChange={handleSearchChange}
              onKeyUp={(e) => e.key === 'Enter' && fetchEmployees()}
              onFocus={() => search.length > 1 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none shadow-sm transition-all"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-50">
                {suggestions.map((emp) => (
                  <button
                    key={emp.employee_id}
                    onClick={() => {
                      setSearch(`${emp.first_name} ${emp.last_name}`);
                      setShowSuggestions(false);
                      fetchEmployees();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                       <UserCircle className="w-4 h-4 text-slate-300" />
                       <span className="text-sm font-medium text-slate-700">{emp.first_name} {emp.last_name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.employee_code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <select 
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-[#003366] outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d: any) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
            </select>
            <select 
              value={desig}
              onChange={(e) => setDesig(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-[#003366] outline-none"
            >
              <option value="all">All Designations</option>
              {designations.map((d: any) => <option key={d.designation_id} value={d.designation_id}>{d.designation_name}</option>)}
            </select>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-[#003366] outline-none"
            >
              <option value="all">Any Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading directory...</div>
        ) : employees.length > 0 ? (
          employees.map((emp) => (
            <div key={emp.employee_id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative">
              <button 
                onClick={() => {
                  setEditingEmp(emp);
                  setEditForm({ photo_url: emp.photo_url || '', employment_status: emp.employment_status });
                }}
                className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-xl group-hover:bg-[#003366] group-hover:text-white transition-colors overflow-hidden">
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt={emp.first_name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{emp.first_name.charAt(0)}{emp.last_name?.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 leading-tight flex items-center gap-2">
                    {emp.first_name} {emp.last_name}
                    {emp.employment_status === 'ACTIVE' ? (
                      <div className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-rose-500" title={emp.employment_status}></div>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">{emp.employee_code}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1.5">{emp.designation_name}</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold">{emp.department_name}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-xs">{emp.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono">{emp.mobile || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-400 italic">No staff members found matching criteria.</div>
        )}
      </div>

      {editingEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 tracking-tight">Update Staff Info</h3>
                <p className="text-xs text-slate-500 font-medium">{editingEmp.first_name} {editingEmp.last_name} • {editingEmp.employee_code}</p>
              </div>
              <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <AlertCircle className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Profile Photo URL</label>
                <div className="flex gap-3">
                   <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                     {editForm.photo_url ? (
                       <img src={editForm.photo_url} className="w-full h-full object-cover" />
                     ) : <ImageIcon className="w-full h-full p-3 text-slate-300" />}
                   </div>
                   <input 
                    type="text" 
                    value={editForm.photo_url}
                    onChange={(e) => setEditForm({...editForm, photo_url: e.target.value})}
                    placeholder="https://..."
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#003366]"
                   />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Provide a direct link to the staff member's portrait image.</p>
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Employment Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm({...editForm, employment_status: s})}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${editForm.employment_status === s ? 'bg-[#003366] text-white border-[#003366] shadow-md shadow-blue-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Reporting Manager</label>
                <select 
                  value={editForm.reporting_manager_id}
                  onChange={(e) => setEditForm({...editForm, reporting_manager_id: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">None</option>
                  {activeEmployees.filter(emp => emp.employee_id !== editingEmp?.employee_id).map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_code} - {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setEditingEmp(null)} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700">Discard Changes</button>
                <button type="submit" className="px-8 py-2.5 bg-[#003366] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-[#002244]">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 tracking-tight text-lg">Add New Staff Member</h3>
                <p className="text-xs text-slate-500 font-medium">Create a new employee profile in hr_employees</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <AlertCircle className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="createStaffForm" onSubmit={handleCreate} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Emp Code *</label>
                    <input required type="text" value={createForm.employee_code} onChange={e => setCreateForm({...createForm, employee_code: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. EMP-001" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">First Name *</label>
                    <input required type="text" value={createForm.first_name} onChange={e => setCreateForm({...createForm, first_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="John" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Last Name</label>
                    <input type="text" value={createForm.last_name} onChange={e => setCreateForm({...createForm, last_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Doe" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Email</label>
                    <input type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="john.doe@hospital.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Mobile</label>
                    <input type="text" value={createForm.mobile} onChange={e => setCreateForm({...createForm, mobile: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="+1234567890" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Photo URL</label>
                    <input type="text" value={createForm.photo_url} onChange={e => setCreateForm({...createForm, photo_url: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Department *</label>
                    <select required value={createForm.department_id} onChange={e => setCreateForm({...createForm, department_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Select Department</option>
                      {departments.map((d: any) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Designation *</label>
                    <select required value={createForm.designation_id} onChange={e => setCreateForm({...createForm, designation_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Select Designation</option>
                      {designations.map((d: any) => <option key={d.designation_id} value={d.designation_id}>{d.designation_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Reporting Manager</label>
                    <select value={createForm.reporting_manager_id} onChange={e => setCreateForm({...createForm, reporting_manager_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">None</option>
                      {activeEmployees.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_code} - {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
               <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
               <button form="createStaffForm" type="submit" className="px-8 py-2.5 bg-[#003366] text-white rounded-lg text-sm font-bold hover:bg-[#002244]">Create Employee</button>
            </div>
          </div>
         </div>
      )}

    </div>
  );
}
