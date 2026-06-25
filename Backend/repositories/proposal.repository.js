const { getPool } = require("../config/database");
const sql = require("mssql");

const getMyProposals = async (maTaiKhoan) => {
    const pool = await getPool(); 
    const result = await pool.request()
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .query(`
            SELECT D.*, NULL AS MaPheDuyet, 'DA_TAO' AS PhanLoai, DQT.MaQuyTrinh, QT.LoaiKy AS LoaiQuyTrinh,
                   (SELECT TenTep, DuongDanTep FROM TepDinhKemDeXuat WHERE MaDeXuat = D.MaDeXuat FOR JSON PATH) AS DanhSachFile,
                   -- 🌟 ĐÃ FIX: Lấy TOÀN BỘ thông tin (Trạng thái, Ý kiến) của Hội đồng duyệt
                   (SELECT MaTaiKhoan, TrangThai, YKien FROM PheDuyetDeXuat WHERE MaDeXuat = D.MaDeXuat FOR JSON PATH) AS DanhSachNguoiDuyet
            FROM DeXuat D 
            LEFT JOIN DeXuatQuyTrinh DQT ON D.MaDeXuat = DQT.MaDeXuat
            LEFT JOIN QuyTrinhPheDuyet QT ON DQT.MaQuyTrinh = QT.MaQuyTrinh
            WHERE D.NguoiTao = @MaTaiKhoan
            
            UNION
            
            SELECT D.*, PD.MaPheDuyet, 'CAN_DUYET' AS PhanLoai, DQT.MaQuyTrinh, QT.LoaiKy AS LoaiQuyTrinh,
                   (SELECT TenTep, DuongDanTep FROM TepDinhKemDeXuat WHERE MaDeXuat = D.MaDeXuat FOR JSON PATH) AS DanhSachFile,
                   -- 🌟 ĐÃ FIX: Lấy TOÀN BỘ thông tin (Trạng thái, Ý kiến) của Hội đồng duyệt
                   (SELECT MaTaiKhoan, TrangThai, YKien FROM PheDuyetDeXuat WHERE MaDeXuat = D.MaDeXuat FOR JSON PATH) AS DanhSachNguoiDuyet
            FROM DeXuat D 
            INNER JOIN PheDuyetDeXuat PD ON D.MaDeXuat = PD.MaDeXuat
            LEFT JOIN DeXuatQuyTrinh DQT ON D.MaDeXuat = DQT.MaDeXuat
            LEFT JOIN QuyTrinhPheDuyet QT ON DQT.MaQuyTrinh = QT.MaQuyTrinh
            WHERE PD.MaTaiKhoan = @MaTaiKhoan
        `);
    return result.recordset;
};

const getAllProposals = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT 
            D.*, 
            T.HoTen AS TenNguoiTao,
            P.MaTaiKhoan AS MaNguoiDuyet,
            ND.HoTen AS TenNguoiDuyet
        FROM DeXuat D 
        LEFT JOIN TaiKhoan T ON D.NguoiTao = T.MaTaiKhoan 
        LEFT JOIN PheDuyetDeXuat P ON D.MaDeXuat = P.MaDeXuat
        LEFT JOIN TaiKhoan ND ON P.MaTaiKhoan = ND.MaTaiKhoan
        ORDER BY D.NgayTao DESC
    `);
    return result.recordset;
};

const getEmailTaiKhoan = async (maTaiKhoan) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .query(`SELECT Email FROM TaiKhoan WHERE MaTaiKhoan = @MaTaiKhoan`);
    return result.recordset.length > 0 ? result.recordset[0].Email : null;
};

// Hàm hỗ trợ chuẩn hóa đường dẫn linh động 
const formatFilePath = (path) => {
    if (!path) return null;
    let formattedPath = path.replace(/\\/g, '/');
    if (!formattedPath.startsWith('/')) {
        formattedPath = '/' + formattedPath;
    }
    return formattedPath;
};

const create = async (tieuDe, noiDung, loaiDeXuat, nguoiNhanDuyet, nguoiTao, danhSachFile = [], maQuyTrinh) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    let newMaDeXuat;

    try {
        await transaction.begin();

        // 1. Lấy link file bìa (File đầu tiên trong mảng)
        let duongDanFile = null;
        if (danhSachFile && danhSachFile.length > 0 && danhSachFile[0].filename) {
            duongDanFile = `uploads/dexuat/${danhSachFile[0].filename}`;
        }

        // 2. Lưu vào bảng DeXuat (Bảo vệ an toàn bằng @TempID chống đụng độ Trigger)
        const resDX = await new sql.Request(transaction)
            .input("TieuDe", sql.NVarChar, tieuDe)
            .input("NoiDung", sql.NVarChar, noiDung)
            .input("LoaiDeXuat", sql.NVarChar, loaiDeXuat)
            .input("DuongDanFile", sql.VarChar, duongDanFile) 
            .input("NguoiTao", sql.Int, nguoiTao)
            .input("TrangThai", sql.VarChar, 'CHO_DUYET')
            .query(`
                DECLARE @TempID TABLE (MaDeXuat INT);

                INSERT INTO DeXuat (SoDeXuat, TieuDe, NoiDung, LoaiDeXuat, DuongDanFile, NguoiTao, NgayTao, TrangThai)
                OUTPUT INSERTED.MaDeXuat INTO @TempID
                VALUES ('DX' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'), @TieuDe, @NoiDung, @LoaiDeXuat, @DuongDanFile, @NguoiTao, GETDATE(), @TrangThai);
                
                SELECT MaDeXuat FROM @TempID;
            `);
            
        newMaDeXuat = resDX.recordset[0].MaDeXuat;

        // 3. Phân công NGƯỜI DUYỆT (Tách chuỗi thành mảng và chạy vòng lặp)
        const listNguoiDuyet = typeof nguoiNhanDuyet === 'string'
            ? nguoiNhanDuyet.split(',').map(id => parseInt(id.trim())).filter(Boolean)
            : (Array.isArray(nguoiNhanDuyet) ? nguoiNhanDuyet.map(id => parseInt(id)) : [parseInt(nguoiNhanDuyet)]);

        for (let i = 0; i < listNguoiDuyet.length; i++) {
            await new sql.Request(transaction)
                .input("MaDeXuat", sql.Int, newMaDeXuat)
                .input("MaTaiKhoan", sql.Int, listNguoiDuyet[i])
                .input("ThuTuPheDuyet", sql.Int, i + 1)
                .input("TrangThai", sql.VarChar, 'CHO_DUYET')
                .query(`
                    INSERT INTO PheDuyetDeXuat (MaDeXuat, MaTaiKhoan, ThuTuPheDuyet, TrangThai)
                    VALUES (@MaDeXuat, @MaTaiKhoan, @ThuTuPheDuyet, @TrangThai)
                `);
        }

        // 4. Lưu QUY TRÌNH DUYỆT (1: Cấp Bậc, 2: Tự do)
        const maQuyTrinhApDung = maQuyTrinh ? parseInt(maQuyTrinh) : 2;
        await new sql.Request(transaction)
            .input("MaDeXuat", sql.Int, newMaDeXuat)
            .input("MaQuyTrinh", sql.Int, maQuyTrinhApDung)
            .query(`
                INSERT INTO DeXuatQuyTrinh (MaDeXuat, MaQuyTrinh) 
                VALUES (@MaDeXuat, @MaQuyTrinh)
            `);

        // 5. Xử lý lưu TỆP ĐÍNH KÈM
        let listFiles = [];
        if (Array.isArray(danhSachFile)) {
            listFiles = danhSachFile;
        } else if (danhSachFile && typeof danhSachFile === 'object' && danhSachFile.filename) {
            listFiles = [danhSachFile]; 
        }

        if (listFiles.length > 0) {
            for (const file of listFiles) {
                if (!file || !file.filename) continue; // Rào chắn file rác

                const urlTep = `uploads/dexuat/${file.filename}`;
                const originalName = decodeURIComponent(file.originalname || "Tai_Lieu_Dinh_Kem");
                
                await new sql.Request(transaction)
                    .input("MaDeXuat", sql.Int, newMaDeXuat) // Bỏ biến rác đi
                    .input("TenTep", sql.NVarChar(300), originalName)
                    .input("DuongDanTep", sql.VarChar(1000), urlTep)
                    .input("NguoiTaiLen", sql.Int, nguoiTao) // Dùng luôn nguoiTao ở tham số
                    .query(`
                        INSERT INTO TepDinhKemDeXuat (MaDeXuat, TenTep, DuongDanTep, NguoiTaiLen, NgayTaiLen)
                        VALUES (@MaDeXuat, @TenTep, @DuongDanTep, @NguoiTaiLen, GETDATE())
                    `);
            }
        }

        await transaction.commit();
        
        // (Nếu bạn có phần Gửi thông báo Notification thì cứ để nguyên ở ngay dưới dòng này nhé)
        return { maDeXuat: newMaDeXuat, message: "Tạo đề xuất thành công" };

    } catch (error) {
        await transaction.rollback();
        throw new Error("Lỗi cơ sở dữ liệu khi tạo đề xuất: " + error.message);
    }
};

const update = async (maDeXuat, tieuDe, noiDung, loaiDeXuat, listNguoiDuyet, listFiles, maQuyTrinh) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Cập nhật thông tin cơ bản bảng DeXuat
        await new sql.Request(transaction)
            .input("MaDeXuat", sql.Int, maDeXuat)
            .input("TieuDe", sql.NVarChar, tieuDe)
            .input("NoiDung", sql.NVarChar, noiDung)
            .input("LoaiDeXuat", sql.NVarChar, loaiDeXuat)
            .query(`
                UPDATE DeXuat 
                SET TieuDe = @TieuDe, 
                    NoiDung = @NoiDung, 
                    LoaiDeXuat = @LoaiDeXuat,
                    TrangThai = 'CHO_DUYET' -- Reset lại trạng thái để trình duyệt lại
                WHERE MaDeXuat = @MaDeXuat
            `);

        // 🌟 2. BẢO VỆ LỊCH SỬ KÝ DUYỆT (GIỮ NGUYÊN Ý KIẾN CŨ CỦA SẾP)
        if (listNguoiDuyet && listNguoiDuyet.length > 0) {
            const inClause = listNguoiDuyet.join(',');
            
            // Bước A: Xóa những sếp bị nhân viên gạch tên (Không trình sếp đó nữa)
            await new sql.Request(transaction)
                .input("MaDeXuat", sql.Int, maDeXuat)
                .query(`DELETE FROM PheDuyetDeXuat WHERE MaDeXuat = @MaDeXuat AND MaTaiKhoan NOT IN (${inClause})`);

            // 🌟 Bước B (ĐÃ SỬA THEO Ý BẠN): Chỉ reset trạng thái về 'CHO_DUYET', TUYỆT ĐỐI KHÔNG XÓA YKien
            await new sql.Request(transaction)
                .input("MaDeXuat", sql.Int, maDeXuat)
                .query(`
                    UPDATE PheDuyetDeXuat 
                    SET TrangThai = 'CHO_DUYET' 
                    WHERE MaDeXuat = @MaDeXuat AND TrangThai IN ('TRA_VE', 'TU_CHOI')
                `);

            // Bước C: Chèn sếp mới HOẶC Cập nhật lại số thứ tự
            for (let i = 0; i < listNguoiDuyet.length; i++) {
                await new sql.Request(transaction)
                    .input("MaDeXuat", sql.Int, maDeXuat)
                    .input("MaTaiKhoan", sql.Int, listNguoiDuyet[i])
                    .input("ThuTuPheDuyet", sql.Int, i + 1)
                    .query(`
                        IF EXISTS (SELECT 1 FROM PheDuyetDeXuat WHERE MaDeXuat = @MaDeXuat AND MaTaiKhoan = @MaTaiKhoan)
                        BEGIN
                            -- Sếp đã có mặt trong đơn -> Chỉ cập nhật số thứ tự, giữ nguyên Trạng Thái và Ý Kiến
                            UPDATE PheDuyetDeXuat 
                            SET ThuTuPheDuyet = @ThuTuPheDuyet 
                            WHERE MaDeXuat = @MaDeXuat AND MaTaiKhoan = @MaTaiKhoan
                        END
                        ELSE
                        BEGIN
                            -- Người mới hoàn toàn -> Thêm vào với trạng thái CHO_DUYET
                            INSERT INTO PheDuyetDeXuat (MaDeXuat, MaTaiKhoan, ThuTuPheDuyet, TrangThai)
                            VALUES (@MaDeXuat, @MaTaiKhoan, @ThuTuPheDuyet, 'CHO_DUYET')
                        END
                    `);
            }
        }

        // 3. Cập nhật quy trình duyệt áp dụng
        await new sql.Request(transaction)
            .input("MaDeXuat", sql.Int, maDeXuat)
            .query(`DELETE FROM DeXuatQuyTrinh WHERE MaDeXuat = @MaDeXuat`);

        const maQuyTrinhApDung = maQuyTrinh ? parseInt(maQuyTrinh) : 2;
        await new sql.Request(transaction)
            .input("MaDeXuat", sql.Int, maDeXuat)
            .input("MaQuyTrinh", sql.Int, maQuyTrinhApDung)
            .query(`
                INSERT INTO DeXuatQuyTrinh (MaDeXuat, MaQuyTrinh) 
                VALUES (@MaDeXuat, @MaQuyTrinh)
            `);

        // 4. LƯU TỆP ĐÍNH KÈM VÀO BẢNG
        if (listFiles && listFiles.length > 0) {
            
            const getCreator = await new sql.Request(transaction)
                .input("MaDeXuat", sql.Int, maDeXuat)
                .query(`SELECT NguoiTao FROM DeXuat WHERE MaDeXuat = @MaDeXuat`);
            const nguoiTao = getCreator.recordset[0]?.NguoiTao || 0;

            let fileBiaDauTien = null; 

            for (const file of listFiles) {
                if (!file || !file.filename) continue;

                const urlTep = `uploads/dexuat/${file.filename}`;
                const originalName = decodeURIComponent(file.originalname || "Tai_Lieu_Dinh_Kem");
                
                if (!fileBiaDauTien) fileBiaDauTien = urlTep; 

                await new sql.Request(transaction)
                    .input("MaDeXuat", sql.Int, maDeXuat)
                    .input("TenTep", sql.NVarChar(300), originalName)
                    .input("DuongDanTep", sql.VarChar(1000), urlTep)
                    .input("NguoiTaiLen", sql.Int, nguoiTao)
                    .query(`
                        INSERT INTO TepDinhKemDeXuat (MaDeXuat, TenTep, DuongDanTep, NguoiTaiLen, NgayTaiLen)
                        VALUES (@MaDeXuat, @TenTep, @DuongDanTep, @NguoiTaiLen, GETDATE())
                    `);
            }
            
            if (fileBiaDauTien) {
                await new sql.Request(transaction)
                    .input("MaDeXuat", sql.Int, maDeXuat)
                    .input("DuongDanFile", sql.VarChar, fileBiaDauTien)
                    .query(`UPDATE DeXuat SET DuongDanFile = @DuongDanFile WHERE MaDeXuat = @MaDeXuat`);
            }
        }

        await transaction.commit();
        
    } catch (error) {
        await transaction.rollback();
        throw new Error("Lỗi cơ sở dữ liệu khi cập nhật đề xuất: " + error.message);
    }
};

const signProposal = async (maPheDuyet, maChuKyNguoiDung, diaChiIP, yKien) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaPheDuyet", sql.Int, maPheDuyet)
        .input("MaChuKyNguoiDung", sql.Int, maChuKyNguoiDung)
        .input("DiaChiIP", sql.VarChar(100), diaChiIP)
        .input("YKien", sql.NVarChar(sql.MAX), yKien || "")
        .execute("SP_KyDeXuat"); 
    return result;
};

const rejectProposal = async (maPheDuyet, yKien) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaPheDuyet", sql.Int, maPheDuyet)
        .input("YKien", sql.NVarChar(sql.MAX), yKien || "")
        .execute("SP_TuChoiDeXuat");
    return result;
};

const returnProposal = async (maPheDuyet, yKien) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaPheDuyet", sql.Int, maPheDuyet)
        .input("YKien", sql.NVarChar(sql.MAX), yKien || "")
        .execute("SP_TraVeDeXuat");
    return result;
};

const resubmitProposal = async (maDeXuat, maTaiKhoan) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaDeXuat", sql.Int, maDeXuat)
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .execute("SP_GuiLaiDeXuat");
    return result;
};

// 🌟 HÀM MỚI: Trích xuất toàn bộ dữ liệu Đề xuất + Các bước duyệt + Chữ ký ảnh để In
const getProposalDetailsForPrint = async (maDeXuat) => {
    const pool = await getPool();
    
    // 1. Lấy thông tin chung của Tờ trình (🌟 ĐÃ NÂNG CẤP: Lấy thêm chữ ký của người lập)
    const deXuat = await pool.request()
        .input("MaDeXuat", sql.Int, maDeXuat)
        .query(`
            SELECT D.*, T.HoTen AS NguoiTaoTen, T.MaPhongBan, P.TenPhongBan,
                   CK.DuongDanAnhChuKy AS ChuKyNguoiTao -- 🌟 Lấy đường dẫn chữ ký số của người lập
            FROM DeXuat D
            LEFT JOIN TaiKhoan T ON D.NguoiTao = T.MaTaiKhoan
            LEFT JOIN PhongBan P ON T.MaPhongBan = P.MaPhongBan
            -- 🌟 Nối bảng ChuKyNguoiDung để quét xem người lập có cài chữ ký mặc định chưa
            LEFT JOIN ChuKyNguoiDung CK ON T.MaTaiKhoan = CK.MaTaiKhoan AND CK.DangSuDung = 1 
            WHERE D.MaDeXuat = @MaDeXuat
        `);

    // 2. Lấy danh sách những người đã duyệt, ý kiến và ẢNH CHỮ KÝ (Giữ nguyên)
    const pheDuyet = await pool.request()
        .input("MaDeXuat", sql.Int, maDeXuat)
        .query(`
            SELECT PD.ThuTuPheDuyet, PD.TrangThai, PD.YKien, PD.NgayPheDuyet,
                   T.HoTen AS NguoiDuyet, CV.TenChucVu,
                   CK.DuongDanAnhChuKy, CKS.ThoiGianKy
            FROM PheDuyetDeXuat PD
            JOIN TaiKhoan T ON PD.MaTaiKhoan = T.MaTaiKhoan
            LEFT JOIN ChucVu CV ON T.MaChucVu = CV.MaChucVu
            LEFT JOIN ChuKySo CKS ON PD.MaPheDuyet = CKS.MaPheDuyet
            LEFT JOIN ChuKyNguoiDung CK ON CKS.MaChuKyNguoiDung = CK.MaChuKyNguoiDung
            WHERE PD.MaDeXuat = @MaDeXuat
            ORDER BY PD.ThuTuPheDuyet ASC
        `);

    return {
        thongTinChung: deXuat.recordset[0] || null,
        lichSuPheDuyet: pheDuyet.recordset || []
    };
};

module.exports = {
    create, signProposal, rejectProposal, returnProposal, resubmitProposal, getMyProposals, getAllProposals, getProposalDetailsForPrint, getEmailTaiKhoan, update
};