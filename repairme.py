import os
import subprocess

def execute_git_command(command):
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"EXECUTION FAILURE: {command}\n{result.stderr.strip()}")
    else:
        print(f"SUCCESS: {command}")
    return result.returncode

def resolve_pipeline_lockup():
    submodule_path = "necronomy-atlas/public/d3-celestial"
    
    print("Initiating Git index repair sequence...")

    execute_git_command(f"git rm --cached {submodule_path}")
    
    if os.path.exists(".gitmodules"):
        execute_git_command("git rm .gitmodules")
        
    execute_git_command(f"git add {submodule_path}/")
    
    execute_git_command('git commit -m "fix: purge dead d3-celestial submodule, migrate to standard tracking"')
    
    print("Pipeline lockup cleared. Execute `git push` to initiate GitHub Actions deployment.")

if __name__ == "__main__":
    resolve_pipeline_lockup()
