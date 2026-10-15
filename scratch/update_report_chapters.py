import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# 1. Backup original document
doc_path = r"c:\Users\ACER SWIFT\AppProject\Kantin Lina v0.0\Report\Report.docx"
backup_path = r"c:\Users\ACER SWIFT\AppProject\Kantin Lina v0.0\Report\Report_backup_before_bab5_9.docx"
if not os.path.exists(backup_path):
    shutil.copy2(doc_path, backup_path)
    print(f"Created backup: {backup_path}")

doc = docx.Document(doc_path)
diagrams_dir = r"c:\Users\ACER SWIFT\AppProject\Kantin Lina v0.0\Report\diagrams"

# Locate boundaries: Bab 5 start and Lampiran start
body_children = doc._body._element[:]
bab5_start_idx = None
lampiran_idx = None

for idx, child in enumerate(body_children):
    tag = child.tag.split('}')[-1]
    if tag == 'p':
        p = docx.text.paragraph.Paragraph(child, doc)
        txt = p.text.strip()
        if txt.startswith("Bab 5") and bab5_start_idx is None:
            bab5_start_idx = idx
        elif txt.startswith("Lampiran") and lampiran_idx is None:
            lampiran_idx = idx

print(f"Bab 5 child index: {bab5_start_idx}")
print(f"Lampiran child index: {lampiran_idx}")

if bab5_start_idx is None or lampiran_idx is None:
    raise ValueError("Could not find Bab 5 or Lampiran boundaries in document.")

# Reference element before which new content will be inserted
lampiran_elem = body_children[lampiran_idx]

# Remove old elements between Bab 5 and Lampiran
for idx in range(bab5_start_idx, lampiran_idx):
    elem_to_remove = body_children[idx]
    doc._body._element.remove(elem_to_remove)

print(f"Removed {lampiran_idx - bab5_start_idx} old elements.")

# Helper functions to create formatted elements and insert before lampiran_elem
def create_p(text="", style='Normal', space_after=6, space_before=0, align=WD_ALIGN_PARAGRAPH.LEFT):
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    p.alignment = align
    if text:
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        if style == 'Heading 1':
            run.font.size = Pt(16)
            run.bold = True
        elif style == 'Heading 2':
            run.font.size = Pt(13)
            run.bold = True
        elif style == 'Heading 3':
            run.font.size = Pt(11.5)
            run.bold = True
        else:
            run.font.size = Pt(11)
    # Move from end of body to before lampiran_elem
    doc._body._element.remove(p._p)
    lampiran_elem.addprevious(p._p)
    return p

def create_bullet(text, bold_prefix="", space_after=4):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(0)
    if bold_prefix:
        r1 = p.add_run(bold_prefix)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(11)
        r1.bold = True
    r2 = p.add_run(text)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(11)
    doc._body._element.remove(p._p)
    lampiran_elem.addprevious(p._p)
    return p

def create_caption(text):
    p = doc.add_paragraph(style='Normal')
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.space_before = Pt(4)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(9.5)
    r.font.italic = True
    doc._body._element.remove(p._p)
    lampiran_elem.addprevious(p._p)
    return p

def create_image(image_filename, caption_text, width_inches=6.0):
    img_path = os.path.join(diagrams_dir, image_filename)
    if not os.path.exists(img_path):
        print(f"Warning: image file not found: {img_path}")
        return
    p = doc.add_paragraph(style='Normal')
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(8)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(img_path, width=Inches(width_inches))
    doc._body._element.remove(p._p)
    lampiran_elem.addprevious(p._p)
    create_caption(caption_text)

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'w:{edge}'
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', 'CCCCCC'))
            tcBorders.append(element)
    tcPr.append(tcBorders)

def set_cell_shading(cell, color_hex):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)

def create_table(headers, rows_data, col_widths=None):
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header row
    hdr_cells = tbl.rows[0].cells
    for c_idx, title in enumerate(headers):
        cell = hdr_cells[c_idx]
        cell.text = title
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        if p.runs:
            p.runs[0].font.name = 'Times New Roman'
            p.runs[0].font.size = Pt(10)
            p.runs[0].bold = True
        set_cell_shading(cell, "F2F2F2")
        set_cell_border(cell, top={'sz': 6, 'color': '888888'}, bottom={'sz': 6, 'color': '888888'},
                              left={'sz': 4, 'color': 'CCCCCC'}, right={'sz': 4, 'color': 'CCCCCC'})
    
    # Body rows
    for r_idx, row_values in enumerate(rows_data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_color = "FAFAFA" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            cell = row_cells[c_idx]
            cell.text = str(val)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx != 1 else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            if p.runs:
                p.runs[0].font.name = 'Times New Roman'
                p.runs[0].font.size = Pt(9.5)
            set_cell_shading(cell, bg_color)
            set_cell_border(cell, top={'sz': 4, 'color': 'E0E0E0'}, bottom={'sz': 4, 'color': 'E0E0E0'},
                                  left={'sz': 4, 'color': 'E0E0E0'}, right={'sz': 4, 'color': 'E0E0E0'})
    
    if col_widths:
        for r in tbl.rows:
            for idx, width in enumerate(col_widths):
                r.cells[idx].width = Inches(width)

    doc._body._element.remove(tbl._tbl)
    lampiran_elem.addprevious(tbl._tbl)
    # spacer paragraph
    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_before = Pt(0)
    p_space.paragraph_format.space_after = Pt(6)
    doc._body._element.remove(p_space._p)
    lampiran_elem.addprevious(p_space._p)

print("Starting generation of Bab 5 to Bab 9...")

# ==============================================================================
# BAB 5: PERANCANGAN BASIS DATA
# ==============================================================================
create_p("Bab 5 Perancangan Basis Data", style='Heading 1', space_before=12, space_after=8)
create_p("5.1 Arsitektur NoSQL Cloud Firestore", style='Heading 2', space_before=6, space_after=4)
create_p(
    "Sistem Informasi Pre-Order Kantin Lina mengimplementasikan basis data non-relasional terdistribusi "
    "Cloud Firestore yang di-hosting pada region asia-southeast2 (Jakarta). Pemilihan model NoSQL berbasis dokumen "
    "ini didasarkan pada karakteristik operasional kantin sekolah yang membutuhkan kemampuan penanganan beban transaksi "
    "puncak (peak traffic) saat jam istirahat sekolah tanpa terjadinya bottleneck konkurensi. Cloud Firestore menawarkan "
    "dua kapabilitas fundamental yang menjadi fondasi sistem nyata:",
    space_after=6
)
create_bullet(
    " Memungkinkan antarmuka kasir/dapur (admin-kantin-lina.pages.dev) dan portal pemesan (kantin-lina.pages.dev) "
    "menerima pembaruan status transaksi secara reaktif melalui koneksi WebSocket persisten tanpa perlu polling manual.",
    bold_prefix="1. Sinkronisasi Real-Time Berbasis Event Listener (onSnapshot):"
)
create_bullet(
    " Melalui fungsi runTransaction, mutasi pemotongan kuota stok menu dan pembuatan pesanan baru dieksekusi secara "
    "atomik. Jika dua pelanggan secara simultan memesan menu yang sama dengan sisa stok terbatas, Firestore menjamin "
    "hanya transaksi pertama yang berhasil diverifikasi, sedangkan transaksi kedua digagalkan secara aman (rollback) "
    "sehingga tidak pernah terjadi kondisi overselling (stok minus).",
    bold_prefix="2. Integritas Data Atomik (ACID Transactions):"
)

create_p("5.2 Skema Dokumen & Kamus Data Terstruktur", style='Heading 2', space_before=8, space_after=4)
create_p(
    "Basis data sistem dimodelkan ke dalam empat koleksi utama: menu, orders, settings, dan counters. "
    "Struktur atribut, tipe data, aturan konstrain, dan deskripsi fungsional dijabarkan secara rinci sebagai berikut:",
    space_after=6
)

# Table 5.1 Menu
create_caption("Tabel 5.1 Kamus Data Koleksi 'menu'")
menu_headers = ["Nama Field", "Tipe Data", "Constraint", "Keterangan & Aturan Validasi"]
menu_rows = [
    ["id", "String", "Primary Key (Auto/Slug)", "Identitas unik dokumen menu (contoh: 'nasi-ayam-geprek-1728')"],
    ["name", "String", "Required, Length 2-50", "Nama makanan/minuman yang ditampilkan di katalog"],
    ["category", "String", "Enum (Food|Drink|Other)", "Kategori baku pengelompokan menu di etalase web"],
    ["price", "Number (Integer)", "Required, > 0", "Harga aktual penuh dalam Rupiah (contoh: 12000 untuk 12k)"],
    ["stock", "Number (Integer)", "Required, >= 0", "Sisa kuota porsi yang dapat dipesan hari ini (dipotong saat checkout)"],
    ["imageUrl", "String", "Required (Valid URL)", "Tautan foto makanan dengan rasio proporsional persegi 1:1"],
    ["description", "String", "Optional, Max 200", "Deskripsi komposisi bahan dan cita rasa makanan"],
    ["available", "Boolean", "Default: true", "Flag sakelar aktif/nonaktif dari admin untuk menampilkan/menyembunyikan menu"]
]
create_table(menu_headers, menu_rows, [1.2, 1.2, 1.3, 2.5])

# Table 5.2 Orders
create_caption("Tabel 5.2 Kamus Data Koleksi 'orders'")
orders_headers = ["Nama Field", "Tipe Data", "Constraint", "Keterangan & Logika Siklus Transaksi"]
orders_rows = [
    ["id", "String", "Primary Key", "ID unik transaksi pesanan (contoh: 'ord-1728559988-abc')"],
    ["customerName", "String", "Required, 2-30 char", "Nama dasar pelanggan yang diinput tanpa registrasi akun"],
    ["pickupName", "String", "Required", "Nama antrean tampilan (diperbarui menjadi order_tag saat lunas)"],
    ["order_tag", "String", "Sequential per Day", "Tag antrean harian sekuensial unik (contoh: 'Faiz-1', 'Budi-2')"],
    ["items", "Array of Map", "Required, 1-20 items", "Daftar belanja: [{ id, name, price, qty }] yang diverifikasi di server"],
    ["total", "Number (Integer)", "Required, > 0", "Total nominal transaksi dalam satuan Rupiah penuh"],
    ["status", "String", "Enum", "Status pesanan: 'Pending', 'Paid', 'Completed', 'Expired', 'Failed'"],
    ["pickup_timestamp", "Timestamp / ISO", "Required (Future Date)", "Waktu target pengambilan siswa (interval 5 menit, min lead 2m)"],
    ["created_at", "Timestamp / ISO", "Required", "Waktu pembuatan dokumen transaksi dan inisialisasi QRIS"],
    ["expiresAt", "Timestamp / ISO", "TTL 1 Menit (60 detik)", "Tenggat waktu bayar; lewat 1 menit kuota stok dikembalikan"],
    ["paidAt", "Timestamp / ISO", "Optional", "Waktu verifikasi pelunasan dari HTTP POST webhook Midtrans"],
    ["completedAt", "Timestamp / ISO", "Optional", "Waktu penyerahan makanan fisik di loket counter oleh admin dapur"],
    ["stockDeducted", "Boolean", "Default: true", "Flag idempotensi penjamin stok dikembalikan tepat satu kali jika expired"],
    ["latePayment", "Boolean", "Default: false", "Flag penanda pembayaran diterima setelah TTL 1 menit terlampaui"],
    ["latePaymentAt", "Timestamp / ISO", "Optional", "Waktu pencatatan notifikasi webhook yang terlambat masuk"],
    ["latePaymentAmount", "Number (Integer)", "Optional", "Nominal transaksi terlambat untuk kebutuhan audit & refund"],
    ["transactionId", "String", "Optional", "ID referensi transaksi pembayaran dari payment gateway Midtrans"]
]
create_table(orders_headers, orders_rows, [1.2, 1.2, 1.3, 2.5])

# Table 5.3 Settings & Counters
create_caption("Tabel 5.3 Kamus Data Koleksi 'settings' & 'counters'")
sc_headers = ["Koleksi / Dokumen", "Nama Field", "Tipe Data", "Keterangan & Nilai Konfigurasi"]
sc_rows = [
    ["settings / schedule", "days", "Array of String", "Hari kerja aktif kantin: ['Monday', 'Tuesday', ..., 'Friday']"],
    ["settings / schedule", "openTime", "String (HH:mm)", "Jam buka layanan pre-order online (contoh: '07:00')"],
    ["settings / schedule", "closeTime", "String (HH:mm)", "Jam tutup layanan pre-order online (contoh: '14:00')"],
    ["settings / schedule", "slotIntervalMinutes", "Number (Integer)", "Interval slot waktu batch cooking dapur (tetap 5 menit)"],
    ["settings / schedule", "leadTimeMinutes", "Number (Integer)", "Batas minimal waktu pemesanan sebelum jam ambil (2 menit)"],
    ["counters / payment_YYYY-MM-DD", "count", "Number (Integer)", "Atomic daily counter untuk menerbitkan nomor urut tag antrean"]
]
create_table(sc_headers, sc_rows, [1.5, 1.2, 1.1, 2.4])

create_p("5.3 Model Data Dokumen (NoSQL ERD)", style='Heading 2', space_before=8, space_after=4)
create_p(
    "Relasi struktural antar dokumen basis data diilustrasikan pada Gambar 5.1. Pesanan (orders) mengagregasi "
    "daftar item dari menu dengan melakukan reservasi stok secara atomik, divalidasi terhadap jendela operasional "
    "pada settings (jadwal 5 menit dan toleransi lead time 2 menit), serta memperoleh alokasi nomor urut harian "
    "sekuensial dari dokumen counters saat pembayaran berhasil diverifikasi.",
    space_after=6
)
create_image("database_model.png", "Gambar 5.1 Diagram Model Data Dokumen Cloud Firestore (NoSQL ERD)", 5.8)

# ==============================================================================
# BAB 6: CLASS DIAGRAM
# ==============================================================================
create_p("Bab 6 Class Diagram", style='Heading 1', space_before=12, space_after=8)
create_p("6.1 Deskripsi Struktur Komponen Domain", style='Heading 2', space_before=6, space_after=4)
create_p(
    "Class Diagram memodelkan struktur kelas entitas, atribut privat, dan metode bisnis yang dienkapsulasi "
    "pada lapisan front-end React serta backend Cloudflare Functions. Arsitektur berorientasi objek ini "
    "menjamin pemisahan tanggung jawab (Separation of Concerns) secara bersih:",
    space_after=6
)
create_bullet(
    " Merepresentasikan produk makanan atau minuman. Memiliki metode isSoldOut() untuk validasi kuota stok, "
    "formatPriceK() untuk penyajian visual harga ringkas dalam ribuan (contoh: Rp 12k), dan toDisplayRupiah() "
    "untuk formatting mata uang formal.",
    bold_prefix="1. Class MenuItem:"
)
create_bullet(
    " Komponen penyimpan item yang dipilih siswa ke dalam keranjang belanja. Mengenkapsulasi kuantitas dan "
    "menyediakan metode getSubtotal() untuk menghitung perkalian harga dengan jumlah porsi.",
    bold_prefix="2. Class CartItem:"
)
create_bullet(
    " Agregat utama transaksi bisnis. Menyimpan rincian belanja, pickupName, order_tag, pickup_timestamp, "
    "serta status pesanan. Memiliki metode bisnis isExpired() yang mengevaluasi TTL 1 menit, markPaid() yang "
    "mencatat nomor antrean terverifikasi, markCompleted() saat makanan diserahkan, dan flagLatePayment() "
    "untuk menangani anomali webhook yang datang terlambat.",
    bold_prefix="3. Class Order:"
)
create_bullet(
    " Komponen pengatur jadwal kantin. Menyediakan metode isStoreOpen() serta getAvailableHours() dan "
    "getAvailableMinutes(hour) yang membatasi menit pada kelipatan 5 menit dan menonaktifkan slot yang "
    "berjarak kurang dari 2 menit dari jam sistem saat ini.",
    bold_prefix="4. Class ScheduleSetting:"
)
create_bullet(
    " Adapter antarmuka gerbang pembayaran Midtrans. Mengenkapsulasi komunikasi REST API /v2/charge untuk "
    "pembuatan QRIS dinamis 1 menit dan memvalidasi keaslian payload webhook menggunakan kalkulasi SHA-512 signature key.",
    bold_prefix="5. Class MidtransClient:"
)
create_bullet(
    " Komponen logika pengurutan antrean dapur pada dashboard pengelola. Menerapkan algoritma prioritas "
    "berdasarkan pickup_timestamp secara menaik (pesanan dengan target pengambilan terdekat selalu di puncak) "
    "dan menghitung badge urgensi waktu relatif (DUE NOW, IN 5 MINS, IN 15 MINS).",
    bold_prefix="6. Class OrderQueueManager:"
)

create_p("6.2 Diagram Kelas Domain Model", style='Heading 2', space_before=8, space_after=4)
create_p(
    "Struktur detail kelas, visibilitas atribut, tanda tangan metode, dan relasi dependensi/agregasi "
    "antar objek disajikan secara lengkap pada Gambar 6.1.",
    space_after=6
)
create_image("class_diagram.png", "Gambar 6.1 Class Diagram Domain Model Sistem Informasi Pre-Order Kantin", 5.8)

# ==============================================================================
# BAB 7: SEQUENCE DIAGRAM
# ==============================================================================
create_p("Bab 7 Sequence Diagram", style='Heading 1', space_before=12, space_after=8)
create_p(
    "Sequence Diagram memodelkan interaksi pertukaran pesan dinamis secara kronologis antar aktor manusia, "
    "antarmuka web pengguna, fungsi serverless Cloudflare Workers, payment gateway Midtrans, dan basis data Cloud Firestore. "
    "Tiga skenario inti sistem direkayasa balik secara mendalam sebagai berikut:",
    space_after=6
)

create_p("7.1 Sequence Diagram Pre-Order & Inisialisasi QRIS Dinamis (Soft Allocation)", style='Heading 2', space_before=6, space_after=4)
create_p(
    "Alur pemesanan (Gambar 7.1) menerapkan mekanisme Soft Allocation berbasis Firestore Transaction:",
    space_after=4
)
create_bullet("Pelanggan memilih menu, menentukan Jam dan Menit (kelipatan 5m, lead time min 2m), mengisi nama panggilan, dan klik Bayar.")
create_bullet("Browser mengirim HTTP POST /api/checkout ke Cloudflare Worker.")
create_bullet("Worker memulai Firestore Transaction: memeriksa sisa stok menu dari database.")
create_bullet("Jika stok bernilai 0 atau kurang dari jumlah pesanan, worker mengembalikan HTTP 409 Conflict dan proses checkout dibatalkan.")
create_bullet("Jika stok mencukupi, sistem langsung memotong kuota stok secara atomik, mencatat pesanan 'Pending' dengan expiresAt tepat 1 menit (60 detik), dan menandai stockDeducted = true.")
create_bullet("Worker memanggil Midtrans Core API /v2/charge dengan parameter custom_expiry 1 menit.")
create_bullet("Midtrans mengembalikan string/URL QRIS dinamis; worker meneruskannya ke browser pelanggan.")
create_bullet("Layar pelanggan merender kode QRIS dinamis dan langsung memulai hitung mundur timer 1 menit.")
create_image("sequence_checkout.png", "Gambar 7.1 Sequence Diagram Alur Checkout & Pembuatan QRIS Dinamis", 5.8)

create_p("7.2 Sequence Diagram Verifikasi Webhook Midtrans & Penomoran Antrean Harian", style='Heading 2', space_before=8, space_after=4)
create_p(
    "Alur verifikasi pelunasan dan penanganan anomali late payment (Gambar 7.2) dimodelkan sebagai berikut:",
    space_after=4
)
create_bullet("Pelanggan memindai QRIS dan menyelesaikan pembayaran via dompet digital/m-banking.")
create_bullet("Server Midtrans mengirimkan notifikasi HTTP POST webhook ke /api/webhook.")
create_bullet("Worker memvalidasi keaslian signature key SHA-512 (order_id + status_code + gross_amount + server_key).")
create_bullet("Worker mengeksekusi Firestore Transaction untuk membandingkan waktu pelunasan terhadap TTL 1 menit:")
create_bullet("KASUS TEPAT WAKTU (<= 1 Menit): Worker meng-increment atomic counter counters/payment_YYYY-MM-DD, menerbitkan order_tag (contoh: 'Faiz-1'), dan memperbarui status pesanan menjadi 'Paid'. Firestore menyiarkan onSnapshot ke dashboard admin dan layar pelanggan secara instan.")
create_bullet("KASUS TERLAMBAT (> 1 Menit): Jika pesanan telah kedaluwarsa dan stok sudah dikembalikan oleh auto-sweep, pesanan ditandai sebagai 'Expired' dengan flag latePayment = true tanpa memotong stok kembali. Dashboard admin seketika memunculkan Late Payment Alert untuk tindakan dapur/refund manual.")
create_image("sequence_webhook.png", "Gambar 7.2 Sequence Diagram Alur Verifikasi Webhook & Real-Time Sync", 5.8)

create_p("7.3 Sequence Diagram Penyiapan Dapur & Pengambilan Makanan di Counter", style='Heading 2', space_before=8, space_after=4)
create_p(
    "Alur operasional dapur dan penyerahan pesanan (Gambar 7.3) merefleksikan kerja fisik di loket kantin:",
    space_after=4
)
create_bullet("Staf kantin memantau tab Smart Queue yang mengurutkan pesanan Paid berdasarkan urgensi waktu pengambilan terdekat.")
create_bullet("Dapur menyiapkan makanan secara efisien sesuai jadwal interval kelompok 5 menit.")
create_bullet("Siswa tiba di counter saat bel istirahat dan menyebutkan order_tag (contoh: 'Faiz-1').")
create_bullet("Staf memverifikasi rincian pesanan pada kartu antrean, menyerahkan makanan, dan menekan tombol hijau 'Mark Completed'.")
create_bullet("Aplikasi admin memperbarui dokumen pesanan dengan status 'Completed' dan completedAt timestamp.")
create_bullet("Layar pemesan otomatis berganti menampilkan konfirmasi pesanan telah diambil ('Order picked up. Enjoy your meal!').")
create_image("sequence_pickup.png", "Gambar 7.3 Sequence Diagram Alur Penyerahan Makanan di Loket Kantin", 5.8)

# ==============================================================================
# BAB 8: DATA FLOW DIAGRAM (DFD)
# ==============================================================================
create_p("Bab 8 Data Flow Diagram (DFD)", style='Heading 1', space_before=12, space_after=8)
create_p("8.1 DFD Level 0 (Context Diagram)", style='Heading 2', space_before=6, space_after=4)
create_p(
    "Context Diagram (Gambar 8.1) mendefinisikan batas ruang lingkup sistem secara makro dalam berinteraksi "
    "dengan tiga entitas eksternal: Pelanggan, Admin Kantin, dan Midtrans Payment Gateway. Sistem menerima aliran "
    "data transaksi dan jadwal, melakukan penguncian stok dan kalkulasi pembayaran, serta mengembalikan umpan balik "
    "berupa QRIS dinamis, tag antrean terverifikasi, dan antrean prioritas dapur.",
    space_after=6
)
create_image("dfd_level_0.png", "Gambar 8.1 DFD Level 0 (Context Diagram) Sistem Informasi Pre-Order Kantin", 5.6)

create_p("8.2 DFD Level 1 (Dekomposisi Proses)", style='Heading 2', space_before=8, space_after=4)
create_p(
    "DFD Level 1 (Gambar 8.2) mendekomposisi sistem menjadi empat proses fungsional yang didukung oleh empat data store:",
    space_after=4
)
create_bullet(
    " Menerima input katalog, kategori baku (Food, Drink, Other), input harga satuan ribuan 'k' yang otomatis dikalikan 1.000, "
    "serta pengaturan jadwal operasional (Data Store: D1 Menu, D3 Settings).",
    bold_prefix="1. Proses 1.0 (Manajemen Menu & Jadwal):"
)
create_bullet(
    " Menerima keranjang belanja dan jam pengambilan pelanggan, memvalidasi lead time minimal 2 menit dan interval 5 menit, "
    "memotong kuota stok secara atomik, dan menyimpan draft pesanan dengan TTL 1 menit (Data Store: D1 Menu, D2 Orders, D3 Settings).",
    bold_prefix="2. Proses 2.0 (Pemesanan & Soft Allocation Stok):"
)
create_bullet(
    " Meminta penerbitan QRIS dinamis 1 menit ke Midtrans, memvalidasi notifikasi webhook SHA-512, menaikkan counter harian "
    "untuk menghasilkan order_tag unik, dan mengembalikan stok ke D1 jika transaksi kedaluwarsa (Data Store: D1 Menu, D2 Orders, D4 Counters).",
    bold_prefix="3. Proses 3.0 (Pemrosesan Pembayaran & Webhook):"
)
create_bullet(
    " Mengambil pesanan berstatus Paid yang otomatis diurutkan berdasarkan pickup_timestamp, menampilkan label urgensi relatif, "
    "serta mencatat timestamp penyelesaian saat staf mengklik tombol Mark Completed (Data Store: D2 Orders).",
    bold_prefix="4. Proses 4.0 (Pemantauan Smart Queue & Penyerahan):"
)
create_image("dfd_level_1.png", "Gambar 8.2 DFD Level 1 Dekomposisi Fungsional Sistem", 5.8)

# ==============================================================================
# BAB 9: PERANCANGAN ANTAR MUKA (UI DESIGN)
# ==============================================================================
create_p("Bab 9 Perancangan Antar Muka", style='Heading 1', space_before=12, space_after=8)
create_p(
    "Perancangan antarmuka pengguna mengadopsi standar desain web modern berbasis Progressive Web App (PWA). "
    "Sistem dirancang responsif untuk perangkat bergerak (mobile-first), mengedepankan ergonomi visual, rasio kontras "
    "warna hangat khas kuliner kantin (#E06D53, #C85339, #FFF8F1), serta tipografi modern Google Fonts (Inter dan Outfit).",
    space_after=6
)

create_p("9.1 Antarmuka Pelanggan (Customer Web Portal)", style='Heading 2', space_before=6, space_after=4)
create_p(
    "Portal pemesanan pelanggan dapat diakses publik tanpa login di https://kantin-lina.pages.dev. "
    "Fitur dan tata letak halaman mencakup:",
    space_after=4
)

# Gambar 9.1 Home
create_bullet(
    " Memuat indikator status operasional live (Buka/Tutup), banner 3 langkah mudah pemesanan ('Pilih Menu', "
    "'Tentukan Jam Ambil', 'Scan & Ambil'), jadwal jam operasional kantin, serta 14 pasal Syarat & Ketentuan (Terms and Conditions) "
    "lengkap dengan kontak pengaduan WhatsApp (081328347306).",
    bold_prefix="1. Halaman Beranda (Home):"
)
create_image("ui_customer_home.png", "Gambar 9.1 Halaman Beranda Pelanggan (Status Buka, Alur 3 Langkah, dan Syarat & Ketentuan)", 5.6)

# Gambar 9.2 Menu
create_bullet(
    " Menampilkan etalase makanan dan minuman yang dikelompokkan ke dalam 3 kategori baku: Food, Drink, dan Other. "
    "Setiap menu ditampilkan dengan foto berasio proporsional persegi 1:1, format nominal disederhanakan dalam satuan ribuan "
    "('k', contoh: Rp 12k), tombol penambah porsi (+/-), serta indikator badge jika stok habis.",
    bold_prefix="2. Halaman Katalog Menu (Menu):"
)
create_image("ui_customer_menu.png", "Gambar 9.2 Halaman Katalog Menu (Kategori Baku Food/Drink/Other, Foto 1:1, dan Format Harga k)", 5.6)

# Gambar 9.3 Cart & Time Picker
create_bullet(
    " Menampilkan ringkasan pesanan dan antarmuka seleksi waktu pengambilan baru yang memisahkan pilihan Jam (Hour) dan "
    "Menit (Minute). Pilihan menit dibatasi pada kelipatan 5 menit (00, 05, 10, 15, ...) untuk memfasilitasi batch cooking dapur. "
    "Sistem menerapkan validasi dinamis Minimum Lead Time 2 Menit yang menonaktifkan jam dan menit yang telah terlewat. "
    "Pelanggan menginput nama pemesan (pickup name) tanpa registrasi akun sebelum menekan tombol checkout.",
    bold_prefix="3. Halaman Keranjang & Time Picker Baru (Cart):"
)
create_image("ui_customer_cart.png", "Gambar 9.3 Halaman Keranjang Belanja (Seleksi Waktu 5 Menit Batch & Form Nama Pemesan)", 5.6)

# Gambar 9.4 Payment
create_bullet(
    " Menampilkan kode QRIS dinamis yang diterbitkan Midtrans Core API, disertai countdown timer 1 menit (60 detik). "
    "Halaman ini memuat informasi nominal pembayaran, identitas pemesan, dan tag antrean (order_tag). Setelah pembayaran berhasil, "
    "layar otomatis bertransisi menampilkan status lunas tanpa membeberkan nomor antrean numerik mentah guna menghindari kerumunan.",
    bold_prefix="4. Halaman Pembayaran QRIS Dinamis & Timer 1 Menit (Payment):"
)
create_image("ui_customer_payment.png", "Gambar 9.4 Halaman Pembayaran QRIS Dinamis (Countdown Timer 1 Menit & Ringkasan Antrean)", 4.6)

create_p("9.2 Antarmuka Admin Kantin (Admin Portal)", style='Heading 2', space_before=8, space_after=4)
create_p(
    "Portal pengelola kantin diakses melalui https://admin-kantin-lina.pages.dev dan dilindungi oleh sistem "
    "autentikasi kredensial Firebase Authentication. Antarmuka admin terbagi ke dalam tiga modul operasional utama:",
    space_after=4
)

# Gambar 9.5 Login Admin
create_bullet(
    " Form autentikasi email dan kata sandi terenkripsi untuk mengamankan hak akses pengelola dan kasir dapur.",
    bold_prefix="1. Halaman Login Kredensial Admin:"
)
create_image("ui_admin_login.png", "Gambar 9.5 Halaman Login Kredensial Admin Kantin Lina", 4.8)

# Gambar 9.6 Smart Queue
create_bullet(
    " Menampilkan antrean pesanan aktif yang secara cerdas diurutkan berdasarkan batas waktu pengambilan (pickup_timestamp) "
    "paling mendesak. Dilengkapi label urgensi waktu relatif dinamis (OVERDUE, DUE NOW, IN 5 MINS, IN 15 MINS) yang di-refresh "
    "setiap 15 detik. Setiap kartu memuat order_tag berukuran besar (contoh: 'Faiz-1'), rincian porsi menu, total bayar, dan tombol "
    "hijau 'Mark as Completed'. Modul ini juga dilengkapi banner khusus 'Late Payment Alert' jika ada transaksi yang dibayar setelah TTL 1 menit.",
    bold_prefix="2. Tab Smart Queue (Order Monitor):"
)
create_image("ui_admin_smart_queue.png", "Gambar 9.6 Tab Smart Queue (Antrean Prioritas Urut Waktu Pengambilan & Late Payment Alert)", 5.8)

# Gambar 9.7 Menu Management
create_bullet(
    " Form input dan pembaruan katalog menu yang mewajibkan seleksi 3 kategori baku (Food, Drink, Other), input kuota stok harian, "
    "dan fitur kemudahan penulisan harga dalam ribuan 'k' (cukup ketik '12' untuk Rp 12.000). Tabel di bawahnya menampilkan status kuota "
    "stok live yang tersisa dari hasil reservasi pelanggan.",
    bold_prefix="3. Tab Menu & Stock Management:"
)
create_image("ui_admin_menu.png", "Gambar 9.7 Tab Menu & Stock Management (Kategori Baku, Input Harga Ribuan k, dan Stok Live)", 5.8)

# Gambar 9.8 Schedule Management
create_bullet(
    " Form konfigurasi parameter operasional kantin yang memuat opsi hari buka aktif dari Senin hingga Minggu, pengaturan jam "
    "buka dan tutup pemesanan, serta penegasan interval batch cooking 5 menit dan minimum lead time 2 menit.",
    bold_prefix="4. Tab Schedule Management:"
)
create_image("ui_admin_schedule.png", "Gambar 9.8 Tab Schedule Management (Pengaturan Hari Kerja, Jam Buka/Tutup, dan Interval Slot)", 5.4)

# Save the updated document
doc.save(doc_path)
print("SUCCESS: Report.docx successfully updated from Bab 9 to Bab 5!")
