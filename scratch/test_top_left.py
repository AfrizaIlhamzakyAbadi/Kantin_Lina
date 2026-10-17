import os
from playwright.sync_api import sync_playwright
from PIL import Image

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

with open("Report/diagrams/activity_pickup.mmd", "r", encoding="utf-8") as f:
    mmd = f.read()

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 3000}, device_scale_factor=2.5)
    html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script>
    <style>
        body {{
            margin: 0;
            background: #ffffff;
            padding: 24px;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            display: inline-block;
        }}
    </style>
    </head>
    <body>
        <div class="mermaid">{mmd}</div>
        <script>
            mermaid.initialize({{
                startOnLoad: true,
                theme: 'default',
                flowchart: {{
                    rankSpacing: 40,
                    nodeSpacing: 35,
                    curve: 'basis'
                }},
                themeVariables: {{
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    fontSize: "14.5px",
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
    page.wait_for_selector('.mermaid svg')
    
    # Adjust cluster labels to top-left inside each box
    page.evaluate("""() => {
        const clusters = document.querySelectorAll('.cluster');
        clusters.forEach(c => {
            const rect = c.querySelector('rect');
            const label = c.querySelector('.cluster-label');
            if (rect && label) {
                const rx = parseFloat(rect.getAttribute('x'));
                const ry = parseFloat(rect.getAttribute('y'));
                // Move label to top-left inside the box with padding
                label.setAttribute('transform', `translate(${rx + 16}, ${ry + 10})`);
                const span = label.querySelector('span') || label.querySelector('.nodeLabel');
                if (span) {
                    span.style.fontWeight = 'bold';
                    span.style.color = '#1e3a8a';
                    span.style.fontSize = '14.5px';
                    span.style.letterSpacing = '0.3px';
                }
            }
        });
    }""")
    
    svg = page.locator('.mermaid svg')
    vb = svg.get_attribute('viewBox')
    parts = [float(x) for x in vb.split()]
    vb_w, vb_h = parts[2], parts[3]
    page.evaluate(f"() => {{ const s = document.querySelector('.mermaid svg'); s.style.width = '{vb_w}px'; s.style.maxWidth = 'none'; s.style.height = '{vb_h}px'; }}")
    
    out_png = os.path.abspath("scratch/test_top_left.png")
    svg.screenshot(path=out_png)
    print("Generated scratch/test_top_left.png successfully!")
    browser.close()

im = Image.open(out_png)
print("Image size:", im.size, "File size KB:", os.path.getsize(out_png)/1024)
