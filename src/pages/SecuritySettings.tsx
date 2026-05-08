import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, ShieldCheck, Key, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecuritySettings = () => {
    const { token, user, logout } = useAuthStore();
    const navigate = useNavigate();
    
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [verifyToken, setVerifyToken] = useState('');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const checkStatus = async () => {
       // Assuming we can pass it from user object, but we don't have it directly. 
       // Just handle setup
    };

    const setup2FA = async () => {
        setLoading(true);
        setStatus('');
        try {
            const res = await axios.get('/api/auth/2fa/setup', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQrCodeUrl(res.data.qrCodeUrl);
            setSecret(res.data.secret);
        } catch (err: any) {
            setStatus(err.response?.data?.message || 'Error setting up 2FA');
        } finally {
            setLoading(false);
        }
    };

    const verify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');
        try {
            await axios.post('/api/auth/2fa/verify', 
            { token: verifyToken },
            { headers: { Authorization: `Bearer ${token}` } });
            
            setStatus('2FA Successfully Enabled!');
            setQrCodeUrl(null);
            setVerifyToken('');
            
            // Re-login recommended to get fresh token with 2fa claim if implemented
            setTimeout(() => {
                logout();
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setStatus('Invalid code, please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto min-h-screen">
            <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <Settings className="text-slate-400" /> Security Settings
            </h1>

            <div className="space-y-6">
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <Key className="w-5 h-5 text-indigo-500" />
                        Password
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mb-4">
                        Regularly ensuring a strong password helps keep your account secure.
                    </p>
                    <button onClick={() => navigate('/change-password')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-sm transition-colors">
                        Change Password
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        Two-Factor Authentication (2FA)
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mb-6">
                        Protect your account with an extra layer of security. Once configured, you'll be required to enter both your password and an authentication code from your mobile app.
                    </p>

                    {!qrCodeUrl ? (
                        <button 
                            onClick={setup2FA}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 font-bold tracking-wide rounded-xl text-sm transition-colors"
                        >
                            {loading ? 'Initializing...' : 'Configure 2FA'}
                        </button>
                    ) : (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-2">Step 1: Scan QR Code</h3>
                            <p className="text-sm text-slate-500 mb-4">Open your authenticator app (e.g. Google Authenticator, Authy) and scan this QR code.</p>
                            <div className="bg-white p-4 inline-block rounded-xl shadow-sm border mb-4">
                                <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 mix-blend-multiply" />
                            </div>
                            <p className="text-xs font-mono text-slate-400 bg-white px-3 py-2 rounded-lg border w-fit mb-6">
                                Secret: {secret}
                            </p>

                            <h3 className="font-bold text-slate-900 mb-2">Step 2: Verify Code</h3>
                            <form onSubmit={verify2FA} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={verifyToken}
                                    onChange={e => setVerifyToken(e.target.value)}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="px-4 py-3 border border-slate-300 rounded-xl font-mono text-lg tracking-widest outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 w-48 text-center bg-white"
                                    required
                                />
                                <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-colors">
                                    {loading ? 'Verifying...' : 'Verify'}
                                </button>
                            </form>
                        </div>
                    )}
                    
                    {status && (
                        <div className={`mt-4 p-4 rounded-xl text-sm font-bold ${status.includes('Success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
