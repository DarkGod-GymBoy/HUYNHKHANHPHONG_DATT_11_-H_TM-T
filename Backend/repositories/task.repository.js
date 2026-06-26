const sql = require("mssql");
const { getPool } = require("../config/database");

// 1. TẠO CÔNG VIỆC VÀ PHÂN CÔNG ĐA NHÂN SỰ (TRANSACTION)
const createAndAssignTaskTransaction = async (data) => {
    const { maCongViecNoiBo, tieuDe, noiDung, mucDoUuTien, trangThai, ngayBatDau, hanHoanThanh, danhSachNguoiNhan, danhSachFile, nguoiTaoId } = data;

    const pool = await getPool(); 
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
       
        // [Bước 1] Tạo công việc mẹ - Khớp chính xác các cột của bảng [CongViec]
        const taskResult = await new sql.Request(transaction)
            .input("MaCongViecNoiBo", sql.VarChar(50), maCongViecNoiBo || null)
            .input("TieuDe", sql.NVarChar(500), tieuDe)
            .input("NoiDung", sql.NVarChar(sql.MAX), noiDung || null)
            .input("MucDoUuTien", sql.NVarChar(50), mucDoUuTien || null)
            .input("TrangThai", sql.NVarChar(50), trangThai || null)
            .input("NgayBatDau", sql.DateTime, ngayBatDau ? new Date(ngayBatDau) : null)
            .input("HanHoanThanh", sql.DateTime, hanHoanThanh ? new Date(hanHoanThanh) : null)
            .input("NguoiTao", sql.Int, parseInt(nguoiTaoId, 10)) 
            .query(`
                INSERT INTO CongViec (MaCongViecNoiBo, TieuDe, NoiDung, MucDoUuTien, TrangThai, NgayBatDau, HanHoanThanh, NguoiTao, NgayTao)
                OUTPUT INSERTED.MaCongViec
                VALUES (@MaCongViecNoiBo, @TieuDe, @NoiDung, @MucDoUuTien, @TrangThai, @NgayBatDau, @HanHoanThanh, @NguoiTao, GETDATE())
            `);

        const maCongViec = taskResult.recordset[0].MaCongViec;

        // [Bước 2] Phân công đa nhân sự - Khớp chính xác bảng [PhanCongCongViec]
        if (danhSachNguoiNhan && danhSachNguoiNhan.length > 0) {
            for (const maNhanSu of danhSachNguoiNhan) {
                if (!maNhanSu) continue;
                await new sql.Request(transaction)
                    .input("MaCongViec", sql.Int, maCongViec)
                    .input("MaTaiKhoan", sql.Int, parseInt(maNhanSu, 10)) 
                    .query(`
                        INSERT INTO PhanCongCongViec (MaCongViec, MaTaiKhoan, NgayPhanCong)
                        VALUES (@MaCongViec, @MaTaiKhoan, GETDATE())
                    `);
            }
        }

        // [Bước 3] Lưu tệp tin đính kèm - Khớp chính xác bảng [TepDinhKemCongViec]
        if (danhSachFile && danhSachFile.length > 0) {
            for (const fileObj of danhSachFile) {
                if (!fileObj || !fileObj.duongDanTep) continue;

                await new sql.Request(transaction)
                    .input("MaCongViec", sql.Int, maCongViec)
                    .input("TenTep", sql.NVarChar(300), fileObj.tenTepGoc)     
                    .input("DuongDanTep", sql.VarChar(1000), fileObj.duongDanTep) 
                    .input("NguoiTaiLen", sql.Int, parseInt(nguoiTaoId, 10)) 
                    .query(`
                        INSERT INTO TepDinhKemCongViec (MaCongViec, TenTep, DuongDanTep, NguoiTaiLen, NgayTaiLen)
                        VALUES (@MaCongViec, @TenTep, @DuongDanTep, @NguoiTaiLen, GETDATE())
                    `);
            }
        }

        await transaction.commit();
        return maCongViec;

    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi tại Repo createAndAssignTaskTransaction:", error.message);
        throw error;
    }
};

// 2. LẤY DANH SÁCH TẤT CẢ CÔNG VIỆC (ADMIN)
const getAllTasks = async () => {
    try {
        const pool = await getPool(); 
        const result = await pool.request().query(`
            SELECT 
                CV.MaCongViec, CV.MaCongViecNoiBo, CV.TieuDe, CV.NoiDung, CV.MucDoUuTien, CV.TrangThai, 
                CV.NgayBatDau, CV.HanHoanThanh, CV.NgayHoanThanh, CV.NgayTao,
                TK.HoTen AS NguoiTaoTen,
                STUFF((
                    SELECT ', ' + E.HoTen
                    FROM PhanCongCongViec PC
                    INNER JOIN TaiKhoan E ON PC.MaTaiKhoan = E.MaTaiKhoan
                    WHERE PC.MaCongViec = CV.MaCongViec
                    FOR XML PATH('')
                ), 1, 2, '') AS DanhSachNhanSu,
                
                ISNULL((
                    SELECT TOP 1 BC.TyLeHoanThanh 
                    FROM BaoCaoCongViec BC 
                    WHERE BC.MaCongViec = CV.MaCongViec 
                    ORDER BY BC.NgayBaoCao DESC
                ), 0) AS TyLeHoanThanh
            FROM CongViec CV
            LEFT JOIN TaiKhoan TK ON CV.NguoiTao = TK.MaTaiKhoan
            ORDER BY CV.NgayTao DESC
        `);
        return result.recordset;
    } catch (error) {
        console.error("❌ Lỗi tại Repo getAllTasks:", error.message);
        throw error;
    }
};

// 3. CẬP NHẬT CÔNG VIỆC
const updateTask = async (maCongViec, taskData) => {
    const pool = await getPool(); 
    const transaction = new sql.Transaction(pool);
    try {
        const taskId = parseInt(maCongViec, 10);
        if (isNaN(taskId)) throw new Error("MaCongViec khong hop le khi Update!");

        await transaction.begin();

        await new sql.Request(transaction)
            .input("MaCongViec", sql.Int, taskId)
            .input("MaCongViecNoiBo", sql.VarChar(50), taskData.maCongViecNoiBo || null)
            .input("TieuDe", sql.NVarChar(500), taskData.tieuDe)
            .input("NoiDung", sql.NVarChar(sql.MAX), taskData.noiDung || null)
            .input("MucDoUuTien", sql.NVarChar(50), taskData.mucDoUuTien || null)
            .input("TrangThai", sql.NVarChar(50), taskData.trangThai || null)
            .input("NgayBatDau", sql.DateTime, taskData.ngayBatDau ? new Date(taskData.ngayBatDau) : null)
            .input("HanHoanThanh", sql.DateTime, taskData.hanHoanThanh ? new Date(taskData.hanHoanThanh) : null)
            .query(`
                UPDATE CongViec 
                SET MaCongViecNoiBo = @MaCongViecNoiBo,
                    TieuDe = @TieuDe, NoiDung = @NoiDung, MucDoUuTien = @MucDoUuTien, TrangThai = @TrangThai, 
                    NgayBatDau = @NgayBatDau, HanHoanThanh = @HanHoanThanh,
                    NgayHoanThanh = CASE WHEN @TrangThai = 'HOAN_THANH' THEN GETDATE() ELSE NULL END
                WHERE MaCongViec = @MaCongViec
            `);

        if (taskData.danhSachFile && taskData.danhSachFile.length > 0) {
            await new sql.Request(transaction)
                .input("MaCongViec", sql.Int, taskId)
                .query(`DELETE FROM TepDinhKemCongViec WHERE MaCongViec = @MaCongViec`);

            for (const fileObj of taskData.danhSachFile) {
                if (!fileObj || !fileObj.duongDanTep) continue;
                await new sql.Request(transaction)
                    .input("MaCongViec", sql.Int, taskId)
                    .input("TenTep", sql.NVarChar(300), fileObj.tenTepGoc)
                    .input("DuongDanTep", sql.VarChar(1000), fileObj.duongDanTep)
                    .query(`
                        INSERT INTO TepDinhKemCongViec (MaCongViec, TenTep, DuongDanTep, NgayTaiLen)
                        VALUES (@MaCongViec, @TenTep, @DuongDanTep, GETDATE())
                    `);
            }
        }

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi tại Repo updateTask:", error.message);
        throw error;
    }
};

// 4. XÓA VÀ THU HỒI CÔNG VIỆC (🌟 ĐÃ SỬA: Khớp chính xác 100% các bảng con trong 2.sql)
const deleteTask = async (maCongViec) => {
    const pool = await getPool(); 
    const transaction = new sql.Transaction(pool); 
    try {
        const taskId = parseInt(maCongViec, 10);
        if (isNaN(taskId)) throw new Error("MaCongViec khong hop le khi Delete!");

        await transaction.begin();
        
        // Loại bỏ hoàn toàn bảng ảo TepDinhKemBaoCao không tồn tại trong SQL của bạn
        await new sql.Request(transaction)
            .input("MaCongViec", sql.Int, taskId)
            .query(`
                DELETE FROM BinhLuanCongViec WHERE MaCongViec = @MaCongViec;
                DELETE FROM BaoCaoCongViec WHERE MaCongViec = @MaCongViec;
                DELETE FROM TepDinhKemCongViec WHERE MaCongViec = @MaCongViec;
                DELETE FROM PhanCongCongViec WHERE MaCongViec = @MaCongViec;
                DELETE FROM CongViec WHERE MaCongViec = @MaCongViec;
            `);

        await transaction.commit();
        return true;
    } catch (err) {
        await transaction.rollback();
        console.error("❌ Lỗi tại Repo deleteTask:", err.message);
        throw err;
    }
};

// 5. LẤY CHI TIẾT CÔNG VIỆC THEO ID
const getTaskById = async (maCongViec) => {
    try {
        const pool = await getPool(); 
        const taskId = parseInt(maCongViec, 10);
        if (isNaN(taskId)) throw new Error("MaCongViec khong hop le khi getTaskById!");

        const result = await pool.request()
            .input("MaCongViec", sql.Int, taskId)
            .query(`
                SELECT CV.*, ISNULL((SELECT TOP 1 BC.TyLeHoanThanh FROM BaoCaoCongViec BC WHERE BC.MaCongViec = CV.MaCongViec ORDER BY BC.NgayBaoCao DESC), 0) AS TyLeHoanThanh
                FROM CongViec CV WHERE CV.MaCongViec = @MaCongViec
            `);

        const task = result.recordset[0];
        if (task) {
            const fileResult = await pool.request()
                .input("MaCongViec", sql.Int, taskId)
                .query(`SELECT DuongDanTep FROM TepDinhKemCongViec WHERE MaCongViec = @MaCongViec`);
            task.TepDinhKem = fileResult.recordset;
        }
        return task;
    } catch (error) {
        console.error("❌ Lỗi tại Repo getTaskById:", error.message);
        throw error;
    }
};

// 6. LẤY DANH SÁCH CÔNG VIỆC CỦA USER ĐƯỢC GIAO
const getMyAssignedTasks = async (maTaiKhoan) => {
    try {
        const pool = await getPool();
        const accountId = parseInt(maTaiKhoan, 10);
        if (isNaN(accountId)) throw new Error("MaTaiKhoan khong hop le!");

        const result = await pool.request()
            .input("MaTaiKhoan", sql.Int, accountId)
            .query(`
                SELECT 
                    CV.MaCongViec, CV.MaCongViecNoiBo, CV.TieuDe, CV.NoiDung, CV.MucDoUuTien, CV.TrangThai,CV.NgayBatDau, CV.NgayTao, CV.HanHoanThanh,
                    TK.HoTen AS NguoiGiaoViec,
                    ISNULL((
                        SELECT TOP 1 BC.TyLeHoanThanh 
                        FROM BaoCaoCongViec BC 
                        WHERE BC.MaCongViec = CV.MaCongViec 
                        ORDER BY BC.NgayBaoCao DESC
                    ), 0) AS TyLeHoanThanh
                FROM CongViec CV
                INNER JOIN PhanCongCongViec PC ON CV.MaCongViec = PC.MaCongViec
                LEFT JOIN TaiKhoan TK ON CV.NguoiTao = TK.MaTaiKhoan
                WHERE PC.MaTaiKhoan = @MaTaiKhoan
                ORDER BY CV.HanHoanThanh ASC
            `);
        return result.recordset;
    } catch (error) {
        console.error("❌ Lỗi tại Repo getMyAssignedTasks:", error.message);
        throw error;
    }
};
// Tự động cập nhật trạng thái THAT_BAI
const autoFailOverdueTasks = async () => {
    const pool = await getPool();
    try {
        // Sử dụng IS NOT NULL để bỏ qua các công việc không set Deadline
        const result = await pool.request().query(`
            UPDATE CongViec
            SET TrangThai = 'THAT_BAI'
            WHERE HanHoanThanh IS NOT NULL 
              AND HanHoanThanh < GETDATE() 
              AND TrangThai NOT IN ('HOAN_THANH', 'THANH_CONG', 'THAT_BAI')
        `);
        
        // In ra log để bạn biết có bao nhiêu công việc vừa bị đánh rớt
        if (result.rowsAffected[0] > 0) {
            console.log(`⚠️ Đã tự động chuyển [${result.rowsAffected[0]}] công việc quá hạn sang THẤT BẠI.`);
        }
    } catch (error) {
        console.error("Lỗi khi tự động đánh rớt công việc:", error.message);
    }
};

module.exports = { 
    createAndAssignTaskTransaction, 
    getAllTasks, 
    updateTask, 
    deleteTask, 
    getTaskById, 
    getMyAssignedTasks ,
    autoFailOverdueTasks
};