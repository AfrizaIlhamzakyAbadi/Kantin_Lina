from playwright.sync_api import sync_playwright
import os

html_template = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { margin: 0; background: white; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: inline-block; }
        .mermaid { background: white; }
    </style>
</head>
<body>
    <div class="mermaid">
    graph TD
        subgraph Customer
            A1([Mulai]) --> A2[Buka Web Kantin Lina]
            A2 --> A3[Pilih Item & Keranjang]
        end
    </div>
    <script>
        mermaid.initialize({ 
            startOnLoad: true, 
            theme: 'default',
            themeVariables: {
                primaryColor: '#ffffff',
                primaryTextColor: '#1e293b',
                primaryBorderColor: '#0284c7',
                lineColor: '#0284c7',
                secondaryColor: '#f8fafc',
                tertiaryColor: '#f1f5f9'
            }
        });
    </script>
</body>
</html>
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(device_scale_factor=2)
    page.set_content(html_template)
    page.wait_for_selector('.mermaid svg', timeout=10000)
    svg = page.locator('.mermaid svg')
    out_path = os.path.abspath('scratch/test_mermaid.png')
    svg.screenshot(path=out_path)
    browser.close()
    print("Screenshot saved to", out_path)
