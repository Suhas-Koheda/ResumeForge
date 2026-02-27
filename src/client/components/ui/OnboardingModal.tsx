import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Globe, Sparkles } from 'lucide-react';
import { useResumeActions } from '../../hooks/useResume';
import { ResumeBlock } from '../@shared/types';

export const OnboardingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addBlock, blocks, updateData } = useResumeActions();

    // Find header data
    const headerBlock = blocks.find((b: ResumeBlock) => b.type === 'header');
    const [formData, setFormData] = useState({
        name: headerBlock?.data?.name || '',
        email: headerBlock?.data?.email || '',
        phone: headerBlock?.data?.phone || '',
        location: headerBlock?.data?.location || '',
        website: headerBlock?.data?.website || '',
    });

    if (!isOpen) return null;

    const handleSave = () => {
        if (headerBlock) {
            updateData(headerBlock.id, formData);
        } else {
            const newId = addBlock('header') as string;
            // In local mode, the state update is synchronous but we use a microtask to be safe
            Promise.resolve().then(() => {
                if (newId) updateData(newId, formData);
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-10">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h2 className="text-[14px] font-black uppercase tracking-[0.5em] text-black dark:text-white">Profile_Initialization</h2>
                            <div className="h-0.5 w-12 bg-black dark:bg-white mt-3"></div>
                            <p className="text-[9px] text-zinc-400 mt-6 uppercase tracking-[0.2em] leading-relaxed max-w-[300px]">Seed your canvas with the essential identity parameters.</p>
                        </div>
                        <button onClick={onClose} className="text-zinc-300 hover:text-black transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={10} /> Full Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono"
                                    placeholder="NAME_SURNAME"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Mail size={10} /> Email Registry
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono"
                                        placeholder="user@domain.tld"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Phone size={10} /> Uplink (Phone)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono"
                                        placeholder="+X-XXX-XXX-XXXX"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={10} /> Location
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono"
                                        placeholder="City, State"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Globe size={10} /> Portfolio URL
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono"
                                        placeholder="portfolio.exe"
                                        value={formData.website}
                                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-colors"
                        >
                            Skip_Setup
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 hover:opacity-80 transition-all border border-black dark:border-white"
                        >
                            <Sparkles size={14} />
                            Deploy_Node
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
