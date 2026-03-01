import React, { useState } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

export const VerificationBanner = ({ email, onVerified }: { email: string, onVerified: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleResend = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setSent(true);
                toast.success("Verification email dispatched.");
            } else {
                toast.error(data.error || "Failed to resend.");
            }
        } catch (e) {
            toast.error("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top duration-500 z-[100]">
            <div className="flex items-center gap-3">
                <Mail size={14} />
                <span>UNVERIFIED ACCOUNT: SOME FEATURES (AI, CLOUD SYNC) ARE RESTRICTED. CHECK {email}</span>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleResend}
                    disabled={loading || sent}
                    className="flex items-center gap-2 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                    {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    {sent ? 'SENT' : 'RESEND VERIFICATION'}
                </button>
            </div>
        </div>
    );
};
