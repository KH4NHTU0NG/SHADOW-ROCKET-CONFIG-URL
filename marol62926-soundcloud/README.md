# Marol62926 SoundCloud (`soundcloud.js`)

- **URL gốc:** `https://raw.githubusercontent.com/Marol62926/MarScrpt/main/soundcloud.js`
- **Tệp trong thư mục:** [`soundcloud.js`](./soundcloud.js) (`73 dòng`, `1,097 B`).

## 1. Công dụng
Chỉnh sửa JSON phản hồi hồ sơ/cấu hình tài khoản từ API SoundCloud trên tầng client để hiển thị gói `SoundCloud Go+` và thay đổi trạng thái 7 feature flags cục bộ (mục tiêu tham chiếu qua tìm kiếm: `api-mobile.soundcloud.com`, file gốc không đính kèm header cấu hình URL pattern).

## 2. Cơ chế hoạt động
1. **Selective JSON Property Patching (`L1-L2`):** Đọc `$response.body` rồi gọi `JSON.parse(body)`. Khác với script thay thế toàn phần như Grammarly, script giữ nguyên các trường metadata tài khoản sẵn có và chỉ ghi đè 2 nhánh: `obj.plan` và `obj.features`.
2. **Giả lập gói `SoundCloud Go+` (`obj.plan`, `L4-L16`):**
   - Thiết lập `vendor: "apple"`, `id: "high_tier"`, `plan_id: "go-plus"`, `plan_name: "SoundCloud Go+"`, `manageable: true`, `plan_upsells: []`, `upsells: []`.
3. **Điều chỉnh 7 Feature Flags (`obj.features`, `L18-L70`):**
   - **Bật (`enabled: true`):** `offline_sync` (`["mid_tier", "high_tier"]`), `no_audio_ads` (`["mid_tier", "high_tier"]`), `hq_audio` (`["high_tier"]`), `system_playlist_in_library` (`[]`), `new_home` (`[]`).
   - **Tắt (`enabled: false`):** `ads_krux` (`[]`) và `spotlight` (`[]`).
4. **Đầu ra (`L72-L73`):** Lưu ý tác giả dùng toán tử dấu phẩy `,` sau `obj.plan` (`L16`) và `obj.features` (`L70`) trước khi gọi `JSON.stringify(obj)` và `$done({body})`.

## 3. Ranh giới hiệu lực & Rủi ro
- **Giới hạn backend:** Có thể ẩn quảng cáo phía client và đổi giao diện sang Go+, nhưng quyền cấp URL audio `hq_audio` hoặc giải mã nhạc offline vẫn do máy chủ SoundCloud kiểm tra theo token/account trước khi phát hành file media.
- **Thiếu kiểm tra lỗi (`L1-L2`, `L16`, `L70`):** Không kiểm tra HTTP status code, không bọc `try/catch` quanh `JSON.parse(body)`, và nếu phản hồi trả về JSON `null` hoặc primitive (`typeof obj !== 'object'`), lệnh gán `obj.plan = ...` tại `L4` (nối bằng toán tử dấu phẩy `,` tới `L70`) sẽ ném `TypeError`. Ngoài ra ghi đè nguyên mảng `obj.features` (`L18-L70`) sẽ làm mất các feature flag khác từ server ngoài 7 mục được khai báo cứng.
