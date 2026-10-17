import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

def render_mmd(name, mmd_code, width=1200, height=800):
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script>
{mermaid_js}
    </script>
    <style>
        body {{
            margin: 0;
            background: #ffffff;
            padding: 20px;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        }}
        .mermaid {{
            background: #ffffff;
        }}
    </style>
</head>
<body>
    <div class="mermaid">
{mmd_code}
    </div>
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
</body>
</html>"""

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
        page.set_content(html)
        page.wait_for_selector('.mermaid svg', state='attached', timeout=10000)
        page.wait_for_timeout(1000)
        svg = page.locator('.mermaid svg')
        box = svg.bounding_box()
        out_png = os.path.abspath(f"scratch/{name}.png")
        svg.screenshot(path=out_png)
        print(f"[{name}] Box: width={box['width']:.1f}, height={box['height']:.1f}, ratio={box['width']/box['height']:.2f}")
        print(f"Saved: {out_png}")
        browser.close()

# Layout 1: Compact graph LR
layout_lr = """graph LR
    subgraph Midtrans ["Midtrans Gateway"]
        direction TB
        W1([Pembayaran Sukses<br/>Bank / E-Wallet]) --> W2[Bentuk JSON<br/>Notifikasi Webhook]
        W2 --> W3[Kirim HTTP POST<br/>ke /api/webhook]
    end

    subgraph Worker ["Cloudflare Worker & Firestore (/api/webhook)"]
        direction TB
        X1[Terima HTTP POST] --> X2[Validasi Hash SHA-512<br/>Server Key]
        X2 --> X3{Signature<br/>Valid?}
        X3 -- Tidak --> X4[Tolak HTTP 403<br/>Forbidden] --> E1([Ditolak])
        
        X3 -- Ya --> X5{Status<br/>Settlement?}
        X5 -- Tidak --> X6[releaseOrder:<br/>Kembalikan Stok Menu] --> E2([Batal])
        
        X5 -- Ya --> X7[Buka Firestore<br/>Transaction]
        X7 --> X8{Pelunasan<br/>&le; 1m TTL?}
        
        X8 -- Tepat Waktu --> X9[Increment Counter Harian<br/>& Terbitkan order_tag]
        X9 --> X10[Update orders/id:<br/>Status Paid & paidAt]
        
        X8 -- Terlambat --> X11[Update orders/id:<br/>Expired & latePayment]
        
        X10 --> X12[Kirim HTTP 200 OK<br/>ke Midtrans]
        X11 --> X12
    end

    subgraph Clients ["Antarmuka Klien (Real-Time onSnapshot)"]
        direction TB
        C_Check{Status Transaksi?}
        
        C_Check -- Status Paid --> C_Paid[Admin Smart Queue:<br/>Prioritas Teratas Hijau<br/>---<br/>Pelanggan Layar Status:<br/>Tiket Lunas & order_tag]
        C_Check -- Late Payment --> C_Late[Admin Smart Queue:<br/>Late Payment Alert Merah<br/>---<br/>Pelanggan Layar Status:<br/>Notifikasi Waktu Habis]
        
        C_Paid --> E3([Siap Diproses Dapur & Diambil])
        C_Late --> E4([Tindak Lanjut Refund Manual])
    end

    W3 --> X1
    X10 -.-> C_Check
    X11 -.-> C_Check
"""

render_mmd("layout_lr", layout_lr, width=2400, height=1200)
