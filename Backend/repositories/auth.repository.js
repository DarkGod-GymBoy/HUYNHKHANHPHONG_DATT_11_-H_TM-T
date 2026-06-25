const { getPool } = require("../config/database");

// CÁC HÀM PHỤC VỤ ĐĂNG NHẬP / LẤY THÔNG TIN
const findByUsername = async (tenDangNhap) => {
    const pool = getPool();
    const result = await pool.request()
        .input("TenDangNhap", tenDangNhap)
        .query(`SELECT * FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap`);
    return result.recordset[0];
};

const findById = async (maTaiKhoan) => {
    const pool = getPool();
    const result = await pool.request()
        .input("MaTaiKhoan", maTaiKhoan)
        .query(`
            SELECT
                TK.MaTaiKhoan, TK.TenDangNhap, TK.HoTen, TK.Email, TK.SoDienThoai,
                TK.MaPhongBan, TK.MaChucVu, TK.MaVaiTro, TK.TrangThai, TK.NgayTao
            FROM TaiKhoan TK
            WHERE TK.MaTaiKhoan = @MaTaiKhoan
        `);
    return result.recordset[0];
};

// CÁC HÀM PHỤC VỤ ĐĂNG KÝ
const createUser = async (userData) => {
    const pool = getPool();
    const result = await pool.request()
        .input("HoTen", userData.hoTen)
        .input("Email", userData.email)
        .input("SoDienThoai", userData.soDienThoai || "")
        .input("TenDangNhap", userData.tenDangNhap)
        .input("MatKhau", userData.matKhau) 
        .input("MaPhongBan", userData.maPhongBan)
        .input("MaChucVu", userData.maChucVu)
        .input("MaVaiTro", userData.maVaiTro)
        .query(`
            INSERT INTO TaiKhoan (
                HoTen, Email, SoDienThoai, TenDangNhap, MatKhau, 
                MaPhongBan, MaChucVu, MaVaiTro, TrangThai, NgayTao
            )
            OUTPUT INSERTED.MaTaiKhoan
            VALUES (
                @HoTen, @Email, @SoDienThoai, @TenDangNhap, @MatKhau, 
                @MaPhongBan, @MaChucVu, @MaVaiTro, 1, GETDATE()
            )
        `);
    return result.recordset[0];
};

const updateFirstLoginIP = async (maTaiKhoan, ipAddress) => {
    const pool = getPool();
    await pool.request()
        .input("MaTaiKhoan", maTaiKhoan)
        .input("IPAddress", ipAddress)
        .query(`
            UPDATE TaiKhoan 
            SET DiaChiIPLanDau = @IPAddress 
            WHERE MaTaiKhoan = @MaTaiKhoan AND DiaChiIPLanDau IS NULL
        `);
};

// CÁC HÀM PHỤC VỤ QUÊN MẬT KHẨU (MỚI THÊM)
const findByEmail = async (email) => {
    const pool = getPool();
    const result = await pool.request()
        .input("Email", email)
        .query(`SELECT * FROM TaiKhoan WHERE Email = @Email`);
    return result.recordset[0];
};

const saveResetToken = async (email, resetToken) => {
    const pool = getPool();
    await pool.request()
        .input("Email", email)
        .input("ResetToken", resetToken)
        .query(`
            UPDATE TaiKhoan 
            SET ResetToken = @ResetToken, 
                HanResetToken = DATEADD(MINUTE, 15, GETDATE()) 
            WHERE Email = @Email
        `);
};

const findByResetToken = async (token) => {
    const pool = getPool();
    const result = await pool.request()
        .input("Token", token)
        .query("SELECT * FROM TaiKhoan WHERE ResetToken = @Token AND HanResetToken > GETDATE()");
    return result.recordset[0];
};

const updatePassword = async (email, newHashedPassword) => {
    const pool = getPool();
    await pool.request()
        .input("Email", email)
        .input("MatKhau", newHashedPassword)
        .query(`
            UPDATE TaiKhoan 
            SET MatKhau = @MatKhau, ResetToken = NULL, HanResetToken = NULL 
            WHERE Email = @Email
        `);
};


// EXPORT TẤT CẢ CÁC HÀM (ĐÃ SỬA LỖI)
module.exports = {
    findByUsername,
    findById,
    createUser,
    updateFirstLoginIP,
    findByEmail,
    saveResetToken,
    updatePassword,
    findByResetToken
};