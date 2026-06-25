const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const authRepository = require("../repositories/auth.repository");

const login = async (tenDangNhap, matKhau, clientIp) => {
    // 1. Tìm user trong cơ sở dữ liệu
    const user = await authRepository.findByUsername(tenDangNhap);

    // 2. Kiểm tra tồn tại và trạng thái tài khoản
    if (!user) {
        throw new Error("Tài khoản không tồn tại");
    }

    if (!user.TrangThai) {
        throw new Error("Tài khoản đã bị khóa");
    }

    // 3. Kiểm tra mật khẩu (BƯỚC QUAN TRỌNG NHẤT PHẢI LÀM TRƯỚC TIÊN)
    const isMatch = await bcrypt.compare(matKhau, user.MatKhau);

    if (!isMatch) {
        throw new Error("Sai mật khẩu");
    }

    // 4. Kiểm tra và cập nhật IP lần đầu
    if (!user.DiaChiIPLanDau && clientIp) {
        await authRepository.updateFirstLoginIP(user.MaTaiKhoan, clientIp);
        user.DiaChiIPLanDau = clientIp; // Cập nhật trên object đang thao tác
    }

    // 5. Ghi log hệ thống
    const pool = require("../config/database").getPool();
    await pool.request()
        .input("MaTaiKhoan", user.MaTaiKhoan)
        .input("HanhDong", "Đăng nhập hệ thống")
        .input("DiaChiIP", clientIp)
        .query(`INSERT INTO NhatKyHeThong (MaTaiKhoan, HanhDong, DiaChiIP, ThoiGian) 
            VALUES (@MaTaiKhoan, @HanhDong, @DiaChiIP, GETDATE())`);

    // 6. Tạo JWT Token
    const token = jwt.sign(
        {
            MaTaiKhoan: user.MaTaiKhoan,
            TenDangNhap: user.TenDangNhap,
            MaVaiTro: user.MaVaiTro,
            MaPhongBan: user.MaPhongBan,
            MaChucVu: user.MaChucVu
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "8h"
        }
    );

    // 7. Trả về kết quả
    return {
        token,
        user: {
            MaTaiKhoan: user.MaTaiKhoan,
            HoTen: user.HoTen,
            TenDangNhap: user.TenDangNhap,
            Email: user.Email,
            MaVaiTro: user.MaVaiTro
        }
    };
};

const profile = async (maTaiKhoan) => {
    // Gọi hàm findById từ authRepository mà chúng ta đã viết hôm trước
    const user = await authRepository.findById(maTaiKhoan);

    if (!user) {
        throw new Error("Không tìm thấy tài khoản");
    }

    return user;
};

const register = async (data) => {
    // 1. Kiểm tra trùng lặp Tên đăng nhập (Dùng đúng tên authRepository và findByUsername)
    const userByUsername = await authRepository.findByUsername(data.tenDangNhap);
    if (userByUsername) {
        throw new Error("Tên đăng nhập này đã được sử dụng!");
    }

    // 2. Kiểm tra trùng lặp Email (Dùng đúng tên authRepository và findByEmail)
    const userByEmail = await authRepository.findByEmail(data.email);
    if (userByEmail) {
        throw new Error("Email này đã được đăng ký cho tài khoản khác!");
    }

    // 3. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.matKhau, salt);

    // 4. Gắn mật khẩu đã mã hóa đè lên object data
    const newUserData = {
        ...data,
        matKhau: hashedPassword
    };

    // 5. Gọi Repo để lưu (Dùng đúng tên authRepository)
    const newUser = await authRepository.createUser(newUserData);
    
    return newUser;
};

const forgotPassword = async (email) => {
    // 1. Kiểm tra User qua Repo chuẩn
    const user = await authRepository.findByEmail(email);
    if (!user) throw new Error("Email không tồn tại trong hệ thống");

    // 2. Tạo Token reset ngẫu nhiên
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 3. 🌟 GỌI REPO LƯU DB: Tránh tự query lộn xộn trong Service
    await authRepository.saveResetToken(email, resetToken);

    // 4. Lưu email vào hàng đợi (Bảng EmailChoGui)
    const pool = require("../config/database").getPool();
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${email}`;
    const htmlContent = `
       <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #0050b3; border-bottom: 2px solid #0050b3; padding-bottom: 10px;">Bệnh viện Gia Định</h2>
        <p><strong>Kính gửi Quý người dùng,</strong></p>
        <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này.</p>
        <p>Để đảm bảo an toàn, vui lòng nhấp vào liên kết bên dưới để thiết lập mật khẩu mới:</p>
        
        <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #0050b3; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">ĐẶT LẠI MẬT KHẨU</a>
        </div>
        
        <p style="font-size: 14px; color: #666;"><em>Lưu ý: Liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong> kể từ khi email được gửi đi.</em></p>
        <p>Nếu Quý người dùng không thực hiện yêu cầu này, vui lòng bỏ qua email và bảo mật thông tin tài khoản.</p>
        
        <p>Trân trọng,<br><strong>Hệ thống Quản trị Bệnh viện Gia Định</strong></p>
    </div>
    `;

    await pool.request()
        .input("NguoiNhan", email)
        .input("TieuDe", "Hệ thống quản lý công việc - Khôi phục mật khẩu")
        .input("NoiDung", htmlContent)
        .query("INSERT INTO EmailChoGui (NguoiNhan, TieuDe, NoiDung, DaGui, NgayTao) VALUES (@NguoiNhan, @TieuDe, @NoiDung, 0, GETDATE())");

    return { message: "Vui lòng kiểm tra email để đặt lại mật khẩu" };
};

const resetPassword = async (token, newPassword) => {
    // 1. Kiểm tra token (Bây giờ nó sẽ so sánh rất chuẩn xác vì cùng xài Time của SQL Server)
    const user = await authRepository.findByResetToken(token);
    if (!user) {
        throw new Error("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (Quá 15 phút).");
    }

    // 2. Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. Cập nhật mật khẩu mới vào DB
    await authRepository.updatePassword(user.Email, hashedPassword);
    
    return { message: "Mật khẩu đã được cập nhật thành công" };
};

// Đã bổ sung đẩy đủ các hàm để export
module.exports = {
    login,
    profile,
    register,
    forgotPassword,
    resetPassword
};