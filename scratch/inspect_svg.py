from playwright.sync_api import sync_playwright
import os

with open('scratch/mermaid.min.js', 'r', encoding='utf-8') as f:
    mermaid_js = f.read()

with open('Report/diagrams/activity_pickup.mmd', 'r', encoding='utf-8') as f:
    mmd = f.read()

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script></head><body><div class="mermaid">{mmd}</div>
    <script>
    mermaid.initialize({{
        startOnLoad: true,
        theme: 'default'
    }});
    </script></body></html>"""
    page.set_content(html)
    page.wait_for_selector('.mermaid svg')
    res = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('.cluster')).map(c => c.outerHTML);
    }""")
    for r in res:
        print("CLUSTER:", r[:400])

    browser.close()
