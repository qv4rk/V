import os
import re

def debundle_markdown(md_file_path, output_dir):
    """
    Parses a markdown file to extract embedded code blocks and 
    saves them as individual files in the specified directory.
    """
    try:
        with open(md_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: The file '{md_file_path}' was not found.")
        return

    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    print(f"Output directory established: ./{output_dir}/")

    # Regex pattern to identify the filename in the header and the content in the code block
    # Matches: #### 1. filename.ext (Optional Text) \n ```language \n content \n ```
    pattern = re.compile(r'#### \d+\.\s+([a-zA-Z0-9_.-]+).*?\n```[a-zA-Z]*\n(.*?)```', re.DOTALL)

    matches = pattern.findall(content)

    if not matches:
        print("No bundled files found matching the expected markdown format.")
        return

    for filename, file_content in matches:
        file_path = os.path.join(output_dir, filename)
        
        # Write the extracted content to the respective file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_content)
            
        print(f"Successfully extracted and wrote: {file_path}")

if __name__ == "__main__":
    # Define the target input file and desired output directory
    INPUT_FILE = "airbnbstrategy.md"
    OUTPUT_DIRECTORY = "florida_str_dashboard"
    
    debundle_markdown(INPUT_FILE, OUTPUT_DIRECTORY)
    print("\nDebundling process complete.")
