const express = require("express");
const router = express.Router();
const controller = require("../controllers/task_report.controller"); 
const { verifyToken } = require("../middleware/auth.middleware");

// 🌟 ĐÃ THÊM: Import cấu hình Multer để đón file báo cáo
const upload = require("../middleware/upload.middleware");

// Khóa bảo mật: Tất cả các API tương tác báo cáo tiến độ bắt buộc phải có Token hợp lệ
router.use(verifyToken);

// 🌟 PHÂN HỆ 1: API CHO NHÂN VIÊN (User Portal nhận việc & báo cáo)
router.get("/my-tasks", controller.getMyTasks);

// Nhân viên nộp bản báo cáo tiến độ mới cho một công việc cụ thể
// 🌟 ĐÃ THÊM: upload.array("files", 10) để hứng file mã hóa
router.post("/:taskId", upload.array("files", 10), controller.addReport);

// 🛠️ PHÂN HỆ 2: API CHO QUẢN TRỊ VIÊN & HỆ THỐNG (Xem lịch sử / CRUD)
router.get("/:taskId", controller.getReports);

// Cập nhật nội dung bản báo cáo cũ (Gắn thêm upload nếu báo cáo cho phép sửa file)
router.put("/report/:reportId", upload.array("files", 10), controller.updateReport);

// Xóa/Thu hồi bản báo cáo
router.delete("/report/:reportId", controller.deleteReport);

module.exports = router;