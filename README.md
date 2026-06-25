# Hệ thống Quản lý Công việc EMR

Đây là một ứng dụng web full-stack dùng để quản lý công việc, đề xuất, tài liệu, báo cáo và thông báo trong doanh nghiệp. Dự án gồm hai phần chính:

- Frontend: giao diện người dùng xây dựng bằng React + Vite
- Backend: API xây dựng bằng Node.js + Express + SQL Server

## Tính năng chính

- Đăng nhập, đăng ký, quên mật khẩu và đặt lại mật khẩu
- Phân quyền người dùng theo vai trò (Admin, nhân viên, trưởng phòng, ...)
- Quản lý phòng ban, vị trí, nhân viên
- Quản lý công việc, đề xuất, báo cáo công việc
- Quản lý tài liệu, chữ ký và upload file
- Hệ thống thông báo và cron job gửi email

## Công nghệ sử dụng

### Frontend
- React
- Vite
- React Router DOM
- Ant Design
- Axios
- React PDF

### Backend
- Node.js
- Express.js
- SQL Server (mssql)
- JWT Authentication
- Multer (upload file)
- Nodemailer
- Helmet, CORS, Rate Limiter

## Cấu trúc thư mục

```bash
DA_TN/
├── Backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   ├── package.json
│   └── server.js
├── Frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Yêu cầu hệ thống

- Node.js >= 18
- npm hoặc yarn
- SQL Server
- Git

## Cài đặt

### 1. Clone dự án

```bash
git clone <repository-url>
cd DA_TN
```

### 2. Cài đặt Backend

```bash
cd Backend
npm install
```

### 3. Cài đặt Frontend

```bash
cd ../Frontend
npm install
```

## Cấu hình môi trường

Backend đã có file `.env` mẫu với các biến cần thiết như:

```env
PORT=3000
DB_SERVER=...
DB_DATABASE=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=...
EMAIL_HOST=...
EMAIL_PORT=...
EMAIL_USER=...
EMAIL_PASS=...
```

Hãy điều chỉnh các giá trị này phù hợp với môi trường SQL Server và email của bạn.

## Chạy dự án

### Chạy Backend

```bash
cd Backend
npm run dev
```

Backend sẽ chạy tại:
- http://localhost:3000

### Chạy Frontend

```bash
cd Frontend
npm run dev
```

Frontend sẽ chạy tại:
- http://localhost:5173

## API chính

Backend cung cấp các API theo nhóm chức năng như:

- Auth: `/api/auths`
- Departments: `/api/departments`
- Positions: `/api/positions`
- Employees: `/api/employees`
- Tasks: `/api/tasks`
- Proposals: `/api/proposals`
- Documents: `/api/documents`
- Notifications: `/api/notifications`
- Uploads: `/api/uploads`

## Ghi chú

- Đảm bảo SQL Server đang chạy trước khi khởi động backend.
- Nếu kết nối database thất bại, hãy kiểm tra lại thông tin trong file `.env`.
- Một số chức năng upload hoặc gửi email có thể cần cấu hình SMTP hợp lệ.

## Tác giả

Dự án được phát triển trong khuôn khổ học tập/đồ án.
