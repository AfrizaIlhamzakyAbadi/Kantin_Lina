import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

with open("scratch/test_compact_flow.py", "r", encoding="utf-8") as f:
    code = f.read()

start = code.find('cand_compact = """') + len('cand_compact = """')
end = code.find('"""\n\nwith sync_playwright')
cand_compact = code[start:end]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 2400}, device_scale_factor=2)
    
    html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script>
    <style>
        body {{
            margin: 0;
            background: #ffffff;
            padding: 30px;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        }}
        #wrap {{
            display: inline-block;
            background: #ffffff;
        }}
    </style>
    </head>
    <body>
        <div id="wrap">
            <div class="mermaid">{cand_compact}</div>
        </div>
        <script>
            mermaid.initialize({{
                startOnLoad: true,
                theme: 'default',
                themeVariables: {{
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    fontSize: "14px",
                    primaryColor: '#eff6ff',
                    primaryTextColor: '#0f172a',
                    primaryBorderColor: '#2563eb',
                    lineColor: '#2563eb',
                    secondaryColor: '#f8fafc',
                    tertiaryColor: '#f1f5f9',
                    clusterBkg: '#f8fafc',
                    clusterBorder: '#94a3b8'
                }}
            }});
        </script>
    </body></html>"""
    
    page.set_content(html)
    page.wait_for_selector('.mermaid svg', timeout=10000)
    
    # Get natural viewBox
    svg = page.locator('.mermaid svg')
    viewbox = svg.get_attribute('viewBox')
    print("viewBox:", viewbox)
    parts = viewbox.split()
    vb_w = float(parts[2])
    vb_h = float(parts[3])
    print(f"Natural viewBox dimensions: W={vb_w}, H={vb_h}, ratio={vb_w/vb_h:.2f}")
    
    # Set SVG width explicitly to its viewBox width!
    page.evaluate(f"() => {{ const s = document.querySelector('.mermaid svg'); s.style.width = '{vb_w}px'; s.style.maxWidth = 'none'; s.style.height = '{vb_h}px'; }}")
    
    box = svg.bounding_box()
    print("Actual element box after setting natural width:", box)
    out_png = os.path.abspath("scratch/cand_compact_natural.png")
    svg.screenshot(path=out_png)
    print(f"Saved screenshot: {out_png}")
    browser.close()
