import os
from playwright.sync_api import sync_playwright

diagrams_dir = os.path.abspath("Report/diagrams")
os.makedirs(diagrams_dir, exist_ok=True)

# MMD files are already written, let's read them and render at high resolution
html_template = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {{
            margin: 0;
            background: #ffffff;
            padding: 30px;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            display: inline-block;
        }}
        .mermaid {{
            background: #ffffff;
        }}
        .mermaid svg {{
            max-width: none !important;
            height: auto !important;
        }}
    </style>
</head>
<body>
    <div class="mermaid">
{mmd_content}
    </div>
    <script>
        mermaid.initialize({{
            startOnLoad: true,
            theme: 'default',
            themeVariables: {{
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                fontSize: "15px",
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
</body>
</html>"""

names = ["activity_checkout", "activity_webhook", "activity_pickup", "activity_menu"]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 2400, "height": 1800}, device_scale_factor=2.5)
    
    for name in names:
        mmd_path = os.path.join(diagrams_dir, f"{name}.mmd")
        with open(mmd_path, "r", encoding="utf-8") as f:
            mmd = f.read()
        html_code = html_template.format(mmd_content=mmd)
        page.set_content(html_code)
        page.wait_for_selector(".mermaid svg", timeout=15000)
        svg = page.locator(".mermaid svg")
        png_path = os.path.join(diagrams_dir, f"{name}.png")
        svg.screenshot(path=png_path)
        print(f"Rendered PNG: {png_path}")
        
    browser.close()

print("High resolution rendering complete!")
