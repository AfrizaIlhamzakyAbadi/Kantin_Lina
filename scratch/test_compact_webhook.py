import os
from playwright.sync_api import sync_playwright

html_template = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {{
            margin: 0;
            background: #ffffff;
            padding: 20px;
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
<body>
    <div class="mermaid">
{mmd}
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

candidate_1 = """graph TD
    subgraph Midtrans ["Midtrans Gateway"]
        W1([Pembayaran Sukses<br/>Bank / E-Wallet]) --> W2[Bentuk Notifikasi<br/>Webhook JSON]
        W2 --> W3[Kirim HTTP POST<br/>ke /api/webhook]
    end

    subgraph Worker ["Cloudflare Worker & Firestore (/api/webhook)"]
        W3 --> X1[Terima HTTP POST]
        X1 --> X2[Kalkulasi Signature<br/>SHA-512 Server Key]
        X2 --> X3{Signature<br/>Valid?}
        X3 -- Tidak --> X4[Tolak HTTP 403<br/>Forbidden]
        X4 --> E_Fail([Terminasi Gagal])
        
        X3 -- Ya --> X5{Status<br/>Settlement?}
        X5 -- Tidak --> X6[releaseOrder:<br/>Kembalikan Stok Menu]
        X6 --> E_Fail
        
        X5 -- Ya --> X7[Buka Transaksi<br/>Cloud Firestore]
        X7 --> X8{Pelunasan<br/>&le; 1 Menit TTL?}
        
        X8 -- Ya: Tepat Waktu --> X9[Increment Counter Harian<br/>& Terbitkan order_tag]
        X9 --> X10[Update orders/{id}:<br/>Status 'Paid' & Catat paidAt]
        
        X8 -- Tidak: Terlambat --> X11[Update orders/{id}:<br/>Expired & latePayment=true]
        
        X10 --> X12[Kirim HTTP 200 OK<br/>ke Midtrans]
        X11 --> X12
        X10 -.-> F_Sync[Broadcast Real-Time<br/>via onSnapshot]
        X11 -.-> F_Sync
    end

    subgraph Client ["Antarmuka Klien (Real-Time)"]
        F_Sync --> A1[Admin Smart Queue:<br/>Prioritas Teratas Hijau]
        F_Sync --> A2[Admin Alert:<br/>Late Payment Merah]
        F_Sync --> C1[Layar Pelanggan:<br/>Tiket Sukses & order_tag]
        F_Sync --> C2[Layar Pelanggan:<br/>Pemberitahuan Expired]
        
        A1 --> E_OK([Pesanan Siap Diproses])
        A2 --> E_Manual([Tindakan Manual / Refund])
        C1 --> E_Cust([Pengambilan di Loket])
        C2 --> E_Done([Transaksi Kedaluwarsa])
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1920, 'height': 1600}, device_scale_factor=2)
    page.on('console', lambda m: print('CONSOLE:', m.text))
    page.set_content(html_template.format(mmd=candidate_1), wait_until='domcontentloaded', timeout=15000)
    page.wait_for_selector('.mermaid svg', timeout=15000)
    box = page.locator('.mermaid svg').bounding_box()
    print("Candidate 1 Bounding Box:", box)
    page.locator('.mermaid svg').screenshot(path='scratch/candidate_1.png')
    browser.close()
