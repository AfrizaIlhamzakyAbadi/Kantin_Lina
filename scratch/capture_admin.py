from playwright.sync_api import sync_playwright
import os

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1200, 'height': 800})
    page.goto('http://localhost:5174/', wait_until='networkidle')
    page.screenshot(path='scratch/admin_login_preview.png')
    browser.close()

print('Saved scratch/admin_login_preview.png')
