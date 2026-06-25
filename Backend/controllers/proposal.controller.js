const proposalService = require("../services/proposal.service");
const { sql, poolPromise, getPool } = require("../config/database"); 

// ============================================================================
// 1. TẠO ĐỀ XUẤT (VÀ GỬI THÔNG BÁO CHO NGƯỜI DUYỆT)
// ============================================================================
const createProposal = async (req, res) => {
    try {
        const tieuDe = req.body.tieuDe || req.body.TieuDe;
        const noiDung = req.body.noiDung || req.body.NoiDung || ""; 
        const loaiDeXuat = req.body.loaiDeXuat || req.body.LoaiDeXuat || "Khác";
        const nguoiNhanDuyet = req.body.nguoiNhanDuyet || req.body.NguoiNhanDuyet;
        const nguoiTao = req.user.MaTaiKhoan; 

        const maQuyTrinh = req.body.maQuyTrinh || req.body.MaQuyTrinh || 2;

        if (!tieuDe) return res.status(400).json({ success: false, message: "Tiêu đề không được để trống" });

        // 🌟 ĐÃ FIX: Lấy mảng files thay vì 1 file đơn lẻ
        const danhSachFile = req.files || []; 
       
        // BƯỚC 1: Lưu Đề xuất vào Database qua Service
        const result = await proposalService.create(tieuDe, noiDung, loaiDeXuat, nguoiNhanDuyet, nguoiTao, danhSachFile, maQuyTrinh);

        // BƯỚC 2: Tự động bắn thông báo cho Danh sách Người duyệt
        try {
            const listNguoiDuyet = typeof nguoiNhanDuyet === "string" 
                ? nguoiNhanDuyet.split(',').map(id => id.trim()).filter(Boolean) 
                : (Array.isArray(nguoiNhanDuyet) ? nguoiNhanDuyet : [nguoiNhanDuyet]);

            const tieuDeThongBao = "Hồ sơ trình ký mới";
            const noiDungThongBao = `Bạn có một tờ trình chờ phê duyệt: <b>${tieuDe}</b>. Vui lòng kiểm tra và xử lý.`;
            const duongDanHoSo = "/user/proposals"; 
            
            const pool = await getPool(); 

            for (const sepId of listNguoiDuyet) {
                await pool.request()
                    .input('MaTaiKhoan', sql.Int, sepId)
                    .input('TieuDe', sql.NVarChar, tieuDeThongBao)
                    .input('NoiDung', sql.NVarChar, noiDungThongBao)
                    .input('DaDoc', sql.Bit, 0)
                    .input('NgayTao', sql.DateTime, new Date())
                    .input('DuongDan', sql.VarChar, duongDanHoSo)
                    .query(`
                        INSERT INTO ThongBao (MaTaiKhoan, TieuDe, NoiDung, DaDoc, NgayTao, DuongDan)
                        VALUES (@MaNguoiNhan, @TieuDe, @NoiDung, @DaDoc, @NgayTao, @DuongDan)
                    `);
                
                const io = req.app.get('socketio');
                if (io && global.onlineUsers?.has(String(sepId))) {
                    io.to(global.onlineUsers.get(String(sepId))).emit('new_notification', {
                        title: tieuDeThongBao,
                        content: noiDungThongBao,
                        duongDan: duongDanHoSo
                    });
                }
            }
        } catch (notifErr) {
            console.error("⚠️ Lỗi tạo thông báo ngầm:", notifErr.message);
        }

        return res.status(201).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const updateProposal = async (req, res) => {
    try {
        const maDeXuat = req.params.id;
        
        const tieuDe = req.body.tieuDe || req.body.TieuDe;
        const noiDung = req.body.noiDung || req.body.NoiDung || "";
        const loaiDeXuat = req.body.loaiDeXuat || req.body.LoaiDeXuat || "Khác";
        const nguoiNhanDuyet = req.body.nguoiNhanDuyet || req.body.NguoiNhanDuyet;
        const danhSachFile = req.files || [];
        const maQuyTrinh = req.body.maQuyTrinh || req.body.MaQuyTrinh || 2;

        if (!tieuDe || !nguoiNhanDuyet) {
            return res.status(400).json({ success: false, message: "Tiêu đề và người duyệt không được bỏ trống" });
        }

        await proposalService.update(maDeXuat, tieuDe, noiDung, loaiDeXuat, nguoiNhanDuyet, danhSachFile,maQuyTrinh);
        return res.status(200).json({ success: true, message: "Cập nhật dữ liệu chứng từ thành công!" });
    } catch (error) {
        console.error("🚨 [LỖI UPDATE ĐỀ XUẤT]:", error.message);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống: " + error.message });
    }
};

const signProposal = async (req, res) => {
    try {
        const { maPheDuyet, yKien } = req.body;
        const maTaiKhoan = req.user?.MaTaiKhoan || req.user?.maTaiKhoan;
        const diaChiIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "Unknown IP";

        if (!maPheDuyet) return res.status(400).json({ success: false, message: "Thiếu mã phê duyệt" });

        const result = await proposalService.sign(maPheDuyet, maTaiKhoan, diaChiIP, yKien);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const rejectProposal = async (req, res) => {
    try {
        const { maPheDuyet, yKien } = req.body;
        if (!maPheDuyet) return res.status(400).json({ success: false, message: "Thiếu mã phê duyệt" });

        const result = await proposalService.reject(maPheDuyet, yKien);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const returnProposal = async (req, res) => {
    try {
        const { maPheDuyet, yKien } = req.body;
        if (!maPheDuyet) return res.status(400).json({ success: false, message: "Thiếu mã phê duyệt" });

        const result = await proposalService.returnBack(maPheDuyet, yKien);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const resubmitProposal = async (req, res) => {
    try {
        const { maDeXuat } = req.body;
        const maTaiKhoan = req.user?.MaTaiKhoan || req.user?.maTaiKhoan;
        if (!maDeXuat) return res.status(400).json({ success: false, message: "Thiếu mã đề xuất" });

        const result = await proposalService.resubmit(maDeXuat, maTaiKhoan);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const uploadFile = async (req, res) => {
    try {
        const maDeXuat = req.params.id;
        const nguoiTaiLen = req.user?.MaTaiKhoan || req.user?.maTaiKhoan;
        const danhSachFile = req.files || [];

        const result = await proposalService.uploadAttachment(maDeXuat, danhSachFile, nguoiTaiLen);
        return res.status(201).json({ success: true, message: "Tải file đính kèm thành công", data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const getMyProposals = async (req, res) => {
    try {
        const result = await proposalService.getMyProposals(req.user?.MaTaiKhoan || req.user?.maTaiKhoan);
        return res.status(200).json({ success: true, data: result });
    } catch (error) { 
        return res.status(400).json({ success: false, message: error.message }); 
    }
};

const getAllProposals = async (req, res) => {
    try {
        const result = await proposalService.getAllProposals();
        return res.status(200).json({ success: true, data: result });
    } catch (error) { 
        return res.status(400).json({ success: false, message: error.message }); 
    }
};

const getProposalForPrint = async (req, res) => {
    try {
        const result = await proposalService.getProposalForPrint(req.params.id);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const getPendingProposals = async (req, res) => {
    try {
        const maTaiKhoan = req.user.MaTaiKhoan;
        const maChucVu = req.user.MaChucVu; 
        const pool = await getPool(); 

        if (maChucVu === 5) {
            return res.status(200).json({ success: true, data: [] });
        }

        // 🌟 ĐÃ FIX: Bổ sung logic đọc "Công tắc Quy trình" (LoaiKy)
        const result = await pool.request()
            .input("MaTaiKhoan", sql.Int, maChucVu === 1 ? null : maTaiKhoan) 
            .query(`
                SELECT 
                    PD.MaPheDuyet, PD.ThuTuPheDuyet, PD.TrangThai AS TrangThaiCuaToi, PD.YKien,
                    DX.MaDeXuat, DX.SoDeXuat, DX.TieuDe, DX.NoiDung, DX.LoaiDeXuat, DX.DuongDanFile, DX.NgayTao,
                    TK.HoTen AS NguoiTaoHoTen,
                    ISNULL(QT.LoaiKy, 'THEO_CAP_BAC') AS LoaiQuyTrinh
                FROM PheDuyetDeXuat PD
                INNER JOIN DeXuat DX ON PD.MaDeXuat = DX.MaDeXuat
                INNER JOIN TaiKhoan TK ON DX.NguoiTao = TK.MaTaiKhoan
                -- Nối để lấy loại quy trình
                LEFT JOIN DeXuatQuyTrinh DQT ON DX.MaDeXuat = DQT.MaDeXuat
                LEFT JOIN QuyTrinhPheDuyet QT ON DQT.MaQuyTrinh = QT.MaQuyTrinh
                WHERE (PD.MaTaiKhoan = @MaTaiKhoan OR @MaTaiKhoan IS NULL)
                  AND (PD.TrangThai IS NULL OR PD.TrangThai <> N'DA_KY')
                  AND DX.TrangThai = N'CHO_DUYET'
                  AND (
                      -- Nếu là luồng Ký Tự Do, bỏ qua rào cản thứ tự
                      ISNULL(QT.LoaiKy, 'THEO_CAP_BAC') = 'TU_DO'
                      OR 
                      -- Nếu là luồng Cấp bậc, phải đợi người có thứ tự nhỏ hơn ký xong
                      NOT EXISTS (
                          SELECT 1 FROM PheDuyetDeXuat SUB_PD
                          WHERE SUB_PD.MaDeXuat = PD.MaDeXuat
                            AND SUB_PD.ThuTuPheDuyet < PD.ThuTuPheDuyet
                            AND ISNULL(SUB_PD.TrangThai, '') <> N'DA_KY'
                      )
                  )
                ORDER BY DX.NgayTao DESC
            `);

        return res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        console.error("❌ Lỗi tại Phân quyền động Backend:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
const getWorkflows = async (req, res) => {
    try {
        const result = await proposalService.getWorkflows();
        return res.status(200).json({ success: true, data: result });
    } catch (error) { 
        return res.status(400).json({ success: false, message: error.message }); 
    }
};

module.exports = {
    createProposal, signProposal, rejectProposal, returnProposal, resubmitProposal, uploadFile, getMyProposals, getAllProposals, getProposalForPrint, updateProposal, getPendingProposals, getWorkflows
};