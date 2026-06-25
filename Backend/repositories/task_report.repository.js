// backend/repositories/task_report.repository.js
const sql = require("mssql"); 
const { getPool } = require("../config/database");

// ============================================================================
// 1. LƯU BÁO CÁO TIẾN ĐỘ + FILE ĐÍNH KÈM + CẬP NHẬT TRẠNG THÁI TASK
// ============================================================================
const addReportAndUpdateTask = async (maCongViec, maTaiKhoan, data, danhSachFile = []) => {
    const pool = await getPool(); 
    const transaction = new sql.Transaction(pool); 
    
    try {
        await transaction.begin();

        // Bước A: Thêm mới báo cáo vào đúng bảng BaoCaoCongViec
        const reportResult = await new sql.Request(transaction)
            .input("MaCongViec", sql.Int, maCongViec)
            .input("MaTaiKhoan", sql.Int, maTaiKhoan)
            .input("NoiDungBaoCao", sql.NVarChar(sql.MAX), data.noiDungBaoCao)
            .input("TyLeHoanThanh", sql.Int, data.tyLeHoanThanh)
            .query(`
                INSERT INTO BaoCaoCongViec (MaCongViec, MaTaiKhoan, NoiDungBaoCao, TyLeHoanThanh, NgayBaoCao)
                OUTPUT INSERTED.MaBaoCao
                VALUES (@MaCongViec, @MaTaiKhoan, @NoiDungBaoCao, @TyLeHoanThanh, GETDATE())
            `);
        
        const maBaoCao = reportResult.recordset[0].MaBaoCao;

        // Bước B: Lưu danh sách file đính kèm vào TepDinhKemCongViec
        if (danhSachFile && Array.isArray(danhSachFile) && danhSachFile.length > 0) {
            for (const fileObj of danhSachFile) {
                // 🌟 ĐÃ SỬA: Lấy trực tiếp tên và url mã hóa (Không cần băm chuỗi string nữa)
                if (!fileObj || !fileObj.duongDanTep) continue;

                await new sql.Request(transaction)
                    .input("MaCongViec", sql.Int, maCongViec)
                    .input("MaBaoCao", sql.Int, maBaoCao) 
                    .input("TenTep", sql.NVarChar(300), fileObj.tenTepGoc)        // Lưu tên gốc cho UI
                    .input("DuongDanTep", sql.VarChar(1000), fileObj.duongDanTep) // Lưu tên mã hóa để chống trùng
                    .input("NguoiTaiLen", sql.Int, maTaiKhoan) 
                    .query(`
                        INSERT INTO TepDinhKemCongViec (MaCongViec, MaBaoCao, TenTep, DuongDanTep, NguoiTaiLen, NgayTaiLen)
                        VALUES (@MaCongViec, @MaBaoCao, @TenTep, @DuongDanTep, @NguoiTaiLen, GETDATE())
                    `);
            }
        }

        // Bước C: Logic tự động cập nhật trạng thái của Công việc mẹ dựa trên tỷ lệ % (GIỮ NGUYÊN)
        const tyLe = Number(data.tyLeHoanThanh);
        if (tyLe === 100) {
            await new sql.Request(transaction)
                .input("MaCongViec", sql.Int, maCongViec)
                .query(`UPDATE CongViec SET TrangThai = 'HOAN_THANH', NgayHoanThanh = GETDATE() WHERE MaCongViec = @MaCongViec`);
        } else if (tyLe > 0) {
            await new sql.Request(transaction)
                .input("MaCongViec", sql.Int, maCongViec)
                .query(`
                    UPDATE CongViec 
                    SET TrangThai = 'DANG_THUC_HIEN' 
                    WHERE MaCongViec = @MaCongViec AND TrangThai IN ('CHUA_THUC_HIEN', 'TRE_HAN')
                `);
        }

        await transaction.commit();
        return maBaoCao;
    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi tại Report Repository:", error.message);
        throw error;
    }
};

// ============================================================================
// 2. LẤY DANH SÁCH BÁO CÁO CỦA MỘT TASK (Bao gồm File đính kèm dạng JSON)
// ============================================================================
const getReportsByTask = async (maCongViec) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaCongViec", sql.Int, maCongViec)
        .query(`
            SELECT 
                BC.MaBaoCao, BC.NoiDungBaoCao, BC.TyLeHoanThanh, BC.NgayBaoCao,
                TK.HoTen AS NguoiBaoCao,
                (
                    SELECT T.TenTep, T.DuongDanTep 
                    FROM TepDinhKemCongViec T 
                    WHERE T.MaBaoCao = BC.MaBaoCao 
                    FOR JSON PATH
                ) AS TepDinhKem
            FROM BaoCaoCongViec BC
            INNER JOIN TaiKhoan TK ON BC.MaTaiKhoan = TK.MaTaiKhoan
            WHERE BC.MaCongViec = @MaCongViec
            ORDER BY BC.NgayBaoCao DESC
        `);

    return result.recordset.map(row => {
        row.TepDinhKem = row.TepDinhKem ? JSON.parse(row.TepDinhKem) : [];
        return row;
    });
};

// ============================================================================
// 3. LẤY DANH SÁCH CÔNG VIỆC CỦA NHÂN VIÊN
// ============================================================================
const getMyAssignedTasks = async (maTaiKhoan) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .query(`
            SELECT 
                CV.MaCongViec, CV.MaCongViecNoiBo, CV.TieuDe, CV.NoiDung, CV.MucDoUuTien, CV.TrangThai, CV.HanHoanThanh,
                TK.HoTen AS NguoiGiaoViec,
                ISNULL((
                    SELECT TOP 1 BC.TyLeHoanThanh 
                    FROM BaoCaoCongViec BC 
                    WHERE BC.MaCongViec = CV.MaCongViec 
                    ORDER BY BC.NgayBaoCao DESC
                ), 0) AS TyLeHoanThanh
            FROM CongViec CV
            INNER JOIN PhanCongCongViec PC ON CV.MaCongViec = PC.MaCongViec
            INNER JOIN TaiKhoan TK ON CV.NguoiTao = TK.MaTaiKhoan
            WHERE PC.MaTaiKhoan = @MaTaiKhoan
            ORDER BY CV.HanHoanThanh ASC
        `);
    return result.recordset;
};

// ============================================================================
// 4. CÁC HÀM CRUD CƠ BẢN
// ============================================================================
const getAllByTask = async (maCongViec) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaCongViec", sql.Int, maCongViec)
        .query(`SELECT * FROM BaoCaoCongViec WHERE MaCongViec = @MaCongViec ORDER BY NgayBaoCao DESC`);
    return result.recordset;
};

const create = async (data) => {
    const pool = await getPool();
    await pool.request()
        .input("MaCongViec", sql.Int, data.maCongViec)
        .input("MaTaiKhoan", sql.Int, data.maTaiKhoan)
        .input("NoiDungBaoCao", sql.NVarChar, data.noiDungBaoCao)
        .input("TyLeHoanThanh", sql.Int, data.tyLeHoanThanh)
        .query(`
            INSERT INTO BaoCaoCongViec  (MaCongViec, MaTaiKhoan, NoiDungBaoCao, TyLeHoanThanh, NgayBaoCao) 
            VALUES (@MaCongViec, @MaTaiKhoan, @NoiDungBaoCao, @TyLeHoanThanh, GETDATE())
        `);
    return true;
};

const update = async (maBaoCao, data) => {
    const pool = await getPool();
    await pool.request()
        .input("MaBaoCao", sql.Int, maBaoCao)
        .input("NoiDung", sql.NVarChar, data.noiDungBaoCao)
        .input("TyLe", sql.Int, data.tyLeHoanThanh)
        .query(`UPDATE BaoCaoCongViec SET NoiDungBaoCao = @NoiDung, TyLeHoanThanh = @TyLe WHERE MaBaoCao = @MaBaoCao`);
    return true;
};

const remove = async (maBaoCao) => {
    const pool = await getPool();
    await pool.request()
        .input("MaBaoCao", sql.Int, maBaoCao)
        .query(`DELETE FROM BaoCaoCongViec WHERE MaBaoCao = @MaBaoCao`);
    return true;
};



module.exports = {
    addReportAndUpdateTask,
    getReportsByTask,
    getMyAssignedTasks,
    getAllByTask,
    create,
    update,
    remove,
    createReportTransaction: addReportAndUpdateTask 

};