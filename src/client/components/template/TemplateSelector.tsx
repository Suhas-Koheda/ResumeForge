import React, { useState } from 'react';
import { templateRegistry } from '../../services/templateRegistry';
import { useBuilderStore } from '../../store/useBuilderStore';
import { TemplateType } from '../../../shared/template.types';

export const TemplateSelector: React.FC = () => {
    const { templateOptions, setTemplateOptions } = useBuilderStore();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'All' | 'Professional' | 'Creative' | 'Technical'>('All');

    const templates = templateRegistry.getAllTemplates();
    
    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                             t.description.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    const handleSelect = (id: string) => {
        const template = templateRegistry.getTemplate(id);
        if (template) {
            setTemplateOptions({ ...template.config, template: template.type as TemplateType });
        }
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">Choose a Template</h2>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Search templates..." 
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['All', 'Professional', 'Creative', 'Technical'].map(cat => (
                        <button
                            key={cat}
                            className={`px-4 py-1.4 rounded-full text-sm font-medium transition-colors ${
                                category === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setCategory(cat as any)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map(template => (
                    <div 
                        key={template.id}
                        className={`group cursor-pointer rounded-xl border-2 transition-all overflow-hidden ${
                            templateOptions.template === template.type 
                                ? 'border-blue-600 shadow-md scale-[1.02]' 
                                : 'border-transparent hover:border-slate-300 bg-slate-50'
                        }`}
                        onClick={() => handleSelect(template.id)}
                    >
                        <div className="aspect-[3/4] bg-slate-200 relative overflow-hidden">
                            {/* In a real app, this would be an image of the template */}
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs rotate-[-45deg]">
                                Preview Coming Soon
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                <button className="w-full py-2 bg-white text-blue-600 rounded-lg font-bold shadow-lg">
                                    Select Template
                                </button>
                            </div>
                        </div>
                        <div className="p-3 bg-white">
                            <h3 className="font-bold text-slate-800">{template.name}</h3>
                            <p className="text-xs text-slate-500 truncate">{template.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
