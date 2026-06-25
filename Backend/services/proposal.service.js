const proposalRepo = require("../repositories/proposal.repository");
const notificationService = require("./notification.service");
const { getPool } = require("../config/database"); 
const sql = require("mssql"); 

// ============================================================================
// 1. TẠO ĐỀ XUẤT MỚI
// ============================================================================
const create = async (tieuDe, noiDung, loaiDeXuat, nguoiNhanDuyet, nguoiTao, danhSachFile = [], maQuyTrinh) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    let newMaDeXuat;

    try {
        await transaction.begin();

        // 1. Xử lý đường dẫn file chính (Dự phòng cho API cũ / Làm ảnh bìa)
        let duongDanFile = null;
        if (danhSachFile && danhSachFile.length > 0 && danhSachFile[0].filename) {
            duongDanFile = `uploads/dexuat/${danhSachFile[0].filename}`;
        }

        // 2. Lưu vào bảng DeXuat (Sử dụng OUTPUT INTO)
        const requestDX = new sql.Request(transaction);
        const resDX = await requestDX
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
                VALUES (
                    'DX' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'), 
                    @TieuDe, @NoiDung, @LoaiDeXuat, @DuongDanFile, @NguoiTao, GETDATE(), @TrangThai
                );
                
                SELECT MaDeXuat FROM @TempID;
            `);
            
        newMaDeXuat = resDX.recordset[0].MaDeXuat;

        // 3. Xử lý ĐA NHÂN SỰ DUYỆT
        const listNguoiDuyet = typeof nguoiNhanDuyet === 'string'
            ? nguoiNhanDuyet.split(',').map(id => parseInt(id.trim())).filter(Boolean)
            : (Array.isArray(nguoiNhanDuyet) ? nguoiNhanDuyet.map(id => parseInt(id)) : [parseInt(nguoiNhanDuyet)]);

        // Vòng lặp: Phân công từng người vào bảng PheDuyetDeXuat theo thứ tự
        for (let i = 0; i < listNguoiDuyet.length; i++) {
            const maSep = listNguoiDuyet[i];
            const thuTuDuyet = i + 1; 

            await new sql.Request(transaction)
                .input("MaDeXuat", sql.Int, newMaDeXuat)
                .input("MaTaiKhoan", sql.Int, maSep)
                .input("ThuTuPheDuyet", sql.Int, thuTuDuyet)
                .input("TrangThai", sql.VarChar, 'CHO_DUYET')
                .query(`
                    INSERT INTO PheDuyetDeXuat (MaDeXuat, MaTaiKhoan, ThuTuPheDuyet, TrangThai)
                    VALUES (@MaDeXuat, @MaTaiKhoan, @ThuTuPheDuyet, @TrangThai)
                `);
        }

        // 4. Gắn quy trình duyệt cho Đề xuất này
        const maQuyTrinhApDung = maQuyTrinh ? parseInt(maQuyTrinh) : 2;// 2 = Duyệt TU_DO

        await new sql.Request(transaction)
            .input("MaDeXuat", sql.Int, newMaDeXuat)
            .input("MaQuyTrinh", sql.Int, maQuyTrinhApDung)
            .query(`
                INSERT INTO DeXuatQuyTrinh (MaDeXuat, MaQuyTrinh)
                VALUES (@MaDeXuat, @MaQuyTrinh)
            `);

        // 🌟 5. XỬ LÝ ĐA TỆP ĐÍNH KÈM (Đã dọn dẹp biến rác)
        let listFiles = [];
        if (Array.isArray(danhSachFile)) {
            listFiles = danhSachFile;
        } else if (danhSachFile && typeof danhSachFile === 'object' && danhSachFile.filename) {
            listFiles = [danhSachFile]; 
        }

        if (listFiles.length > 0) {
            for (const file of listFiles) {
                // Rào chắn: Nếu file rác, không có tên thì bỏ qua
                if (!file || !file.filename) continue; 

                const urlTep = `uploads/dexuat/${file.filename}`;
                const originalName = decodeURIComponent(file.originalname || "Tai_Lieu_Dinh_Kem");
                
                await new sql.Request(transaction)
                    .input("MaDeXuat", sql.Int, newMaDeXuat)
                    .input("TenTep", sql.NVarChar(300), originalName)
                    .input("DuongDanTep", sql.VarChar(1000), urlTep)
                    .input("NguoiTaiLen", sql.Int, nguoiTao) 
                    .query(`
                        INSERT INTO TepDinhKemDeXuat (MaDeXuat, TenTep, DuongDanTep, NguoiTaiLen, NgayTaiLen)
                        VALUES (@MaDeXuat, @TenTep, @DuongDanTep, @NguoiTaiLen, GETDATE())
                    `);
            }
        }

        await transaction.commit();

    } catch (error) {
        await transaction.rollback();
        throw new Error("Lỗi cơ sở dữ liệu khi tạo đề xuất: " + error.message);
    }

    // 6. Gửi thông báo cho TẤT CẢ các sếp được chọn
    try {
        if (nguoiNhanDuyet) {
            const poolNotif = await getPool(); 
            const listNguoiNhanNotif = typeof nguoiNhanDuyet === 'string'
                ? nguoiNhanDuyet.split(',').map(id => id.trim()).filter(Boolean)
                : (Array.isArray(nguoiNhanDuyet) ? nguoiNhanDuyet : [nguoiNhanDuyet]);
            
            for (const idNguoiNhan of listNguoiNhanNotif) {
                const empInfo = await poolNotif.request()
                    .input("MaTaiKhoan_Mail", sql.Int, idNguoiNhan)
                    .query(`SELECT Email FROM TaiKhoan WHERE MaTaiKhoan = @MaTaiKhoan_Mail`);
                
                if (empInfo.recordset.length > 0) {
                    const emailNguoiNhan = empInfo.recordset[0].Email;
                    await notificationService.createNotification(
                        idNguoiNhan, 
                        emailNguoiNhan,              
                        "📋 Bạn có một đề xuất/công việc mới được giao", 
                        `Bạn vừa nhận được một đề xuất trình ký: <b>${tieuDe}</b>. Vui lòng đăng nhập hệ thống để kiểm tra.`, 
                        "DE_XUAT", 
                        "/user/proposals"                
                    );
                }
            }
        }
    } catch (notifError) {
        console.error("Lỗi gửi thông báo:", notifError);
    }
    
    return { maDeXuat: newMaDeXuat, message: "Tạo đề xuất thành công" };
};
// ============================================================================
// CÁC HÀM XỬ LÝ KHÁC (Thông qua Repository)
// ============================================================================
const update = async (maDeXuat, tieuDe, noiDung, loaiDeXuat, nguoiNhanDuyet, danhSachFile = [], maQuyTrinh) => {
    
    // 1. Chuẩn hóa chuỗi người duyệt thành mảng số nguyên (vd: "2,4" -> [2, 4])
    const listNguoiDuyet = typeof nguoiNhanDuyet === 'string'
        ? nguoiNhanDuyet.split(',').map(id => parseInt(id.trim())).filter(Boolean)
        : (Array.isArray(nguoiNhanDuyet) ? nguoiNhanDuyet.map(id => parseInt(id)) : [parseInt(nguoiNhanDuyet)]);

    // 2. Chuẩn hóa mảng File & dựng rào chắn chặn dữ liệu rác (tránh lỗi undefined)
    let listFiles = [];
    if (Array.isArray(danhSachFile)) {
        listFiles = danhSachFile;
    } else if (danhSachFile && typeof danhSachFile === 'object' && danhSachFile.filename) {
        listFiles = [danhSachFile]; 
    }

    // 3. Đẩy dữ liệu sạch xuống Tầng Repository để gọi Database
    await proposalRepo.update(maDeXuat, tieuDe, noiDung, loaiDeXuat, listNguoiDuyet, listFiles, maQuyTrinh);
    
    return { success: true, message: "Cập nhật đề xuất thành công!" };
};
    
const sign = async (maPheDuyet, maTaiKhoan, diaChiIP, yKien) => {
    const pool = await getPool(); 
    
    // 1. Kiểm tra thiết lập Chữ ký số
    const chuKyResult = await pool.request()
        .input("MaTaiKhoan", sql.Int, maTaiKhoan)
        .query("SELECT TOP 1 MaChuKyNguoiDung FROM ChuKyNguoiDung WHERE MaTaiKhoan = @MaTaiKhoan AND DangSuDung = 1");
    
    if (chuKyResult.recordset.length === 0) {
        throw new Error("Bạn chưa thiết lập chữ ký số hợp lệ để ký duyệt. Vui lòng vào Cài đặt chữ ký.");
    }

    const maChuKyNguoiDung = chuKyResult.recordset[0].MaChuKyNguoiDung;

    // 2. Ký thông qua Repo (Repository này sẽ gọi SP_KyDeXuat đã được cập nhật logic mới)
    await proposalRepo.signProposal(maPheDuyet, maChuKyNguoiDung, diaChiIP, yKien);
    
    // 3. THÔNG BÁO CHO NGƯỜI TẠO
    const creatorInfo = await pool.request()
        .input("MaPheDuyet", sql.Int, maPheDuyet)
        .query(`
            SELECT T.MaTaiKhoan, T.Email 
            FROM DeXuat D 
            JOIN TaiKhoan T ON D.NguoiTao = T.MaTaiKhoan 
            WHERE D.MaDeXuat = (SELECT MaDeXuat FROM PheDuyetDeXuat WHERE MaPheDuyet = @MaPheDuyet)
        `);

    if (creatorInfo.recordset.length > 0) {
        const { MaTaiKhoan, Email } = creatorInfo.recordset[0];
        await notificationService.createNotification(
            MaTaiKhoan, Email, "Thông báo: Đề xuất đã được ký", 
            "Đề xuất của bạn vừa được cấp trên duyệt.", "DE_XUAT", "/user/proposals"
        );
    }
    
    return { message: "Ký duyệt đề xuất thành công" };
};

const reject = async (maPheDuyet, yKien) => {
    if (!yKien || yKien.trim() === "") throw new Error("Bắt buộc phải nhập lý do khi từ chối đề xuất");
    await proposalRepo.rejectProposal(maPheDuyet, yKien);
    return { message: "Đã từ chối đề xuất thành công" };
};

const returnBack = async (maPheDuyet, yKien) => {
    if (!yKien || yKien.trim() === "") throw new Error("Bắt buộc phải nhập lý do khi trả về đề xuất");
    await proposalRepo.returnProposal(maPheDuyet, yKien);
    return { message: "Đã trả về đề xuất cho người tạo" };
};

const resubmit = async (maDeXuat, maTaiKhoan) => {
    await proposalRepo.resubmitProposal(maDeXuat, maTaiKhoan);
    return { message: "Đã gửi lại đề xuất thành công" };
};

const uploadAttachment = async (maDeXuat, fileData, nguoiTaiLen) => {
    if (!fileData) throw new Error("Không tìm thấy file để tải lên.");
    const duongDanFile = fileData.path.replace(/\\/g, '/');
    const result = await proposalRepo.attachFileToProposal(maDeXuat, fileData.originalname, duongDanFile, nguoiTaiLen);
    return result;
};

const getMyProposals = async (maTaiKhoan) => { return await proposalRepo.getMyProposals(maTaiKhoan); };
const getAllProposals = async () => { return await proposalRepo.getAllProposals(); };
const getProposalForPrint = async (maDeXuat) => { return await proposalRepo.getProposalDetailsForPrint(maDeXuat); };
const getWorkflows = async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT MaQuyTrinh, TenQuyTrinh, MoTa, LoaiKy
        FROM QuyTrinhPheDuyet
        ORDER BY MaQuyTrinh ASC
    `);
    return result.recordset;
};

module.exports = {
    create, sign, reject, returnBack, resubmit, uploadAttachment, getMyProposals, getAllProposals, getProposalForPrint, update, getWorkflows
};