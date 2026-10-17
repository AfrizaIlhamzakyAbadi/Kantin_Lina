import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

# Let's test placing subgraphs side-by-side using horizontal ranking
cand_columns = """graph TD
    %% Force horizontal alignment of subgraphs at top
    W1 ~~~ X1
    X1 ~~~ C_Head

    subgraph Midtrans ["Midtrans Payment Gateway"]
        W1([Pembayaran Sukses<br/>Bank / E-Wallet]) --> W2[Bentuk Payload JSON<br/>Notifikasi Webhook]
        W2 --> W3[Kirim HTTP POST<br/>ke /api/webhook]
    end

    subgraph Worker ["Cloudflare Worker (/api/webhook)"]
        X1[Terima HTTP POST] --> X2[Validasi Hash SHA-512<br/>Server Key]
        X2 --> X3{Signature<br/>Valid?}
        X3 -- Tidak --> X4[Tolak HTTP 403<br/>Forbidden] --> E1([Ditolak])
        
        X3 -- Ya --> X5{Status<br/>Settlement?}
        X5 -- Tidak --> X6[releaseOrder:<br/>Kembalikan Stok] --> E2([Batal])
        
        X5 -- Ya --> X7[Buka Transaksi<br/>Cloud Firestore]
        X7 --> X8{Pelunasan<br/>&le; 1m TTL?}
        
        X8 -- Tepat Waktu --> X9[Increment Counter<br/>& Terbitkan order_tag]
        X9 --> X10[Update orders/id:<br/>Paid & paidAt]
        
        X8 -- Terlambat --> X11[Update orders/id:<br/>Expired & latePayment]
        
        X10 --> X12[Kirim HTTP 200 OK<br/>ke Midtrans]
        X11 --> X12
    end

    subgraph Clients ["Antarmuka Klien (Real-Time)"]
        C_Head[Real-Time Listener<br/>Firestore onSnapshot]
        C_Head --> C_Check{Status Transaksi?}
        
        C_Check -- Status Paid --> C_Paid[Admin Smart Queue:<br/>Prioritas Teratas Hijau<br/>---<br/>Pelanggan: Tampil Tiket<br/>Lunas & order_tag]
        C_Check -- Late Payment --> C_Late[Admin Alert:<br/>Late Payment Merah<br/>---<br/>Pelanggan: Notifikasi<br/>Waktu Bayar Habis]
        
        C_Paid --> E3([Pesanan Siap Diproses])
        C_Late --> E4([Tindak Lanjut Refund])
    end

    %% Cross-swimlane links
    W3 --> X1
    X10 -.-> C_Head
    X11 -.-> C_Head
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 2400}, device_scale_factor=2)
    
    html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script>
    <style>
        body {{ margin: 0; background: #ffffff; padding: 24px; font-family: 'Segoe UI', sans-serif; display: inline-block; }}
        .mermaid {{ background: #ffffff; }}
        .mermaid svg {{ max-width: none !important; height: auto !important; width: auto !important; }}
    </style>
    </head>
    <body><div class="mermaid">{cand_columns}</div>
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
    box = svg.bounding_box()
    print("Columns layout Bounding Box:", box)
    print(f"Aspect ratio: width={box['width']:.1f}, height={box['height']:.1f}, ratio={box['width']/box['height']:.2f}")
    svg.screenshot(path="scratch/cand_columns.png")
    browser.close()
