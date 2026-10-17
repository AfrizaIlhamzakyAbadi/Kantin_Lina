import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

for name in ["activity_pickup", "activity_menu", "activity_checkout"]:
    mmd_path = os.path.join("Report/diagrams", f"{name}.mmd")
    with open(mmd_path, "r", encoding="utf-8") as f:
        mmd = f.read()
        
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 2400, 'height': 2400})
        html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script></head>
        <body><div class="mermaid">{mmd}</div>
        <script>mermaid.initialize({{ startOnLoad: true }});</script>
        </body></html>"""
        page.set_content(html)
        page.wait_for_selector('.mermaid svg')
        svg = page.locator('.mermaid svg')
        vb = svg.get_attribute('viewBox')
        parts = [float(x) for x in vb.split()]
        print(f"{name}: viewBox={vb} -> W={parts[2]:.1f}, H={parts[3]:.1f}, ratio={parts[2]/parts[3]:.2f}")
        browser.close()
