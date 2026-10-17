import os
from playwright.sync_api import sync_playwright
from PIL import Image

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

mmd_code = """graph TD
    subgraph Dapur ["Dapur Kantin (Penyiapan Pesanan)"]
        D1([Pesanan Berstatus Paid Masuk ke Smart Queue]) --> D2[Petugas Cek Urutan Waktu & Notes Pesanan]
        D2 --> D3[Koki Memasak & Mengemas Makanan Terjadwal]
        D3 --> D4[Tempelkan Label order_tag Contoh: 'Budi-1']
        D4 --> D5[Letakkan Paket Makanan di Rak Loket Pengambilan]
    end

    subgraph Loket ["Loket Pengambilan (Serah Terima Nirkasir)"]
        D5 --> L1([Bel Istirahat Berbunyi & Siswa Datang ke Loket])
        L1 --> L2[Siswa Tunjukkan Tiket Digital di Layar Smartphone]
        L2 --> L3[Petugas Cocokkan order_tag Layar & Kemasan]
        L3 --> L4[Serahkan Makanan Fisik Tanpa Antre Kasir]
        L4 --> L5[Petugas Klik Tombol 'Complete' di Web Admin]
    end

    subgraph Sistem ["Cloud Firestore & Web Admin (Finalisasi)"]
        L5 --> S1[Eksekusi updateDoc: Status 'Completed' & completedAt]
        S1 --> S2[Admin: Kartu Pindah ke Completed Orders History]
        S1 -.-> S3[Pelanggan: onSnapshot Real-Time Broadcast]
        S3 --> S4[Layar Smartphone Siswa: 'Order Picked Up']
        S2 --> S5([Siklus Hidup Transaksi Selesai])
        S4 --> S5
    end
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 2400, 'height': 3000}, device_scale_factor=2.0)
    
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
        /* Clean pill styling for cluster titles */
        .cluster-label span {{
            background: #f8fafc !important;
            padding: 3px 12px !important;
            border-radius: 12px !important;
            border: 1.5px solid #cbd5e1 !important;
            font-weight: 700 !important;
            font-size: 13.5px !important;
            color: #1e3a8a !important;
            letter-spacing: 0.3px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }}
    </style>
    </head>
    <body>
        <div class="mermaid">{mmd_code}</div>
        <script>
            mermaid.initialize({{
                startOnLoad: true,
                theme: 'default',
                flowchart: {{
                    rankSpacing: 38,
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
    print(f"ViewBox: W={vb_w:.1f}, H={vb_h:.1f}, aspect_ratio={vb_w/vb_h:.2f}")
    
    page.evaluate(f"() => {{ const s = document.querySelector('.mermaid svg'); s.style.width = '{vb_w}px'; s.style.maxWidth = 'none'; s.style.height = '{vb_h}px'; }}")
    
    out_png = os.path.abspath("scratch/test_aligned_pickup.png")
    svg.screenshot(path=out_png)
    print("Saved screenshot:", out_png)
    browser.close()

im = Image.open(out_png)
print("Image size:", im.size, "aspect ratio:", im.size[0]/im.size[1], "File size KB:", os.path.getsize(out_png)/1024)
