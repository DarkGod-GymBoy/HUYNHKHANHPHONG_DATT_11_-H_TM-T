const documentRepo = require("../repositories/document.repository");

// 🌟 ĐÃ FIX: Hàm cắt gọn đường dẫn an toàn để lưu vào DB (Cắt bỏ thư mục gốc như 'public' hoặc 'src')
const formatFilePath = (path) => {
    if (!path) return null;
    let formattedPath = path.replace(/\\/g, '/'); // Chuyển chéo Windows thành chuẩn Web
    
    // Nếu multer lưu vào thư mục public/uploads/documents/..., ta chỉ lấy từ /uploads trở đi
    const uploadIndex = formattedPath.indexOf('/uploads/');
    if (uploadIndex !== -1) {
        formattedPath = formattedPath.substring(uploadIndex);
    } else if (!formattedPath.startsWith('/')) {
        formattedPath = '/' + formattedPath;
    }
    
    return formattedPath;
};

const uploadNewDocument = async (docData, fileData, nguoiTaiLen) => {
    if (!fileData) throw new Error("Không tìm thấy tệp tài liệu nào được tải lên!");
    if (!docData.tenTaiLieu || !docData.maLoaiTaiLieu) throw new Error("Vui lòng cung cấp Tên tài liệu và Loại tài liệu!");

    const filepath = formatFilePath(fileData.path); 
    const maTaiLieu = await documentRepo.createDocument(docData, filepath, nguoiTaiLen);
    
    return {
        maTaiLieu: maTaiLieu,
        message: "Số hóa tài liệu và lưu trữ phiên bản 1.0 thành công"
    };
};

const getDocumentList = async (maTaiKhoan, isAdmin) => {
    return await documentRepo.getAllDocuments(maTaiKhoan, isAdmin);
};

const updateDocumentInfo = async (maTaiLieu, docData, fileData, nguoiCapNhat) => {
    if (!docData.tenTaiLieu || !docData.maLoaiTaiLieu) throw new Error("Tên và Loại tài liệu không được để trống!");
    
    const filepath = fileData ? formatFilePath(fileData.path) : null;
    await documentRepo.updateDocument(maTaiLieu, docData, filepath, nguoiCapNhat);
    
    return { message: "Cập nhật tài liệu thành công" + (filepath ? " (Hệ thống đã lưu trữ phiên bản mới)" : "") };
};

const removeDocument = async (maTaiLieu) => {
    await documentRepo.deleteDocument(maTaiLieu);
    return { message: "Đã thu hồi và xóa tài liệu số hóa thành công" };
};

const getDocumentTypes = async () => {
    return await documentRepo.getDocTypes();
};

module.exports = { 
    uploadNewDocument, getDocumentList, 
    updateDocumentInfo, removeDocument, getDocumentTypes 
};