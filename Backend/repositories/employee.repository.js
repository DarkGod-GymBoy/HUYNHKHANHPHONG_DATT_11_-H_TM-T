const sql = require("mssql");
const { getPool } = require("../config/database");

// 1. LẤY CHI TIẾT HỒ SƠ 
const getEmployeeDetail = async (maTaiKhoan) => {
    const pool = await getPool();
    const result = await pool.request()
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .query(`
            SELECT 
                TK.MaTaiKhoan, TK.TenDangNhap, TK.HoTen, TK.Email, TK.SoDienThoai, TK.TrangThai, TK.MaPhongBan, TK.MaChucVu, TK.MaVaiTro,
                PB.TenPhongBan, CV.TenChucVu, VT.TenVaiTro,
                HS.MaNhanVien, HS.MaNhanVienBV, HS.CCCD, HS.NgaySinh, HS.GioiTinh, HS.DiaChi, HS.NgayVaoLam, HS.AnhDaiDien,
                HD.SoHopDong, HD.LoaiHopDong, HD.NgayBatDau, HD.NgayKetThuc, HD.TrangThai AS TrangThaiHopDong
            FROM TaiKhoan TK
            LEFT JOIN HoSoNhanVien HS ON TK.MaTaiKhoan = HS.MaTaiKhoan
            LEFT JOIN PhongBan PB ON TK.MaPhongBan = PB.MaPhongBan
            LEFT JOIN ChucVu CV ON TK.MaChucVu = CV.MaChucVu
            LEFT JOIN VaiTro VT ON TK.MaVaiTro = VT.MaVaiTro
            OUTER APPLY (
                SELECT TOP 1 SoHopDong, LoaiHopDong, NgayBatDau, NgayKetThuc, TrangThai
                FROM HopDong 
                WHERE HopDong.MaNhanVien = HS.MaNhanVien 
                ORDER BY NgayBatDau DESC
            ) HD
            WHERE TK.MaTaiKhoan = @MaTaiKhoan
        `);
    return result.recordset[0];
};

const updateEmployeeProfile = async (maTaiKhoan, data) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const checkExists = await new sql.Request(transaction)
            .input("MaTaiKhoan", sql.Int, maTaiKhoan)
            .query("SELECT MaNhanVien FROM HoSoNhanVien WHERE MaTaiKhoan = @MaTaiKhoan");

        if (checkExists.recordset.length === 0) {
            await new sql.Request(transaction)
                .input("MaTaiKhoan", sql.Int, maTaiKhoan)
                .input("MaNhanVienBV", sql.VarChar, data.maNhanVienBV || null)
                .input("CCCD", sql.VarChar, data.cccd || null)
                .input("NgaySinh", sql.Date, data.ngaySinh || null)
                .input("GioiTinh", sql.NVarChar, data.gioiTinh || null)
                .input("DiaChi", sql.NVarChar, data.diaChi || null)
                .input("NgayVaoLam", sql.Date, data.ngayVaoLam || null)
                .input("AnhDaiDien", sql.VarChar, data.anhDaiDien || null)
                .query(`
                    INSERT INTO HoSoNhanVien (MaTaiKhoan, MaNhanVienBV, CCCD, NgaySinh, GioiTinh, DiaChi, NgayVaoLam, AnhDaiDien)
                    VALUES (@MaTaiKhoan, @MaNhanVienBV, @CCCD, @NgaySinh, @GioiTinh, @DiaChi, @NgayVaoLam, @AnhDaiDien)
                `);
        } else {
            await new sql.Request(transaction)
                .input("MaTaiKhoan", sql.Int, maTaiKhoan)
                .input("CCCD", sql.VarChar, data.cccd || null)
                .input("NgaySinh", sql.Date, data.ngaySinh || null)
                .input("GioiTinh", sql.NVarChar, data.gioiTinh || null)
                .input("DiaChi", sql.NVarChar, data.diaChi || null)
                .input("AnhDaiDien", sql.VarChar, data.anhDaiDien || null)
                .query(`
                    UPDATE HoSoNhanVien 
                    SET CCCD = @CCCD, NgaySinh = @NgaySinh, GioiTinh = @GioiTinh, DiaChi = @DiaChi, AnhDaiDien = @AnhDaiDien
                    WHERE MaTaiKhoan = @MaTaiKhoan
                `);
        }

        if (data.soDienThoai || data.hoTen) {
            await new sql.Request(transaction)
                .input("MaTaiKhoan", sql.Int, maTaiKhoan)
                .input("HoTen", sql.NVarChar, data.hoTen || null)
                .input("SoDienThoai", sql.VarChar, data.soDienThoai || null)
                .query(`
                    UPDATE TaiKhoan 
                    SET HoTen = ISNULL(@HoTen, HoTen), SoDienThoai = ISNULL(@SoDienThoai, SoDienThoai)
                    WHERE MaTaiKhoan = @MaTaiKhoan
                `);
        }
        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const getAll = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT 
            TK.MaTaiKhoan, TK.HoTen, TK.TenDangNhap, TK.Email, TK.SoDienThoai, 
            TK.MaPhongBan, TK.MaChucVu, TK.MaVaiTro, CAST(TK.TrangThai AS INT) AS TrangThai,CV.TenChucVu, PB.TenPhongBan, VT.TenVaiTro,
            HS.MaNhanVienBV, HS.AnhDaiDien, HS.CCCD, HS.GioiTinh, HS.DiaChi, HS.NgayVaoLam, HS.NgaySinh,
            HD.SoHopDong, HD.LoaiHopDong, HD.NgayBatDau, HD.NgayKetThuc, HD.TrangThai AS TrangThaiHopDong
        FROM TaiKhoan TK
        LEFT JOIN HoSoNhanVien HS ON TK.MaTaiKhoan = HS.MaTaiKhoan
        LEFT JOIN ChucVu CV ON TK.MaChucVu = CV.MaChucVu
        LEFT JOIN PhongBan PB ON TK.MaPhongBan = PB.MaPhongBan
        LEFT JOIN VaiTro VT ON TK.MaVaiTro = VT.MaVaiTro
        OUTER APPLY (
            SELECT TOP 1 SoHopDong, LoaiHopDong, NgayBatDau, NgayKetThuc, TrangThai
            FROM HopDong 
            WHERE HopDong.MaNhanVien = HS.MaNhanVien 
            ORDER BY NgayBatDau DESC
        ) HD
        ORDER BY TK.MaTaiKhoan DESC
    `);
    return result.recordset;
};

const create = async (data) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();

        // [Bước A: Thêm TaiKhoan - Giữ nguyên]
        const resultTK = await new sql.Request(transaction)
            .input("HoTen", sql.NVarChar, data.hoTen)
            .input("TenDangNhap", sql.VarChar, data.tenDangNhap)
            .input("MatKhau", sql.VarChar, data.matKhau)
            .input("SoDienThoai", sql.VarChar, data.soDienThoai)
            .input("Email", sql.VarChar, data.email)
            .input("MaPhongBan", sql.Int, data.maPhongBan)
            .input("MaChucVu", sql.Int, data.maChucVu)
            .input("MaVaiTro", sql.Int, data.maVaiTro || 5)
            .input("TrangThai", sql.Bit, data.trangThai !== undefined ? data.trangThai : 1)
            .query(`
                INSERT INTO TaiKhoan (HoTen, TenDangNhap, MatKhau, Email, SoDienThoai, MaPhongBan, MaChucVu, MaVaiTro, TrangThai, NgayTao)
                OUTPUT INSERTED.MaTaiKhoan
                VALUES (@HoTen, @TenDangNhap, @MatKhau, @Email, @SoDienThoai, @MaPhongBan, @MaChucVu, @MaVaiTro, @TrangThai, GETDATE())
            `);
            
        const nextMaTaiKhoan = resultTK.recordset[0].MaTaiKhoan;

        // [Bước B: Thêm HoSoNhanVien - 🌟 BỔ SUNG AnhDaiDien]
        const resultHS = await new sql.Request(transaction)
            .input("MaTaiKhoan", sql.Int, nextMaTaiKhoan)
            .input("MaNhanVienBV", sql.VarChar, data.maNhanVienBV || null)
            .input("CCCD", sql.VarChar, data.cccd || null)
            .input("NgaySinh", sql.Date, data.ngaySinh || null)
            .input("GioiTinh", sql.NVarChar, data.gioiTinh || "Nam")
            .input("DiaChi", sql.NVarChar, data.diaChi || null)
            .input("AnhDaiDien", sql.VarChar, data.anhDaiDien || null) // 👈 ĐÃ THÊM
            .query(`
                INSERT INTO HoSoNhanVien (MaTaiKhoan, MaNhanVienBV, CCCD, NgaySinh, GioiTinh, DiaChi, AnhDaiDien, NgayVaoLam)
                OUTPUT INSERTED.MaNhanVien
                VALUES (@MaTaiKhoan, @MaNhanVienBV, @CCCD, @NgaySinh, @GioiTinh, @DiaChi, @AnhDaiDien, GETDATE())
            `);

        const nextMaNhanVien = resultHS.recordset[0].MaNhanVien;

        // [Bước C: Thêm HopDong - Giữ nguyên]
        if (data.soHopDong) {
            await new sql.Request(transaction)
                .input("MaNhanVien", sql.Int, nextMaNhanVien)
                .input("SoHopDong", sql.VarChar, data.soHopDong)
                .input("LoaiHopDong", sql.NVarChar, data.loaiHopDong || "CHINH_THUC")
                .query(`
                    INSERT INTO HopDong (MaNhanVien, SoHopDong, LoaiHopDong, NgayBatDau, TrangThai)
                    VALUES (@MaNhanVien, @SoHopDong, @LoaiHopDong, GETDATE(), N'CON_HIEU_LUC')
                `);
        }

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// 2. HÀM UPDATE: Bổ sung AnhDaiDien vào lệnh UPDATE HoSoNhanVien
const update = async (id, data) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // [Bước A: Cập nhật TaiKhoan - Giữ nguyên]
        let queryTK = `UPDATE TaiKhoan SET HoTen=@HoTen, Email=@Email, SoDienThoai=@SoDienThoai, MaPhongBan=@MaPhongBan, MaChucVu=@MaChucVu, MaVaiTro=@MaVaiTro, TrangThai=@TrangThai`;
        const requestTK = new sql.Request(transaction)
            .input("MaTaiKhoan", sql.Int, id)
            .input("HoTen", sql.NVarChar, data.hoTen)
            .input("Email", sql.VarChar, data.email)
            .input("SoDienThoai", sql.VarChar, data.soDienThoai) 
            .input("MaPhongBan", sql.Int, data.maPhongBan)
            .input("MaChucVu", sql.Int, data.maChucVu)
            .input("MaVaiTro", sql.Int, data.maVaiTro)
            .input("TrangThai", sql.Bit, data.trangThai);

        if (data.matKhau) {
            queryTK += `, MatKhau=@MatKhau`;
            requestTK.input("MatKhau", sql.VarChar, data.matKhau);
        }
        queryTK += ` WHERE MaTaiKhoan=@MaTaiKhoan`;
        await requestTK.query(queryTK);

        const checkHS = await new sql.Request(transaction)
            .input("MaTaiKhoanCheck", sql.Int, id)
            .query("SELECT MaNhanVien FROM HoSoNhanVien WHERE MaTaiKhoan = @MaTaiKhoanCheck");

        let currentMaNhanVien = null;

        // [Bước B: Cập nhật HoSoNhanVien - 🌟 BỔ SUNG AnhDaiDien]
        if (checkHS.recordset.length > 0) {
            currentMaNhanVien = checkHS.recordset[0].MaNhanVien;
            await new sql.Request(transaction)
                .input("MaTaiKhoan", sql.Int, id)
                .input("MaNhanVienBV", sql.VarChar, data.maNhanVienBV || null)
                .input("CCCD", sql.VarChar, data.cccd || null)
                .input("NgaySinh", sql.Date, data.ngaySinh || null)
                .input("GioiTinh", sql.NVarChar, data.gioiTinh || "Nam")
                .input("DiaChi", sql.NVarChar, data.diaChi || null)
                .input("AnhDaiDien", sql.VarChar, data.anhDaiDien || null) // 👈 ĐÃ THÊM
                .query(`
                    UPDATE HoSoNhanVien 
                    SET MaNhanVienBV = @MaNhanVienBV, CCCD = @CCCD, NgaySinh = @NgaySinh, GioiTinh = @GioiTinh, DiaChi = @DiaChi, 
                        AnhDaiDien = ISNULL(@AnhDaiDien, AnhDaiDien) 
                    WHERE MaTaiKhoan = @MaTaiKhoan
                `);
        } else {
            const insertHS = await new sql.Request(transaction)
                .input("MaTaiKhoan", sql.Int, id)
                .input("MaNhanVienBV", sql.VarChar, data.maNhanVienBV || null)
                .input("CCCD", sql.VarChar, data.cccd || null)
                .input("NgaySinh", sql.Date, data.ngaySinh || null) 
                .input("GioiTinh", sql.NVarChar, data.gioiTinh || "Nam")
                .input("DiaChi", sql.NVarChar, data.diaChi || null)
                .input("AnhDaiDien", sql.VarChar, data.anhDaiDien || null) 
                .query(`
                    INSERT INTO HoSoNhanVien (MaTaiKhoan, MaNhanVienBV, CCCD, GioiTinh, DiaChi, AnhDaiDien, NgayVaoLam)
                    OUTPUT INSERTED.MaNhanVien
                    VALUES (@MaTaiKhoan, @MaNhanVienBV, @CCCD, @GioiTinh, @DiaChi, @AnhDaiDien, GETDATE())
                `);
            currentMaNhanVien = insertHS.recordset[0].MaNhanVien;
        }

        // [Bước C: Cập nhật HopDong - Giữ nguyên]
        if (data.soHopDong && currentMaNhanVien) {
            const checkHD = await new sql.Request(transaction)
                .input("MaNhanVienCheck", sql.Int, currentMaNhanVien)
                .query("SELECT 1 FROM HopDong WHERE MaNhanVien = @MaNhanVienCheck");

            if (checkHD.recordset.length > 0) {
                await new sql.Request(transaction)
                    .input("MaNhanVien", sql.Int, currentMaNhanVien)
                    .input("SoHopDong", sql.VarChar, data.soHopDong)
                    .input("LoaiHopDong", sql.NVarChar, data.loaiHopDong)
                    .input("TrangThai", sql.NVarChar, data.trangThaiHopDong || "CON_HIEU_LUC")
                    .input("NgayKetThuc", sql.Date, data.ngayKetThuc || null)
                    .input("NgayBatDau", sql.Date, data.ngayBatDau || null)
                    .query(`UPDATE HopDong SET SoHopDong = @SoHopDong, LoaiHopDong = @LoaiHopDong WHERE MaNhanVien = @MaNhanVien`);
            } else {
                await new sql.Request(transaction)
                    .input("MaNhanVien", sql.Int, currentMaNhanVien)
                    .input("SoHopDong", sql.VarChar, data.soHopDong)
                    .input("LoaiHopDong", sql.NVarChar, data.loaiHopDong)
                    .input("NgayBatDau", sql.Date, data.ngayBatDau || null)
                    .input("NgayKetThuc", sql.Date, data.ngayKetThuc || null)
                    .input("TrangThai", sql.NVarChar, data.trangThaiHopDong || "CON_HIEU_LUC")
                    .query(`INSERT INTO HopDong (MaNhanVien, SoHopDong, LoaiHopDong, NgayBatDau, NgayKetThuc, TrangThai) VALUES (@MaNhanVien, @SoHopDong, @LoaiHopDong, @NgayBatDau, @NgayKetThuc, @TrangThai)`);
            }
        }

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// 🌟 THÊM CHỨC NĂNG SOFT DELETE (KHÓA TÀI KHOẢN AN TOÀN)
const toggleStatus = async (maTaiKhoan, trangThai) => {
    const pool = await getPool();
    await pool.request()
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .input("TrangThai", sql.Bit, trangThai ? 1 : 0)
        .query(`UPDATE TaiKhoan SET TrangThai = @TrangThai WHERE MaTaiKhoan = @MaTaiKhoan`);
    return true;
};

// GIỮ LẠI HARD DELETE NẾU BẠN VẪN MUỐN DÙNG (Cảnh báo: Dễ lỗi Foreign Key)
const remove = async (id) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const findEmp = await new sql.Request(transaction).input("MaTaiKhoan", sql.Int, id).query("SELECT MaNhanVien FROM HoSoNhanVien WHERE MaTaiKhoan = @MaTaiKhoan");
        if (findEmp.recordset.length > 0) {
            const maNhanVien = findEmp.recordset[0].MaNhanVien;
            await new sql.Request(transaction).input("MaNhanVien", sql.Int, maNhanVien).query("DELETE FROM HopDong WHERE MaNhanVien = @MaNhanVien");
            await new sql.Request(transaction).input("MaTaiKhoan", sql.Int, id).query("DELETE FROM HoSoNhanVien WHERE MaTaiKhoan = @MaTaiKhoan");
        }
        await new sql.Request(transaction).input("MaTaiKhoan", sql.Int, id).query("DELETE FROM TaiKhoan WHERE MaTaiKhoan = @MaTaiKhoan");
        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = { getEmployeeDetail, updateEmployeeProfile, getAll, create, update, toggleStatus, remove };