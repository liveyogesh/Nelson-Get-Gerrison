import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { QrCode, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const QRScanner = () => {
    const { token } = useAuthStore();
    const [scanResult, setScanResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [scanningState, setScanningState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

    const handleDecode = async (text: string) => {
        if (scannedData === text) return;
        setScannedData(text);
        setScanningState('processing');
        setScanResult(null);
        setError(null);

        try {
            const formData = {
                qrData: text,
                gateId: 1 // Example gate ID
            };
            const res = await axios.post('/api/gatepass/scan', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setScanResult(res.data);
            setScanningState('success');
            setTimeout(() => resetScan(), 5000); // Reset after 5s
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid or expired QR code.');
            setScanningState('error');
            setTimeout(() => resetScan(), 5000); // Reset after 5s
        }
    };

    const resetScan = () => {
        setScanningState('idle');
        setScanResult(null);
        setError(null);
        setScannedData(null);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <h1 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-900">
                <QrCode className="text-blue-600" />
                Gatepass Security Scanner
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                {/* Scanner Camera */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center z-10 relative">
                        <span className="font-bold tracking-widest text-sm uppercase">Active Scanner</span>
                        <div className="flex gap-2 items-center">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs text-red-400 font-mono">LIVEREC</span>
                        </div>
                    </div>
                    <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                        <Scanner 
                            onScan={(result) => { if (result && result.length > 0) handleDecode(result[0].rawValue) }}
                            formats={['qr_code']}
                        />
                        {scanningState === 'processing' && (
                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                                <span className="font-mono text-sm tracking-widest animate-pulse">VERIFYING SIGNATURE...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scan Result */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Inspection Result</h2>
                    
                    <AnimatePresence mode="popLayout">
                        {scanningState === 'idle' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-48 border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
                                <QrCode className="w-12 h-12 mb-3 opacity-50" />
                                <p className="font-medium text-sm">Present QR code to scanner</p>
                            </motion.div>
                        )}

                        {scanningState === 'success' && scanResult && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-emerald-50 border-2 border-emerald-500 p-8 rounded-[2rem] text-center shadow-lg shadow-emerald-500/10">
                                <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                                    <CheckCircle className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-emerald-900 mb-1">ACCESS GRANTED</h3>
                                <p className="text-emerald-700 font-medium mb-6 tracking-wide">Valid Gatepass Signature</p>
                                
                                <div className="bg-white/60 rounded-2xl p-4 text-left space-y-2 border border-emerald-200">
                                    <div className="flex justify-between border-b border-emerald-100 pb-2">
                                        <span className="text-xs font-bold text-emerald-600 uppercase">Pass ID</span>
                                        <span className="font-mono text-sm font-bold text-emerald-900">#{scanResult.request_id}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-xs font-bold text-emerald-600 uppercase">Verified At</span>
                                        <span className="font-mono text-xs font-bold text-emerald-900">{new Date().toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-emerald-100 mt-2">
                                        <span className="text-xs font-bold text-emerald-600 uppercase">Message</span>
                                        <span className="font-medium text-xs text-emerald-800">{scanResult.message}</span>
                                    </div>
                                </div>
                                <button onClick={resetScan} className="mt-8 w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-widest text-sm transition-colors shadow-lg shadow-emerald-600/20">
                                    CONTINUE SCANNING
                                </button>
                            </motion.div>
                        )}

                        {scanningState === 'error' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-rose-50 border-2 border-rose-500 p-8 rounded-[2rem] text-center shadow-lg shadow-rose-500/10">
                                <div className="w-20 h-20 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/30">
                                    <XCircle className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-rose-900 mb-1">ACCESS DENIED</h3>
                                <p className="text-rose-700 font-bold mb-6 flex justify-center items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {error}
                                </p>
                                <button onClick={resetScan} className="mt-8 w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black tracking-widest text-sm transition-colors shadow-lg shadow-rose-600/20">
                                    RESET SCANNER
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
