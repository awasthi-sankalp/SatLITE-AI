const fs = require('fs');
let code = fs.readFileSync('app/LandingPage.tsx', 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');
fs.writeFileSync('app/LandingPage.tsx', code);
