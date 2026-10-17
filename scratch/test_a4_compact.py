import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

# 2-column branched design: Top verification + 2 parallel columns (Tepat Waktu vs Terlambat)
mmd_a4_compact = """graph TD
    subgraph Gateway ["1. Midtrans Payment Gateway"]
        W1([Settlement Berhasil di Bank / E-Wallet]) --> W2[Kirim HTTP POST Webhook ke /api/webhook]
    end

    subgraph Verifikasi ["2. Cloudflare Edge Worker: Validasi Signature"]
        W2 --> X1[Terima Webhook & Validasi Hash SHA-512]
        X1 --> X2{Signature Valid<br/>& Settlement?}
        X2 -- Tidak Valid / Gagal --> X3([Tolak HTTP 403 / releaseOrder])
        X2 -- Valid --> X4[Buka Transaksi Firestore: Cek TTL 1 Menit]
    end

    X4 --> D_TTL{Waktu Pelunasan<br/>&le; 1 Menit TTL?}

    subgraph AlurLunas ["3A. Alur Pelunasan Tepat Waktu (<= 1 Menit)"]
        D_TTL -- Ya: Tepat Waktu --> L1[Increment Counter Harian<br/>counters/payment_YYYY-MM-DD]
        L1 --> L2[Terbitkan order_tag Contoh: 'Budi-1'<br/>Update orders/id Status 'Paid' & paidAt]
        L2 --> L3[Kirim HTTP 200 OK & Broadcast onSnapshot]
        L3 --> L4[Admin: Smart Queue Prioritas Teratas Hijau<br/>Pelanggan: Tampil Tiket Lunas & order_tag]
        L4 --> E_Paid([Pesanan Siap Diproses & Diambil])
    end

    subgraph AlurLate ["3B. Alur Pembayaran Terlambat (> 1 Menit)"]
        D_TTL -- Tidak: Terlambat --> T1[Deteksi Waktu Melebihi Batas 60 Detik<br/>& Kuota Stok Telah Dikembalikan]
        T1 --> T2[Update orders/id Status 'Expired'<br/>Set latePayment=true & Catat Nominal]
        T2 --> T3[Kirim HTTP 200 OK & Broadcast onSnapshot]
        T3 --> T4[Admin: Banner Late Payment Alert Merah<br/>Pelanggan: Notifikasi Waktu Bayar Habis]
        T4 --> E_Late([Tindak Lanjut Refund Manual / Khusus])
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 2400}, device_scale_factor=2)
    
    html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script>
    <style>
        body {{
            margin: 0;
            background: #ffffff;
            padding: 24px;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            display: inline-block;
        }}
        .mermaid {{
            background: #ffffff;
        }}
    </style>
    </head>
    <body>
        <div class="mermaid">{mmd_a4_compact}</div>
        <script>
            mermaid.initialize({{
                startOnLoad: true,
                theme: 'default',
                flowchart: {{
                    rankSpacing: 40,
                    nodeSpacing: 35,
                    curve: 'basis'
                }},
                themeVariables: {{
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    fontSize: "14px",
                    primaryColor: '#eff6ff',
                    primaryTextColor: '#0f172a',
                    primaryBorderColor: '#2563eb',
                    lineColor: '#2563eb',
                    secondaryColor: '#f8fafc',
                    tertiaryColor: '#f1f5f9',
                    clusterBkg: '#f8fafc',
                    clusterBorder: '#94a3b8'
                }}
            }});
        </script>
    </body></html>"""
    
    page.set_content(html)
    page.wait_for_selector('.mermaid svg', timeout=10000)
    svg = page.locator('.mermaid svg')
    vb = svg.get_attribute('viewBox')
    parts = [float(x) for x in vb.split()]
    vb_w, vb_h = parts[2], parts[3]
    print(f"A4 Compact Box: W={vb_w:.1f}, H={vb_h:.1f}, aspect_ratio={vb_w/vb_h:.2f}")
    
    page.evaluate(f"() => {{ const s = document.querySelector('.mermaid svg'); s.style.width = '{vb_w}px'; s.style.maxWidth = 'none'; s.style.height = '{vb_h}px'; }}")
    
    out_png = os.path.abspath("scratch/test_a4_compact.png")
    svg.screenshot(path=out_png)
    print("Saved screenshot:", out_png)
    browser.close()
