import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Plus, Edit2, CheckCircle2, X } from 'lucide-react';

export default function AdminMasters() {
    const [activeMaster, setActiveMaster] = useState('organization_master');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // For mapping nice labels etc
    const masters = [
        { id: 'organization_master', label: 'Organizations' },
        { id: 'state_master', label: 'States' },
        { id: 'location_master', label: 'Locations' },
        { id: 'facility_master', label: 'Facilities' },
        { id: 'designation_master', label: 'Designations' },
        { id: 'pass_type_master', label: 'Pass Types' },
        { id: 'employee_type_master', label: 'Employee Types' },
    ];

    const fetchMasterData = async (type: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/hrms/masters/${type}`);
            setData(res.data || []);
        } catch(e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMasterData(activeMaster);
    }, [activeMaster]);

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Enterprise Master Data</h3>
                    <p className="text-sm text-slate-500 font-medium">Manage foundational hierarchies and lookups</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
                    {masters.map(m => (
                        <button 
                            key={m.id}
                            onClick={() => setActiveMaster(m.id)}
                            className={`px-4 py-3 text-left text-sm font-bold rounded-xl border transition-all ${
                                activeMaster === m.id 
                                ? 'bg-[#003366] text-white border-[#003366] shadow-md' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading records...</div>
                    ) : data.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">No records found for {activeMaster}.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {Object.keys(data[0]).map(key => (
                                        <th key={key} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        {Object.values(row).map((val: any, j) => (
                                            <td key={j} className="px-4 py-3 text-sm text-slate-600">
                                                {typeof val === 'boolean' || val === 1 || val === 0 ? (
                                                    (val === true || val === 1) ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <X className="w-4 h-4 text-rose-500" />
                                                ) : (
                                                    val?.toString() || '-'
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
