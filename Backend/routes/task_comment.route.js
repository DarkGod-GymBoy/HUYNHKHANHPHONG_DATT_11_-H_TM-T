const express = require("express");
const router = express.Router();
const controller = require("../controllers/task_comment.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Tất cả các route dưới đây đều yêu cầu xác thực
router.use(verifyToken);

// Lấy danh sách bình luận của một công việc cụ thể
router.get("/:taskId", controller.getComments);

// Gửi bình luận mới
router.post("/:taskId", controller.postComment);

// Sửa bình luận
router.put("/:commentId", controller.editComment);

// Xóa bình luận
router.delete("/:commentId", controller.removeComment);

module.exports = router;