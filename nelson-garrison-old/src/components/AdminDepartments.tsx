import React, { useState } from 'react';
import { Building2, Plus, Users, Anchor, ChevronRight, Edit3 } from 'lucide-react';

export default function AdminDepartments() {
  const [departments] = useState([
    { id: 1, code: 'ADMIN', name: 'Administration', head: 'John Doe', staffCount: 14, type: 'Non-Clinical' },
    { id: 2, code: 'CARD', name: 'Cardiology', head: 'Dr. Sarah Smith', staffCount: 45, type: 'Clinical' },
    { id: 3, code: 'ICU', name: 'Intensive Care Unit', head: 'Dr. Emily Chen', staffCount: 62, type: 'Clinical' },
    { id: 4, code: 'SEC', name: 'Security Operations', head: 'James Wilson', staffCount: 28, type: 'Operations' },
  ]);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Department Management</h3>
          <p className="text-sm text-slate-500 font-medium">Configure hospital wards, clinical units, and operations</p>
        </div>
        <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          New Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group relative">
            <button className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100">
              <Edit3 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-sm border
                bg-indigo-50 text-indigo-600 border-indigo-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{dept.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{dept.type}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{dept.code}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 border-dashed">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2"><Anchor className="w-3.5 h-3.5" /> Dept Head</span>
                <span className="font-semibold text-slate-700">{dept.head}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Staff Assigned</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs">{dept.staffCount}</span>
              </div>
            </div>

            <button className="w-full mt-5 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              View Hierarchy <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-white border shadow-sm flex items-center justify-center mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold">Add Department</span>
          <span className="text-xs font-medium mt-1">Configure a new organizational unit</span>
        </button>
      </div>
    </div>
  );
}
