import React from 'react';
import { 
    X, Sun, Moon, LogOut, LogIn, User, 
    Terminal, Briefcase, GraduationCap, Code, Rocket, FileText, Layers 
} from 'lucide-react';
import { BlockType } from '@shared/types';

interface MobileDrawerProps {
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (val: boolean) => void;
    setIsDark: (val: boolean) => void;
    isDark: boolean;
    serverMode: 'LOCAL' | 'CLOUD' | 'LOADING';
    userEmail: string | null;
    token: string | null;
    setToken: (token: string | null, email: string | null) => void;
    setShowAuth: (val: boolean) => void;
    BLOCK_BUTTONS: { type: BlockType; label: string; icon: React.ElementType }[];
    addBlock: (type: BlockType) => string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
    isMobileMenuOpen, setIsMobileMenuOpen, setIsDark, isDark,
    serverMode, userEmail, token, setToken, setShowAuth,
    BLOCK_BUTTONS, addBlock
}) => {
    if (!isMobileMenuOpen) return null;

    return (
        <div className="lg:hidden fixed inset-0 z-[100] animate-in slide-in-from-right duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#111215] shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800">
                <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-black dark:text-white" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">Menu_System</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-zinc-400 hover:text-black dark:hover:text-white">
                        <X size={18} />
                    </button>
                </header>
                
                <div className="flex-1 overflow-y-auto py-6 px-4">
                    {/* Auth Section */}
                    {serverMode === 'CLOUD' && (
                        <div className="mb-8 p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                            {token && userEmail ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
                                            <User size={18} className="text-white dark:text-black" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Active_User</p>
                                            <p className="text-[11px] font-bold truncate dark:text-white">{userEmail}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setToken(null, null); setIsMobileMenuOpen(false); }}
                                        className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <LogOut size={14} /> Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => { setShowAuth(true); setIsMobileMenuOpen(false); }}
                                    className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/10 transition-all active:scale-[0.98]"
                                >
                                    <LogIn size={14} /> Initialize_Session
                                </button>
                            )}
                        </div>
                    )}

                    {/* Quick Add Section */}
                    <div className="mb-8">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest px-2 mb-4">Quick_Add_Nodes</p>
                        <div className="grid grid-cols-2 gap-2">
                            {BLOCK_BUTTONS.map(({ type, label, icon: Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => { addBlock(type); setIsMobileMenuOpen(false); }}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all font-bold group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Icon size={14} className="text-zinc-500" />
                                    </div>
                                    <span className="text-[9px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400 font-black">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferences */}
                    <div>
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest px-2 mb-4">System_Preferences</p>
                        <button 
                            onClick={() => setIsDark(!isDark)}
                            className="w-full h-12 flex items-center justify-between px-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Night_Vision_Mode</span>
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-white' : 'bg-zinc-200'}`}>
                                <div className={`w-4 h-4 rounded-full transition-transform flex items-center justify-center ${isDark ? 'translate-x-4 bg-black' : 'bg-white'}`}>
                                    {isDark ? <Moon size={8} className="text-white" /> : <Sun size={8} className="text-zinc-400" />}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <footer className="p-6 border-t border-zinc-100 dark:border-zinc-900">
                    <p className="text-[7px] font-black text-center text-zinc-300 dark:text-zinc-600 uppercase tracking-[0.2em]">Build_v1.0.42_Stable</p>
                </footer>
            </div>
        </div>
    );
};
