from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    
    logs = []
    page.on('console', lambda msg: logs.append(f'[{msg.type}] {msg.text}'))
    page.on('pageerror', lambda err: logs.append(f'[ERROR] {err}'))

    
    page.goto('http://localhost:5174/', wait_until='load')
    page.wait_for_timeout(2000)
    
    html = page.content()
    print('Console logs:', logs)
    print('Body HTML snippet:', html[:1000])
    
    browser.close()
