import os

def gather_code_files(root_dir, extensions, exclude_files, exclude_folders):
    code_files = []
    excluded_files_found = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Capture all files in excluded folders for reporting but skip content extraction
        if any(excluded_folder in os.path.relpath(dirpath) for excluded_folder in exclude_folders):
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                excluded_files_found.append(file_path)
            continue  # Skip further processing in excluded folders
        
        for filename in filenames:
            file_ext = os.path.splitext(filename)[1]
            file_path = os.path.join(dirpath, filename)
            
            if filename in exclude_files:
                excluded_files_found.append(file_path)
            elif file_ext in extensions:
                code_files.append(file_path)
    
    return code_files, excluded_files_found

def write_to_markdown(code_files, excluded_files, output_file):
    with open(output_file, 'w') as md_file:
        # Write included code files
        for file_path in code_files:
            relative_path = os.path.relpath(file_path)
            md_file.write(f"## {relative_path}\n\n")
            md_file.write("```" + relative_path.split('.')[-1] + "\n")
            with open(file_path, 'r', encoding='utf-8') as code_file:
                md_file.write(code_file.read())
            md_file.write("\n```\n\n")
        
        # Write excluded files with a note
        if excluded_files:
            md_file.write("## Excluded Files\n\n")
            for excluded_path in excluded_files:
                relative_path = os.path.relpath(excluded_path)
                md_file.write(f"- **{relative_path}**: This file is present, but its content was not captured in this list for brevity.\n")

def create_markdown(root_dir, extensions, exclude_files, exclude_folders, output_file=None):
    if not output_file:
        output_file = os.path.join(root_dir, "code_files.md")
    code_files, excluded_files = gather_code_files(root_dir, extensions, exclude_files, exclude_folders)
    write_to_markdown(code_files, excluded_files, output_file)
    print(f"Markdown file '{output_file}' created with {len(code_files)} code files and {len(excluded_files)} excluded files.")


# Usage example:
if __name__ == "__main__":
    root_directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), "v5")
    extensions_to_look_for = ['.html', '.css', '.js']
    exclude_files_list = ['personal_apis.js']
    exclude_folders_list = ['libs']
    
create_markdown(root_directory, extensions_to_look_for, exclude_files_list, exclude_folders_list)
