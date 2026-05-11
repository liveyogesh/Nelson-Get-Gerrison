import React, { useState, useEffect } from 'react';
import { Settings2, Save, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';

export default function AdminConfig() {
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [gracePeriod, setGracePeriod] = useState(15);
  const [escalationTimeout, setEscalationTimeout] = useState(15);
  const [visitorExpiryWarning, setVisitorExpiryWarning] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await axios.get('/api/config');
      if (data.escalation_enabled) setEscalationEnabled(data.escalation_enabled === 'true');
      if (data.escalation_timeout_mins) setEscalationTimeout(parseInt(data.escalation_timeout_mins, 10));
      if (data.grace_period_mins) setGracePeriod(parseInt(data.grace_period_mins, 10));
      if (data.visitor_expiry_warning_mins) setVisitorExpiryWarning(parseInt(data.visitor_expiry_warning_mins, 10));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);

    try {
      await axios.post('/api/config', {
        escalation_enabled: escalationEnabled,
        escalation_timeout_mins: escalationTimeout,
        grace_period_mins: gracePeriod,
        visitor_expiry_warning_mins: visitorExpiryWarning
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-blue-600" />
          Workflow Configuration
        </h2>
        <p className="text-slate-500 mt-1 text-sm">Configure system-wide thresholds and automation engines.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Auto-Escalation Engine
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
              <div>
                <p className="font-medium text-slate-800 tracking-tight">Enable Auto-Escalation</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md">Automatically bypass HOD to HR Manager if a request remains PENDING beyond the timeout threshold.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={escalationEnabled}
                  onChange={(e) => setEscalationEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className={`transition-opacity ${escalationEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <label className="block text-sm font-medium text-slate-700 mb-2">Escalation Timeout (Minutes)</label>
              <div className="flex items-center">
                <input 
                  type="number" 
                  min="5" max="120"
                  value={escalationTimeout}
                  onChange={(e) => setEscalationTimeout(parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-slate-300 bg-slate-100 text-slate-500 sm:text-sm">
                  minutes
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Background watcher runs every 5 minutes.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-500" />
            Gatepass Return Protocol
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Late Return Grace Period (Minutes)</label>
            <div className="flex items-center">
              <input 
                type="number" 
                min="0" max="60"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(parseInt(e.target.value))}
                className="w-24 px-3 py-2 border border-slate-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-slate-300 bg-slate-100 text-slate-500 sm:text-sm">
                minutes
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Time allowed past 'Expected Return' before flagging as a Late Return violation.</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-emerald-500" />
            Visitor Protocol
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Visitor Expiry Warning (Minutes)</label>
            <div className="flex items-center">
              <input 
                type="number" 
                min="5" max="120"
                value={visitorExpiryWarning}
                onChange={(e) => setVisitorExpiryWarning(parseInt(e.target.value))}
                className="w-24 px-3 py-2 border border-slate-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-slate-300 bg-slate-100 text-slate-500 sm:text-sm">
                minutes
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Send socket notification when a visitor's pass is this many minutes away from expected exit time.</p>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-200">
          {saved && (
            <span className="text-emerald-600 text-sm font-medium animate-pulse">Save successful!</span>
          )}
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
