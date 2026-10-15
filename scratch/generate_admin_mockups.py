import os
from playwright.sync_api import sync_playwright

output_dir = r"c:\Users\ACER SWIFT\AppProject\Kantin Lina v0.0\Report\diagrams"
os.makedirs(output_dir, exist_ok=True)

css = """
:root {
  --bg: #fff8f1;
  --bg-accent: #ffeedd;
  --surface: #ffffff;
  --surface-2: #fff3e6;
  --text: #2b1b12;
  --text-muted: #7b6556;
  --border: #f1e0d0;
  --primary: #e4572e;
  --primary-strong: #c9431c;
  --primary-soft: rgba(228, 87, 46, 0.12);
  --gradient: linear-gradient(135deg, #f0702f 0%, #e4572e 45%, #d63a52 100%);
  --success: #1f9d63;
  --success-soft: rgba(31, 157, 99, 0.12);
  --danger: #d64545;
  --danger-soft: rgba(214, 69, 69, 0.12);
  --warn: #b7791f;
  --warn-soft: rgba(245, 158, 11, 0.16);
  --radius: 16px;
  --radius-sm: 10px;
  --shadow: 0 8px 24px -6px rgba(120, 50, 10, 0.15);
  --shadow-sm: 0 1px 3px rgba(80, 40, 10, 0.08);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  padding: 0;
  min-height: 100vh;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand-mark {
  width: 36px; height: 36px; border-radius: 10px; background: var(--gradient);
  display: grid; place-items: center; color: white; font-weight: bold; font-size: 1.1rem;
}
.brand-name { font-size: 1.25rem; font-weight: 700; }
.user-info { display: flex; align-items: center; gap: 12px; }
.user-email { color: var(--text-muted); font-size: 0.9rem; }
.btn-logout {
  padding: 0.45rem 1rem; background: var(--bg-accent); border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer;
}
main { padding: 2rem; max-width: 1160px; margin: 0 auto; }
.admin-tabs {
  display: flex; gap: 0.75rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;
}
.tab-btn {
  padding: 0.7rem 1.4rem; border: none; border-radius: var(--radius-sm);
  font-weight: 600; font-size: 0.95rem; cursor: pointer; background: transparent; color: var(--text-muted);
}
.tab-btn.active {
  background: var(--primary); color: #fff; box-shadow: 0 4px 14px rgba(228, 87, 46, 0.35);
}
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 1.5rem; box-shadow: var(--shadow-sm); margin-bottom: 1.5rem;
}
.alert-banner {
  background: #fff3f3; border: 1px solid #ffd0d0; border-radius: var(--radius-sm);
  padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 12px; color: var(--danger);
  font-size: 0.95rem; font-weight: 500;
}
.badge-pill {
  display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px;
  font-size: 0.8rem; font-weight: 700;
}
.badge-urgent { background: var(--danger-soft); color: var(--danger); }
.badge-soon { background: var(--primary-soft); color: var(--primary); }
.badge-paid { background: var(--success-soft); color: var(--success); }
.queue-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem; }
.order-card {
  background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius);
  padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; box-shadow: var(--shadow-sm);
}
.order-card.priority-1 { border-color: var(--danger); }
.order-card.priority-2 { border-color: var(--primary); }
.order-header { display: flex; justify-content: space-between; align-items: flex-start; }
.order-tag { font-size: 1.4rem; font-weight: 800; color: var(--text); }
.pickup-time { font-size: 1.15rem; font-weight: 700; color: var(--primary); margin: 4px 0; }
.items-list { font-size: 0.9rem; color: var(--text-muted); border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border); padding: 0.5rem 0; margin: 0.5rem 0; }
.items-list li { list-style: none; display: flex; justify-content: space-between; margin-bottom: 4px; }
.order-total { display: flex; justify-content: space-between; font-weight: 700; font-size: 1rem; }
.btn-complete {
  width: 100%; padding: 0.75rem; background: var(--success); color: white; border: none;
  border-radius: var(--radius-sm); font-weight: 700; cursor: pointer; margin-top: 0.5rem;
}
/* Form Styles */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
.form-control {
  padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); font-size: 0.95rem; color: var(--text);
}
.btn-submit {
  padding: 0.85rem 1.8rem; background: var(--primary); color: white; border: none;
  border-radius: var(--radius-sm); font-weight: 700; cursor: pointer;
}
.table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.table th, .table td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
.table th { background: var(--surface-2); font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); }
"""

html_smart_queue = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>{css}</style></head>
<body>
  <header>
    <div class="brand">
      <div class="brand-mark">KL</div>
      <div class="brand-name">Kantin Lina Admin</div>
    </div>
    <div class="user-info">
      <span class="user-email">owner@kantinlina.com</span>
      <button class="btn-logout">Logout</button>
    </div>
  </header>
  <main>
    <div class="admin-tabs">
      <button class="tab-btn active">Smart Queue (3 Active)</button>
      <button class="tab-btn">Menu & Stock</button>
      <button class="tab-btn">Schedule</button>
    </div>

    <div class="alert-banner">
      <span style="font-size: 1.3rem;">⚠️</span>
      <div>
        <strong>Late Payment Alert:</strong> Order <code>Faiz-1</code> was settled after 1-minute TTL. Stock was atomically restored to inventory. Action required by kitchen / manual verification.
      </div>
    </div>

    <h2 style="margin-bottom: 1rem; font-size: 1.3rem;">Active Orders (Sorted by Pickup Urgency)</h2>
    <div class="queue-grid">
      <!-- Order 1: Due Now -->
      <div class="order-card priority-1">
        <div class="order-header">
          <div>
            <div class="order-tag">Faiz-1</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Customer: Faiz &bull; #ord-8921</div>
          </div>
          <span class="badge-pill badge-urgent">DUE NOW</span>
        </div>
        <div class="pickup-time">⏰ Pickup: 09:45 WIB</div>
        <div class="items-list">
          <li><span>2x Nasi Ayam Geprek</span> <strong>Rp 24k</strong></li>
          <li><span>1x Es Teh Manis</span> <strong>Rp 4k</strong></li>
        </div>
        <div class="order-total">
          <span>Total Bayar:</span>
          <span style="color: var(--primary);">Rp 28.000</span>
        </div>
        <button class="btn-complete">Mark as Completed</button>
      </div>

      <!-- Order 2: In 5 mins -->
      <div class="order-card priority-2">
        <div class="order-header">
          <div>
            <div class="order-tag">Budi-2</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Customer: Budi &bull; #ord-8922</div>
          </div>
          <span class="badge-pill badge-soon">IN 5 MINS</span>
        </div>
        <div class="pickup-time">⏰ Pickup: 09:50 WIB</div>
        <div class="items-list">
          <li><span>1x Dimsum Mentai (4 pcs)</span> <strong>Rp 15k</strong></li>
        </div>
        <div class="order-total">
          <span>Total Bayar:</span>
          <span style="color: var(--primary);">Rp 15.000</span>
        </div>
        <button class="btn-complete">Mark as Completed</button>
      </div>

      <!-- Order 3: In 15 mins -->
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-tag">Siti-3</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Customer: Siti &bull; #ord-8923</div>
          </div>
          <span class="badge-pill" style="background: var(--bg-accent); color: var(--text-muted);">IN 15 MINS</span>
        </div>
        <div class="pickup-time">⏰ Pickup: 10:00 WIB</div>
        <div class="items-list">
          <li><span>1x Mie Goreng Spesial</span> <strong>Rp 12k</strong></li>
          <li><span>1x Air Mineral 600ml</span> <strong>Rp 3k</strong></li>
        </div>
        <div class="order-total">
          <span>Total Bayar:</span>
          <span style="color: var(--primary);">Rp 15.000</span>
        </div>
        <button class="btn-complete">Mark as Completed</button>
      </div>
    </div>
  </main>
</body>
</html>
"""

html_menu = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>{css}</style></head>
<body>
  <header>
    <div class="brand">
      <div class="brand-mark">KL</div>
      <div class="brand-name">Kantin Lina Admin</div>
    </div>
    <div class="user-info">
      <span class="user-email">owner@kantinlina.com</span>
      <button class="btn-logout">Logout</button>
    </div>
  </header>
  <main>
    <div class="admin-tabs">
      <button class="tab-btn">Smart Queue</button>
      <button class="tab-btn active">Menu & Stock Management</button>
      <button class="tab-btn">Schedule</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 1.25rem;">Tambah / Edit Item Menu</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Nama Menu</label>
          <input class="form-control" value="Nasi Ayam Geprek">
        </div>
        <div class="form-group">
          <label>Kategori Baku</label>
          <select class="form-control">
            <option selected>Food</option>
            <option>Drink</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Harga (dalam Ribuan 'k')</label>
          <input class="form-control" type="number" value="12">
          <span style="font-size: 0.8rem; color: var(--text-muted);">Ketik 12 untuk Rp 12.000 (Otomatis dikalikan 1.000)</span>
        </div>
        <div class="form-group">
          <label>Kuota Stok Hari Ini</label>
          <input class="form-control" type="number" value="25">
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label>URL Gambar (Rasio Persegi 1:1)</label>
          <input class="form-control" value="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500">
        </div>
      </div>
      <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
        <button class="btn-submit">Simpan Menu</button>
      </div>
    </div>

    <div class="card">
      <h3>Daftar Menu Aktif</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Menu</th>
            <th>Kategori</th>
            <th>Harga</th>
            <th>Sisa Kuota Stok</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Nasi Ayam Geprek</strong></td>
            <td><span class="badge-pill badge-soon">Food</span></td>
            <td>Rp 12k</td>
            <td><strong>25 porsi</strong></td>
            <td><span class="badge-pill badge-paid">Tersedia</span></td>
            <td><button class="btn-logout" style="color: var(--primary);">Edit</button></td>
          </tr>
          <tr>
            <td><strong>Dimsum Mentai</strong></td>
            <td><span class="badge-pill badge-soon">Food</span></td>
            <td>Rp 15k</td>
            <td><strong>18 porsi</strong></td>
            <td><span class="badge-pill badge-paid">Tersedia</span></td>
            <td><button class="btn-logout" style="color: var(--primary);">Edit</button></td>
          </tr>
          <tr>
            <td><strong>Es Teh Manis</strong></td>
            <td><span class="badge-pill" style="background:#e6f4ea; color:#137333;">Drink</span></td>
            <td>Rp 4k</td>
            <td><strong>40 gelas</strong></td>
            <td><span class="badge-pill badge-paid">Tersedia</span></td>
            <td><button class="btn-logout" style="color: var(--primary);">Edit</button></td>
          </tr>
          <tr>
            <td><strong>Cireng Kuah Pedas</strong></td>
            <td><span class="badge-pill" style="background:#fef7e0; color:#b06000;">Other</span></td>
            <td>Rp 8k</td>
            <td><strong>15 bungkus</strong></td>
            <td><span class="badge-pill badge-paid">Tersedia</span></td>
            <td><button class="btn-logout" style="color: var(--primary);">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
"""

html_schedule = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>{css}</style></head>
<body>
  <header>
    <div class="brand">
      <div class="brand-mark">KL</div>
      <div class="brand-name">Kantin Lina Admin</div>
    </div>
    <div class="user-info">
      <span class="user-email">owner@kantinlina.com</span>
      <button class="btn-logout">Logout</button>
    </div>
  </header>
  <main>
    <div class="admin-tabs">
      <button class="tab-btn">Smart Queue</button>
      <button class="tab-btn">Menu & Stock</button>
      <button class="tab-btn active">Schedule Management</button>
    </div>

    <div class="card" style="max-width: 680px; margin: 0 auto;">
      <h3 style="margin-bottom: 1.25rem;">Pengaturan Jam & Hari Operasional Kantin</h3>
      
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label style="margin-bottom: 0.5rem;">Hari Operasional Buka:</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; background: var(--bg-accent); padding: 6px 14px; border-radius: 999px;">
            <input type="checkbox" checked> Senin
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; background: var(--bg-accent); padding: 6px 14px; border-radius: 999px;">
            <input type="checkbox" checked> Selasa
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; background: var(--bg-accent); padding: 6px 14px; border-radius: 999px;">
            <input type="checkbox" checked> Rabu
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; background: var(--bg-accent); padding: 6px 14px; border-radius: 999px;">
            <input type="checkbox" checked> Kamis
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; background: var(--bg-accent); padding: 6px 14px; border-radius: 999px;">
            <input type="checkbox" checked> Jumat
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; background: var(--bg); padding: 6px 14px; border-radius: 999px; opacity: 0.6;">
            <input type="checkbox"> Sabtu
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; background: var(--bg); padding: 6px 14px; border-radius: 999px; opacity: 0.6;">
            <input type="checkbox"> Minggu
          </label>
        </div>
      </div>

      <div class="form-grid" style="margin-bottom: 1.5rem;">
        <div class="form-group">
          <label>Jam Buka Pemesanan</label>
          <input class="form-control" type="time" value="07:00">
        </div>
        <div class="form-group">
          <label>Jam Tutup Pemesanan</label>
          <input class="form-control" type="time" value="14:00">
        </div>
        <div class="form-group">
          <label>Interval Slot Batch Cooking</label>
          <input class="form-control" type="text" value="5 Menit (Batch Cooking)" readonly style="background:#eee;">
        </div>
        <div class="form-group">
          <label>Minimum Lead Time Pesan</label>
          <input class="form-control" type="text" value="2 Menit (Lead Time)" readonly style="background:#eee;">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button class="btn-submit">Simpan Konfigurasi Jadwal</button>
      </div>
    </div>
  </main>
</body>
</html>
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 820}, device_scale_factor=2)

    # 1. Smart Queue
    page.set_content(html_smart_queue)
    page.wait_for_timeout(1000)
    p1 = os.path.join(output_dir, "ui_admin_smart_queue.png")
    page.screenshot(path=p1)
    print(f"[OK] Rendered: {p1}")

    # 2. Menu
    page.set_content(html_menu)
    page.wait_for_timeout(1000)
    p2 = os.path.join(output_dir, "ui_admin_menu.png")
    page.screenshot(path=p2)
    print(f"[OK] Rendered: {p2}")

    # 3. Schedule
    page.set_content(html_schedule)
    page.wait_for_timeout(1000)
    p3 = os.path.join(output_dir, "ui_admin_schedule.png")
    page.screenshot(path=p3)
    print(f"[OK] Rendered: {p3}")

    browser.close()
    print("ALL ADMIN MOCKUP SCREENSHOTS GENERATED WITH HIGH FIDELITY!")
