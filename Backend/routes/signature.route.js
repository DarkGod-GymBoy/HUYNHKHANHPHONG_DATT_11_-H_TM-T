const express = require("express");
const router = express.Router();
const signatureController = require("../controllers/signature.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

router.use(verifyToken);

// 1. Lấy danh sách (Controller sẽ tự phân luồng Admin hay User)
router.get("/", signatureController.getSignatures);

// 2. Thêm mới
router.post("/", upload.single("image"), signatureController.uploadNewSignature);

// 3. Sửa
router.put("/:id", upload.single("image"), signatureController.updateSignature);

// 4. Xóa
router.delete("/:id", signatureController.deleteSignature);

// 5. Ghi nhớ chữ ký (Dùng cho User đặt mặc định)
router.put("/:id/active", signatureController.setActiveSignature);

module.exports = router;