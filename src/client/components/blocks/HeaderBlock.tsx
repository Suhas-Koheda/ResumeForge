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
        <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">{label}</label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600">
                    <Icon size={12} />
                </div>
                <input
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-2 pl-9 text-[10px] outline-none focus:border-black dark:focus:border-white transition-all font-mono"
                    value={data[field] || ''}
                    onChange={handleChange(field)}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-black dark:text-white uppercase tracking-[0.2em] pl-1">Primary Identity</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                        <User size={16} />
                    </div>
                    <input
                        className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 pl-12 text-lg font-black tracking-tight outline-none focus:border-black dark:focus:border-white transition-all"
                        value={data.name || ''}
                        onChange={handleChange('name')}
                        placeholder="NAME_SURNAME"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Input label="Email" field="email" icon={Mail} placeholder="user@domain.com" />
                <Input label="Phone" field="phone" icon={Phone} placeholder="+1-XXX-XXX-XXXX" />
                <Input label="Location" field="location" icon={MapPin} placeholder="City, State" />
                <Input label="Web" field="website" icon={Globe} placeholder="domain.tld" />
                <Input label="LinkedIn" field="linkedin" icon={Linkedin} placeholder="in/username" />
                <Input label="GitHub" field="github" icon={Github} placeholder="git/username" />
            </div>
        </div>
    );
});
