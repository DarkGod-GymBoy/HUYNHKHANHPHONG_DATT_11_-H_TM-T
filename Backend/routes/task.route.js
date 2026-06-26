const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
// Chặn token bảo mật cho toàn bộ endpoint điều phối công việc
router.use(verifyToken);

router.get("/", taskController.getAllTasks);
router.post("/",upload.array("files", 10), taskController.createTask);


router.get("/my-tasks", taskController.getMyTasks);

// Các đường dẫn động (có dấu :) phải để ở dưới cùng
router.get("/:id", taskController.getTaskById);
router.put("/:id",upload.array("files", 10), taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

module.exports = router;