const taskService = require("../services/task.service");
const notificationService = require("../services/notification.service");
//Import thư viện kết nối Database để chạy lệnh INSERT thông báo
const { getPool, sql } = require("../config/database"); 

// ============================================================================
// 1. TẠO CÔNG VIỆC VÀ GỬI THÔNG BÁO TỰ ĐỘNG
// ============================================================================
const createTask = async (req, res) => {
    try {
        const nguoiTaoId = req.user.MaTaiKhoan; 
        const { ngayBatDau, hanHoanThanh, danhSachNguoiNhan, ...restBody } = req.body || {};

        let danhSachFile = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                danhSachFile.push({
                    tenTepGoc: decodeURIComponent(file.originalname), // Giữ tên gốc để UI hiển thị đẹp
                    duongDanTep: `uploads/tasks/${file.filename}`     // Tên mã hóa để tải về
                });
            });
        }

        // Chuẩn hóa dữ liệu đầu vào
        const payload = {
            ...restBody,
            ngayBatDau: ngayBatDau ? new Date(ngayBatDau) : null,
            hanHoanThanh: hanHoanThanh ? new Date(hanHoanThanh) : null,
            danhSachNguoiNhan: Array.isArray(danhSachNguoiNhan) ? danhSachNguoiNhan : (danhSachNguoiNhan ? [danhSachNguoiNhan] : []),
            danhSachFile: danhSachFile
        };

        // BƯỚC 1: Lưu công việc vào Database (Qua Service)
        const result = await taskService.createTask(payload, nguoiTaoId);
        

        
        // BƯỚC 2: Tạo dữ liệu Chuông thông báo cho từng người nhận
       try {
            if (payload.danhSachNguoiNhan && payload.danhSachNguoiNhan.length > 0) {
                const pool = await getPool();
                
                // 1. Quét Database lấy Email của những người được phân công
                const placeholders = payload.danhSachNguoiNhan.map((_, i) => `@id${i}`).join(',');
                const request = pool.request();
                payload.danhSachNguoiNhan.forEach((id, i) => request.input(`id${i}`, sql.Int, id));
                
                const users = await request.query(`SELECT MaTaiKhoan, Email FROM TaiKhoan WHERE MaTaiKhoan IN (${placeholders})`);
                
                const tieuDeThongBao = "🎯 Chỉ thị công việc mới";
                const noiDungThongBao = `Bạn vừa được phân công phụ trách tác vụ: <b>${payload.tieuDe}</b>. Vui lòng kiểm tra thời hạn và cập nhật tiến độ.`;
                const duongDanTacVu = "/user/tasks"; 

                // 2. Chạy vòng lặp bắn thông báo (KHÔNG VIẾT LỆNH INSERT INTO Ở ĐÂY NỮA)
                for (const user of users.recordset) {
                    
                    // 🌟 CHỈ CẦN GỌI DUY NHẤT DÒNG NÀY (Hàm này đã lo hết việc lưu DB và Gửi Mail bên file Service)
                    await notificationService.createNotification(
                        user.MaTaiKhoan, 
                        user.Email, 
                        tieuDeThongBao, 
                        noiDungThongBao, 
                        "TASK", 
                        duongDanTacVu
                    );

                    // Bắn Socket.io (Giữ nguyên)
                    const io = req.app.get('socketio');
                    if (io && global.onlineUsers?.has(String(user.MaTaiKhoan))) {
                        io.to(global.onlineUsers.get(String(user.MaTaiKhoan))).emit('new_notification', {
                            title: tieuDeThongBao,
                            content: noiDungThongBao,
                            duongDan: duongDanTacVu
                        });
                    }
                }
            }
        } catch (notifErr) {
            console.error("⚠️ Lỗi tạo thông báo công việc ngầm:", notifErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Phát hành chỉ thị tác vụ thành công!",
            data: result
        });
    } catch (error) {
        console.error("❌ Lỗi tại Task Controller:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ============================================================================
// 2. LẤY TẤT CẢ CÔNG VIỆC (DÀNH CHO QUẢN TRỊ VIÊN)
// ============================================================================
const getAllTasks = async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks();
        return res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        console.error("❌ Lỗi tại Task Controller:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// 3. LẤY CÔNG VIỆC CÁ NHÂN (DÀNH CHO NHÂN VIÊN)
// ============================================================================
const getMyTasks = async (req, res) => {
    try {
        const maTaiKhoan = req.user.MaTaiKhoan; 
        const tasks = await taskService.getMyAssignedTasks(maTaiKhoan);
        
        return res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        console.error("❌ Lỗi lấy công việc cá nhân:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// 4. CẬP NHẬT TIẾN TRÌNH HOẶC NỘI DUNG CÔNG VIỆC
// ============================================================================
const updateTask = async (req, res) => {
    try {
        const { ngayBatDau, hanHoanThanh, ...restBody } = req.body || {};
        let danhSachFile = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                danhSachFile.push({
                    tenTepGoc: decodeURIComponent(file.originalname),
                    duongDanTep: `uploads/tasks/${file.filename}`
                });
            });
        }
        const payload = {
            ...restBody,
            ngayBatDau: ngayBatDau ? new Date(ngayBatDau) : null,
            hanHoanThanh: hanHoanThanh ? new Date(hanHoanThanh) : null,
            danhSachFile: danhSachFile
        };

        await taskService.updateTask(req.params.id, payload);
        return res.status(200).json({ success: true, message: "Cập nhật tiến trình công việc thành công!" });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ============================================================================
// 5. THU HỒI VÀ XÓA CÔNG VIỆC
// ============================================================================
const deleteTask = async (req, res) => {
    try {
        await taskService.deleteTask(req.params.id);
        return res.status(200).json({ success: true, message: "Đã thu hồi và xóa công việc khỏi hệ thống!" });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ============================================================================
// 6. XEM CHI TIẾT CÔNG VIỆC THEO ID
// ============================================================================
const getTaskById = async (req, res) => {
    try {
        const task = await taskService.getTaskById(req.params.id);
        return res.status(200).json({ success: true, data: task });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { 
    createTask, 
    getAllTasks, 
    getMyTasks,  
    updateTask, 
    deleteTask, 
    getTaskById 
};