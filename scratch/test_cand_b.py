import os
from playwright.sync_api import sync_playwright

mermaid_file = os.path.abspath("scratch/mermaid.min.js")
with open(mermaid_file, "r", encoding="utf-8") as f:
    mermaid_js = f.read()

def test_render(name, mmd_code, font_size="13px"):
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
                fontSize: "{font_size}",
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
        page = browser.new_page(viewport={'width': 2400, 'height': 2400}, device_scale_factor=2)
        page.set_content(html)
        page.wait_for_selector('.mermaid svg', timeout=10000)
        svg = page.locator('.mermaid svg')
        box = svg.bounding_box()
        out_png = os.path.abspath(f"scratch/{name}.png")
        svg.screenshot(path=out_png)
        print(f"[{name}] Box: width={box['width']:.1f}, height={box['height']:.1f}, aspect_ratio={box['width']/box['height']:.2f}")
        print(f"Saved: {out_png}")
        browser.close()

cand_b = """graph TD
    subgraph Midtrans ["Midtrans Gateway"]
        W1([Settlement Berhasil<br/>di Bank / E-Wallet]) --> W2[Bentuk Payload JSON<br/>Notifikasi Webhook]
        W2 --> W3[Kirim HTTP POST<br/>ke /api/webhook]
    end

    subgraph Worker ["Cloudflare Worker & Database (/api/webhook)"]
        W3 --> X1[Terima HTTP POST]
        X1 --> X2[Validasi Hash SHA-512<br/>dengan Server Key]
        X2 --> X3{Signature<br/>Valid?}
        X3 -- Tidak --> X4[Tolak HTTP 403 Forbidden]
        X4 --> E1([Ditolak])
        
        X3 -- Ya --> X5{Status<br/>Settlement?}
        X5 -- Tidak --> X6[releaseOrder:<br/>Kembalikan Stok Menu]
        X6 --> E2([Batal])
        
        X5 -- Ya --> X7[Buka Firestore Transaction]
        X7 --> X8{Pelunasan<br/>&le; 1 Menit TTL?}
        
        X8 -- Ya: Tepat Waktu --> X9[Increment Counter Harian<br/>& Terbitkan order_tag]
        X9 --> X10[Update Dokumen orders/{id}:<br/>Status Paid & paidAt]
        
        X8 -- Tidak: Terlambat --> X11[Update Dokumen orders/{id}:<br/>Status Expired & Late Flag]
        
        X10 --> X12[Kirim HTTP 200 OK<br/>ke Midtrans]
        X11 --> X12
        
        X10 -.-> F1[Trigger onSnapshot<br/>Real-Time Broadcast]
        X11 -.-> F1
    end

    subgraph Klien ["Antarmuka Klien (Real-Time Synchronous)"]
        F1 --> C_Check{Status Transaksi?}
        
        C_Check -- Paid: Sukses --> C_Paid[Admin: Antrean Smart Queue Teratas<br/>Pelanggan: Tiket Lunas & order_tag]
        C_Check -- Late: Terlambat --> C_Late[Admin: Late Payment Alert Merah<br/>Pelanggan: Notifikasi Kedaluwarsa]
        
        C_Paid --> E3([Siap Diproses Dapur & Diambil])
        C_Late --> E4([Tindak Lanjut Refund Manual])
    end
"""

test_render("cand_b", cand_b)
