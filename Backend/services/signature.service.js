const signatureRepo = require("../repositories/signature.repository");

const getSignatureImagePath = (fileData) => {
    if (!fileData) return null;
    return `/uploads/chuky/${fileData.filename}`;
};

// [CODE CŨ CỦA BẠN]
const uploadSignature = async (maTaiKhoan, fileData, bodyData) => {
    if (!fileData) {
        throw new Error("Không tìm thấy file hình ảnh chữ ký");
    }

    const { tenChuKy } = bodyData;
    const duongDanAnh = getSignatureImagePath(fileData);
    
    const newSignature = await signatureRepo.createAndActivateSignature(maTaiKhoan, tenChuKy, duongDanAnh);

    return {
        message: "Cập nhật chữ ký số thành công",
        data: newSignature
    };
};

// [CODE CŨ CỦA BẠN]
const getMySignatures = async (maTaiKhoan) => {
    return await signatureRepo.getSignaturesByUser(maTaiKhoan);
};

// ================= THÊM MỚI (DÙNG CHUNG ADMIN & USER) =================

const getAllSignatures = async () => {
    return await signatureRepo.getAllSignatures();
};
const updateSignature = async (maChuKy, fileData, bodyData) => {
    const { tenChuKy, dangSuDung } = bodyData;
    // Chuyển dangSuDung thành bit (nếu có truyền lên)
    const isActive = dangSuDung !== undefined ? (dangSuDung === '1' || dangSuDung === 'true' || dangSuDung === 1 ? 1 : 0) : null;
    
    let duongDanAnh = null;
    if (fileData) {
        duongDanAnh = getSignatureImagePath(fileData);
    }

    await signatureRepo.updateSignature(maChuKy, tenChuKy, isActive, duongDanAnh);
    return { message: "Cập nhật chữ ký thành công" };
};

const deleteSignature = async (maChuKy) => {
    await signatureRepo.deleteSignature(maChuKy);
    return { message: "Xóa chữ ký thành công" };
};

const setActiveSignature = async (maChuKy, maTaiKhoan) => {
    await signatureRepo.setActiveSignature(maChuKy, maTaiKhoan);
    return { message: "Đã ghi nhớ chữ ký này làm mặc định" };
};

module.exports = { 
    uploadSignature, getMySignatures, 
    getAllSignatures, updateSignature, deleteSignature, setActiveSignature 
};