import React, { memo } from 'react';
import { useBlock } from '../../hooks/useResume';
import { Mail, Phone, Globe, Linkedin, Github, MapPin, User } from 'lucide-react';

interface HeaderBlockProps {
    id: string;
}

const Input = ({ label, icon: Icon, placeholder, value, onChange }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">{label}</label>
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600">
                <Icon size={12} />
            </div>
            <input
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-2 pl-9 text-[10px] outline-none focus:border-black dark:focus:border-white transition-all font-mono text-zinc-900 dark:text-zinc-100"
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
            />
        </div>
    </div>
);

export const HeaderBlock: React.FC<HeaderBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);

    if (!data) return null;

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        updateData({ [field]: e.target.value });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-black dark:text-white uppercase tracking-[0.2em] pl-1">Primary Identity</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                        <User size={16} />
                    </div>
                    <input
                        className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-4 pl-12 text-lg font-black tracking-tight outline-none focus:border-black dark:focus:border-white transition-all text-black dark:text-white"
                        value={data.name || ''}
                        onChange={handleChange('name')}
                        placeholder="NAME_SURNAME"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Input label="Email" icon={Mail} placeholder="user@domain.com" value={data.email} onChange={handleChange('email')} />
                <Input label="Phone" icon={Phone} placeholder="+1-XXX-XXX-XXXX" value={data.phone} onChange={handleChange('phone')} />
                <Input label="Location" icon={MapPin} placeholder="City, State" value={data.location} onChange={handleChange('location')} />
                <Input label="Web" icon={Globe} placeholder="domain.tld" value={data.website} onChange={handleChange('website')} />
                <Input label="LinkedIn" icon={Linkedin} placeholder="in/username" value={data.linkedin} onChange={handleChange('linkedin')} />
                <Input label="GitHub" icon={Github} placeholder="git/username" value={data.github} onChange={handleChange('github')} />
            </div>
        </div>
    );
});

export default HeaderBlock;
