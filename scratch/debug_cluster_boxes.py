from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 2400})
    with open('Report/diagrams/activity_webhook.mmd', 'r', encoding='utf-8') as f:
        mmd = f.read()
    html = f"""<!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    </head>
    <body>
        <div class="mermaid">{mmd}</div>
        <script>mermaid.initialize({{ startOnLoad: true }});</script>
    </body>
    </html>"""
    page.set_content(html)
    page.wait_for_selector('.mermaid svg')
    clusters = page.locator('.cluster').all()
    print(f"Total clusters (subgraphs): {len(clusters)}")
    for c in clusters:
        box = c.bounding_box()
        text = c.locator('.cluster-label').inner_text() if c.locator('.cluster-label').count() > 0 else 'unknown'
        print(f"  Cluster '{text}': box={box}")
    nodes = page.locator('.node').all()
    print(f"Total nodes: {len(nodes)}")
    browser.close()
