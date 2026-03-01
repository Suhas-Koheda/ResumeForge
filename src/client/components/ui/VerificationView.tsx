import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useResumeActions } from '../../hooks/useResume';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

export const VerificationView = ({ onComplete }: { onComplete: () => void }) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your data uplink...');
    const { setIsVerified } = useResumeActions();

    useEffect(() => {
        const verify = async () => {
            const token = new URLSearchParams(window.location.search).get('token');
            if (!token) {
                setStatus('error');
                setMessage('Missing verification token.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/auth/verify?token=${token}`);
                const data = await res.json();
                
                if (res.ok) {
                    setStatus('success');
                    setMessage('Identity confirmed. All systems operational.');
                    setIsVerified(true);
                    // Clear the token from URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Verification failed.');
                }
            } catch (e) {
                setStatus('error');
                setMessage('Network error during verification.');
            }
        };
        verify();
    }, [setIsVerified]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 font-mono">
            <div className="w-full max-w-sm bg-white dark:bg-black p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col items-center text-center">
                <div className="mb-6">
                    {status === 'loading' && <Loader2 className="w-12 h-12 text-zinc-400 animate-spin" />}
                    {status === 'success' && <CheckCircle className="w-12 h-12 text-green-500" />}
                    {status === 'error' && <XCircle className="w-12 h-12 text-red-500" />}
                </div>

                <h2 className="text-sm font-black uppercase tracking-[0.3em] mb-4">
                    {status === 'loading' ? 'AUTH_SYNC' : status === 'success' ? 'ACCESS_GRANTED' : 'VERIFICATION_ERROR'}
                </h2>

                <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed mb-8">
                    {message}
                </p>

                {status !== 'loading' && (
                    <button 
                        onClick={onComplete}
                        className="w-full py-4 bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                    >
                        Continue to Workspace <ArrowRight size={12} />
                    </button>
                )}
            </div>
        </div>
    );
};
