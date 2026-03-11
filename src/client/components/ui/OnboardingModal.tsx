import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Globe, Sparkles, Rocket, Loader2, FileDown } from 'lucide-react';
import { useResumeActions } from '../../hooks/useResume';
import { ResumeBlock, BlockType } from '@shared/types';
import { geminiService } from '../../services/ai';
import { offlineLatexParser } from '../../services/offlineParser';
import toast from 'react-hot-toast';

export const OnboardingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [tab, setTab] = useState<'profile' | 'import'>('profile');
    const [importText, setImportText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const { addBlock, blocks, updateData, apiKey, setApiKey, updateFileContent, setBlocks, setResumeId, activeResumeIndex, resumes, setCustomTemplate, setProjectFiles, setActiveFileName } = useResumeActions();
    const [localKey, setLocalKey] = useState(apiKey || '');

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
        if (localKey) setApiKey(localKey);
        if (headerBlock) {
            updateData(headerBlock.id, formData);
        } else {
            const newId = addBlock('header');
            if (newId) setTimeout(() => updateData(newId, formData), 10);
        }
        onClose();
    };

    const handleImport = async () => {
        console.log("[OnboardingModal] handleImport clicked. Text length:", importText.length);
        if (!importText.trim()) {
            console.log("[OnboardingModal] importText is empty, returning.");
            return;
        }
        if (localKey) setApiKey(localKey);

        setIsImporting(true);
        try {
            const isLatex = importText.includes('\\documentclass');
            console.log(`[OnboardingModal] Detected ${isLatex ? 'LaTeX' : 'Text'} source.`);

            if (isLatex && false) {
                console.log("[OnboardingModal] Skipping AI completely, using local LaTeX parser.");
                updateFileContent('main.tex', importText);

                try {
                    const extracted = offlineLatexParser.parseLatexBlocks(importText);

                    if (extracted.length > 0) {
                        const newBlocks: ResumeBlock[] = extracted.map((b: any) => ({
                            id: Math.random().toString(36).substring(7),
                            type: b.type as BlockType,
                            position: { x: 0, y: 0 },
                            data: b.data || {},
                            enabled: true
                        }));
                        setBlocks([...blocks, ...newBlocks]);
                    } else {
                        toast.error("Our parser couldn't find any structural blocks. Try enabling AI parsing fallback.");
                    }
                } catch (e: any) {
                    console.error("[OnboardingModal] Local parser failed:", e);
                    toast.error("Local parser failed. " + e.message);
                }
                onClose();
            } else {
                console.log("[OnboardingModal] Triggering remote backend parsing. (fallback to AI if text)");
                if (isLatex) updateFileContent('main.tex', importText);

                const currentResume = resumes[activeResumeIndex];
                const resumeTitle = currentResume?.title || `Resume R_${activeResumeIndex + 1}`;
                const currentId = currentResume?.id;

                console.log("[OnboardingModal] Sending request to geminiService.parseResume()");
                const result = await geminiService.parseResume(
                    importText,
                    'text',
                    localKey || apiKey,
                    false, // autoSave only if logged in
                    resumeTitle,
                    currentId
                );

                console.log("[OnboardingModal] Parsing Result:", result);
                const parsedBlocks = result.data || result;
                const resumeId = result.resumeId;

                const newBlocks: ResumeBlock[] = parsedBlocks.filter((b: any) => b.type && b.data).map((b: any) => ({
                    id: Math.random().toString(36).substring(7),
                    type: b.type,
                    position: { x: 0, y: 0 },
                    data: b.data || {},
                    enabled: true
                }));

                setBlocks([...blocks, ...newBlocks]);
                if (resumeId) {
                    setResumeId(activeResumeIndex, resumeId);
                }
                onClose();
            }
        } catch (error: any) {
            console.error("[OnboardingModal] Final Import Catch Error:", error);
            toast.error("Failed to parse source. If using raw text, an AI Key might be required.");
        } finally {
            setIsImporting(false);
            console.log("[OnboardingModal] isImporting set to false.");
        }
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (json.source !== 'ResumeForge') {
                    toast.error('Invalid file format.');
                    return;
                }
                const { nodes, customTemplate: tmpl, projectFiles: pf, activeFileName: af } = json.canvasData;
                setBlocks(nodes || []);
                setCustomTemplate(tmpl || null);
                if (pf) setProjectFiles(pf);
                setActiveFileName(af || 'main.tex');
                toast.success('Resume restored successfully.');
                onClose();
            } catch {
                toast.error('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] no-scrollbar">
                <div className="p-6 sm:p-10">
                    <div className="flex justify-between items-start mb-6 sm:mb-10">
                        <div>
                            <h2 className="text-[12px] sm:text-[14px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-black dark:text-white">System_Initialization</h2>
                            <div className="h-0.5 w-12 bg-black dark:bg-white mt-2 sm:mt-3"></div>
                            <p className="hidden sm:block text-[9px] text-zinc-400 mt-6 uppercase tracking-[0.2em] leading-relaxed max-w-[350px]">
                                Configure your identity parameters or import historical data to prime the engine.
                            </p>
                            <p className="sm:hidden text-[8px] text-zinc-400 mt-4 uppercase tracking-[0.15em] leading-relaxed">
                                Configure identity or import data.
                            </p>
                        </div>
                        <button onClick={onClose} className="text-zinc-300 hover:text-black transition-colors p-2">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex gap-4 mb-6 sm:mb-8 border-b border-zinc-100 dark:border-zinc-900">
                        <button
                            onClick={() => setTab('profile')}
                            className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'profile' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-zinc-300'}`}
                        >
                            01_IDENTITY
                        </button>
                        <button
                            onClick={() => setTab('import')}
                            className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'import' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-zinc-300'}`}
                        >
                            02_IMPORT_DATA
                        </button>
                    </div>

                    <div className="min-h-[300px]">
                        {tab === 'profile' ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                            <User size={10} /> Full Name
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300"
                                            placeholder="NAME_SURNAME"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                                <Mail size={10} /> Email Registry
                                            </label>
                                            <input
                                                type="email"
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300"
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
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300"
                                                placeholder="+X-XXX-XXX-XXXX"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                                <MapPin size={10} /> Location
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300"
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
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300"
                                                placeholder="portfolio.exe"
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles size={10} />
                                        AI_ENGINE_KEY {(import.meta as any).env.IS_LOCAL !== 'true' ? '(Optional - Uses shared quota if empty)' : '(Optional)'}
                                    </label>
                                    <input
                                        type="password"
                                        className={`w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300`}
                                        placeholder="sk-..."
                                        value={localKey}
                                        onChange={e => setLocalKey(e.target.value)}
                                    />
                                    {!localKey && (import.meta as any).env.IS_LOCAL !== 'true' && (
                                        <p className="text-[8px] text-zinc-400/60 font-medium uppercase tracking-tight italic">
                                            Note: You can provide your own Gemini API key to avoid shared rate limits in cloud environments.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Rocket size={12} /> Source Digest (Resume Text / Overleaf LaTeX)
                                    </label>
                                    <textarea
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-4 text-[10px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300 min-h-[220px] leading-relaxed"
                                        placeholder="Paste your existing resume text or raw Overleaf LaTeX source here. Our AI will parse and reconstruct it on the canvas."
                                        value={importText}
                                        onChange={e => setImportText(e.target.value)}
                                    />
                                </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest text-center">Or restore from your machine</p>
                                        <button 
                                            onClick={() => document.getElementById('onboarding-json-import')?.click()}
                                            className="w-full flex items-center justify-center gap-3 p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100 transition-all text-[10px] font-bold uppercase tracking-widest text-zinc-500"
                                        >
                                            <FileDown size={14} /> RESTORE FROM .RF.JSON
                                        </button>
                                        <input id="onboarding-json-import" type="file" accept=".rf.json" className="hidden" onChange={handleImportJson} />
                                    </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                            onClick={onClose}
                            className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-colors order-2 sm:order-1"
                        >
                            Skip_Setup
                        </button>
                        {tab === 'profile' ? (
                            <button
                                onClick={handleSave}
                                className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-6 sm:px-10 py-3 sm:py-4 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:opacity-80 transition-all border border-black dark:border-white shadow-lg order-1 sm:order-2"
                            >
                                <Sparkles size={14} />
                                Deploy_Node
                            </button>
                        ) : (
                            <button
                                onClick={handleImport}
                                disabled={isImporting || !importText.trim()}
                                className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-6 sm:px-10 py-3 sm:py-4 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:opacity-80 disabled:opacity-30 transition-all border border-black dark:border-white shadow-lg order-1 sm:order-2"
                            >
                                {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                                {isImporting ? "Parsing..." : "Import_Digest"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
