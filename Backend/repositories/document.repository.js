const { getPool } = require("../config/database");
const sql = require("mssql");

const createDocument = async (docData, filepath, nguoiTaiLen) => {
    const pool = await getPool(); 
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // 🌟 ĐÃ FIX: Sử dụng SCOPE_IDENTITY() để vượt qua rào cản Trigger của bảng TaiLieuSoHoa
        const insertDoc = await new sql.Request(transaction)
            .input("TenTaiLieu", sql.NVarChar, docData.tenTaiLieu)
            .input("MaLoaiTaiLieu", sql.Int, parseInt(docData.maLoaiTaiLieu, 10)) 
            .input("MoTa", sql.NVarChar, docData.moTa || "")
            .input("DuongDanFile", sql.VarChar, filepath)
            .input("NguoiTaiLen", sql.Int, parseInt(nguoiTaiLen, 10))
            .input("NguoiSoHuu", sql.Int, parseInt(nguoiTaiLen, 10))
            .query(`
                INSERT INTO TaiLieuSoHoa (TenTaiLieu, MaLoaiTaiLieu, MoTa, DuongDanFile, NguoiTaiLen, NgayTaiLen, NguoiSoHuu)
                VALUES (@TenTaiLieu, @MaLoaiTaiLieu, @MoTa, @DuongDanFile, @NguoiTaiLen, GETDATE(), @NguoiSoHuu);
                
                SELECT SCOPE_IDENTITY() AS MaTaiLieu;
            `);
            
        // Lấy ID vừa được tạo ra từ SCOPE_IDENTITY
        const maTaiLieu = insertDoc.recordset[0].MaTaiLieu;

        await new sql.Request(transaction)
            .input("MaTaiLieu", sql.Int, maTaiLieu)
            .input("SoPhienBan", sql.VarChar, "1.0")
            .input("DuongDanFile", sql.VarChar, filepath)
            .input("NguoiCapNhat", sql.Int, parseInt(nguoiTaiLen, 10))
            .query(`
                INSERT INTO PhienBanTaiLieu (MaTaiLieu, SoPhienBan, DuongDanFile, NgayCapNhat, NguoiCapNhat)
                VALUES (@MaTaiLieu, @SoPhienBan, @DuongDanFile, GETDATE(), @NguoiCapNhat)
            `);

        await transaction.commit();
        return maTaiLieu;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const getAllDocuments = async (maTaiKhoan, isAdmin) => {
    const pool = await getPool(); 
    const request = pool.request();
    
    let queryStr = `
        SELECT 
            TL.MaTaiLieu, TL.TenTaiLieu, TL.MoTa, TL.DuongDanFile, TL.NgayTaiLen,
            LT.TenLoaiTaiLieu, LT.MaLoaiTaiLieu,
            TK.HoTen AS NguoiTaiLen
        FROM TaiLieuSoHoa TL
        LEFT JOIN LoaiTaiLieu LT ON TL.MaLoaiTaiLieu = LT.MaLoaiTaiLieu
        LEFT JOIN TaiKhoan TK ON TL.NguoiTaiLen = TK.MaTaiKhoan
        ORDER BY TL.NgayTaiLen DESC
    `;
    
    const result = await request.query(queryStr);
    return result.recordset;
};

const updateDocument = async (maTaiLieu, docData, filepath, nguoiCapNhat) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        await new sql.Request(transaction)
            .input("MaTaiLieu", sql.Int, parseInt(maTaiLieu, 10))
            .input("TenTaiLieu", sql.NVarChar, docData.tenTaiLieu)
            .input("MaLoaiTaiLieu", sql.Int, parseInt(docData.maLoaiTaiLieu, 10))
            .input("MoTa", sql.NVarChar, docData.moTa || "")
            .input("DuongDanFile", sql.VarChar, filepath)
            .query(`
                UPDATE TaiLieuSoHoa
                SET TenTaiLieu = @TenTaiLieu,
                    MaLoaiTaiLieu = @MaLoaiTaiLieu,
                    MoTa = @MoTa,
                    DuongDanFile = COALESCE(@DuongDanFile, DuongDanFile)
                WHERE MaTaiLieu = @MaTaiLieu
            `);

        // Tự động sinh Phiên bản mới nếu có đính kèm file thay thế
        if (filepath) {
            const countRes = await new sql.Request(transaction)
                .input("MaTaiLieu", sql.Int, parseInt(maTaiLieu, 10))
                .query(`SELECT COUNT(*) AS VerCount FROM PhienBanTaiLieu WHERE MaTaiLieu = @MaTaiLieu`);
            
            const nextVersion = `${countRes.recordset[0].VerCount + 1}.0`;

            await new sql.Request(transaction)
                .input("MaTaiLieu", sql.Int, parseInt(maTaiLieu, 10))
                .input("SoPhienBan", sql.VarChar, nextVersion)
                .input("DuongDanFile", sql.VarChar, filepath)
                .input("NguoiCapNhat", sql.Int, parseInt(nguoiCapNhat, 10))
                .query(`
                    INSERT INTO PhienBanTaiLieu (MaTaiLieu, SoPhienBan, DuongDanFile, NgayCapNhat, NguoiCapNhat)
                    VALUES (@MaTaiLieu, @SoPhienBan, @DuongDanFile, GETDATE(), @NguoiCapNhat)
                `);
        }

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const deleteDocument = async (maTaiLieu) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        await new sql.Request(transaction).input("MaTaiLieu", sql.Int, parseInt(maTaiLieu, 10))
            .query(`DELETE FROM PhienBanTaiLieu WHERE MaTaiLieu = @MaTaiLieu`);
        await new sql.Request(transaction).input("MaTaiLieu", sql.Int, parseInt(maTaiLieu, 10))
            .query(`DELETE FROM TaiLieuSoHoa WHERE MaTaiLieu = @MaTaiLieu`);
        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const getDocTypes = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT MaLoaiTaiLieu, TenLoaiTaiLieu FROM LoaiTaiLieu ORDER BY TenLoaiTaiLieu`);
    return result.recordset;
};

module.exports = { createDocument, getAllDocuments, updateDocument, deleteDocument, getDocTypes };