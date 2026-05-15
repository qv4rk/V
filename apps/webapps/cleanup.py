import os
import shutil

def repair_directory():
    target_dir = "sketcherspocket"
    
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    # Assets dumped into the webapps root during the debundle execution
    strays = [
        "index.html",
        "css",
        "js",
        "bundle.md",
        "debundle.py"
    ]

    for item in strays:
        if os.path.exists(item):
            try:
                shutil.move(item, os.path.join(target_dir, item))
                print(f"Secured: {item} -> {target_dir}/")
            except Exception as e:
                print(f"Failed to move {item}: {e}")
        else:
            print(f"Bypassed (Not Found): {item}")

if __name__ == "__main__":
    repair_directory()
