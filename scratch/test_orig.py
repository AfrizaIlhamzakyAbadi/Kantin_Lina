from playwright.sync_api import sync_playwright

candidate = """graph TD
    subgraph Midtrans ["Midtrans Gateway"]
        W1([Pembayaran Sukses])
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.on('console', lambda m: print('LOG:', m.text))
    page.on('pageerror', lambda e: print('PAGE ERROR:', e))
    
    with open('Report/diagrams/activity_webhook.mmd', 'r', encoding='utf-8') as f:
        orig = f.read()
        
    html = f"""<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script></head>
    <body><div class="mermaid">{orig}</div>
    <script>mermaid.initialize({{ startOnLoad: true }});</script>
    </body></html>"""
    
    page.set_content(html, wait_until='domcontentloaded')
    page.wait_for_selector('.mermaid svg')
    svg = page.locator('.mermaid svg')
    print("Orig box:", svg.bounding_box())
    print("Orig text snippet:", svg.inner_text()[:100])
    browser.close()
