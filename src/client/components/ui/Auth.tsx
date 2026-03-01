import React, { useState } from 'react';
import { ArrowLeft, Loader2, Key, CheckCircle } from 'lucide-react';
import { useResumeActions } from '../../hooks/useResume';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

export const Auth = ({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) => {
    const isLocal = (import.meta as any).env.IS_LOCAL === 'true';
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const { setToken } = useResumeActions();

    // Handle verification or reset on mount if token is present in URL
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const verifyToken = params.get('token');
        const resetTok = params.get('resetToken');
        const isVerifyPath = window.location.pathname.includes('/verify');

        if (verifyToken || isVerifyPath) {
            handleVerify(verifyToken);
        } else if (resetTok) {
            setResetToken(resetTok);
            setIsResetting(true);
            setIsLogin(false);
            setIsForgotPassword(false);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname.split('/auth')[0] || '/');
        }
    }, []);

    const handleVerify = async (token: string | null) => {
        if (!token) {
            setError("Missing verification token.");
            return;
        }

        setIsVerifying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/verify?token=${token}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Verification failed");

            setSuccessMessage("Email verified! You can now sign in.");
            setIsLogin(true);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname.split('/verify')[0] || '/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');

            setSuccessMessage(data.message);
            setTimeout(() => {
                setIsForgotPassword(false);
                setIsLogin(true);
            }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Access keys do not match.");
            return;
        }
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reset failed');

            setSuccessMessage(data.message);
            setTimeout(() => {
                setIsResetting(false);
                setIsLogin(true);
                setPassword('');
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
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

            // SUCCESS FLOW
            if (data.token) {
                setToken(data.token, email);
                setSuccessMessage(isLogin ? "Welcome back!" : "Account established. Data uplink active.");
                setTimeout(() => onSuccess(), 1000);
            } else if (!isLogin) {
                setSuccessMessage("Initialization sequence started. Check your mail for the verification link.");
                setIsLogin(true); // Switch to login after registration success
                setEmail('');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLocalBypass = () => {
        setToken('local-bypass', 'local-dev@host.local');
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
                        {isResetting ? 'Reset Key' : isForgotPassword ? 'Recover' : isLogin ? 'Authenticate' : 'Initialize'}
                    </h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2 font-black italic text-center">
                        {isResetting ? 'Setting New Access Key' : isForgotPassword ? 'Send Recovery Sequence' : isLocal ? 'DEVELOPMENT MODE ACTIVE' : 'SECURE ACCESS'}
                    </p>
                </div>

                <form onSubmit={isResetting ? handleResetPassword : isForgotPassword ? handleForgotPassword : handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[10px] uppercase font-bold tracking-wider p-3 text-center">
                            {error}
                        </div>
                    )}

                    {successMessage && !error && (
                        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 text-[10px] uppercase font-bold tracking-wider p-3 text-center flex items-center justify-center gap-2">
                            <CheckCircle size={10} />
                            {successMessage}
                        </div>
                    )}

                    {!isResetting && (
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">Email Vector</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300 placeholder:text-zinc-400 shadow-sm"
                                placeholder="user@domain.com"
                            />
                        </div>
                    )}

                    {!isForgotPassword && (
                        <>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">
                                    {isResetting ? 'New Access Key' : 'Access Key'}
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300 shadow-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            {isResetting && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">Confirm Access Key</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300 shadow-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            {isLogin && !isForgotPassword && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(true)}
                                        className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                                    >
                                        Forgot Key?
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={loading || isVerifying}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isVerifying ? 'Verifying...' : loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                            isResetting ? 'Reset Key' : isForgotPassword ? 'Send Link' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>

                    {isLocal && isLogin && !isForgotPassword && !isResetting && (
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
                        onClick={() => {
                            if (isForgotPassword || isResetting) {
                                setIsForgotPassword(false);
                                setIsResetting(false);
                                setIsLogin(true);
                            } else {
                                setIsLogin(!isLogin);
                            }
                            setError(null);
                            setSuccessMessage(null);
                        }}
                        className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                        {isForgotPassword || isResetting ? '← Back to Sign In' : isLogin ? 'Initialize New Node →' : '← Back to Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};
