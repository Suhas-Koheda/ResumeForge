import React, { useState } from 'react';
import { ArrowLeft, Loader2, Key } from 'lucide-react';
import { useResumeActions } from '../../hooks/useResume';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

export const Auth = ({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('172.');
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setToken } = useResumeActions();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (isLogin && data.token) {
                setToken(data.token);
                onSuccess();
            } else if (!isLogin) {
                setIsLogin(true); // Switch to login after register
                setError("Account created successfully. Please login.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLocalBypass = () => {
        setToken('local-bypass');
        onSuccess();
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-black dark:text-white flex flex-col font-mono items-center justify-center p-4">
            <button 
                onClick={onBack}
                className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>

            <div className="w-full max-w-sm bg-white dark:bg-black p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4">
                        <Key className="w-5 h-5 text-black dark:text-white" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-widest">
                        {isLogin ? 'Authenticate' : 'Initialize'}
                    </h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">
                        {isLocal ? 'DEVELOPMENT MODE ACTIVE' : 'SECURE ACCESS'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[10px] uppercase font-bold tracking-wider p-3 text-center">
                            {error}
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">Email Vector</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-xs outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-zinc-400"
                            placeholder="user@domain.com"
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">Access Key</label>
                        <input 
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-xs outline-none focus:border-black dark:focus:border-white transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>

                    {isLocal && isLogin && (
                        <button 
                            type="button"
                            onClick={handleLocalBypass}
                            className="mt-2 w-full flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                        >
                            Skip (Local Mode)
                        </button>
                    )}
                </form>

                <div className="mt-6 flex justify-center border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <button 
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                        {isLogin ? 'Initialize New Node →' : '← Back to Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};
