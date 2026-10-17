import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

test_code = """graph LR
    subgraph Midtrans ["Midtrans Gateway"]
        direction TB
        W1([Pembayaran Sukses<br/>Bank / E-Wallet])
        W2[Kirim HTTP POST<br/>Notifikasi Webhook]
        W1 --> W2
    end

    subgraph Worker ["Cloudflare Edge Worker & Firestore (/api/webhook)"]
        direction TB
        X1[Terima & Validasi<br/>Signature SHA-512]
        X2{Signature &<br/>Settlement Valid?}
        X3([Tolak HTTP 403 /<br/>releaseOrder])
        X4[Buka Transaksi Firestore:<br/>Evaluasi TTL 1 Menit]
        X5{Pelunasan<br/>&le; 1m TTL?}
        X6[Increment Counter<br/>& Terbitkan order_tag]
        X7[Update orders/id:<br/>Status Paid & paidAt]
        X8[Update orders/id:<br/>Expired & Late Flag]
        X9[Kirim HTTP 200 OK<br/>ke Midtrans]

        X1 --> X2
        X2 -- Tidak --> X3
        X2 -- Ya --> X4
        X4 --> X5
        X5 -- Ya / Tepat --> X6 --> X7 --> X9
        X5 -- Tidak / Late --> X8 --> X9
    end

    subgraph Clients ["Antarmuka Klien (Real-Time onSnapshot)"]
        direction TB
        C1{Status Transaksi?}
        C2[Admin Smart Queue:<br/>Prioritas Teratas Hijau]
        C3[Admin Alert:<br/>Late Payment Merah]
        C4[Pelanggan Layar:<br/>Tiket Sukses & order_tag]
        C5[Pelanggan Layar:<br/>Notifikasi Kedaluwarsa]
        
        C1 -- Paid --> C2
        C1 -- Paid --> C4
        C1 -- Expired --> C3
        C1 -- Expired --> C5
        
        E1([Pesanan Siap Diproses])
        E2([Tindak Lanjut Manual])
        C2 --> E1
        C3 --> E2
    end

    W2 --> X1
    X7 -.-> C1
    X8 -.-> C1
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2000, 'height': 2000}, device_scale_factor=2)
    
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
        <div class="mermaid">{test_code}</div>
        <script>
            mermaid.initialize({{
                startOnLoad: true,
                theme: 'default',
                themeVariables: {{
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    fontSize: "13.5px",
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
    print(f"LR with TB subgraphs: W={vb_w:.1f}, H={vb_h:.1f}, aspect_ratio={vb_w/vb_h:.2f}")
    
    page.evaluate(f"() => {{ const s = document.querySelector('.mermaid svg'); s.style.width = '{vb_w}px'; s.style.maxWidth = 'none'; s.style.height = '{vb_h}px'; }}")
    
    out_png = os.path.abspath("scratch/test_lr_tb.png")
    svg.screenshot(path=out_png)
    print("Saved screenshot:", out_png)
    browser.close()
