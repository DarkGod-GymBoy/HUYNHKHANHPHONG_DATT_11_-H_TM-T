const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Yêu cầu phải có token hợp lệ cho TẤT CẢ các API
router.use(verifyToken);

// 🌟 NHÓM 1: CÁ NHÂN (User Portal)
router.get("/my-profile", employeeController.getMyProfile);
router.put("/my-profile", employeeController.updateMyProfile);

// 🛠️ NHÓM 2: ADMIN QUẢN LÝ
router.get("/", employeeController.getAllEmployees);
router.post("/", employeeController.createEmployee);

router.get("/:id/full-profile", employeeController.getFullProfile);
router.put("/:id", employeeController.updateEmployee);

// Khóa hoặc mở khóa tài khoản (Khuyên dùng thay cho Delete)
router.patch("/:id/status", employeeController.toggleEmployeeStatus);

// Xóa vĩnh viễn tài khoản (Nguy hiểm)
router.delete("/:id", employeeController.deleteEmployee);

module.exports = router;