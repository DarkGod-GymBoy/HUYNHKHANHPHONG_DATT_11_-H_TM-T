const sql = require("mssql");
const { getPool } = require("../config/database");

// 1. LƯU THÔNG BÁO MỚI XUỐNG DATABASE
const createNotification = async (maTaiKhoan, tieuDe, noiDung, duongDan = "") => {
    try {
        const pool = await getPool();
        
        // Nếu có đường dẫn đi kèm, nhúng thẳng thẻ HTML vào nội dung để user click được ở giao diện
        let noiDungFinal = noiDung;
        if (duongDan) {
            noiDungFinal += `<br/><br/><a href="${duongDan}" style="color: #1890ff; font-weight: bold;">👉 Nhấp vào đây để xem chi tiết</a>`;
        }

        await pool.request()
            .input("MaTaiKhoan", sql.Int, parseInt(maTaiKhoan, 10))
            .input("TieuDe", sql.NVarChar(500), tieuDe)
            .input("NoiDung", sql.NVarChar(sql.MAX), noiDungFinal)
            .query(`
                INSERT INTO ThongBao (MaTaiKhoan, TieuDe, NoiDung, DaDoc, NgayTao)
                VALUES (@MaTaiKhoan, @TieuDe, @NoiDung, 0, GETDATE())
            `);
        return true;
    } catch (error) {
        console.error("❌ Lỗi tại Notification Repository (Create):", error.message);
        throw error;
    }
};

// 2. LẤY DANH SÁCH THÔNG BÁO CỦA TỪNG USER
const getNotificationsByUser = async (maTaiKhoan) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("MaTaiKhoan", sql.Int, parseInt(maTaiKhoan, 10))
            .query(`
                SELECT MaThongBao, MaTaiKhoan, TieuDe, NoiDung, DaDoc, NgayTao
                FROM ThongBao
                WHERE MaTaiKhoan = @MaTaiKhoan
                ORDER BY NgayTao DESC
            `);
        return result.recordset;
    } catch (error) {
        console.error("❌ Lỗi tại Notification Repository (Get):", error.message);
        throw error;
    }
};

// 3. ĐÁNH DẤU MỘT THÔNG BÁO LÀ ĐÃ ĐỌC
const markAsRead = async (maThongBao, maTaiKhoan) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input("MaThongBao", sql.Int, parseInt(maThongBao, 10))
            .input("MaTaiKhoan", sql.Int, parseInt(maTaiKhoan, 10))
            .query(`
                UPDATE ThongBao 
                SET DaDoc = 1 
                WHERE MaThongBao = @MaThongBao AND MaTaiKhoan = @MaTaiKhoan
            `);
        return true;
    } catch (error) {
        console.error("❌ Lỗi tại Notification Repository (MarkRead):", error.message);
        throw error;
    }
};

module.exports = {
    createNotification,
    getNotificationsByUser,
    markAsRead
};