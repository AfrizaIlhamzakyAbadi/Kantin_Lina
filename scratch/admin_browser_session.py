import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = r"c:\Users\ACER SWIFT\AppProject\Kantin Lina v0.0\Report\diagrams"
flag_file = r"c:\Users\ACER SWIFT\AppProject\Kantin Lina v0.0\scratch\admin_captured.txt"
profile_dir = r"c:\Users\ACER SWIFT\AppProject\Kantin Lina v0.0\Report\browser_profile"

os.makedirs(output_dir, exist_ok=True)
os.makedirs(os.path.dirname(flag_file), exist_ok=True)
if os.path.exists(flag_file):
    os.remove(flag_file)

print("Launching persistent Chromium browser GUI...", flush=True)
with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir=profile_dir,
        headless=False,
        viewport={'width': 1280, 'height': 800}
    )
    page = context.pages[0] if context.pages else context.new_page()

    print("Navigating to https://admin-kantin-lina.pages.dev ...", flush=True)
    page.goto("https://admin-kantin-lina.pages.dev", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2000)

    # Capture login screen
    login_path = os.path.join(output_dir, "ui_admin_login.png")
    page.screenshot(path=login_path)
    print(f"[OK] Captured login screen to {login_path}", flush=True)

    print("Waiting for admin login (checking every 2 seconds for up to 10 minutes)...", flush=True)
    logged_in = False
    start_time = time.time()
    while time.time() - start_time < 600:
        if page.locator(".admin-tabs").count() > 0 or page.locator("button:has-text('Logout')").count() > 0:
            logged_in = True
            break
        page.wait_for_timeout(2000)

    if not logged_in:
        print("Login timed out after 10 minutes.", flush=True)
        context.close()
        sys.exit(1)

    print("Login confirmed! Capturing admin portal tabs...", flush=True)
    page.wait_for_timeout(3000)

    # Tab 1: Smart Queue
    tab_orders = page.locator("button:has-text('Smart Queue')")
    if tab_orders.count() > 0:
        tab_orders.click()
        page.wait_for_timeout(2500)
    queue_path = os.path.join(output_dir, "ui_admin_smart_queue.png")
    page.screenshot(path=queue_path)
    print(f"[OK] Captured Smart Queue tab: {queue_path}", flush=True)

    # Tab 2: Menu & Stock
    tab_menu = page.locator("button:has-text('Menu & Stock')")
    if tab_menu.count() > 0:
        tab_menu.click()
        page.wait_for_timeout(2500)
        menu_path = os.path.join(output_dir, "ui_admin_menu.png")
        page.screenshot(path=menu_path)
        print(f"[OK] Captured Menu & Stock tab: {menu_path}", flush=True)

    # Tab 3: Schedule
    tab_sched = page.locator("button:has-text('Schedule')")
    if tab_sched.count() > 0:
        tab_sched.click()
        page.wait_for_timeout(2500)
        sched_path = os.path.join(output_dir, "ui_admin_schedule.png")
        page.screenshot(path=sched_path)
        print(f"[OK] Captured Schedule tab: {sched_path}", flush=True)

    with open(flag_file, "w") as f:
        f.write("DONE\n")
    print("SUCCESS: All admin screens captured and flag written!", flush=True)

    page.wait_for_timeout(3000)
    context.close()
