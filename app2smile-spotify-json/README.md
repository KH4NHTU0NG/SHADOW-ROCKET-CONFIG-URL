# app2smile Spotify JSON Request Rewrite (`spotify-json.js`)

- **URL gốc:** `https://raw.githubusercontent.com/app2smile/rules/master/js/spotify-json.js`
- **Module tham chiếu:** `https://raw.githubusercontent.com/app2smile/rules/master/module/spotify.module`
- **Tệp trong thư mục:** [`spotify-json.js`](./spotify-json.js) (`15 dòng`, `381 B`).

## 1. Công dụng
Dù đặt tên là `spotify-json.js`, script **không xử lý JSON** và chạy ở pha `http-request` (với `requires-body=0` trong `spotify.module`). Đây là tầng bổ trợ request phối hợp cùng [`spotify-proto.js`](../app2smile-spotify-proto/README.md).

## 2. Cơ chế hoạt động (`L1-L15`)
1. **Điểm chặn (theo `spotify.module`):** Khớp request tới `^https:\/\/(spclient\.wg\.spotify\.com|.*-spclient\.spotify\.com(:443)?)\/(artistview\/v1\/artist|album-entity-view\/v2\/album)\/`.
2. **Chuẩn hóa host & đổi nền tảng (`L2-L12`):**
   - Nếu URL chứa `'com:443'`, xóa cổng tường minh (`url.replace(/com:443/, 'com')`).
   - Nếu URL chứa `'platform=iphone'`, đổi thành `'platform=ipad'` (`url.replace(/platform=iphone/, 'platform=ipad')`); nếu không thì log `'无需处理'`.
3. **Trả URL mới (`L13-L15`):** Gọi `$done({ url })` để proxy gửi request mang query `platform=ipad` lên Spotify.

## 3. Lý do kỹ thuật
Trên tài khoản Spotify miễn phí, backend trả về phản hồi xem nghệ sĩ/album (`artistview`/`album-entity-view`) khác nhau tùy tham số `platform`: bản iPhone Free bị giới hạn ở chế độ preview/phát ngẫu nhiên, trong khi bản iPad cho phép hiển thị danh sách bài hát đầy đủ hơn trên client. Script tận dụng chính sự khác biệt hành vi phía server theo query string thay vì phải dịch ngược và vá response view.
