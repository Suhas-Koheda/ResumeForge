import React, { memo } from 'react';
import { useBlock } from '../../hooks/useResume';
import { Mail, Phone, Globe, Linkedin, Github, MapPin, User } from 'lucide-react';

interface HeaderBlockProps {
    id: string;
}

export const HeaderBlock: React.FC<HeaderBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);

    if (!data) return null;

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        updateData({ [field]: e.target.value });
    };

    const Input = ({ label, field, icon: Icon, placeholder }: any) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{label}</label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <Icon size={14} />
                </div>
                <input
                    className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground font-medium placeholder:text-muted-foreground/30"
                    value={data[field] || ''}
                    onChange={handleChange(field)}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1 mb-2">
                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] pl-1">Resume Identity</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50">
                        <User size={18} />
                    </div>
                    <input
                        className="w-full bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl pl-11 pr-4 py-4 text-xl font-black tracking-tight focus:ring-4 focus:ring-indigo-500/10 outline-none text-foreground placeholder:text-muted-foreground/20"
                        value={data.name || ''}
                        onChange={handleChange('name')}
                        placeholder="Your Full Name"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input label="Location" field="location" icon={MapPin} placeholder="City, Country" />
                <Input label="Phone" field="phone" icon={Phone} placeholder="+91-1234567890" />
                <Input label="Email" field="email" icon={Mail} placeholder="name@example.com" />
                <Input label="Website" field="website" icon={Globe} placeholder="portfolio.dev" />
                <Input label="LinkedIn" field="linkedin" icon={Linkedin} placeholder="linkedin.com/in/user" />
                <Input label="GitHub" field="github" icon={Github} placeholder="github.com/user" />
            </div>
        </div>
    );
});
