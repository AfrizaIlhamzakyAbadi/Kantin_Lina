import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

mmd_proposal = """graph TD
    subgraph Midtrans ["Midtrans Payment Gateway"]
        W1([Pembayaran Berhasil di Bank / E-Wallet]) --> W2[Kirim HTTP POST Notifikasi Webhook]
    end

    subgraph Worker ["Cloudflare Edge Worker (/api/webhook)"]
        W2 --> X1[Terima & Hitung SHA-512 Signature Key]
        X1 --> X2{Signature Valid<br/>& Settlement?}
        X2 -- Tidak --> X3[Tolak HTTP 403 / releaseOrder] --> E1([Terminasi Gagal])
        
        X2 -- Ya --> X4[Buka Transaksi Firestore & Cek TTL 1 Menit]
        X4 --> X5{Pelunasan Melebihi<br/>Batas 1 Menit TTL?}
        
        X5 -- Tidak: Tepat Waktu --> X6[Increment Counter counters/payment_YYYY-MM-DD<br/>Terbitkan order_tag, Status 'Paid' & Catat paidAt]
        X5 -- Ya: Terlambat --> X7[Tandai Status 'Expired' & Set latePayment=true<br/>Catat latePaymentAmount tanpa Potong Stok]
        
        X6 --> X8[Kirim Respons HTTP 200 OK ke Midtrans]
        X7 --> X8
    end

    subgraph Firestore ["Basis Data Cloud Firestore"]
        X8 --> F1[Komit Pembaruan orders/id & Broadcast onSnapshot]
    end

    subgraph Client ["Antarmuka Klien Real-Time (onSnapshot)"]
        F1 --> C1{Evaluasi Status Transaksi}
        
        C1 -- Status Paid --> C2[Admin: Antrean Smart Queue Teratas Hijau<br/>Pelanggan: Tampil Tiket Lunas & order_tag]
        C1 -- Late Payment --> C3[Admin: Tampil Late Payment Alert Merah<br/>Pelanggan: Notifikasi Waktu Bayar Habis]
        
        C2 --> E2([Pesanan Siap Diproses & Diambil])
        C3 --> E3([Tindak Lanjut Refund / Penanganan Khusus])
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 2400}, device_scale_factor=2.5)
    
    html = f"""<!DOCTYPE html><html><head><script>{mermaid_js}</script>
    <style>
        body {{
            margin: 0;
            background: #ffffff;
            padding: 30px;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            display: inline-block;
        }}
        .mermaid {{
            background: #ffffff;
        }}
    </style>
    </head>
    <body>
        <div class="mermaid">{mmd_proposal}</div>
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
    vb = svg.get_attribute('viewBox')
    parts = [float(x) for x in vb.split()]
    vb_w, vb_h = parts[2], parts[3]
    print(f"Proposal dimensions: W={vb_w:.1f}, H={vb_h:.1f}, aspect_ratio={vb_w/vb_h:.2f}")
    
    # Set explicit size so it captures without squishing
    page.evaluate(f"() => {{ const s = document.querySelector('.mermaid svg'); s.style.width = '{vb_w}px'; s.style.maxWidth = 'none'; s.style.height = '{vb_h}px'; }}")
    
    out_png = os.path.abspath("scratch/test_proposal.png")
    svg.screenshot(path=out_png)
    print("Saved screenshot:", out_png)
    browser.close()
