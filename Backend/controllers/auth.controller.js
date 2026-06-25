const authService = require("../services/auth.service");

// 1. ĐĂNG NHẬP
const login = async (req, res) => {
    try {
        const { tenDangNhap, matKhau } = req.body;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const result = await authService.login(tenDangNhap, matKhau, clientIp);

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 2. XEM HỒ SƠ
const profile = async (req, res) => {
    try {
        const result = await authService.profile(req.user.MaTaiKhoan);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 3. ĐĂNG KÝ (Đã sửa lại thành req, res chuẩn Controller)
const register = async (req, res) => {
    try {
        const { hoTen, email, soDienThoai, tenDangNhap, matKhau, maPhongBan, maChucVu, maVaiTro } = req.body;

        if (!hoTen || !email || !tenDangNhap || !matKhau || !maPhongBan || !maChucVu || !maVaiTro) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp đầy đủ thông tin bắt buộc" });
        }

        // Gọi sang Service để xử lý logic mã hóa và lưu DB
        await authService.register(req.body);

        return res.status(201).json({ success: true, message: "Đăng ký tài khoản thành công" });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 4. QUÊN MẬT KHẨU (Đã sửa lại thành req, res chuẩn Controller)
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp email" });
        }

        // Gọi sang Service để kiểm tra email
        const result = await authService.forgotPassword(email);

        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

//Đặt lại MK
const resetPassword = async (req, res) => {
    try {
        // 🌟 SỬA LỖI: Bắt linh hoạt cả 2 trường hợp Frontend gửi lên là 'newPassword' hoặc 'matKhau'
        const { token, newPassword, matKhau } = req.body;
        const passwordToUpdate = newPassword || matKhau;

        if (!token || !passwordToUpdate) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin yêu cầu (token hoặc mật khẩu mới)" });
        }

        const result = await authService.resetPassword(token, passwordToUpdate);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    login,
    profile,
    register,
    forgotPassword,
    resetPassword
};