from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1200, 'height': 900})
    page.goto('http://localhost:5174/?preview=true', wait_until='domcontentloaded')
    time.sleep(3.0)
    
    # 1. Smart Queue
    page.screenshot(path='scratch/dashboard_smart_queue.png', full_page=True)
    print('Saved scratch/dashboard_smart_queue.png')
    
    # 2. Menu & Stock
    page.click('#tab-menu')
    time.sleep(2.0)
    page.screenshot(path='scratch/dashboard_menu.png', full_page=True)
    print('Saved scratch/dashboard_menu.png')
    
    # 3. Schedule
    page.click('#tab-schedule')
    time.sleep(2.0)
    page.screenshot(path='scratch/dashboard_schedule.png', full_page=True)
    print('Saved scratch/dashboard_schedule.png')
    
    browser.close()
