const signatureService = require("../services/signature.service");

// [ĐÃ NÂNG CẤP TỪ CODE CỦA BẠN]
const uploadNewSignature = async (req, res) => {
    try {
        // Nếu Admin gửi maTaiKhoan lên để thêm cho nhân viên khác -> lấy từ body
        // Nếu User tự thêm -> lấy từ req.user
        const maTaiKhoan = req.body.maTaiKhoan || req.user?.MaTaiKhoan || req.user?.maTaiKhoan; 
        const fileData = req.file; 
        const bodyData = req.body; 

        const result = await signatureService.uploadSignature(maTaiKhoan, fileData, bodyData);

        return res.status(201).json({ success: true, ...result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// [ĐÃ NÂNG CẤP TỪ CODE CỦA BẠN]
const getSignatures = async (req, res) => {
    try {
        const maVaiTro = req.user?.MaVaiTro || req.user?.maVaiTro;
        const maTaiKhoan = req.user?.MaTaiKhoan || req.user?.maTaiKhoan; 

        let result;
        // Kiểm tra phân quyền: Vai trò = 1 (Admin) thì lấy hết, ngược lại lấy của riêng mình
        if (maVaiTro === 1) {
            result = await signatureService.getAllSignatures();
        } else {
            result = await signatureService.getMySignatures(maTaiKhoan);
        }

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ================= THÊM MỚI =================

const updateSignature = async (req, res) => {
    try {
        const maChuKy = req.params.id;
        const result = await signatureService.updateSignature(maChuKy, req.file, req.body);
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const deleteSignature = async (req, res) => {
    try {
        const maChuKy = req.params.id;
        const result = await signatureService.deleteSignature(maChuKy);
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const setActiveSignature = async (req, res) => {
    try {
        const maTaiKhoan = req.user?.MaTaiKhoan || req.user?.maTaiKhoan;
        const maChuKy = req.params.id;
        const result = await signatureService.setActiveSignature(maChuKy, maTaiKhoan);
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { 
    uploadNewSignature, getSignatures, 
    updateSignature, deleteSignature, setActiveSignature 
};