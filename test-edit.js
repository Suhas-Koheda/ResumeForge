const content = `\documentclass{article}\n\\begin{document}\nHello World\\end{document}`;
fetch('http://localhost:5000/api/v1/ai/edit-file', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content, instruction: "Add exclamation mark" })
}).then(res => res.text()).then(console.log).catch(console.error);
