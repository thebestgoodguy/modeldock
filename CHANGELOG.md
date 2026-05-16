# Değişiklik Günlüğü (Changelog)

Bu dosya, ModelDock projesinde yapılan tüm dikkate değer değişiklikleri, yeni özellikleri ve hata düzeltmelerini kaydeder.

Proje, [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standartlarına uymayı hedefler.

---

## [1.0.0] - 2026-05-16

### 🚀 Yeni Özellikler & İyileştirmeler (Added & Improved)

* **İndirilen Boyut Takibi (`downloadedSize`):**
  * `tqdm` log akışından anlık olarak indirilen veri miktarı ve toplam dosya boyutu (örn. `11.0M/4.48G`) ayrıştırılarak Node.js API yanıtlarına ve `DownloadItem` TypeScript arayüzüne eklendi.
  * Arayüzdeki (`Canvas.tsx`) indirme tablosunda ve sağ sidebarda (`SidebarRight.tsx`), anlık indirme hızının (`881 KB/s`) hemen soluna indirilen toplam miktar eklendi. Bu sayede indirme hızının, indirilen dosya boyutu olarak algılanması (UX karmaşası) tamamen çözüldü.

* **Temiz Başlangıç & Oturum Yönetimi (Clean Startup):**
  * Node.js arka plan sunucusu (`server.js`) ilk açılışta SQLite veritabanını denetleyerek durumu `downloading`, `starting` veya `queued` olan tüm eski kayıtları otomatik olarak `paused` (Duraklatıldı) konumuna getirecek şekilde güncellendi.
  * Uygulama kapatılıp açıldığında önceki oturumdan kalan indirmelerin sidebarda donuk/zombi bir şekilde çalışmaya çalışması engellendi. Kullanıcılar diledikleri zaman **Play (Devam Et / Resume)** butonuna basarak indirmeyi sorunsuzca sürdürebilirler.

* **Otomatik Python Yolu Tespiti (`getPythonExecutable`):**
  * Paketlenen Electron uygulamasının sistemdeki en doğru Python yorumlayıcısını bulabilmesi için otomatik tarama mekanizması eklendi.
  * Sistemdeki standart kurulumlar (`C:/Program Files/Python311/python.exe`), Scoop ortamları (`scoop/apps/python313/current/python.exe`) ve yerel AppData dizinleri fiziksel olarak (`fs.existsSync`) taranarak `huggingface_hub` bağımlılıklarının bulunduğu en doğru yol mutlak (absolute) olarak eşleştirildi.

* **Gelişmiş İndirme Logları:**
  * Seçilen Python yorumlayıcısının yolu ve çalıştırılan indirme betiğinin (`downloader.py`) konumu, arayüzdeki Terminal (Log) penceresinden izlenebilmesi için log akışına eklendi.

---

### 🐛 Hata Düzeltmeleri (Fixed)

* **Paketlenmiş Electron ASAR Çökmesi (`spawn ENOENT` Hatası):**
  * Kurulum yapılan paketli Electron uygulamasında `server.js` dosyası sanal `app.asar` arşivine gömüldüğü için, `spawn` çağrısında kullanılan `cwd: __dirname` parametresinin Windows kernel'i tarafından bir klasör olarak tanınmaması ve sürecin anında `failed` durumuna düşmesi sorunu çözüldü.
  * `cwd` parametresi `path.dirname(scriptPath)` olarak güncellenerek, sanal `.asar` arşivi yerine `downloader.py` dosyasının kopyalandığı gerçek fiziksel klasör (`resources`) çalışma dizini olarak ayarlandı.

* **Arka Plan İndirme İlerlemesi (Background Progress Bar Fix):**
  * Node.js `spawn` ile başlatılan Python alt sürecinin, ortamı bir terminal (TTY) olarak görmediği için `tqdm` ilerleme çubuğunu sessize alması (disable) ve arayüze log göndermemesi sorunu çözüldü.
  * `downloader.py` ve `server.js` içerisine `TQDM_POSITION: "-1"` ve `HF_HUB_DISABLE_PROGRESS_BARS: "0"` çevre değişkenleri eklenerek, arka plandaki indirmelerin arayüze anlık yüzde (`%`), hız ve kalan süre iletmesi garanti altına alındı.

* **Editör Analiz Uyarısı (IDE Linting):**
  * Editörün (Pylance/Pyright) proje için seçtiği Scoop tabanlı Python 3.13 ortamına `huggingface_hub` ve bağımlılıkları kurularak "Cannot find module" analiz hatası giderildi.
