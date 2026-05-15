import os
import json

REGISTRY_FILE = os.path.join("cobble", "registry.json")

CANDLE_UI_TEMPLATE = """
<div id="candle-nav-system" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: monospace;">
    
    <div id="candle-menu" style="display: none; background: rgba(10,10,10,0.95); border: 1px solid #d4af37; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 0 15px rgba(0,0,0,0.8); max-height: 60vh; overflow-y: auto; width: max-content;">
        <h4 style="color: #7a7a7a; margin: 0 0 10px 0; font-size: 12px; border-bottom: 1px solid #333; padding-bottom: 5px;">NAVIGATION</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;"><a href="{ROOT_PATH}index.html" style="color: #d4af37; text-decoration: none; font-size: 14px;">[ Return to Nexus ]</a></li>
            {LINKS}
        </ul>
    </div>
    
    <div style="display: flex; justify-content: flex-end;">
        <canvas id="ui-candle-canvas" width="60" height="100" style="cursor: pointer; filter: drop-shadow(0px 0px 5px rgba(255,170,0,0.5));"></canvas>
    </div>

</div>

<script>
    // Micro Vector Candle Engine (Single Static Flame)
    const uiCanvas = document.getElementById('ui-candle-canvas');
    if (uiCanvas) {
        const uiCtx = uiCanvas.getContext('2d');
        let uiTime = 0;

        function drawSingleCandle() {
            uiCtx.clearRect(0, 0, 60, 100);
            uiTime++;

            uiCtx.save();
            uiCtx.translate(30, 80); // Center bottom
            uiCtx.scale(0.8, 0.8);

            // Ghostly Vector Wax
            uiCtx.strokeStyle = "rgba(220, 220, 220, 0.6)";
            uiCtx.lineWidth = 2;
            uiCtx.lineCap = "round";
            uiCtx.beginPath();
            uiCtx.moveTo(-10, 0); uiCtx.lineTo(-10, 40);
            uiCtx.lineTo(10, 40); uiCtx.lineTo(10, 0);
            uiCtx.moveTo(-10, 15); uiCtx.lineTo(-10, 25);
            uiCtx.moveTo(10, 10); uiCtx.lineTo(10, 30);
            uiCtx.stroke();

            // Mathematical Flame Flicker
            const flicker = (Math.random() * 0.2 + 0.9);
            const sway = Math.sin(uiTime * 0.1) * 2;
            
            uiCtx.translate(sway, 0);
            uiCtx.shadowBlur = 15 * flicker;
            uiCtx.shadowColor = "#ffaa00";
            uiCtx.strokeStyle = `rgba(255, 180, 0, ${0.9 * flicker})`;
            uiCtx.lineWidth = 3;
            
            uiCtx.beginPath();
            uiCtx.moveTo(0, 0);
            uiCtx.quadraticCurveTo(-10 * flicker, -20, 0, -40 * flicker); 
            uiCtx.quadraticCurveTo(10 * flicker, -20, 0, 0); 
            uiCtx.stroke();
            
            // Vector Wick
            uiCtx.shadowBlur = 0;
            uiCtx.strokeStyle = "rgba(50,50,50,0.8)";
            uiCtx.lineWidth = 1;
            uiCtx.beginPath();
            uiCtx.moveTo(0,0); uiCtx.lineTo(0, -8);
            uiCtx.stroke();

            uiCtx.restore();
            requestAnimationFrame(drawSingleCandle);
        }
        drawSingleCandle();

        // Toggle Menu Logic
        uiCanvas.addEventListener('click', function() {
            const menu = document.getElementById('candle-menu');
            menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
        });
    }
</script>
"""

def weave_candles():
    if not os.path.exists(REGISTRY_FILE):
        print(f"[ERR] {REGISTRY_FILE} not found. Ensure you are in the root directory and 'cobble/registry.json' exists.")
        return

    print("[SYS] Initializing Candle Weaver Automaton...")
    with open(REGISTRY_FILE, 'r', encoding='utf-8') as f:
        registry = json.load(f)

    # Filter out dead stones and skull-stones (only target valid routes)
    valid_routes = [entry for entry in registry if entry.get('route') and entry.get('label')]

    for item in valid_routes:
        target_file = item['route']
        if not os.path.exists(target_file):
            print(f"[WRN] Node missing, skipping injection: {target_file}")
            continue

        # Calculate directory depth to route back to root index
        depth = target_file.count('/')
        root_path = "../" * depth

        # Generate lateral HTML links for the menu
        links_html = ""
        for link_item in valid_routes:
            if link_item['route'] != target_file:
                links_html += f'<li style="margin-bottom: 5px;"><a href="{root_path}{link_item["route"]}" style="color: #7a7a7a; text-decoration: none; font-size: 12px; transition: color 0.2s;" onmouseover="this.style.color=\'#fff\'" onmouseout="this.style.color=\'#7a7a7a\'">- {link_item["label"]}</a></li>\n'

        payload = CANDLE_UI_TEMPLATE.replace("{ROOT_PATH}", root_path).replace("{LINKS}", links_html)

        # Inject into file safely
        with open(target_file, 'r+', encoding='utf-8') as f:
            content = f.read()
            if "" in content:
                print(f"  [=] Candle already illuminates {target_file}")
            else:
                if target_file.endswith('.html'):
                    if "</body>" in content:
                        content = content.replace("</body>", f"{payload}\n</body>")
                    else:
                        content += f"\n{payload}"
                else:
                    # For markdown files, append the raw HTML block at the bottom
                    content += f"\n<br>\n{payload}"
                
                f.seek(0)
                f.write(content)
                f.truncate()
                print(f"  [+] Wove Candle into {target_file}")

    print("\n[SYS] ILLUMINATION COMPLETE.")

if __name__ == "__main__":
    weave_candles()

