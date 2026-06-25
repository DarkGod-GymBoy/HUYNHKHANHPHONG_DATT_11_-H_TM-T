// 1. KHỞI TẠO BIẾN MÔI TRƯỜNG & THƯ VIỆN BÊN NGOÀI
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet"); 
const rateLimit = require("express-rate-limit");
const cron = require("node-cron"); 
const path = require("path");

// 2. IMPORT CÁC MODULE BÊN TRONG DỰ ÁN
const emailService = require("./services/email.service");
const { connectDB } = require("./config/database");
const authRoutes = require("./routes/auth.route.js");
const departmentRoutes = require("./routes/department.route.js");
const positionRoutes = require("./routes/position.route.js");
const employeeRoutes = require("./routes/employee.route.js");
const taskRoutes = require("./routes/task.route.js");
const propposalRoutes = require("./routes/proposal.route.js");
const documentRoutes = require("./routes/document.route.js");
const taskReportRoutes = require("./routes/task_report.route.js");
const signupRoutes = require("./routes/signature.route.js");
const dashboardRoutes = require("./routes/dashboard.route.js");
const uploadRoutes = require("./routes/upload.router.js");
const roleRoutes = require("./routes/role.route.js"); 
const taskCommentRoutes = require("./routes/task_comment.route.js");
const notificationRoutes = require("./routes/notification.routes.js");

const app = express();

// 3. CẤU HÌNH MIDDLEWARE
// BƯỚC 1: Mở cổng CORS ĐẦU TIÊN
app.use(cors());

// BƯỚC 2: Bật khiên bảo mật Helmet (🌟 ĐÃ FIX: Nới lỏng chính sách cho phép Frontend load hình ảnh)
app.use(helmet({
    crossOriginResourcePolicy: false,// Tắt chặn tài nguyên chéo, cho phép load ảnh qua lại giữa 2 cổng
    contentSecurityPolicy: false, 
    xFrameOptions: false, 
}));

// BƯỚC 3: Rate Limiter (🌟 ĐÃ FIX: Tăng giới hạn lên 1000 để Frontend thoải mái gọi API thông báo)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 1000, // Tăng từ 100 lên 1000 lượt
    message: { success: false, message: "Quá nhiều yêu cầu, hệ thống đang tạm khóa IP để bảo vệ. Vui lòng thử lại sau 15 phút." }
});
app.use("/api", limiter); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ thư mục tĩnh an toàn
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 4. KHAI BÁO ROUTES (Định tuyến API)
app.get("/", (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: "EMR Backend is Running normally 🚀" 
    });
});

app.use("/api/auths", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/proposals", propposalRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/task-reports", taskReportRoutes);
app.use("/api/signatures", signupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/task-comments", taskCommentRoutes);   
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);

// XỬ LÝ LỖI 404 (Bắt buộc phải nằm ở CUỐI CÙNG sau tất cả các routes)
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: "API không tồn tại trên hệ thống" 
    });
});

// 5. QUY TRÌNH KHỞI ĐỘNG SERVER
const startServer = async () => {
    try {
        await connectDB();
        
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server Running on http://localhost:${PORT}`);
        });

        const emailJob = cron.schedule("* * * * *", () => {
            console.log("⏳ [Cron Job]: Đang kiểm tra hàng đợi email...");
            emailService.processPendingEmails();
        });

        process.on("SIGINT", () => {
            console.log("\n🛑 Đang tắt Server an toàn...");
            emailJob.stop(); 
            server.close(() => {
                console.log("✅ Đã đóng kết nối. Tạm biệt!");
                process.exit(0);
            });
        });

    } catch (error) {
        console.error("❌ Lỗi khởi động Server:", error.message);
        process.exit(1); 
    }
};

startServer();