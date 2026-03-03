import React, { useState } from 'react';
import axios from 'axios';
import { useBuilderStore } from '../../store/useBuilderStore';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

export const TemplateSaver: React.FC = () => {
    const { templateOptions, token } = useBuilderStore();
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        if (!name) {
            setMessage({ type: 'error', text: 'Please enter a name for your template' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            await axios.post(`${API_URL}/templates`, {
                name,
                config: templateOptions,
                preamble: '', // In a more advanced version, we'd capture custom preamble
                styles: {},
                isPublic: false
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Template saved successfully!' });
            setName('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save template' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            name: name || 'Custom Template',
            config: templateOptions,
        }, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${name || 'template'}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Save Template</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Template Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. My Professional Theme" 
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm ${
                        message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                        {message.text}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button 
                        className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-all ${
                            isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                        }`}
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save to Cloud'}
                    </button>
                    <button 
                        className="px-4 py-2.5 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        onClick={handleExport}
                    >
                        Export JSON
                    </button>
                </div>
                
                <p className="text-[10px] text-slate-400 text-center">
                    Saved templates will appear in your Template Registry.
                </p>
            </div>
        </div>
    );
};
