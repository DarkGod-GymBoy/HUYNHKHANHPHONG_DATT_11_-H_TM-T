const nodemailer = require("nodemailer");
const { getPool } = require("../config/database");

// Cấu hình Nodemailer sử dụng Gmail (Bạn cần thêm EMAIL_USER và EMAIL_PASS vào file .env)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // VD: test@gmail.com
        pass: process.env.EMAIL_PASS  // Mật khẩu ứng dụng (App Password) của Gmail
    }
});

// 🌟 HÀM MỚI BỔ SUNG: Gửi email trực tiếp tức thì (Sửa dứt điểm lỗi "is not a function")
const sendEmail = async (to, subject, htmlContent) => {
    try {
        if (!to) {
            console.error("[Email] Lỗi: Không có địa chỉ email người nhận.");
            return false;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: htmlContent
        };

        // Thực hiện bắn mail trực tiếp bằng transporter
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Đã gửi trực tiếp thành công tới: ${to}`);
        return true;
    } catch (err) {
        console.error(`[Email] Gửi trực tiếp thất bại tới ${to}:`, err.message);
        // Không throw lỗi ra ngoài để tránh làm sập luồng tạo Task chính, chỉ ghi log lỗi
        return false; 
    }
};

// Luồng quét hàng đợi tự động (Code cũ của bạn - GIỮ NGUYÊN)
const processPendingEmails = async () => {
    try {
        const pool = getPool();
        
        // Lấy danh sách email chưa gửi
        const result = await pool.request()
            .query("SELECT TOP 10 * FROM EmailChoGui WHERE DaGui = 0 ORDER BY NgayTao ASC");
        
        const emails = result.recordset;

        for (const email of emails) {
            try {
                // Cấu hình gửi mail
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email.NguoiNhan,
                    subject: email.TieuDe,
                    html: email.NoiDung
                };

                // Thực hiện gửi
                await transporter.sendMail(mailOptions);

                // Nếu gửi thành công, cập nhật trạng thái DaGui = 1
                await pool.request()
                    .input("MaEmail", email.MaEmail)
                    .query("UPDATE EmailChoGui SET DaGui = 1, NgayGui = GETDATE() WHERE MaEmail = @MaEmail");
                
                console.log(`[Email Queue] Đã gửi thành công tới: ${email.NguoiNhan}`);
            } catch (err) {
                console.error(`[Email Queue] Lỗi khi gửi mail ID ${email.MaEmail}:`, err.message);
            }
        }
    } catch (error) {
        console.error("[Email] Lỗi khi truy vấn hàng đợi email:", error);
    }
};

// 🌟 ĐÃ CẬP NHẬT: Xuất cả 2 hàm ra ngoài để các Service khác (như Task, Notification) gọi được
module.exports = {
    sendEmail,
    processPendingEmails
};