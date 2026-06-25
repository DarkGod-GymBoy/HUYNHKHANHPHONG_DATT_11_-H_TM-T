const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Yêu cầu đăng nhập mới được xem Dashboard
router.use(verifyToken);

// Gọi GET /api/dashboard
router.get("/", dashboardController.getDashboardStats);

module.exports = router;