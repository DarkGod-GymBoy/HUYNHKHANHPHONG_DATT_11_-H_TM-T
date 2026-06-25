const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseUploadDir = path.resolve(__dirname, "../uploads"); 

// Hàm hỗ trợ tự động kiểm tra và khởi tạo thư mục con
const ensureDirExists = (subDirName) => {
    const fullPath = path.join(baseUploadDir, subDirName);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
};

// Cấu hình kho lưu trữ của Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let targetDir = baseUploadDir;
        const url = req.originalUrl.toLowerCase();

        // 🌟 ĐÃ FIX: Bắt URL thông minh và bao quát hơn khớp với chuẩn RESTful API
        if (url.includes("/task") || url.includes("/congviec")) {
            targetDir = ensureDirExists("congviec");
        } else if (url.includes("/proposal") || url.includes("/dexuat")) {
            targetDir = ensureDirExists("dexuat");  
        } else if (url.includes("/document") || url.includes("/tailieu")) {
            targetDir = ensureDirExists("tailieu");  
        } else if (url.includes("/signature") || url.includes("/chuky")) {
            targetDir = ensureDirExists("chuky");    
        } else if (url.includes("/profile") || url.includes("/nhanvien") || url.includes("/user")) {
            targetDir = ensureDirExists("nhanvien"); 
        } else {
            targetDir = ensureDirExists("khac"); // Đề phòng API lạ thì tống vào thư mục "khac"
        }

        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        // 🌟 ĐÃ FIX: Sửa lỗi font chữ Tiếng Việt của Multer trước khi lấy đuôi file
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        // Đặt tên file độc nhất bằng timestamp + số ngẫu nhiên
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        
        cb(null, uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // 🌟 Sửa lỗi font chữ Tiếng Việt ở bước Filter
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // Đã bổ sung thêm định dạng nén (.zip, .rar) rất hay dùng trong giao việc ERP
    const allowedExts = [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".zip", ".rar"];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Hệ thống không chấp nhận định dạng file ${ext}! Chỉ hỗ trợ văn bản, hình ảnh và file nén.`), false);
    }
};

const uploadOpts = {
    storage: storage,
    fileFilter: fileFilter,
    // 🌟 ĐÃ FIX: 10 * 1024 * 1024 chính xác là 10MB
    limits: { fileSize: 10 * 1024 * 1024 } 
};

// 🌟 ĐÃ TỐI ƯU CÁCH XUẤT MODULE: Chỉ xuất 1 đối tượng upload duy nhất
// Ở các file Route, bạn chỉ cần gọi: upload.array("files", 10) hoặc upload.single("file")
const upload = multer(uploadOpts);

module.exports = upload;