from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.on('console', lambda m: print('LOG:', m.text))
    page.on('pageerror', lambda e: print('PAGE ERROR:', e))
    
    with open('scratch/test_compact_webhook.py', 'r', encoding='utf-8') as f:
        # let's read candidate_1
        lines = f.readlines()
    
    import re
    # extract candidate_1 text
    with open('scratch/test_compact_webhook.py', 'r', encoding='utf-8') as f:
        code = f.read()
    start = code.find('candidate_1 = """') + len('candidate_1 = """')
    end = code.find('"""\n\nwith sync_playwright()')
    cand = code[start:end]
    
    html = f"""<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script></head>
    <body><div class="mermaid">{cand}</div>
    <script>mermaid.initialize({{ startOnLoad: true }});</script>
    </body></html>"""
    
    page.set_content(html, wait_until='domcontentloaded')
    page.wait_for_selector('.mermaid svg')
    res = page.evaluate("() => document.querySelector('.mermaid').innerHTML")
    print("Rendered HTML:", res[:300])
    browser.close()
