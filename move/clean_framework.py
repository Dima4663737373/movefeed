import os
import re

def remove_attributes(content):
    # Remove #[view] and #[entry]
    content = re.sub(r'#\[view\]', '', content)
    content = re.sub(r'#\[entry\]', '', content)
    return content

def remove_specs(content):
    # Simple state machine to remove spec blocks
    # Assumes spec blocks start with "spec " and end with "}"
    # Handles nested braces
    
    new_lines = []
    lines = content.split('\n')
    
    in_spec = False
    brace_count = 0
    
    for line in lines:
        stripped = line.strip()
        
        # Check if we are entering a spec block
        # Patterns: "spec {", "spec module {", "spec fun {", "spec schema {"
        # But NOT "use ... spec ...;" (unlikely)
        
        if not in_spec:
            # Check for start of spec block
            # Regex to match "spec" word followed by something and "{"
            # Or just "spec {"
            if re.search(r'\bspec\s+.*\{', stripped) or re.search(r'\bspec\s*\{', stripped):
                in_spec = True
                # Count braces in this line
                brace_count += line.count('{') - line.count('}')
                # If brace_count is 0, it was a one-liner spec?
                # e.g. spec { invariant x; };
                if brace_count == 0:
                    in_spec = False
                continue # Skip the start line
            else:
                new_lines.append(line)
        else:
            # Inside spec block
            brace_count += line.count('{') - line.count('}')
            if brace_count <= 0:
                in_spec = False
                brace_count = 0
            # Skip lines inside spec
            
    return '\n'.join(new_lines)

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    content = remove_attributes(content)
    content = remove_specs(content)
    
    if content != original_content:
        print(f"Modified {file_path}")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

def main():
    root_dir = 'local_framework'
    
    for subdir, dirs, files in os.walk(root_dir):
        for file in files:
            file_path = os.path.join(subdir, file)
            
            if file.endswith('.spec.move'):
                print(f"Deleting {file_path}")
                os.remove(file_path)
            elif file.endswith('.move'):
                process_file(file_path)

if __name__ == '__main__':
    main()
