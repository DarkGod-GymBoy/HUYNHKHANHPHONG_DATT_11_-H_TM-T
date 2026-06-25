const { getPool } = require("../config/database");
const sql = require("mssql");

const getCommentsByTask = async (maCongViec) => {
    const pool = await getPool();
    // Đã loại bỏ JOIN ChuKyNguoiDung để tối ưu hiệu suất
    const result = await pool.request()
        .input("MaCongViec", sql.Int, maCongViec)
        .query(`
            SELECT BC.MaBinhLuan, BC.NoiDung, BC.NgayBinhLuan, TK.HoTen as NguoiBinhLuan
            FROM BinhLuanCongViec BC
            JOIN TaiKhoan TK ON BC.MaTaiKhoan = TK.MaTaiKhoan
            WHERE BC.MaCongViec = @MaCongViec
            ORDER BY BC.NgayBinhLuan ASC
        `);
    return result.recordset;
};

// Đổi tên hàm cho chuẩn xác (không còn Signature nữa)
const addComment = async (maCongViec, maTaiKhoan, noiDung) => {
    const pool = await getPool();
    
    await pool.request()
        .input("MaCongViec", sql.Int, parseInt(maCongViec, 10))
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .input("NoiDung", sql.NVarChar, noiDung)
        .query(`
            INSERT INTO BinhLuanCongViec (MaCongViec, MaTaiKhoan, NoiDung, NgayBinhLuan)
            VALUES (@MaCongViec, @MaTaiKhoan, @NoiDung, GETDATE())
        `);
        
    return true;
};

const updateComment = async (maBinhLuan, noiDung) => {
    const pool = await getPool();
    await pool.request()
        .input("MaBinhLuan", sql.Int, maBinhLuan)
        .input("NoiDung", sql.NVarChar, noiDung)
        .query(`UPDATE BinhLuanCongViec SET NoiDung = @NoiDung WHERE MaBinhLuan = @MaBinhLuan`);
    return true;
};

const deleteComment = async (maBinhLuan) => {
    const pool = await getPool();
    await pool.request()
        .input("MaBinhLuan", sql.Int, maBinhLuan)
        .query(`DELETE FROM BinhLuanCongViec WHERE MaBinhLuan = @MaBinhLuan`);
    return true;
};

module.exports = { getCommentsByTask, addComment, updateComment, deleteComment };