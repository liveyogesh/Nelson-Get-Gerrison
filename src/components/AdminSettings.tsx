import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, ShieldCheck, Clock, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface Setting {
  setting_key: string;
  setting_value: string;
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/config', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSettings(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load system configurations');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    setSaving(key);
    try {
      await axios.post('/api/config', { key, value }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSaving(null);
      // Optional: show toast
    } catch (err) {
        setError(`Failed to update ${key}`);
        setSaving(null);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading System Config...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
          <Settings className="w-8 h-8 text-blue-500" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">System Configuration</h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Super Admin Governance Panel</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-sm font-bold">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {[
          { key: 'escalation_timeout_mins', label: 'Escalation Timeout', desc: 'Minutes before an unaddressed gatepass escalates to HOD.', icon: Clock },
          { key: 'grace_period_mins', label: 'Entry Grace Period', desc: 'Extra minutes allowed for personnel entry before violation log.', icon: ShieldCheck }
        ].map((item) => {
          const setting = settings.find(s => s.setting_key === item.key);
          return (
            <motion.div 
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-slate-800 rounded-xl mt-1">
                  <item.icon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{item.label}</h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm">{item.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="number"
                  defaultValue={setting?.setting_value || ''}
                  onBlur={(e) => handleUpdate(item.key, e.target.value)}
                  className="w-24 px-4 py-2 bg-black/40 border border-slate-800 rounded-xl text-white font-mono text-center outline-none focus:border-blue-500/50 transition-all"
                />
                <div className="w-8 flex items-center justify-center">
                  {saving === item.key ? (
                    <Activity className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 p-8 border border-dashed border-slate-800 rounded-[2rem] text-center bg-blue-500/[0.02]">
         <ShieldCheck className="w-10 h-10 text-slate-800 mx-auto mb-4" />
         <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600 mb-2">Audit Trace Protocol Active</p>
         <p className="text-[10px] text-slate-500 font-medium">All configuration changes are logged with timestamp and Admin ID for enterprise compliance.</p>
      </div>
    </div>
  );
};

export default AdminSettings;
