const fs = require('fs');
let file = 'app/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Sample query button
content = content.replace('text-xs border border-gray-300 px-2 py-1 hover:border-black hover:bg-gray-50', 'text-xs border border-gray-600 px-2 py-1 hover:border-white hover:bg-white hover:text-black');

// Dropzone
content = content.replace('border-2 border-dashed border-gray-300 hover:border-black cursor-pointer', 'border-2 border-dashed border-gray-600 hover:border-white hover:bg-white/10 cursor-pointer');

// Just in case, let's also check if there are any other hover:bg-white missing text-black
// (Looks like only sample query button had hover:bg-gray-50 which is practically white)

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed hovers in DashboardClient');
