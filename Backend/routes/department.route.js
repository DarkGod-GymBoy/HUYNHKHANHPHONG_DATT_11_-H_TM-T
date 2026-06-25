const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/department.controller");
const { verifyToken } = require("../middleware/auth.middleware");



router.get("/", departmentController.getAllDepartments);

// Tất cả các route quản lý danh mục đều cần đăng nhập
router.use(verifyToken);

router.post("/", departmentController.createDepartment);
router.put("/:id", departmentController.updateDepartment);
router.delete("/:id", departmentController.deleteDepartment);



module.exports = router;