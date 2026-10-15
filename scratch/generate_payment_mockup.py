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
  --gradient: linear-gradient(135deg, #f0702f 0%, #e4572e 45%, #d63a52 100%);
  --success: #1f9d63;
  --success-soft: rgba(31, 157, 99, 0.12);
  --danger: #d64545;
  --radius: 16px;
  --radius-sm: 10px;
  --shadow: 0 8px 24px -6px rgba(120, 50, 10, 0.15);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
}
.payment-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  max-width: 440px;
  width: 100%;
  padding: 2rem;
  text-align: center;
}
.timer-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fee2e2;
  color: var(--danger);
  padding: 6px 16px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 1.25rem;
}
.qr-box {
  width: 240px;
  height: 240px;
  margin: 0 auto 1.25rem;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: white;
  display: grid;
  place-items: center;
}
.qr-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.order-info {
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 1.25rem;
  text-align: left;
  font-size: 0.9rem;
}
.order-info div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.order-info div:last-child { margin-bottom: 0; font-weight: 700; }
"""

html_payment = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>{css}</style></head>
<body>
  <div class="payment-card">
    <div class="timer-pill">
      <span>⏱️ Sisa Waktu Bayar: <strong>00:48</strong></span>
    </div>
    <h2 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Pindai QRIS untuk Membayar</h2>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
      Batas toleransi reservasi stok adalah 1 menit. Pesanan akan otomatis dibatalkan jika melebihi batas.
    </p>

    <div class="qr-box">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=00020101021226670016ID.CO.MIDTRANS01189360052300000188880215000000000000000520458125802ID5911KANTIN+LINA6010YOGYAKARTA61055513262070703A016304" alt="QRIS Dinamis Midtrans">
    </div>

    <div class="order-info">
      <div><span style="color:var(--text-muted);">Nama Pemesan:</span> <strong>Faiz</strong></div>
      <div><span style="color:var(--text-muted);">Tag Antrean:</span> <strong style="color:var(--primary); font-size:1.05rem;">Faiz-1</strong></div>
      <div><span style="color:var(--text-muted);">Waktu Pengambilan:</span> <strong>09:45 WIB</strong></div>
      <div><span style="color:var(--text-muted);">Total Pembayaran:</span> <strong style="color:var(--primary); font-size:1.1rem;">Rp 28.000</strong></div>
    </div>

    <p style="font-size: 0.8rem; color: var(--text-muted);">
      Setelah pembayaran berhasil diverifikasi melalui webhook Midtrans, status antrean Anda akan otomatis berubah menjadi <span style="color:var(--success); font-weight:600;">Lunas (Paid)</span>.
    </p>
  </div>
</body>
</html>
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 800, 'height': 720}, device_scale_factor=2)
    page.set_content(html_payment)
    page.wait_for_timeout(1000)
    p_path = os.path.join(output_dir, "ui_customer_payment.png")
    page.screenshot(path=p_path)
    print(f"[OK] Rendered: {p_path}")
    browser.close()
