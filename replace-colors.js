const fs = require('fs');
let file = 'app/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('bg-black text-white border-black', 'bg-white text-black border-white');
content = content.replace('bg-white text-black border-gray-400 hover:border-black', 'bg-black text-white border-gray-600 hover:border-white');
content = content.replace('bg-black bg-opacity-0', 'bg-white bg-opacity-0');
content = content.replace('bg-black text-white text-xs px-2 py-1', 'bg-white text-black text-xs px-2 py-1');
content = content.replace('border border-gray-400 p-3 text-sm text-black bg-white focus:outline-none focus:border-black', 'border border-gray-600 p-3 text-sm text-white bg-black focus:outline-none focus:border-white');
content = content.replace('bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:bg-gray-400', 'bg-white text-black text-sm font-bold hover:bg-gray-200 disabled:bg-gray-600');
content = content.replace(/<span className=\"font-medium text-black\">/g, '<span className=\"font-medium text-white\">');
content = content.replace('text-black mb-6', 'text-white mb-6');
content = content.replace('text-black opacity-80', 'text-white opacity-80');
content = content.replace('hover:text-black', 'hover:text-white');
content = content.replace('hover:border-black text-black', 'hover:border-white text-white');
content = content.replace('text-black text-sm z-50 pointer-events-none font-medium bg-white/80', 'text-white text-sm z-50 pointer-events-none font-medium bg-black/80');

fs.writeFileSync(file, content, 'utf8');
console.log('Updated DashboardClient.tsx');
