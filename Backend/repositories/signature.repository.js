const { getPool } = require("../config/database");
const sql = require("mssql");

// [CODE CŨ CỦA BẠN]
const createAndActivateSignature = async (maTaiKhoan, tenChuKy, duongDanAnh) => {
    const pool = await getPool(); 
    const transaction = new sql.Transaction(pool); 
    await transaction.begin();

    try {
        await new sql.Request(transaction)
            .input("MaTaiKhoan", sql.Int, maTaiKhoan)
            .query(`
                UPDATE ChuKyNguoiDung 
                SET DangSuDung = 0 
                WHERE MaTaiKhoan = @MaTaiKhoan
            `);

        const result = await new sql.Request(transaction)
            .input("MaTaiKhoan", sql.Int, maTaiKhoan)
            .input("TenChuKy", sql.NVarChar, tenChuKy || "Chữ ký mặc định")
            .input("DuongDanAnhChuKy", sql.VarChar, duongDanAnh)
            .query(`
                INSERT INTO ChuKyNguoiDung (MaTaiKhoan, TenChuKy, DuongDanAnhChuKy, DangSuDung, NgayTao)
                OUTPUT INSERTED.*
                VALUES (@MaTaiKhoan, @TenChuKy, @DuongDanAnhChuKy, 1, GETDATE())
            `);

        await transaction.commit();
        return result.recordset[0];
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// [CODE CŨ CỦA BẠN]
const getSignaturesByUser = async (maTaiKhoan) => {
    const pool = await getPool(); 
    console.log("Đang lấy chữ ký cho MaTaiKhoan:", maTaiKhoan);
    const result = await pool.request()
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .query(`
            SELECT MaChuKyNguoiDung, TenChuKy, DuongDanAnhChuKy, DangSuDung, NgayTao
            FROM ChuKyNguoiDung
            WHERE MaTaiKhoan = @MaTaiKhoan
            ORDER BY DangSuDung DESC, NgayTao DESC
        `);
    return result.recordset;
};

// ================= THÊM MỚI (DÙNG CHUNG ADMIN & USER) =================

// Lấy tất cả chữ ký (Dành cho Admin)
const getAllSignatures = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT C.MaChuKyNguoiDung, C.MaTaiKhoan, T.HoTen AS TenNhanVien, C.TenChuKy, C.DuongDanAnhChuKy, C.DangSuDung, C.NgayTao
        FROM ChuKyNguoiDung C
        INNER JOIN TaiKhoan T ON C.MaTaiKhoan = T.MaTaiKhoan
        ORDER BY C.NgayTao DESC
    `);
    return result.recordset;
};

// Sửa chữ ký
const updateSignature = async (maChuKy, tenChuKy, dangSuDung, duongDanAnh) => {
    const pool = await getPool();
    await pool.request()
        .input("MaChuKy", sql.Int, maChuKy)
        .input("TenChuKy", sql.NVarChar, tenChuKy)
        .input("DangSuDung", sql.Bit, dangSuDung)
        .input("DuongDanAnh", sql.VarChar, duongDanAnh) // Có thể Null
        .query(`
            UPDATE ChuKyNguoiDung
            SET TenChuKy = @TenChuKy,
                DangSuDung = COALESCE(@DangSuDung, DangSuDung),
                DuongDanAnhChuKy = COALESCE(@DuongDanAnh, DuongDanAnhChuKy)
            WHERE MaChuKyNguoiDung = @MaChuKy
        `);
    return true;
};

// Xóa chữ ký
const deleteSignature = async (maChuKy) => {
    const pool = await getPool();
    await pool.request()
        .input("MaChuKy", sql.Int, maChuKy)
        .query(`DELETE FROM ChuKyNguoiDung WHERE MaChuKyNguoiDung = @MaChuKy`);
    return true;
};

// Đặt làm mặc định (Ghi nhớ chữ ký cho User)
const setActiveSignature = async (maChuKy, maTaiKhoan) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        await new sql.Request(transaction)
            .input("MaTaiKhoan", sql.Int, maTaiKhoan)
            .query(`UPDATE ChuKyNguoiDung SET DangSuDung = 0 WHERE MaTaiKhoan = @MaTaiKhoan`);

        await new sql.Request(transaction)
            .input("MaChuKy", sql.Int, maChuKy)
            .input("MaTaiKhoan", sql.Int, maTaiKhoan)
            .query(`UPDATE ChuKyNguoiDung SET DangSuDung = 1 WHERE MaChuKyNguoiDung = @MaChuKy`);

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = { 
    createAndActivateSignature, getSignaturesByUser, 
    getAllSignatures, updateSignature, deleteSignature, setActiveSignature 
};