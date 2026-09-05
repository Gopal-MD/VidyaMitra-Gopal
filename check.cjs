const fs = require('fs');
const c = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = c.split('\n');
console.log('Total lines:', lines.length);
// Find the 2-space-indented return ( which is the component return
let ri = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === '  return (') { ri = i; break; }
}
console.log('Component return at line:', ri + 1);
let b = 0, p = 0;
for (let i = 0; i < ri; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') b++;
    else if (ch === '}') b--;
    else if (ch === '(') p++;
    else if (ch === ')') p--;
  }
}
console.log('open_braces:', b, '| open_parens:', p);
// Show any lines where raw brace count goes abnormally deep or shallow
let bb = 0;
for (let i = 0; i < ri; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') bb++;
    else if (ch === '}') bb--;
  }
  if (bb < 0) { console.log('Brace went negative at line', i + 1, ':', lines[i]); }
}
console.log('Done');
