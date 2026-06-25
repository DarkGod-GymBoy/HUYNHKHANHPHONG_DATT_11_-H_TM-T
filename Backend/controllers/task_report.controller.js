const service = require("../services/task_report.service");

const getMyTasks = async (req, res) => {
    try {
        const maTaiKhoan = req.user.MaTaiKhoan;
        const data = await service.getMyAssignedTasks(maTaiKhoan);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getReports = async (req, res) => {
    try {
        const taskId = req.params.taskId || req.params.id;
        const data = await service.getTaskReports(taskId);
        return res.status(200).json({ success: true, data });
    } catch (error) { 
        return res.status(500).json({ success: false, message: error.message }); 
    }
};

// 3. ⭐ ĐÃ SỬA CHUẨN XÁC: Gửi báo cáo tiến độ mới (Có mã hóa File)
const addReport = async (req, res) => {
    try {
        const taskId = req.params.taskId || req.params.id;
        const maTaiKhoan = req.user.MaTaiKhoan;
        
        // 🌟 NÂNG CẤP XỬ LÝ FILE: Bóc tách file từ req.files (giống hệt task.controller)
        let danhSachFile = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                danhSachFile.push({
                    tenTepGoc: decodeURIComponent(file.originalname), // Tên có dấu hiển thị UI
                    duongDanTep: `uploads/congviec/${file.filename}`  // Tên mã hóa an toàn trên Server
                });
            });
        }

        // Chuẩn hóa gói dữ liệu gộp chung
        const reportData = {
            ...req.body,
            danhSachFile: danhSachFile
        };

        const result = await service.createReport(taskId, reportData, maTaiKhoan);
        
        return res.status(201).json({ 
            success: true, 
            message: "Ghi nhận báo cáo tiến độ và đồng bộ trạng thái thành công!", 
            data: result.maBaoCao 
        });
    } catch (error) { 
        console.error("❌ Lỗi tại Task Report Controller:", error.message);
        return res.status(400).json({ success: false, message: error.message }); 
    }
};

// 4. Cập nhật nội dung bản báo cáo tiến độ cũ
const updateReport = async (req, res) => {
    try {
        const reportId = req.params.reportId || req.params.id;
        
        // 🌟 Bổ sung bóc tách file cho hàm Update (Nếu UI có chức năng sửa file báo cáo)
        let danhSachFile = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                danhSachFile.push({
                    tenTepGoc: decodeURIComponent(file.originalname),
                    duongDanTep: `uploads/congviec/${file.filename}`
                });
            });
        }
        
        const payload = { ...req.body, danhSachFile };
        await service.edit(reportId, payload);
        
        return res.status(200).json({ success: true, message: "Cập nhật nội dung báo cáo thành công!" });
    } catch (error) { 
        return res.status(400).json({ success: false, message: error.message }); 
    }
};

const deleteReport = async (req, res) => {
    try {
        const reportId = req.params.reportId || req.params.id;
        await service.del(reportId);
        return res.status(200).json({ success: true, message: "Đã xóa bản báo cáo khỏi hệ thống!" });
    } catch (error) { 
        return res.status(400).json({ success: false, message: error.message }); 
    }
};

module.exports = { getMyTasks, getReports, addReport, updateReport, deleteReport };