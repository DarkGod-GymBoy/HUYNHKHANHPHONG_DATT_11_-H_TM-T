
const service = require("../services/task_comment.service");

// 1. Lấy danh sách bình luận của một công việc cụ thể
const getComments = async (req, res) => {
    try {
        const data = await service.getList(req.params.taskId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Gửi bình luận mới (Đã gỡ bỏ duongDanChuKy)
const postComment = async (req, res) => {
    try {
        const { noiDung } = req.body;

        if (!noiDung || noiDung.trim() === "") {
            return res.status(400).json({ message: "Nội dung thảo luận không được để trống!" });
        }

        await service.add(req.params.taskId, req.user.MaTaiKhoan, { 
            noiDung: noiDung.trim() 
        });

        res.status(201).json({ success: true, message: "Đã đăng thảo luận thành công!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Chỉnh sửa nội dung bình luận
const editComment = async (req, res) => {
    try {
        const { noiDung } = req.body;

        if (!noiDung || noiDung.trim() === "") {
            return res.status(400).json({ message: "Nội dung chỉnh sửa không được để trống!" });
        }

        await service.edit(req.params.commentId, noiDung.trim());
        res.status(200).json({ success: true, message: "Cập nhật bình luận thành công!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Xóa bỏ bình luận thảo luận
const removeComment = async (req, res) => {
    try {
        await service.del(req.params.commentId);
        res.status(200).json({ success: true, message: "Đã gỡ thảo luận thành công!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getComments, postComment, editComment, removeComment };