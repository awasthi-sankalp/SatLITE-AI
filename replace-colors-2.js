const fs = require('fs');
let file = 'app/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Execution Summary Box
content = content.replace('bg-gray-50 p-4 border border-gray-200', 'bg-gray-900 p-4 border border-gray-700');
content = content.replace('text-gray-600 space-y-1', 'text-gray-300 space-y-1');

// Text color tweaks
content = content.replace('text-gray-600', 'text-gray-400');
content = content.replace('border border-gray-400 px-3 py-1 hover:border-white text-white', 'border border-gray-600 px-3 py-1 hover:border-white text-white');

fs.writeFileSync(file, content, 'utf8');
console.log('Updated DashboardClient.tsx tweaks');
