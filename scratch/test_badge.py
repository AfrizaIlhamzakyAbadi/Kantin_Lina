import os
from playwright.sync_api import sync_playwright
from PIL import Image

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

mmd_test = """graph TD
    subgraph Dapur ["1. Dapur Kantin: Penyiapan Makanan"]
        P1([Pesanan Berstatus Paid Tampil di Smart Queue]) --> P2[Lihat Urutan & Waktu Pengambilan Terdekat]
        P2 --> P3[Koki Memasak & Mengemas Makanan]
        P3 --> P4[Tempelkan Label order_tag Contoh: 'Budi-1']
        P4 --> P5[Letakkan Paket Makanan di Rak Loket Pengambilan]
    end

    subgraph Loket ["2. Loket Pengambilan: Serah Terima Nirkasir"]
        P5 --> S1([Bel Jam Istirahat Sekolah Berbunyi])
        S1 --> S2[Siswa Datang ke Loket & Tunjukkan Tiket Digital]
        S2 --> S3[Petugas Mencocokkan order_tag pada Kemasan]
        S3 --> S4[Serahkan Makanan Fisik Tanpa Antre Kasir]
        S4 --> S5([Siswa Menerima Makanan & Menikmati Pesanan])
        S4 --> H1[Petugas Klik Tombol 'Complete' di Web Admin]
    end

    subgraph Sistem ["3. Cloud Firestore & Web: Finalisasi Transaksi"]
        H1 --> T1[Update Dokumen orders/id: Status 'Completed']
        T1 --> T2[Simpan Timestamp completedAt di Database]
        T2 --> T3[Admin: Kartu Pindah ke Completed Orders History]
        T2 -.-> T4[Pelanggan: Broadcast Event onSnapshot Real-Time]
        T4 --> T5[Layar Smartphone Siswa: Status 'Order Picked Up']
        T3 --> T6([Siklus Hidup Transaksi Selesai])
        T5 --> T6
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    # High DPI device scale factor 2.5
    page = browser.new_page(viewport={'width': 2400, 'height': 3000}, device_scale_factor=2.5)
    
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
        /* Subgraph title pill / badge style so lines do not intersect text */
        .cluster-label span, .cluster-label p {{
            background: #ffffff !important;
            padding: 2px 12px !important;
            border-radius: 6px !important;
            border: 1px solid #94a3b8 !important;
            font-weight: 600 !important;
            color: #1e293b !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            margin: 0 !important;
        }}
    </style>
    </head>
    <body>
        <div class="mermaid">{mmd_test}</div>
        <script>
            mermaid.initialize({{
                startOnLoad: true,
                theme: 'default',
                flowchart: {{
                    rankSpacing: 35,
                    nodeSpacing: 30,
                    curve: 'basis'
                }},
                themeVariables: {{
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    fontSize: "14.5px",
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
    print(f"ViewBox: W={vb_w:.1f}, H={vb_h:.1f}, aspect_ratio={vb_w/vb_h:.2f}")
    
    page.evaluate(f"() => {{ const s = document.querySelector('.mermaid svg'); s.style.width = '{vb_w}px'; s.style.maxWidth = 'none'; s.style.height = '{vb_h}px'; }}")
    
    out_png = os.path.abspath("scratch/test_badge.png")
    svg.screenshot(path=out_png)
    print("Saved screenshot:", out_png)
    browser.close()

im = Image.open(out_png)
print("Image size:", im.size, "File size KB:", os.path.getsize(out_png)/1024)
