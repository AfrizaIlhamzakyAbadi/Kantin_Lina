from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1920, 'height': 1200})
    with open('Report/diagrams/activity_webhook.mmd', 'r', encoding='utf-8') as f:
        mmd = f.read()
    html = """<!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    </head>
    <body>
        <div class="mermaid">""" + mmd + """</div>
        <script>mermaid.initialize({ startOnLoad: true });</script>
    </body>
    </html>"""
    page.set_content(html)
    page.wait_for_selector('.mermaid svg')
    box = page.locator('.mermaid svg').bounding_box()
    print('SVG Bounding Box:', box)
    browser.close()
