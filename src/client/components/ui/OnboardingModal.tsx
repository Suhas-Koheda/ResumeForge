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
    const [useAiForLatex, setUseAiForLatex] = useState(true);

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

            if (isLatex && !useAiForLatex) {
                // IMMEDIATE STORE: No AI usage for LaTeX
                setFullLatex(importText);

                try {
                    const res = await fetch('/api/v1/import/latex', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latexCode: importText })
                    });

                    if (!res.ok) throw new Error('Failed to parse LaTeX');

                    const data = await res.json();
                    const extracted = data.blocks || [];

                    if (extracted.length > 0) {
                        const newBlocks: ResumeBlock[] = extracted.filter((b: any) => b.type && b.data).map((b: any, index: number) => ({
                            id: Math.random().toString(36).substring(7),
                            type: b.type,
                            position: { x: 50, y: 50 + index * 150 },
                            data: b.data || {},
                            enabled: true
                        }));
                        setBlocks(newBlocks);
                        if (data.metadata?.warnings?.length > 0) {
                            console.warn("AST Parse Warnings:", data.metadata.warnings);
                            alert("AST Parsing completed with warnings: " + data.metadata.warnings.join(", "));
                        } else {
                            alert("Template Detected: " + (data.metadata?.template_detected || 'Custom') + ". Canvas synced.");
                        }
                    } else {
                        alert("Our parser couldn't find any structural blocks. Try enabling AI parsing fallback.");
                    }
                } catch (e: any) {
                    console.error(e);
                    alert("Local parser failed. " + e.message);
                }

                onClose();
            } else {
                if (isLatex) setFullLatex(importText);

                // AI reconstruction
                const extractedBlocks = await geminiService.parseResume(importText, 'text', localKey || apiKey);
                const newBlocks: ResumeBlock[] = extractedBlocks.filter((b: any) => b.type && b.data).map((b: any, index: number) => ({
                    id: Math.random().toString(36).substring(7),
                    type: b.type,
                    position: { x: 50, y: 50 + index * 150 },
                    data: b.data || {},
                    enabled: true
                }));
                setBlocks(newBlocks);
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
        const nameMatch = latex.match(/\\Huge\s+\\scshape\s+(?:\\color\{[^}]+\}\s*)?([^}\\]+)/);
        const emailMatch = latex.match(/mailto:([^}]+)/);
        const phoneMatch = latex.match(/\\faPhone\\\s*([\+\d\-]+)/) || latex.match(/\\Telefon\\\s*([\+\d\-]+)/);
        const locationMatch = latex.match(/\\vspace\{[^}]+\}\s*([^~\\]+)/) || latex.match(/Hyderabad, India/) || latex.match(/\\begin\{center\}[^]*?([^\n,]+,\s*[^\n\\]+)[^]*?\\faPhone/);

        const websiteMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faGlobe/) || latex.match(/\\href\{([^}]+)\}\s*\{\\Mundus/);
        const linkedinMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faLinkedin/) || latex.match(/\\href\{([^}]+)\}\s*\{\\textbf\{L\}/);
        const githubMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faGithub/) || latex.match(/\\href\{([^}]+)\}\s*\{\\textbf\{G\}/);

        if (nameMatch || emailMatch || phoneMatch) {
            blocks.push({
                type: 'header',
                data: {
                    name: nameMatch ? nameMatch[1].trim() : '',
                    email: emailMatch ? emailMatch[1].trim() : '',
                    phone: phoneMatch ? phoneMatch[1].trim() : '',
                    location: locationMatch ? (typeof locationMatch === 'string' ? locationMatch : locationMatch[1] || locationMatch[0]).trim() : '',
                    website: websiteMatch ? websiteMatch[1].trim() : '',
                    linkedin: linkedinMatch ? linkedinMatch[1].trim() : '',
                    github: githubMatch ? githubMatch[1].trim() : ''
                }
            });
        }

        // Education
        const eduSectionMatch = latex.match(/\\section\{EDUCATION\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
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
        const expSectionMatch = latex.match(/\\section\{EXPERIENCE\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
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
        const skillsSectionMatch = latex.match(/\\section\{TECHNICAL SKILLS\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
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
        const projSectionMatch = latex.match(/\\section\{PROJECTS?\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
        if (projSectionMatch) {
            const projectsRaw = projSectionMatch[1].split(/\\customProject\b/).filter(s => s.trim().length > 0 && !s.includes('ContentStart'));
            projectsRaw.forEach(pRaw => {
                const titleMatch = pRaw.match(/\\textbf\{([^\}]+)\}/);
                const techMatch = pRaw.match(/\\emph\{([^\}]+)\}/);
                const highlights = (pRaw.match(/\\customItem\{([^\}]+)\}/g) || []).map(mi => mi.replace(/\\customItem\{|\}/g, '').trim());

                const liveLinkMatch = pRaw.match(/\\href\{([^}]+)\}\s*\{[^}]*?(?:Live|Link)[^}]*\}/i);
                const codeLinkMatch = pRaw.match(/\\href\{([^}]+)\}\s*\{[^}]*?Code[^}]*\}/i);

                let duration = "";
                const quadMatch = pRaw.match(/\\quad\s*([^\}\n]+)/);
                if (quadMatch) duration = quadMatch[1].replace('}', '').trim();

                if (titleMatch || techMatch || highlights.length > 0) {
                    blocks.push({
                        type: 'project',
                        data: {
                            title: titleMatch ? titleMatch[1] : '',
                            technologies: techMatch ? techMatch[1] : '',
                            liveLink: liveLinkMatch ? liveLinkMatch[1] : '',
                            githubLink: codeLinkMatch ? codeLinkMatch[1] : '',
                            duration: duration,
                            highlights
                        }
                    });
                }
            });
        }

        return blocks;
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

                                {importText.includes('\\documentclass') && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="useAiForLatex"
                                            checked={useAiForLatex}
                                            onChange={(e) => setUseAiForLatex(e.target.checked)}
                                            className="w-3 h-3 accent-black dark:accent-white"
                                        />
                                        <label htmlFor="useAiForLatex" className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer">
                                            Enable AI Structure Parsing (Recommended for deeply nested LaTeX)
                                        </label>
                                    </div>
                                )}

                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-sm">
                                    <p className="text-[8px] text-zinc-400 uppercase tracking-widest leading-normal">
                                        Tip: For Overleaf, copy all text from the main .tex file. For PDF/Word, copy-paste the text content directly.
                                    </p>
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
                                className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-6 sm:px-10 py-3 sm:py-4 text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] flex items-center justify-center gap-3 hover:opacity-80 transition-all border border-black dark:border-white shadow-lg order-1 sm:order-2"
                            >
                                <Sparkles size={14} />
                                Deploy_Node
                            </button>
                        ) : (
                            <button
                                onClick={handleImport}
                                disabled={isImporting || !importText.trim()}
                                className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-6 sm:px-10 py-3 sm:py-4 text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] flex items-center justify-center gap-3 hover:opacity-80 disabled:opacity-30 transition-all border border-black dark:border-white shadow-lg order-1 sm:order-2"
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
