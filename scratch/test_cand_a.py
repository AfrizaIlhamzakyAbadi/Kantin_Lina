import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

def test_render(name, mmd_code):
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
{mmd_code}
    </div>
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
</body>
</html>"""

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 2000, 'height': 2000}, device_scale_factor=2.5)
        page.set_content(html)
        page.wait_for_selector('.mermaid svg', timeout=10000)
        svg = page.locator('.mermaid svg')
        box = svg.bounding_box()
        out_png = os.path.abspath(f"scratch/{name}.png")
        svg.screenshot(path=out_png)
        print(f"[{name}] Box: width={box['width']:.1f}, height={box['height']:.1f}, aspect_ratio={box['width']/box['height']:.2f}")
        print(f"Saved: {out_png}")
        browser.close()

# Candidate A: 4 stacked subgraphs
cand_a = """graph TD
    subgraph Midtrans ["1. Midtrans Payment Gateway"]
        W1([Pembayaran Sukses di Bank / E-Wallet]) --> W2[Bentuk JSON Notifikasi Webhook]
        W2 --> W3[Kirim HTTP POST ke /api/webhook]
    end
    
    subgraph Worker ["2. Cloudflare Edge Worker (/api/webhook)"]
        W3 --> X1[Terima HTTP POST Notifikasi]
        X1 --> X2[Kalkulasi Signature SHA-512]
        X2 --> X3{Signature<br/>Valid?}
        X3 -- Tidak --> X4[Tolak HTTP 403 Forbidden]
        X4 --> E1([Selesai / Ditolak])
        
        X3 -- Ya --> X5{Status Transaksi<br/>Settlement?}
        X5 -- Tidak --> X6[releaseOrder: Kembalikan Stok]
        X6 --> E2([Pesanan Dibatalkan])
        
        X5 -- Ya --> X7[Buka Transaksi Firestore]
        X7 --> X8{Pelunasan Melebihi<br/>Batas 1 Menit TTL?}
        
        X8 -- Tidak: Tepat Waktu --> X9[Increment Counter Harian<br/>& Terbitkan order_tag]
        X9 --> X10[Update Status 'Paid'<br/>& Catat paidAt]
        
        X8 -- Ya: Terlambat --> X11[Update Status 'Expired'<br/>& Flag latePayment=true]
        
        X10 --> X12[Kirim HTTP 200 OK ke Midtrans]
        X11 --> X12
    end
    
    subgraph Firestore ["3. Cloud Firestore Database"]
        X12 --> F1[Komit Dokumen orders/id]
        F1 --> F2[Trigger onSnapshot Real-Time Broadcast]
    end
    
    subgraph Clients ["4. Sinkronisasi Antarmuka Klien"]
        F2 --> C1{Evaluasi Status Pesanan}
        C1 -- Status Paid --> C2[Admin: Masuk Smart Queue Teratas Hijau<br/>Pelanggan: Tampil Tiket Lunas & order_tag]
        C1 -- Late Payment --> C3[Admin: Tampil Late Payment Alert Merah<br/>Pelanggan: Notifikasi Waktu Bayar Habis]
        C2 --> E3([Pesanan Siap Diproses & Diambil])
        C3 --> E4([Tindak Lanjut Refund / Khusus])
    end
"""

test_render("cand_a", cand_a)
