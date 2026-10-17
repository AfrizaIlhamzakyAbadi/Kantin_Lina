import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

with open("scratch/debug_mermaid_syntax.py", "r", encoding="utf-8") as f:
    code = f.read()

start = code.find('cand_fixed = """') + len('cand_fixed = """')
end = code.find('"""\n\nwith sync_playwright')
cand_fixed = code[start:end]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 2400})
    
    html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script></head>
    <body><div class="mermaid">{cand_fixed}</div>
    <script>
        mermaid.initialize({{ startOnLoad: true }});
    </script>
    </body></html>"""
    
    page.set_content(html)
    page.wait_for_selector('.mermaid svg', timeout=10000)
    svg = page.locator('.mermaid svg')
    print("viewBox:", svg.get_attribute("viewBox"))
    print("style:", svg.get_attribute("style"))
    print("width attr:", svg.get_attribute("width"))
    browser.close()
