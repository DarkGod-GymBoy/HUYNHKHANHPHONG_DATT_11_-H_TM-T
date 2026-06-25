const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Route API Public (Không cần đăng nhập vẫn gọi được)
router.get("/", roleController.getAllRoles);

module.exports = router;