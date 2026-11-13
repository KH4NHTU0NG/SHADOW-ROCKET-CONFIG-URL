# yqc007 Grammarly Premium (`GrammarlyPremiumCrack.js`)

- **URL gốc (trùng nhau ở URL #2 và #7):** `https://raw.githubusercontent.com/yqc007/QuantumultX/master/GrammarlyPremiumCrack.js`
- **Tác giả / Phiên bản trong header:** `Hausd0rff` (`2022-07-16`, nhắm Grammarly `v2.2.0`).
- **Tệp trong thư mục:** [`GrammarlyPremiumCrack.js`](./GrammarlyPremiumCrack.js) (`339 dòng`, `7,943 B`).

## 1. Cấu hình MITM mục tiêu (theo header script)
- `[mitm]` `hostname = subscription.grammarly.com`
- `[rewrite_local]` khớp `^https?:\/\/subscription\.grammarly\.com\/api\/v1\/subscription$` (`script-response-body`).

## 2. Cơ chế hoạt động
1. **Giải mã đầu vào dư thừa (`L23`):** Chạy `var objc = JSON.parse(body);` (không bọc `try/catch` và không kiểm tra HTTP status code).
2. **Thay thế toàn phần bằng JSON tĩnh (`L25-L334`):** Ngay sau dòng parse, biến `objc` bị ghi đè hoàn toàn bởi một object tĩnh cố định chứa:
   - `isPremium: true`, `nextPayDate: "Oct 28, 2999 4:56:52 AM"`.
   - `currentPlan.id: 1005` (gói `Annual` giá `144.0 USD`), danh sách `plans`, `institutionPlans`, `institutionEduPlans`, `institutionDynamicPlans`, và dữ liệu thẻ Visa `creditCard` giả lập.
3. **Trả phản hồi:** Tuần tự hóa bằng `JSON.stringify(objc)` rồi trả về cho app qua `$done`. Không dùng storage, không gửi request mạng ngoài.

## 3. Ranh giới hiệu lực & Rủi ro
- **Giới hạn backend:** Việc thay đổi `/api/v1/subscription` chỉ làm thay đổi hiển thị trạng thái gói trên giao diện client. Các tính năng ngữ pháp nâng cao, kiểm tra đạo văn và AI của Grammarly đều xử lý và xác thực session/token trực tiếp trên máy chủ Grammarly, nên tài khoản miễn phí không được cấp quyền sử dụng các endpoint server-side trả phí.
- **Lỗi runtime & Lệch schema (`L23-L334`):** Nếu máy chủ trả về phản hồi không phải JSON hợp lệ (ví dụ HTML lỗi mạng hoặc body rỗng), `JSON.parse(body)` tại `L23` sẽ ném exception không được bắt dù kết quả parse sau đó cũng bị ghi đè hoàn toàn. Việc thay thế cứng toàn bộ JSON (`2022-07-16`) khiến phản hồi mất toàn bộ metadata tài khoản thực từ server (như `institutionPlans` thực tế hoặc trường mới ở các phiên bản app sau `v2.2.0`).
