const header = {
    name: 'Suhas Koheda',
    location: 'Hyderabad, India',
    phone: '+91-7396824087',
    email: 'sharmasuhas450@gmail.com',
    website: 'suhask.dev',
    linkedin: 'linkedin.com/in/ssk450',
    github: 'github.com/suhas-koheda'
};
const escapeLatex = (text) => text;
const preamble = `
%----------HEADER----------
\\begin{center}
    {\\Huge \\scshape \\color{ACCENT_COLOR} ${escapeLatex(header.name || 'Your Name')}} \\\\ \\vspace{2pt}
    ${escapeLatex(header.location || 'Location')} ~~
    \\faPhone\\ ${escapeLatex(header.phone || 'Phone')} ~~
    \\href{mailto:${header.email || ''}}{\\faEnvelope\\ \\underline{${escapeLatex(header.email || '')}}} \\\\
    ${header.website ? `\\href{https://${header.website.replace('https://', '').replace('http://', '')}}{\\faGlobe\\ \\underline{${escapeLatex(header.website)}}}` : ''}
    ${header.linkedin ? `${header.website ? ' ~~ ' : ''}\\href{https://${header.linkedin.replace('https://', '').replace('http://', '')}}{\\faLinkedin\\ \\underline{${escapeLatex(header.linkedin)}}}` : ''}
    ${header.github ? `${(header.website || header.linkedin) ? ' ~~ ' : ''}\\href{https://${header.github.replace('https://', '').replace('http://', '')}}{\\faGithub\\ \\underline{${escapeLatex(header.github)}}}` : ''}
\\end{center}
`;
console.log(preamble);
