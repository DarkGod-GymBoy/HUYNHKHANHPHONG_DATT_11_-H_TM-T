const express = require("express");
const router = express.Router();

// 🌟 Import biến upload duy nhất từ file cấu hình (Bạn nhớ check lại đường dẫn require cho đúng nhé)
const upload = require("../middleware/upload.middleware"); 
const { verifyToken } = require("../middleware/auth.middleware");

router.use(verifyToken);

// 🌟 ĐÃ FIX 1: Đưa thẳng middleware upload.array vào tuyến đường (Route)
router.post("/multi-files", upload.array("files", 10), (req, res) => {
    
    // Nếu không có file nào được gửi lên
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một tập tin tài liệu cần đính kèm!" });
    }

    // 🌟 ĐÃ FIX 2: Tự động lấy đúng đường dẫn vật lý mà Multer vừa lưu thay vì gõ cứng
    const fileUrls = req.files.map(file => {
        // file.path sẽ tự động là "uploads/congviec/tenfile.pdf" hoặc "uploads/khac/tenfile.pdf"
        let cleanPath = file.path.replace(/\\/g, '/'); // Chống lỗi dấu xuyệt ngược trên Windows
        
        // Trả về /uploads/... để Frontend có thể lấy được
        return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`; 
    });
    
    return res.status(200).json({
        success: true,
        message: "Tải danh sách tài liệu đính kèm lên máy chủ thành công!",
        fileUrls: fileUrls
    });
});

// 🌟 ĐÃ FIX 3: Thêm bộ bắt lỗi rác (Sai định dạng, quá dung lượng 10MB) từ Multer
router.use((err, req, res, next) => {
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

module.exports = router;