# SHADOW-ROCKET-CONFIG-URL

Kho lưu trữ và tài liệu **phân tích kỹ thuật tĩnh (Reverse Engineering)** đối với bộ 9 URL script MITM thường dùng trên Shadowrocket / Surge / Loon / Quantumult X (gồm **8 script duy nhất**, 1 URL trùng lặp và 1 URL trả về `404`).

> **Mục đích lưu trữ:** Tài liệu hóa cấu trúc mã nguồn, cơ chế xử lý JSON / Protobuf nhị phân, lỗi bảo mật và ranh giới thực tế giữa **can thiệp hiển thị phía client (client-side spoofing)** và **xác thực quyền phía máy chủ (server-side verification)** nhằm phục vụ học tập và phân tích kỹ thuật. Không tạo hay đóng gói module crack/bypass mới.

---

## 1. Danh Sách Thư Mục & Script

| # (URL gốc) | Thư mục | Tác giả / Nguồn | Ứng dụng & Endpoint mục tiêu | Kiểu xử lý | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | [maasea-youtube-response](./maasea-youtube-response/README.md) | `Maasea/sgmodule` | YouTube & YT Music (`youtubei.googleapis.com/youtubei/v1/*`) | `http-response` (**Protobuf** `@protobuf-ts/runtime` v1.0.8) | `200 OK` |
| 2, 7 *(trùng)* | [yqc007-grammarly-premium](./yqc007-grammarly-premium/README.md) | `yqc007/QuantumultX` (`Hausd0rff`) | Grammarly (`subscription.grammarly.com/api/v1/subscription`) | `http-response` (**JSON** tĩnh toàn phần) | `200 OK` |
| 3 | [marol62926-soundcloud](./marol62926-soundcloud/README.md) | `Marol62926/MarScrpt` | SoundCloud iOS (*api-mobile.soundcloud.com — suy luận từ search*) | `http-response` (**JSON** chọn lọc) | `200 OK` |
| 4 | [duyvinh09-youtube-response](./duyvinh09-youtube-response/README.md) | `duyvinh09/Module_IOS` | YouTube (không truy cập được mã nguồn) | `—` | **`404: Not Found`** |
| 5 | [vuong2023-locket-ohoang7](./vuong2023-locket-ohoang7/README.md) | `vuong2023/shad` (`Ohoang7`) | Locket / RevenueCat (`api.revenuecat.com/.+/(receipts\|subscribers/...)`) | `http-response` (**JSON**) | `200 OK` |
| 6 | [app2smile-spotify-proto](./app2smile-spotify-proto/README.md) | `app2smile/rules` | Spotify (`spclient*/bootstrap/v1/bootstrap`, `user-customization-service/v1/customize`) | `http-response` (**Protobuf** `protobufjs` `light`) | `200 OK` |
| 8 | [app2smile-spotify-json](./app2smile-spotify-json/README.md) | `app2smile/rules` | Spotify (`spclient*/(artistview/v1/artist\|album-entity-view/v2/album)/`) | `http-request` (**URL Rewrite**) | `200 OK` |
| 9 | [app2smile-spotify-lyric](./app2smile-spotify-lyric/README.md) | `app2smile/rules` | Spotify (`spclient.wg.spotify.com/color-lyrics/v2/track/`) | `http-response` (**Protobuf** + Baidu API) | `200 OK` |

---

## 2. Kiến Trúc Tổng Quan Cơ Chế MITM Proxy

```mermaid
flowchart LR
    A["Client App (iOS/macOS)"] -->|"1. HTTPS Request"| P["MITM Proxy (Shadowrocket / Surge / Loon / QX)"]
    P -->|"2a. Request Rewrite (spotify-json, deleteHeader)"| S["Backend API Server"]
    S -->|"2b. JSON / Binary Protobuf Response"| P
    P -->|"3a. Static/Patch JSON (Grammarly, SoundCloud, Locket)"| A
    P -->|"3b. Decode + Patch Protobuf (YouTube, spotify-proto)"| A
    P -->|"3c. Decode Protobuf -> Baidu Translate API (spotify-lyric)"| B["Baidu Translate API"]
    B -->|"4. trans_result -> Rebuild Protobuf"| P
```

### Nguyên lý kỹ thuật cốt lõi
1. **Hai pha chặn (`http-request` -> `http-response`):** Pha request dùng để đổi tham số định danh (như `platform=iphone` -> `platform=ipad` ở `spotify-json.js`) hoặc xóa header cache như `if-none-match` (`spotify.module`) để ngăn backend trả HTTP `304 Not Modified` (không có body). Pha response dùng để đọc/ghi JSON (`JSON.parse`) hoặc binary Protobuf (`binary-body-mode=1` truyền `Uint8Array`, Quantumult X truyền `ArrayBuffer` qua `$response.bodyBytes`).
2. **Partial Protobuf Patching vs `protobufjs` `light`:**
   - `@protobuf-ts/runtime` (`maasea` YouTube v1.0.8, `spotify-lyric` v2.9.0) bật `UnknownFieldHandler` (`readUnknownField: true`) để giữ nguyên toàn bộ field nhị phân chưa khai báo trong schema và ghi lại khi gọi `toBinary()`.
   - `protobufjs` `light` (`spotify-proto.js`) dùng JSON descriptor `spotifyJson` (20 message) giải mã, sửa 37 thuộc tính trong `accountAttributes` và đóng gói lại bằng `.encode(...).finish()`.
3. **Ranh giới thực tế (Client-side vs Server-side):** Các cờ giao diện, quảng cáo nhúng trong feed/player đã nhận, trình phát PiP/nền YouTube và trạng thái gói hiển thị trên client bị ảnh hưởng bởi các phản hồi này; ngược lại, tính năng kiểm tra token/quyền trực tiếp trên backend (như AI/ngữ pháp server Grammarly, stream `Very High` của Spotify, DRM/offline phía server) không bị qua mặt.

---

## 3. Tài Liệu Tham Chiếu Gốc
- [1] Maasea YouTube Response & Module: `https://raw.githubusercontent.com/Maasea/sgmodule/master/Script/Youtube/youtube.response.js` | `https://raw.githubusercontent.com/Maasea/sgmodule/master/YouTube.Enhance.sgmodule`
- [2] yqc007 Grammarly: `https://raw.githubusercontent.com/yqc007/QuantumultX/master/GrammarlyPremiumCrack.js`
- [3] Marol62926 SoundCloud: `https://raw.githubusercontent.com/Marol62926/MarScrpt/main/soundcloud.js`
- [4] duyvinh09 Module_IOS (HTTP 404): `https://raw.githubusercontent.com/duyvinh09/Module_IOS/refs/heads/main/js/youtube.response.js`
- [5] vuong2023 Locket & Module: `https://raw.githubusercontent.com/vuong2023/shad/main/js/Locket_Ohoang7.js` | `https://raw.githubusercontent.com/vuong2023/shad/main/modules/Locket_ohb.sgmodule`
- [6] app2smile Spotify Proto & Module: `https://raw.githubusercontent.com/app2smile/rules/master/js/spotify-proto.js` | `https://raw.githubusercontent.com/app2smile/rules/master/module/spotify.module`
- [7] app2smile Spotify JSON Request: `https://raw.githubusercontent.com/app2smile/rules/master/js/spotify-json.js`
- [8] app2smile Spotify Lyric Translation: `https://raw.githubusercontent.com/app2smile/rules/master/js/spotify-lyric.js`
