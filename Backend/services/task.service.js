const taskRepo = require("../repositories/task.repository");
const notificationService = require("./notification.service"); // Dùng để gửi thông báo (nếu có)
const { getPool } = require("../config/database");
const cron = require("node-cron");
const sql = require("mssql");

// 🌟 HÀM BỔ SUNG: Định dạng ngày giờ chuẩn mạng bằng JS thuần (Không cần cài thêm thư viện)
const formatDateNative = (dateString) => {
    if (!dateString) return "Không có hạn chót";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Không có hạn chót"; // Bẫy lỗi nếu chuỗi ngày truyền vào sai định dạng
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// 1. TẠO CÔNG VIỆC MỚI VÀ KÍCH HOẠT THÔNG BÁO (Nối xuống Repo)
const createTask = async (taskData, nguoiTaoId) => {
    const payload = { ...taskData, nguoiTaoId };
    const maCongViec = await taskRepo.createAndAssignTaskTransaction(payload);

    // Xử lý gửi thông báo cho những người được giao việc
    if (taskData.danhSachNguoiNhan && taskData.danhSachNguoiNhan.length > 0) {
        try {
            const pool = await getPool();
            for (const maNhanSu of taskData.danhSachNguoiNhan) {
                if (!maNhanSu) continue;

                const userRes = await pool.request()
                    .input("MaTaiKhoan", sql.Int, parseInt(maNhanSu))
                    .query(`SELECT Email, HoTen FROM TaiKhoan WHERE MaTaiKhoan = @MaTaiKhoan`);
                
                if (userRes.recordset.length > 0) {
                    const { Email, HoTen } = userRes.recordset[0];
                    
                    // 🌟 ĐÃ SỬA: Sử dụng hàm formatDateNative thay thế cho dayjs để sửa lỗi triệt để
                    const hanChot = formatDateNative(taskData.hanHoanThanh);
                    
                    const tieuDeNotif = "📋 Bạn có một công việc mới được giao";
                    const noiDungNotif = `
                        Xin chào <b>${HoTen}</b>,<br/>
                        Bạn vừa được Admin phân công vào tác vụ: <strong style="color:#1890ff;">${taskData.tieuDe}</strong>.<br/>
                        Hạn hoàn thành: <span style="color:red;">${hanChot}</span>.<br/>
                        Vui lòng đăng nhập hệ thống để xem chi tiết.
                    `;

                    await notificationService.createNotification(
                        parseInt(maNhanSu), Email, tieuDeNotif, noiDungNotif, "CONG_VIEC", "/user/tasks"
                    );
                }
            }
        } catch (err) {
            console.error("[Task Service] Lỗi gửi thông báo:", err.message);
        }
    }

    return { maCongViec };
};

// 2. LẤY TẤT CẢ CÔNG VIỆC (DÀNH CHO ADMIN)
const getAllTasks = async () => {
    return await taskRepo.getAllTasks();
};

// 3. LẤY CÔNG VIỆC CÁ NHÂN (DÀNH CHO USER)
const getMyAssignedTasks = async (maTaiKhoan) => {
    if (!maTaiKhoan) throw new Error("Mã tài khoản không hợp lệ!");
    return await taskRepo.getMyAssignedTasks(maTaiKhoan);
};

// 4. CẬP NHẬT CÔNG VIỆC
const updateTask = async (maCongViec, taskData) => {
    return await taskRepo.updateTask(maCongViec, taskData);
};

// 5. XÓA CÔNG VIỆC
const deleteTask = async (maCongViec) => {
    return await taskRepo.deleteTask(maCongViec);
};

// 6. LẤY CHI TIẾT CÔNG VIỆC
const getTaskById = async (maCongViec) => {
    return await taskRepo.getTaskById(maCongViec);
};

const checkAndSendDeadlineNotifications = async () => {
    try {
        const pool = await getPool();
        // Lấy các công việc chưa hoàn thành và có cài đặt hạn chót
        const result = await pool.request().query(`
            SELECT MaCongViec, TieuDe, HanHoanThanh
            FROM CongViec
            WHERE TrangThai != 'HOAN_THANH' AND HanHoanThanh IS NOT NULL
        `);

        const tasks = result.recordset;
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Đưa về 0h00 để tính chênh lệch ngày cho chuẩn

        for (const task of tasks) {
            const deadline = new Date(task.HanHoanThanh);
            deadline.setHours(0, 0, 0, 0);

            // Tính toán khoảng cách ngày
            const diffTime = deadline - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let title = "";
            let message = "";

            if (diffDays === 3) {
                title = "⏳ Nhắc nhở: Công việc sắp tới hạn (Còn 3 ngày)";
                message = `Công việc <b>${task.TieuDe}</b> sẽ đến hạn hoàn thành trong 3 ngày nữa. Vui lòng đẩy nhanh tiến độ.`;
            } else if (diffDays === 1) {
                title = "⚠️ Cảnh báo: Công việc sắp tới hạn (Còn 1 ngày)";
                message = `Công việc <b>${task.TieuDe}</b> sẽ đến hạn vào <b>NGÀY MAI</b>. Vui lòng rà soát và báo cáo tiến độ.`;
            } else if (diffDays === 0) {
                title = "🚨 KHẨN CẤP: Công việc tới hạn HÔM NAY";
                message = `Công việc <b>${task.TieuDe}</b> có hạn chót là <b>HÔM NAY</b>. Yêu cầu hoàn tất ngay lập tức!`;
            }

            // Nếu khớp điều kiện ngày, tiến hành bắn thông báo
            if (message) {
                const assigneesRes = await pool.request()
                    .input("MaCongViec", sql.Int, task.MaCongViec)
                    .query(`
                        SELECT PC.MaTaiKhoan, TK.Email 
                        FROM PhanCongCongViec PC
                        INNER JOIN TaiKhoan TK ON PC.MaTaiKhoan = TK.MaTaiKhoan
                        WHERE PC.MaCongViec = @MaCongViec
                    `);
                
                const assignees = assigneesRes.recordset;
                for (const emp of assignees) {
                    await notificationService.createNotification(
                        emp.MaTaiKhoan, emp.Email, title, message, "CONG_VIEC", "/user/tasks"
                    );
                }
            }
        }
    } catch (error) {
        console.error("Lỗi khi chạy Robot kiểm tra hạn chót:", error);
    }
};

// Cài đặt chạy tự động vào lúc 07:00 Sáng mỗi ngày
// (Bạn có thể đổi '0 7 * * *' thành '* * * * *' để test chạy mỗi phút)
cron.schedule('0 7 * * *', async () => {
    console.log("🤖 [CRONJOB] Bắt đầu quét và nhắc nhở hạn chót công việc...");
    
    // 1. Gửi thông báo nhắc việc (Hàm cũ)
    await checkAndSendDeadlineNotifications();
    
    // 2. 🌟 TỰ ĐỘNG ĐÁNH RỚT (THẤT BẠI) CÁC TÁC VỤ ĐÃ QUÁ HẠN
    await taskRepo.autoFailOverdueTasks();
    console.log("🤖 [CRONJOB] Đã dọn dẹp và cập nhật trạng thái các tác vụ quá hạn.");
});

// 🌟 ĐẢM BẢO XUẤT ĐẦY ĐỦ CÁC HÀM ĐỂ CONTROLLER GỌI ĐƯỢC
module.exports = {
    createTask, getAllTasks, getMyAssignedTasks, updateTask, deleteTask, getTaskById
};