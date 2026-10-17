import os
from playwright.sync_api import sync_playwright

profile_dir = os.path.abspath("Report/browser_profile")

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir=profile_dir,
        headless=True,
        viewport={'width': 1920, 'height': 1600}
    )
    page = context.pages[0] if context.pages else context.new_page()
    
    html = """<!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    </head>
    <body>
        <div class="mermaid">
        graph TD
            A[Start] --> B[Persistent Cache Test]
        </div>
        <script>mermaid.initialize({ startOnLoad: true });</script>
    </body>
    </html>"""
    
    page.set_content(html, wait_until='domcontentloaded', timeout=45000)
    page.wait_for_selector('.mermaid svg', timeout=30000)
    print("Success with persistent context! SVG box:", page.locator('.mermaid svg').bounding_box())
    context.close()
