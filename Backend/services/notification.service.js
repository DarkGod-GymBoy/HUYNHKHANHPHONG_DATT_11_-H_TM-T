const notifRepo = require("../repositories/notification.repository");
const { sendEmail } = require("../services/email.service");
const { getPool } = require("../config/database");
const sql = require("mssql");

const createNotification = async (maNguoiNhan, emailNhan, tieuDe, noiDungHtml, loai, duongDan) => {
    try {
        const pool = await getPool();
        
        // 1. Luồng lưu chuông thông báo trên giao diện Web ERP (Hệ thống In-App)
        await pool.request()
            // 🌟 ĐÃ FIX: Khớp các giá trị với tham số truyền vào của hàm
            .input('MaTaiKhoan', sql.Int, maNguoiNhan) 
            .input('TieuDe', sql.NVarChar, tieuDe)
            .input('NoiDung', sql.NVarChar, noiDungHtml)
            .input('DaDoc', sql.Bit, 0)
            .input('NgayTao', sql.DateTime, new Date())
            .input('DuongDan', sql.VarChar, duongDan)
            .query(`
                INSERT INTO ThongBao (MaTaiKhoan, TieuDe, NoiDung, DaDoc, NgayTao, DuongDan)
                VALUES (@MaTaiKhoan, @TieuDe, @NoiDung, @DaDoc, @NgayTao, @DuongDan)
            `);

        // 2. Luồng kích hoạt gửi Email với UX/UI chuẩn Doanh Nghiệp (Trustworthy)
        if (emailNhan) {
            const khungHtmlDoanhNghiep = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
                    .email-container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e0e0e0; }
                    .email-header { background: linear-gradient(135deg, #0050b3 0%, #1890ff 100%); color: #ffffff; padding: 24px 32px; text-align: left; }
                    .email-header h2 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; }
                    .email-body { padding: 32px; color: #333333; font-size: 15px; line-height: 1.6; }
                    .info-box { background-color: #f9fbfc; border-left: 4px solid #1890ff; padding: 16px; margin: 20px 0; border-radius: 4px; color: #262626; }
                    .action-btn { display: inline-block; padding: 14px 28px; background-color: #52c41a; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; margin-top: 16px; text-align: center; }
                    .email-footer { background-color: #fafafa; color: #8c8c8c; padding: 20px 32px; font-size: 12px; text-align: center; border-top: 1px solid #f0f0f0; }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h2>🏢 HỆ THỐNG ERP WORKSPACE</h2>
                    </div>
                    <div class="email-body">
                        <p>Xin chào,</p>
                        <p>Bạn vừa nhận được một thông báo hệ thống liên quan đến công việc và tiến độ của bạn.</p>
                        
                        <div class="info-box">
                            ${noiDungHtml}
                        </div>

                        <p>Vui lòng đăng nhập vào hệ thống để kiểm tra và thực hiện các thao tác cần thiết.</p>
                        
                        <div style="text-align: center;">
                            <a href="http://localhost:5173${duongDan || ''}" class="action-btn">MỞ HỆ THỐNG KIỂM TRA NGAY</a>
                        </div>
                    </div>
                    <div class="email-footer">
                        <p>© 2026 ERP Workspace System. All rights reserved.</p>
                        <p>Email này được tạo tự động từ hệ thống quản trị tác vụ thông minh. Vui lòng không trả lời thư này.</p>
                    </div>
                </div>
            </body>
            </html>
            `;
            
           await sendEmail(emailNhan, tieuDe, khungHtmlDoanhNghiep);
        }
        
        return true;
    } catch (error) {
        console.error("❌ Lỗi luồng tạo thông báo:", error.message);
    }
};

const getMyNotifications = async (maTaiKhoan) => {
    return await notifRepo.getNotificationsByUser(maTaiKhoan);
};

const markAsRead = async (maThongBao, maTaiKhoan) => {
    return await notifRepo.markAsRead(maThongBao, maTaiKhoan);
};

module.exports = {
    createNotification,
    getMyNotifications,
    markAsRead
};