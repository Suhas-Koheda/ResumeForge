import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Globe, Sparkles, Rocket, Loader2 } from 'lucide-react';
import { useResumeActions } from '../../hooks/useResume';
import { ResumeBlock } from '@shared/types';
import { geminiService } from '../../services/ai';

export const OnboardingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [tab, setTab] = useState<'profile' | 'import'>('profile');
    const [importText, setImportText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const { addBlock, blocks, updateData, apiKey, setApiKey, setFullLatex, setBlocks } = useResumeActions();
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
        if (!importText.trim()) return;
        if (localKey) setApiKey(localKey);
        
        setIsImporting(true);
        try {
            const isLatex = importText.includes('\\documentclass');
            console.log(`[LOG_IMPORT] Detected ${isLatex ? 'LaTeX' : 'Text'} source.`);

            if (isLatex) {
                // IMMEDIATE STORE: No AI usage for LaTeX
                setFullLatex(importText);
                
                // PARSE BLOCKS for UI (Regex-based)
                const extracted = parseLatexBlocks(importText);
                if (extracted.length > 0) {
                    setBlocks([]); // Clear for fresh start
                    for (const b of extracted) {
                        if (b.type && b.data) {
                            const id = addBlock(b.type);
                            if (id) {
                                // Small delay to ensure block is added before data update
                                setTimeout(() => updateData(id, b.data), 10);
                            }
                        }
                    }
                }
                
                alert("LaTeX Source imported via Direct Channel. Canvas synced.");
                onClose();
            } else {
                // Pure text -> Full AI reconstruction
                const extractedBlocks = await geminiService.parseResume(importText, 'text', localKey || apiKey);
                setBlocks([]); // Clear for fresh start
                for (const b of extractedBlocks) {
                    if (b.type && b.data) {
                        const id = addBlock(b.type);
                        setTimeout(() => updateData(id, b.data), 10);
                    }
                }
                onClose();
            }
        } catch (error: any) {
            console.error("Import Error:", error);
            alert("Failed to parse source. If using raw text, an AI Key might be required (Quota Exceeded on shared key).");
        } finally {
            setIsImporting(false);
        }
    };

    // Robust Regex-based parser for Udoy Saha LaTeX Template
    const parseLatexBlocks = (latex: string): Partial<ResumeBlock>[] => {
        const blocks: Partial<ResumeBlock>[] = [];
        
        // Header
        const nameMatch = latex.match(/\\color\{ACCENT_COLOR\}\s*([^}]+)\}/) || latex.match(/\\Huge\s+\\scshape\s+([^\\]+?)\s*(?:\\\\|\\vspace)/);
        const emailMatch = latex.match(/mailto:([^}]+)/);
        const phoneMatch = latex.match(/faPhone\\\s*([\+\d\-]+)/) || latex.match(/\\Telefon\\\s*([\+\d\-]+)/);
        const locationMatch = latex.match(/Hyderabad, India/) || latex.match(/\\begin\{center\}[^]*?([^\n,]+,\s*[^\n\\]+)[^]*?\\faPhone/);

        if (nameMatch || emailMatch || phoneMatch) {
            blocks.push({
                type: 'header',
                data: {
                    name: nameMatch ? (nameMatch[1] || '').trim() : '',
                    email: emailMatch ? emailMatch[1].trim() : '',
                    phone: phoneMatch ? phoneMatch[1].trim() : '',
                    location: locationMatch ? (typeof locationMatch === 'string' ? locationMatch : locationMatch[0]).trim() : '',
                }
            });
        }

        // Education
        const eduSectionMatch = latex.match(/\\section\{EDUCATION\}([^]*?)\\section/);
        if (eduSectionMatch) {
            const eduItemRegex = /\\customSubHeading\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}/g;
            let m;
            while ((m = eduItemRegex.exec(eduSectionMatch[1])) !== null) {
                blocks.push({
                    type: 'education',
                    data: { school: m[1], year: m[2], degree: m[3], location: m[4] }
                });
            }
        }

        // Experience
        const expSectionMatch = latex.match(/\\section\{EXPERIENCE\}([^]*?)\\section/);
        if (expSectionMatch) {
            const expItemRegex = /\\customSubHeading\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}([^]*?)(?=\\customSubHeading|\\customSubHeadingContentEnd|$)/g;
            let m;
            while ((m = expItemRegex.exec(expSectionMatch[1])) !== null) {
                const highlights = (m[5].match(/\\customItem\{([^\}]+)\}/g) || []).map(mi => mi.replace(/\\customItem\{|\}/g, '').trim());
                blocks.push({
                    type: 'experience',
                    data: { company: m[1], duration: m[2], role: m[3], location: m[4], highlights }
                });
            }
        }

        // Skills
        const skillsSectionMatch = latex.match(/\\section\{TECHNICAL SKILLS\}([^]*?)\\section/);
        if (skillsSectionMatch) {
            const skillItemRegex = /\\item\s*\\textbf\{([^\}]+)\}:?\s*([^\n\\]+)/g;
            let m;
            while ((m = skillItemRegex.exec(skillsSectionMatch[1])) !== null) {
                blocks.push({
                    type: 'skills',
                    data: { category: m[1].replace(':', '').trim(), skills: m[2].trim() }
                });
            }
        }

        // Projects
        const projSectionMatch = latex.match(/\\section\{PROJECTS\}([^]*?)\\section/);
        if (projSectionMatch) {
            const projItemRegex = /\\customProject\s*\{([^\}]+)\}\s*\{([^\}]+)\}([^]*?)(?=\\customProject|\\customSubHeadingContentEnd|$)/g;
            let m;
            while ((m = projItemRegex.exec(projSectionMatch[1])) !== null) {
                const titleMatch = m[1].match(/\\textbf\{([^\}]+)\}/);
                const techMatch = m[1].match(/\\emph\{([^\}]+)\}/);
                const highlights = (m[3].match(/\\customItem\{([^\}]+)\}/g) || []).map(mi => mi.replace(/\\customItem\{|\}/g, '').trim());
                blocks.push({
                    type: 'project',
                    data: {
                        title: titleMatch ? titleMatch[1] : m[1],
                        technologies: techMatch ? techMatch[1] : '',
                        duration: m[2].split('|').pop()?.trim() || '',
                        highlights
                    }
                });
            }
        }

        return blocks;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-10">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h2 className="text-[14px] font-black uppercase tracking-[0.5em] text-black dark:text-white">System_Initialization</h2>
                            <div className="h-0.5 w-12 bg-black dark:bg-white mt-3"></div>
                            <p className="text-[9px] text-zinc-400 mt-6 uppercase tracking-[0.2em] leading-relaxed max-w-[350px]">
                                Configure your identity parameters or import historical data to prime the engine.
                            </p>
                        </div>
                        <button onClick={onClose} className="text-zinc-300 hover:text-black transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex gap-4 mb-8 border-b border-zinc-100 dark:border-zinc-900">
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

                                    <div className="grid grid-cols-2 gap-6">
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

                                    <div className="grid grid-cols-2 gap-6">
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
                                         <Sparkles size={10} /> AI_ENGINE_KEY (Optional)
                                     </label>
                                     <input
                                         type="password"
                                         className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[11px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-300"
                                         placeholder="sk-..."
                                         value={localKey}
                                         onChange={e => setLocalKey(e.target.value)}
                                     />
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
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-sm">
                                    <p className="text-[8px] text-zinc-400 uppercase tracking-widest leading-normal">
                                        Tip: For Overleaf, copy all text from the main .tex file. For PDF/Word, copy-paste the text content directly.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-colors"
                        >
                            Skip_Setup
                        </button>
                        {tab === 'profile' ? (
                            <button
                                onClick={handleSave}
                                className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 hover:opacity-80 transition-all border border-black dark:border-white shadow-lg"
                            >
                                <Sparkles size={14} />
                                Deploy_Node
                            </button>
                        ) : (
                            <button
                                onClick={handleImport}
                                disabled={isImporting || !importText.trim()}
                                className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 hover:opacity-80 disabled:opacity-30 transition-all border border-black dark:border-white shadow-lg"
                            >
                                {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                                {isImporting ? "Parsing_Source..." : "Import_Digest"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
