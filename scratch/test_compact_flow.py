import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

cand_compact = """graph TD
    subgraph Midtrans ["Midtrans Payment Gateway"]
        W1([Pembayaran Berhasil di Bank / E-Wallet]) --> W2[Kirim HTTP POST Notifikasi Webhook]
    end

    subgraph Worker ["Cloudflare Edge Worker (/api/webhook)"]
        W2 --> X1[Validasi Keaslian Signature SHA-512]
        X1 --> X2{Signature Valid<br/>& Settlement?}
        X2 -- Tidak --> X3[Tolak HTTP 403 / releaseOrder] --> E1([Terminasi Gagal])
        
        X2 -- Ya --> X4[Buka Firestore Transaction & Evaluasi Waktu]
        X4 --> X5{Pelunasan Melebihi<br/>Batas 1 Menit TTL?}
        
        X5 -- Tidak: Tepat Waktu --> X6[Increment Atomic Counter counters/payment_YYYY-MM-DD<br/>Terbitkan order_tag, Status 'Paid' & Catat paidAt]
        X5 -- Ya: Terlambat --> X7[Tandai Status 'Expired' & Flag latePayment=true<br/>Catat latePaymentAmount tanpa Mengurangi Stok]
        
        X6 --> X8[Kirim HTTP 200 OK ke Midtrans]
        X7 --> X8
    end

    subgraph Firestore ["Basis Data Cloud Firestore"]
        X8 --> F1[Komit Pembaruan orders/id & Broadcast onSnapshot]
    end

    subgraph Client ["Antarmuka Klien Real-Time (onSnapshot)"]
        F1 --> C1{Evaluasi Status Pesanan}
        
        C1 -- Status Paid --> C2[Admin: Antrean Smart Queue Teratas Hijau<br/>Pelanggan: Tampil Tiket Lunas & order_tag]
        C1 -- Late Payment --> C3[Admin: Tampil Late Payment Alert Merah<br/>Pelanggan: Notifikasi Waktu Bayar Habis]
        
        C2 --> E2([Pesanan Siap Diproses & Diambil])
        C3 --> E3([Tindak Lanjut Refund Manual])
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1600, 'height': 1600}, device_scale_factor=2.5)
    
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
        .mermaid svg {{
            max-width: none !important;
            height: auto !important;
        }}
    </style>
    </head>
    <body><div class="mermaid">{cand_compact}</div>
    <script>
        mermaid.initialize({{
            startOnLoad: true,
            theme: 'default',
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
    box = svg.bounding_box()
    print("Compact Flow Box:", box)
    print(f"Aspect ratio: width={box['width']:.1f}, height={box['height']:.1f}, ratio={box['width']/box['height']:.2f}")
    svg.screenshot(path="scratch/cand_compact.png")
    browser.close()
