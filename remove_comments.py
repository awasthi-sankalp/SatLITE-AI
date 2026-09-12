import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    
    for line in lines:
        orig = line
        
        line = re.sub(r'\{/\*.*?\*/\}', '', line)
        
        line = re.sub(r'/\*.*?\*/', '', line)
        
        line = re.sub(r'(?<!:)//.*', '', line)
        
        if line.strip() == '' and orig.strip() != '':
            continue
            
        new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

for root, dirs, files in os.walk('.'):
    if any(ignore in root for ignore in ['node_modules', '.git', '.next', 'backend', 'Login', 'LandingPage', 'Backend', 'Py', 'SampleImg', 'Logo', 'SVGs', 'API']):
        continue
    
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css', '.js')):
            process_file(os.path.join(root, file))

print("Comments removed.")

