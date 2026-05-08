import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Moon, Sun, Shield, Activity, Users, Search, Scan, 
  AlertCircle, Server, Filter, X, Eye, Lock, MapPin, 
  Clock, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Guard {
  username: string;
  shift_name: string;
  first_name: string;
  last_name: string;
}

interface Traffic {
  id: number;
  gate_name: string;
  movement_type: 'IN' | 'OUT';
  timestamp: string;
  user_id: number;
}

interface Incident {
  id: number;
  incident_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  created_at: string;
  facility_name: string;
}

interface Zone {
  zone_id: number;
  zone_name: string;
  risk_level: string;
}

const SecurityDashboard: React.FC = () => {
  const [isNightMode, setIsNightMode] = useState(true); // Default to night mode for security
  const [searchQuery, setSearchQuery] = useState('');
  const [systemStatus, setSystemStatus] = useState<'OK' | 'ERROR' | 'LOADING'>('LOADING');

  const [guards, setGuards] = useState<Guard[]>([]);
  const [traffic, setTraffic] = useState<Traffic[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [zoneLogs, setZoneLogs] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [gRes, tRes, iRes, zRes, hRes] = await Promise.all([
        axios.get('/api/security/guards/active', { headers }),
        axios.get('/api/security/gates/traffic/recent', { headers }),
        axios.get('/api/security/incidents', { headers }),
        axios.get('/api/security/restricted/zones', { headers }),
        axios.get('/api/health')
      ]);
      setGuards(gRes.data);
      setTraffic(tRes.data);
      setIncidents(iRes.data);
      setZones(zRes.data);
      setSystemStatus(hRes.data.status === 'OK' ? 'OK' : 'ERROR');
    } catch (err) {
      setSystemStatus('ERROR');
    }
  };

  const fetchZoneLogs = async (zoneId: number) => {
    try {
      const res = await axios.get(`/api/security/restricted/zones/${zoneId}/logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setZoneLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch zone logs', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedZone) {
      fetchZoneLogs(selectedZone.zone_id);
      const interval = setInterval(() => fetchZoneLogs(selectedZone.zone_id), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedZone]);

  const filteredIncidents = severityFilter === 'ALL' 
    ? incidents 
    : incidents.filter(i => i.severity === severityFilter);

  return (
    <div className={`min-h-screen transition-all duration-500 font-sans ${
      isNightMode ? 'bg-[#0a0f1e] text-slate-200' : 'bg-slate-50 text-slate-800'
    }`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Toggle */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isNightMode ? 'bg-blue-600/20' : 'bg-blue-600/10'}`}>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
                Operational Command
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">
                  Node Status: Real-Time Governance
                </p>
                <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full border border-slate-800">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    systemStatus === 'OK' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <span className="text-[8px] font-black text-slate-500">{systemStatus === 'OK' ? 'CONNECTED' : 'OFFLINE'}</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsNightMode(!isNightMode)}
            className="p-2 rounded-full border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-all"
          >
            {isNightMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
          </button>
        </div>

        {/* Search & Entry (Input Fields) */}
        <div className="mb-8">
          <div className={`relative max-w-2xl mx-auto group ${
            isNightMode ? 'text-slate-200' : 'text-slate-800'
          }`}>
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
              isNightMode ? 'text-slate-600 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-600'
            }`} />
            <input 
              type="text"
              placeholder="Search personnel, passes, or gate logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-2xl outline-none transition-all border text-sm font-semibold ${
                isNightMode 
                  ? 'bg-slate-900 border-slate-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10' 
                  : 'bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 shadow-sm'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Controls */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Zones Grid */}
            <div className={`p-6 rounded-[2rem] border ${isNightMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Secure Zones Access</h4>
                <Lock className="w-4 h-4 text-rose-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {zones.map((zone) => (
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    key={zone.zone_id}
                    onClick={() => setSelectedZone(zone)}
                    className="p-4 rounded-2xl bg-black/20 border border-slate-800/50 cursor-pointer hover:border-blue-500/50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2 text-slate-400 group-hover:text-blue-400">
                        <Server className="w-5 h-5" />
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${
                          zone.risk_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>{zone.risk_level}</span>
                    </div>
                    <h5 className="text-sm font-bold text-white mb-1">{zone.zone_name}</h5>
                    <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> View Access Logs
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Traffic Logs */}
            <div className={`p-6 rounded-[2rem] border ${isNightMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <Activity className="w-4 h-4 text-emerald-500" /> Live Gate Traffic Log
                </h4>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> STREAMING
                </div>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {traffic.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 rounded-xl bg-black/20 hover:bg-black/40 transition-all border border-transparent hover:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${
                        log.movement_type === 'IN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {log.movement_type}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{log.gate_name}</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Personnel ID: RX-{log.user_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                       <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">GATE_READY</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Personnel */}
            <div className={`p-6 rounded-[2rem] border ${isNightMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Active Security Force
              </h4>
              <div className="space-y-3">
                {guards.map((guard, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-black/20 border border-slate-800/50">
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                       <div>
                          <p className="text-xs font-bold text-white uppercase">{guard.first_name} {guard.last_name[0]}.</p>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{guard.shift_name}</p>
                       </div>
                    </div>
                    <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">ON_DUTY</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Incidents */}
            <div className={`p-6 rounded-[2rem] border ${isNightMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" /> System Alerts
                </h4>
                <div className="flex gap-1">
                  {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const).map(sev => (
                    <button 
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded border transition-all ${
                        severityFilter === sev 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'bg-black/20 border-slate-800 text-slate-500'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredIncidents.map(incident => (
                  <div key={incident.id} className="p-4 rounded-2xl bg-black/20 border border-slate-800/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                        incident.severity === 'HIGH' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                        incident.severity === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-500'
                      }`}>
                        {incident.severity}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">{new Date(incident.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs font-bold text-white">{incident.incident_type}</p>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{incident.description}</p>
                    <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-600">
                      <MapPin className="w-2.5 h-2.5" /> {incident.facility_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal for Zone Logs */}
        <AnimatePresence>
          {selectedZone && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 onClick={() => setSelectedZone(null)}
                 className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                <div className="flex justify-between items-start mb-10">
                  <div>
                     <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20">
                          <Lock className="w-6 h-6 text-blue-500" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-white uppercase">{selectedZone.zone_name}</h3>
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Security Clearance Access Matrix</p>
                  </div>
                  <button 
                    onClick={() => setSelectedZone(null)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  {zoneLogs.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest bg-black/20 rounded-3xl border border-dashed border-slate-800">
                      <Shield className="w-8 h-8 mx-auto mb-4 opacity-20" />
                      No Access Records Found
                    </div>
                  ) : (
                    zoneLogs.map((log, i) => (
                      <div key={i} className="flex justify-between items-center bg-black/30 p-5 rounded-3xl border border-slate-800/50 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-blue-500 text-xs shadow-inner">
                            {log.username ? log.username[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{log.first_name} {log.last_name}</p>
                            <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500">{log.designation} — STAFF</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-mono text-slate-300">{new Date(log.timestamp).toLocaleTimeString()}</p>
                           <p className={`text-[8px] font-black uppercase tracking-widest mt-1 flex items-center justify-end gap-1 ${
                             log.movement_type === 'IN' ? 'text-emerald-500' : 'text-amber-500'
                           }`}>
                             {log.movement_type === 'IN' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Info className="w-2.5 h-2.5" />}
                             SUCCESS_AUTH
                           </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 3s infinite linear;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 100, 100, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default SecurityDashboard;
