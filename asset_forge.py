import os

def create_directory_tree():
    dirs = [
        "cobble/assets/svg",
        "cobble/assets/models",
        "cobble/assets/audio"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        print(f"[+] Directory verified: {d}")

def forge_skull_stone_svg():
    svg_path = "cobble/assets/svg/skull_stone.svg"
    # A heavily stylized, low-opacity vector skull designed to blend as a cobblestone texture.
    # Uses deep shadows and subtle curves to create the "is it a rock or a skull?" illusion.
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <defs>
        <radialGradient id="rockShade" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.05)" />
            <stop offset="70%" stop-color="rgba(0,0,0,0.3)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.8)" />
        </radialGradient>
        <filter id="blur">
            <feGaussianBlur stdDeviation="1.5" />
        </filter>
    </defs>
    <path d="M20 40 C 20 10, 80 10, 80 40 C 80 60, 70 80, 50 80 C 30 80, 20 60, 20 40 Z" fill="url(#rockShade)"/>
    <ellipse cx="35" cy="45" rx="8" ry="10" fill="rgba(0,0,0,0.4)" filter="url(#blur)"/>
    <ellipse cx="65" cy="45" rx="8" ry="10" fill="rgba(0,0,0,0.4)" filter="url(#blur)"/>
    <path d="M48 60 L 52 60 L 50 50 Z" fill="rgba(0,0,0,0.3)" filter="url(#blur)"/>
    <line x1="40" y1="70" x2="40" y2="75" stroke="rgba(0,0,0,0.4)" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="72" x2="50" y2="77" stroke="rgba(0,0,0,0.4)" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="60" y1="70" x2="60" y2="75" stroke="rgba(0,0,0,0.4)" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M25 25 C 35 20, 45 30, 30 35" stroke="rgba(0,0,0,0.2)" stroke-width="2" fill="none" filter="url(#blur)"/>
    <path d="M75 35 C 65 30, 60 20, 70 25" stroke="rgba(0,0,0,0.2)" stroke-width="2" fill="none" filter="url(#blur)"/>
</svg>"""
    
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"[+] Forged Vector Asset: {svg_path}")

def allocate_3d_placeholders():
    # Allocates empty binary files so the Javascript loader doesn't crash from 404s.
    # The Catacombs Engine is designed to elegantly fall back to geometric WebGL shapes
    # (colored boxes/planes) if the .glb files exist but contain no valid mesh data.
    models = [
        "cobble/assets/models/catacomb_wall.glb",
        "cobble/assets/models/skeleton_hand.glb",
        "cobble/assets/models/oj_glove.glb"
    ]
    
    for model in models:
        if not os.path.exists(model):
            with open(model, 'wb') as f:
                f.write(b"") 
            print(f"[+] Allocated Placeholder: {model}")
        else:
            print(f"[=] Model already exists: {model}")

def allocate_audio_placeholders():
    audio_paths = [
        "cobble/assets/audio/stone_grind.mp3",
        "cobble/assets/audio/door_creak.mp3"
    ]
    for audio in audio_paths:
        if not os.path.exists(audio):
            with open(audio, 'wb') as f:
                f.write(b"") 
            print(f"[+] Allocated Audio Placeholder: {audio}")

if __name__ == "__main__":
    print("[SYS] Initiating Asset Forge...")
    create_directory_tree()
    forge_skull_stone_svg()
    allocate_3d_placeholders()
    allocate_audio_placeholders()
    print("[SYS] Forge Complete. Ready for deployment.")

