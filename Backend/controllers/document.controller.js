const documentService = require("../services/document.service");

const uploadDocument = async (req, res) => {
    try {
        const nguoiTaiLen = req.user?.MaTaiKhoan || req.user?.maTaiKhoan;
        const fileData = req.file; 
        const docData = req.body; 

        const result = await documentService.uploadNewDocument(docData, fileData, nguoiTaiLen);
        return res.status(201).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const getAllDocuments = async (req, res) => {
    try {
        const maTaiKhoan = req.user?.MaTaiKhoan || req.user?.maTaiKhoan;
        const maVaiTro = req.user?.MaVaiTro || req.user?.maVaiTro;
        const isAdmin = maVaiTro === 1; // Kiểm tra quyền Admin

        // Admin lấy hết, User chỉ lấy của User
        const result = await documentService.getDocumentList(maTaiKhoan, isAdmin);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateDocument = async (req, res) => {
    try {
        const maTaiLieu = req.params.id;
        const nguoiCapNhat = req.user?.MaTaiKhoan || req.user?.maTaiKhoan;
        const result = await documentService.updateDocumentInfo(maTaiLieu, req.body, req.file, nguoiCapNhat);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const maTaiLieu = req.params.id;
        const result = await documentService.removeDocument(maTaiLieu);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// API lấy danh sách Loại tài liệu cho Dropdown form
const getDocumentTypes = async (req, res) => {
    try {
        const result = await documentService.getDocumentTypes();
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    uploadDocument, getAllDocuments, 
    updateDocument, deleteDocument, getDocumentTypes 
};