# Thiệp cưới Duy & Ánh

Website thiệp cưới của Lương Văn Duy và Nguyễn Thị Ánh, xây dựng bằng **Astro, TypeScript và CSS**, xuất thành website tĩnh. Giao diện gồm bìa mở hai cánh, thông tin hôn lễ, album ảnh, lời chúc và lời cảm ơn.

## Yêu cầu

- Node.js **22.12.0 trở lên** (khuyến nghị Node.js 24).
- npm đi kèm Node.js.

## Chạy trên máy

```sh
git clone https://github.com/LuongVanDuy/duyanhwedding.git
cd duyanhwedding
npm ci
```

Sao chép `.env.example` thành `.env`:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```sh
# macOS / Linux
cp .env.example .env
```

Sau đó chạy:

```sh
npm run dev
```

Mở địa chỉ terminal thông báo, mặc định **http://localhost:4321/**. Nếu cổng đã được dùng, đọc địa chỉ thực tế trong terminal.

## Cấu hình lời chúc

Điền URL Google Apps Script Web App đã triển khai vào `.env`:

```dotenv
PUBLIC_WISHES_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Đây là URL công khai được nhúng vào frontend, không dùng để chứa mật khẩu hay token bí mật. Khi để trống, website vẫn chạy nhưng chưa thể tải hoặc gửi lời chúc. Sau khi đổi biến môi trường, khởi động lại dev server hoặc build lại.

Mã tích hợp nằm tại `integrations/google-sheets/`:

1. Tạo Google Sheet riêng, thay `SPREADSHEET_ID` và `SHEET_ID` trong `Code.gs`.
2. Tạo sáu cột theo đúng thứ tự: `Mã`, `Thời gian`, `Tên`, `Lời chúc`, `Hiển thị`, `Ghi chú`. Cột `Hiển thị` dùng checkbox.
3. Tạo dự án Google Apps Script, thêm mã `Code.gs` và cấu hình `appsscript.json`.
4. Triển khai dưới dạng Web App, chạy bằng tài khoản chủ sở hữu, cho phép khách truy cập. Chủ sở hữu cần cấp quyền Google Sheets khi triển khai.
5. Sao chép URL kết thúc bằng `/exec` vào `.env`. Bật checkbox `Hiển thị` để lời chúc xuất hiện trên thiệp.

Frontend chỉ gọi API đọc và gửi lời chúc; việc sửa, ẩn hoặc xóa thực hiện trong Google Sheet.

## Kiểm tra và build

```sh
npm run check
npm run build
npm run preview
```

- `check`: kiểm tra Astro và TypeScript.
- `build`: kiểm tra source, tối ưu ảnh và xuất website vào `dist/`. Bước cuối loại các JPG gốc được sinh ra nhưng không được dùng trong bản build.
- `preview`: xem bản build tại địa chỉ terminal thông báo; chỉ dùng để kiểm tra trên máy.
- `assets:brand`: tạo lại favicon và ảnh chia sẻ từ huy hiệu D & A.

Để đưa lên hosting tĩnh, upload **nội dung thư mục `dist/`** sau khi build. Không cần chạy Node.js trên hosting. Cấu hình Docker/Caddy tham khảo nằm trong `deploy/`; thư mục này giả định bản build được đặt tại `deploy/site/current/` và tên miền đã trỏ đến máy chủ.

## Chỉnh sửa nội dung

| Vị trí | Nội dung |
| --- | --- |
| `src/data/site.json` | Tên miền, tiêu đề, mô tả và ảnh chia sẻ |
| `src/data/wedding.json` | Tên hai bạn, gia đình và lịch hôn lễ |
| `src/data/wedding-locations.json` | Địa điểm và link Google Maps |
| `src/data/wedding-album.json` | Nội dung và ảnh hiển thị trong album |
| `src/data/wedding-rsvp.json` | Tiêu đề và nội dung góc lời chúc |
| `src/data/wedding-thanks.json` | Lời cảm ơn |
| `src/assets/wedding/edited/` | Ảnh cưới đã chỉnh sửa |
| `src/lib/wedding-gallery.ts` | Nhóm ảnh, thứ tự và mô tả trong popup album |
| `src/components/` | Các section của thiệp |
| `src/styles/`, `src/scripts/` | Giao diện và tương tác |
| `public/` | Nhạc nền, favicon và tài nguyên tĩnh |

Giữ nguyên tên file khi thay ảnh có sẵn rồi build lại. Khi thêm ảnh mới, cập nhật nhóm ảnh và mô tả trong `src/lib/wedding-gallery.ts`. Astro dùng Sharp để tạo WebP theo nhiều kích thước; không cần đưa ảnh gốc vào `public/`.

Đổi tên miền trong `src/data/site.json` và cập nhật `public/robots.txt`, `public/site.webmanifest`, `deploy/Caddyfile` tương ứng trước khi build cho tên miền khác.

## Link mời có tên khách

Thêm tham số `to` vào URL, ví dụ `/?to=Anh%20Minh`. Với tên có dấu hoặc ký tự đặc biệt, tạo link bằng:

```js
const link = `${window.location.origin}/?to=${encodeURIComponent('Anh Minh & Chị Lan')}`;
```

Khi không có tên, thiệp dùng tên khách mặc định trong dữ liệu. Ảnh và tiêu đề chia sẻ dùng chung vì website xuất tĩnh.

## Phạm vi repository

Repository chứa source, ảnh đang sử dụng, tài nguyên tĩnh và cấu hình chạy/build. Các thư mục `docs/`, `.runtime/`, công cụ tunnel, trạng thái AI/editor, `.env`, `node_modules/`, `dist/`, ảnh gốc đối chiếu và `README.old.md` được giữ ngoài Git.

Ảnh cưới, nhạc và nội dung cá nhân thuộc về chủ sở hữu tương ứng; repository không cấp quyền tái sử dụng các tài nguyên này.
