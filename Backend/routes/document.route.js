const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

router.use(verifyToken);

// Lấy danh mục Loại tài liệu (Bắt buộc phải đứng trên các route có :id để không bị lỗi nhầm route)
router.get("/types", documentController.getDocumentTypes);

// Nhóm API CRUD Tài liệu
router.get("/", documentController.getAllDocuments);
router.post("/", upload.single("file"), documentController.uploadDocument);
router.put("/:id", upload.single("file"), documentController.updateDocument);
router.delete("/:id", documentController.deleteDocument);

module.exports = router;