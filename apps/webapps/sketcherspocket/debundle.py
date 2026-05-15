import os
import re

def unpack_bundle(file_path):
    """
    Parses a bundle.md file and splits it into the original file structure.
    """
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find the filename followed by the code block
    # Pattern: Matches the filename line, then the triple backticks, 
    # then captures everything inside until the closing triple backticks.
    pattern = re.compile(r'^([a-zA-Z0-9._/-]+)\n```[a-z]*\n(.*?)\n```', re.MULTILINE | re.DOTALL)
    
    matches = pattern.findall(content)

    if not matches:
        print("No files found in the bundle. Check the format.")
        return

    for file_name, file_content in matches:
        # Create directory structure if it doesn't exist
        directory = os.path.dirname(file_name)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)
            print(f"Created directory: {directory}")

        # Write the file content
        with open(file_name, 'w', encoding='utf-8') as f:
            f.write(file_content)
        print(f"Extracted: {file_name}")

    print("\nUnpacking complete!")

if __name__ == "__main__":
    # Ensure bundle.md is in the same directory as this script
    unpack_bundle('bundle.md')
