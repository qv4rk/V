import os
import sys

def unbundle(md_file="cobblemaze.md"):
    if not os.path.exists(md_file):
        print(f"[ERR] Matrix file '{md_file}' not found.")
        print("Ensure this script is in the same directory as your markdown file.")
        return

    print(f"[SYS] Initiating Unbundling Sequence on '{md_file}'...")

    with open(md_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    current_file = None
    in_code_block = False
    file_content = []

    for line in lines:
        # 1. Detect the file header
        if line.startswith("### File:"):
            # Extract filename, stripping whitespace and any accidental markdown bolding
            current_file = line.replace("### File:", "").replace("**", "").strip()
            continue
        
        # 2. Detect code block boundaries (```)
        if current_file and line.strip().startswith("```"):
            if not in_code_block:
                # Entering the code block
                in_code_block = True
                file_content = []  # Reset content buffer
            else:
                # Exiting the code block -> Write the file
                in_code_block = False
                write_file(current_file, "".join(file_content))
                current_file = None  # Reset state for the next file
            continue

        # 3. Capture the content if we are inside the boundaries
        if in_code_block:
            file_content.append(line)

    print("\n[SYS] Unbundling Complete. Architecture Deployed.")

def write_file(filepath, content):
    # Dynamically create the necessary directories (e.g., 'cobble/')
    directory = os.path.dirname(filepath)
    if directory:
        os.makedirs(directory, exist_ok=True)
    
    # Write the payload
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"  [+] Extracted and forged: {filepath}")

if __name__ == "__main__":
    # Allows you to pass a different filename via terminal, or defaults to cobblemaze.md
    target = sys.argv[1] if len(sys.argv) > 1 else "cobblemaze.md"
    unbundle(target)
