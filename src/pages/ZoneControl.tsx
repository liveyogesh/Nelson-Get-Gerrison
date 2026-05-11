import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Lock, Unlock, AlertTriangle, ShieldAlert, History, Filter } from 'lucide-react';
import axios from 'axios';

const ZoneControl: React.FC = () => {
  const [zones, setZones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  
  // Access Action State
  const [personType, setPersonType] = useState('EMPLOYEE'); // 'EMPLOYEE' | 'VISITOR'
  const [personRefId, setPersonRefId] = useState('');
  const [accessGranted, setAccessGranted] = useState(true);
  const [violationFlag, setViolationFlag] = useState(false);
  const [denialReason, setDenialReason] = useState('');

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterViolation, setFilterViolation] = useState('ALL'); // 'ALL' | 'VIOLATED' | 'OK'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/zones', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setZones(data);
    } catch (e) {
      console.error('Failed to fetch zones', e);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/zones/logs?sort=${sortOrder}`;
      if (filterDate) url += `&date=${filterDate}`;
      if (filterViolation === 'VIOLATED') url += `&violation_flag=true`;
      else if (filterViolation === 'OK') url += `&violation_flag=false`;

      const token = localStorage.getItem('token');
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(data);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    fetchLogs();
  }, [filterDate, filterViolation, sortOrder]);

  const recordAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;

    try {
      await axios.post('/api/zones/logs', {
        zone_id: selectedZone.zone_id,
        person_type: personType,
        person_reference_id: parseInt(personRefId),
        access_granted: accessGranted,
        violation_flag: violationFlag,
        denial_reason: accessGranted ? '' : denialReason
      });
      setShowLogModal(false);
      setPersonRefId('');
      setDenialReason('');
      setViolationFlag(false);
      fetchLogs();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to record access');
    }
  };

  const openAccessModal = (zone: any) => {
    setSelectedZone(zone);
    setShowLogModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Restricted Zones</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight mt-1">Perimeter control and specialized area access monitoring</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {zones.map((zone: any) => (
            <div key={zone.zone_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden">
               {zone.approval_required && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold uppercase py-0.5 px-2 rounded-bl-lg">Approval Reqd</div>
               )}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h4 className="font-bold text-slate-800">{zone.zone_name}</h4>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 mt-0.5">{zone.zone_code}</p>
                </div>
                <ShieldAlert className={`w-5 h-5 ${zone.active_status ? 'text-emerald-500' : 'text-slate-300'}`}/>
              </div>

              <div className="text-xs text-slate-500 mb-5 min-h-[3rem]">
                {zone.description || 'No description available for this zone.'}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => openAccessModal(zone)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 border border-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
                   Record Access
                </button>
              </div>
            </div>
          ))}
          {zones.length === 0 && (
             <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
                <p className="text-slate-500">No restricted zones configured. Add from Admin Panel.</p>
             </div>
          )}
        </div>
        
        {/* Access Logs Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
           <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                 <History className="w-5 h-5 text-slate-400" />
                 <h3 className="font-bold text-slate-800 text-lg">Zone Access Logs</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
                    <Filter className="w-4 h-4 text-slate-400"/>
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none" />
                 </div>
                 <select value={filterViolation} onChange={e => setFilterViolation(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-sm outline-none text-slate-700">
                    <option value="ALL">All Outcomes</option>
                    <option value="VIOLATED">Violations Only</option>
                    <option value="OK">No Violations</option>
                 </select>
                 <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-sm outline-none text-slate-700">
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                 </select>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                 <thead className="bg-slate-50">
                    <tr>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Time</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Zone</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Person</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Violation</th>
                       <th className="p-4 text-xs font-bold text-slate-500 uppercase">Recorded By</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading logs...</td></tr>
                    ) : logs.length === 0 ? (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-500">No access logs found for the selected criteria.</td></tr>
                    ) : logs.map((log: any) => (
                       <tr key={log.log_id} className="hover:bg-slate-50/50">
                          <td className="p-4 text-sm text-slate-600">{new Date(log.access_time).toLocaleString()}</td>
                          <td className="p-4">
                             <div className="font-bold text-slate-800 text-sm">{log.zone_name}</div>
                             <div className="text-xs text-slate-500">{log.zone_code}</div>
                          </td>
                          <td className="p-4">
                             <div className="font-bold text-slate-800 text-sm">{log.person_name || 'Unknown'}</div>
                             <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                {log.person_type} #{log.person_reference_id}
                             </div>
                          </td>
                          <td className="p-4">
                             {log.access_granted ? (
                                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 w-max"><Unlock className="w-3 h-3"/> Granted</span>
                             ) : (
                                <div className="flex flex-col gap-1">
                                    <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 w-max"><Lock className="w-3 h-3"/> Denied</span>
                                    {log.denial_reason && <span className="text-[10px] text-slate-500">{log.denial_reason}</span>}
                                </div>
                             )}
                          </td>
                          <td className="p-4">
                             {log.violation_flag ? (
                                <span className="text-rose-600 font-bold text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Violation Flagged</span>
                             ) : (
                                <span className="text-slate-400 text-sm">-</span>
                             )}
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                             {log.authorized_by_name}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

      </div>

      {showLogModal && selectedZone && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
               <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                     <h3 className="font-bold text-slate-800 text-lg">Record Access</h3>
                     <p className="text-xs font-semibold text-slate-500 mt-0.5">Zone: {selectedZone.zone_name}</p>
                  </div>
                  <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-rose-500"><Lock className="w-5 h-5" /></button>
               </div>
               
               <form onSubmit={recordAccess} className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Person Type</label>
                        <select value={personType} onChange={e => setPersonType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none">
                           <option value="EMPLOYEE">Employee</option>
                           <option value="VISITOR">Visitor</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">ID (Ref #)</label>
                        <input required type="number" value={personRefId} onChange={e => setPersonRefId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none" placeholder="e.g. 1" />
                     </div>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Access Outcome</label>
                     <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="granted" checked={accessGranted} onChange={() => setAccessGranted(true)} className="form-radio text-emerald-600" />
                           <span className="text-sm font-bold text-emerald-700">Granted</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="granted" checked={!accessGranted} onChange={() => setAccessGranted(false)} className="form-radio text-rose-600" />
                           <span className="text-sm font-bold text-rose-700">Denied</span>
                        </label>
                     </div>
                  </div>

                  {!accessGranted && (
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Denial Reason</label>
                        <input required={!accessGranted} type="text" value={denialReason} onChange={e => setDenialReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none" placeholder="e.g. Invalid pass, Overstay" />
                     </div>
                  )}

                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3">
                     <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                     <div>
                        <label className="flex items-center gap-2 cursor-pointer mt-0.5">
                           <input type="checkbox" checked={violationFlag} onChange={e => setViolationFlag(e.target.checked)} className="rounded text-rose-600 border-rose-300 focus:ring-rose-200" />
                           <span className="text-sm font-bold text-rose-800">Flag as Security Violation</span>
                        </label>
                        <p className="text-xs text-rose-600 mt-1">This will trigger an immediate alert to the Security Supervisor & HODs.</p>
                     </div>
                  </div>

                  <div className="pt-2">
                     <button type="submit" className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 border border-slate-800 text-white rounded-lg text-sm font-bold shadow-md transition-colors">
                        Confirm & Save Log
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </Layout>
  );
};

export default ZoneControl;
