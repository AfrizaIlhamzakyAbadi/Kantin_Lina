import os
from playwright.sync_api import sync_playwright

html_template = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
    <div class="mermaid">
    graph TD
        A[Start] --> B[Test]
    </div>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content(html_template, wait_until="domcontentloaded", timeout=15000)
    page.wait_for_selector(".mermaid svg", timeout=15000)
    print("Mermaid loaded and rendered SVG successfully!")
    browser.close()
