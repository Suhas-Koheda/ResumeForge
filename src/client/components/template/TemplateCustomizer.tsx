import React from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';

export const TemplateCustomizer: React.FC = () => {
    const { templateOptions, setTemplateOptions } = useBuilderStore();

    const handleColorChange = (key: 'primary' | 'secondary' | 'accent', value: string) => {
        setTemplateOptions({
            colorScheme: {
                ...templateOptions.colorScheme,
                [key]: value
            }
        });
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Customize Style</h2>
            
            <div className="space-y-6">
                {/* Colors */}
                <section>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Colors</h3>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <input 
                                type="color" 
                                value={templateOptions.colorScheme.primary}
                                onChange={(e) => handleColorChange('primary', e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                            />
                            <span className="text-[10px] font-medium text-slate-500">Primary</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <input 
                                type="color" 
                                value={templateOptions.colorScheme.secondary}
                                onChange={(e) => handleColorChange('secondary', e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                            />
                            <span className="text-[10px] font-medium text-slate-500">Secondary</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <input 
                                type="color" 
                                value={templateOptions.colorScheme.accent}
                                onChange={(e) => handleColorChange('accent', e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                            />
                            <span className="text-[10px] font-medium text-slate-500">Accent</span>
                        </div>
                    </div>
                </section>

                {/* Typography */}
                <section>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Typography</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">Font Family</label>
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={templateOptions.fontFamily}
                                onChange={(e) => setTemplateOptions({ fontFamily: e.target.value as any })}
                            >
                                <option value="sans">Sans Serif (Modern)</option>
                                <option value="serif">Serif (Classic)</option>
                                <option value="mono">Monospace (Technical)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">Font Size</label>
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={templateOptions.fontSize}
                                onChange={(e) => setTemplateOptions({ fontSize: parseInt(e.target.value) as any })}
                            >
                                <option value={10}>10pt</option>
                                <option value={11}>11pt</option>
                                <option value={12}>12pt</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Layout */}
                <section>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Layout</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">Section Style</label>
                            <div className="flex gap-2">
                                {(['lined', 'spaced', 'compact', 'decorative'] as const).map(style => (
                                    <button
                                        key={style}
                                        className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                                            templateOptions.sectionStyle === style 
                                                ? 'bg-blue-50 border-blue-600 text-blue-600' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                        onClick={() => setTemplateOptions({ sectionStyle: style })}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-600">Show Icons</label>
                            <button 
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                    templateOptions.showIcons ? 'bg-blue-600' : 'bg-slate-200'
                                }`}
                                onClick={() => setTemplateOptions({ showIcons: !templateOptions.showIcons })}
                            >
                                <span 
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        templateOptions.showIcons ? 'translate-x-6' : 'translate-x-1'
                                    }`} 
                                />
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">Paper Size</label>
                            <div className="flex gap-2">
                                {(['a4', 'letter'] as const).map(size => (
                                    <button
                                        key={size}
                                        className={`flex-1 py-2 rounded-lg border text-xs font-medium uppercase transition-all ${
                                            templateOptions.paperSize === size 
                                                ? 'bg-blue-50 border-blue-600 text-blue-600' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                        onClick={() => setTemplateOptions({ paperSize: size })}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
