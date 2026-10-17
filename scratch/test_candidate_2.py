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

candidate_2 = """graph TD
    subgraph Midtrans ["Midtrans Payment Gateway"]
        W1([Pembayaran Berhasil di Bank / E-Wallet]) --> W2[Bentuk JSON Notifikasi Webhook]
        W2 --> W3[Kirim HTTP POST ke /api/webhook]
    end
    
    subgraph Worker ["Cloudflare Edge Worker (/api/webhook)"]
        W3 --> X1[Terima Request Notifikasi Webhook]
        X1 --> X2[Kalkulasi Signature SHA-512]
        X2 --> X3{Signature<br/>Valid?}
        X3 -- Tidak --> X4[Tolak HTTP 403 Forbidden]
        X4 --> E1([Terminasi Ditolak])
        
        X3 -- Ya --> X5{Status Transaksi<br/>Settlement?}
        X5 -- Tidak --> X6[releaseOrder: Kembalikan Stok Menu]
        X6 --> E2([Pesanan Dibatalkan])
        
        X5 -- Ya --> X7[Buka Transaksi Cloud Firestore]
        X7 --> X8{Pelunasan Melebihi<br/>Batas 1 Menit TTL?}
        
        X8 -- Tidak: Tepat Waktu --> X9[Increment Atomic Counter<br/>& Terbitkan order_tag]
        X9 --> X10[Update Status 'Paid'<br/>& Catat Timestamp paidAt]
        
        X8 -- Ya: Terlambat --> X11[Update Status 'Expired'<br/>& Flag latePayment=true]
        
        X10 --> X12[Kirim HTTP 200 OK ke Midtrans]
        X11 --> X12
    end
    
    subgraph Firestore ["Cloud Firestore (Real-Time Database)"]
        X12 --> F1[Komit Pembaruan Dokumen orders/id]
        F1 --> F2[Trigger Broadcast onSnapshot Event]
    end
    
    subgraph Client ["Antarmuka Klien Real-Time"]
        F2 --> C1{Evaluasi Status Pesanan}
        C1 -- Status Paid --> C2[Admin: Masuk Antrean Smart Queue Hijau<br/>Pelanggan: Tampil Tiket Sukses & order_tag]
        C1 -- Late Payment --> C3[Admin: Tampilkan Late Payment Alert Merah<br/>Pelanggan: Notifikasi Waktu Bayar Habis]
        C2 --> E3([Pesanan Siap Diproses Dapur & Diambil])
        C3 --> E4([Tindak Lanjut Refund / Khusus])
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1920, 'height': 1800}, device_scale_factor=2)
    page.set_content(html_template.format(mmd=candidate_2), wait_until='domcontentloaded', timeout=15000)
    page.wait_for_selector('.mermaid svg', timeout=15000)
    box = page.locator('.mermaid svg').bounding_box()
    print("Candidate 2 Bounding Box:", box)
    page.locator('.mermaid svg').screenshot(path='scratch/candidate_2.png')
    browser.close()
