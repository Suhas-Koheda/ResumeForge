const latex = `{\\Huge \\scshape \\color{ACCENT_COLOR} Suhas Koheda} \\\\ \\vspace{2pt}`;
const m = latex.match(/\\Huge\s+\\scshape\s+(?:\\color\{[^}]+\}\s*)?([^}\\]+)/);
console.log(m ? m[1].trim() : 'fail');
