import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import axios from 'axios';
import { Save, Plus, Trash2, ArrowRight, Workflow } from 'lucide-react';

const AdminWorkflowBuilder: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedDept, setSelectedDept] = useState<number | ''>('');
  const [ruleType, setRuleType] = useState('GATEPASS');
  const [steps, setSteps] = useState<any[]>([{ level: 1, roleCode: 'HOD', escalationMins: 60 }]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
       try {
          const [deptsRes] = await Promise.all([
             axios.get('/api/visitors/hr/departments')
          ]);
          setDepartments(deptsRes.data);
       } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchMatrix = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/workflow/matrix', {
          params: { type: ruleType, departmentId: selectedDept || undefined }
        });
        if (res.data && res.data.length > 0) {
          setSteps(res.data.map((r: any) => ({
            level: r.approval_level,
            roleCode: r.assignment_role,
            escalationMins: r.escalation_mins
          })));
        } else {
          setSteps([{ level: 1, roleCode: 'HOD', escalationMins: 60 }]);
        }
      } catch (e) {
        console.error(e);
        setSteps([{ level: 1, roleCode: 'HOD', escalationMins: 60 }]);
      }
      setLoading(false);
    };
    fetchMatrix();
  }, [ruleType, selectedDept]);

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have permission to view the Admin Workflow Builder.
      </div>
    );
  }

  const handleAddStep = () => {
    setSteps([...steps, { level: steps.length + 1, roleCode: 'SECURITY_SUPERVISOR', escalationMins: 120 }]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    const adjusted = newSteps.map((step, idx) => ({ ...step, level: idx + 1 }));
    setSteps(adjusted);
  };

  const handleSave = async () => {
    try {
      await axios.post('/api/workflow/matrix', {
        workflow_type: ruleType,
        department_id: selectedDept || null,
        steps: steps
      });
      alert('Workflow Matrix saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save workflow matrix.');
    }
  };

  const roles = [
    { code: 'HOD', name: 'Head of Department' },
    { code: 'SECURITY_SUPERVISOR', name: 'Security Supervisor' },
    { code: 'SUPER_ADMIN', name: 'Super Admin / Director' },
    { code: 'SECURITY_GUARD', name: 'Security Guard (L1)' },
    { code: 'ESTATES_MANAGER', name: 'Estates Manager' }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8 bg-[#003366] p-6 rounded-2xl text-white shadow-xl">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-blue-300" />
            Decision Flow Architect
          </h2>
          <p className="text-xs text-blue-100 font-medium opacity-80 mt-1">Configure hierarchical approval chains with temporal escalation</p>
        </div>
        <div className="bg-white/10 p-3 rounded-xl border border-white/20">
          <Workflow className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Scope (Department)</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#003366] outline-none"
          >
            <option value="">Global (All Departments)</option>
            {departments.map(dept => (
              <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
            ))}
          </select>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Protocol Type</label>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#003366] outline-none"
          >
            <option value="GATEPASS">Staff Gatepass (General)</option>
            <option value="VISITOR_VIP">High-Level Visitor Entry</option>
            <option value="RESTRICTED_ZONE">Critical Zone Authorization</option>
            <option value="ASSET_MOVEMENT">Medical Equipment Transfer</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            Approval Chain Steps
        </h3>
        {steps.map((step, index) => (
          <div key={index} className="group relative flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-[#003366] border border-slate-200">
              {step.level}
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Approver Entity</label>
              <select
                value={step.roleCode}
                onChange={(e) => {
                  const newSteps = [...steps];
                  newSteps[index].roleCode = e.target.value;
                  setSteps(newSteps);
                }}
                className="w-full border-none p-0 text-sm font-bold text-slate-700 bg-transparent focus:ring-0 cursor-pointer"
              >
                {roles.map(r => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Escalation (Mins)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={step.escalationMins}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[index].escalationMins = Number(e.target.value);
                    setSteps(newSteps);
                  }}
                  className="w-full border-none p-0 text-sm font-bold text-slate-700 bg-transparent focus:ring-0"
                />
                <span className="text-[10px] text-slate-300 font-bold">M</span>
              </div>
            </div>
            <button 
              onClick={() => handleRemoveStep(index)}
              className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button 
          onClick={handleAddStep}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Sequence Step
        </button>
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-100">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-[#003366] text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {loading ? 'Processing...' : 'Deploy Workflow Matrix'}
        </button>
      </div>
    </div>
  );
};

export default AdminWorkflowBuilder;
