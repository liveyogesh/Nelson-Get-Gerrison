import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { Shield, Activity, Lock, AlertCircle, ChevronRight, QrCode, X, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

const SecurityGateway: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'loading' | 'error' | 'scanning'>('idle');
  const [error, setError] = useState('');
  const [health, setHealth] = useState<any>(null);
  const [scannedVisitor, setScannedVisitor] = useState<any>(null);
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleQRData = async (data: string) => {
    // Expected format: GATEPASS-ID or VISITOR-ID
    setStatus('loading');
    try {
      // Simulate API call to fetch visitor details
      const isGatepass = data.startsWith('GATEPASS-');
      const id = data.split('-')[1];
      
      // For demo, we just show a success UI
      setScannedVisitor({
        id,
        name: isGatepass ? "Employee Pass" : "Guest Visitor",
        type: isGatepass ? "Staff Movement" : "External Vendor",
        status: "AUTHORIZED",
        timestamp: new Date().toLocaleTimeString()
      });
      setStatus('idle');
    } catch (err) {
      setError("Invalid QR Code or Expired Pass");
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (status === 'scanning') {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(async (decodedText) => {
        scanner.clear();
        handleQRData(decodedText);
      }, (errorMessage) => {
        // ignore errors
      });

      return () => {
        scanner.clear().catch(e => console.error("Scanner clear fail", e));
      };
    }
  }, [status]);

  useEffect(() => {
    // Check system health on load
    const checkHealth = async () => {
      try {
        const res = await axios.get('/api/health');
        setHealth(res.data);
      } catch (err) {
        setHealth({ status: 'error' });
      }
    };
    checkHealth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setAuth(res.data.user, res.data.token);
      
      // Artificial delay for "Security Handshake" effect
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.message || 'Security validation failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 border-t-4 border-blue-600 overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white rounded-xl p-8 shadow-xl border border-slate-200">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center mb-4 shadow-sm">
              <Shield className="w-6 h-6 text-slate-800" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Nelson Garrison</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Hospital Security Operations</p>
          </div>

          {status === 'scanning' ? (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <QrCode className="w-5 h-5 text-blue-600" /> Scanner Active
                 </h3>
                 <button onClick={() => setStatus('idle')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                   <X className="w-5 h-5 text-slate-400" />
                 </button>
               </div>
               <div id="qr-reader" className="w-full rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50"></div>
               <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Position QR code within the frame</p>
            </div>
          ) : scannedVisitor ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
               <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                   <User className="w-8 h-8 text-emerald-600" />
                 </div>
                 <h3 className="text-emerald-900 font-bold text-lg">{scannedVisitor.name}</h3>
                 <p className="text-emerald-700 font-medium text-sm">{scannedVisitor.type}</p>
                 <div className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                   {scannedVisitor.status} • {scannedVisitor.timestamp}
                 </div>
               </div>
               <button 
                 onClick={() => setScannedVisitor(null)}
                 className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-lg transition-colors text-sm"
               >
                 Acknowledge & Clear
               </button>
            </div>
          ) : status === 'loading' ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-5">
              <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-sm"></div>
              <p className="text-slate-600 font-medium text-sm">Validating credentials...</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Staff Credentials</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Staff Email or Username"
                    className="w-full bg-white border border-slate-200 rounded-md py-2.5 pl-9 pr-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Access Token</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Security PIN / Password"
                    className="w-full bg-white border border-slate-200 rounded-md py-2.5 pl-9 pr-10 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-md text-xs font-medium flex items-center gap-2 mt-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="submit"
                  className="bg-[#1a2332] hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  Login 
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => setStatus('scanning')}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-lg transition-all text-sm flex items-center justify-center gap-2 border border-blue-100 shadow-sm"
                >
                  <QrCode className="w-4 h-4" /> Visitor Scan
                </button>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">System: {health?.status === 'ok' ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SecurityGateway;
