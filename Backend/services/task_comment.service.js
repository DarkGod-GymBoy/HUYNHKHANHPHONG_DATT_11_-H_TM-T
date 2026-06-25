const repo = require("../repositories/task_comment.repository");

const getList = async (taskId) => {
    if (!taskId) throw new Error("Mã công việc không hợp lệ!");
    return await repo.getCommentsByTask(taskId);
};

// Hàm add đã được dọn sạch rác liên quan đến ảnh chữ ký
const add = async (taskId, userId, data) => {
    if (!data.noiDung || data.noiDung.trim() === "") {
        throw new Error("Nội dung bình luận không được để trống!");
    }
    // Chỉ truyền nội dung văn bản xuống Repository
    return await repo.addComment(taskId, userId, data.noiDung.trim());
};

const edit = async (commentId, noiDung) => {
    if (!commentId) throw new Error("Mã bình luận không hợp lệ!");
    return await repo.updateComment(commentId, noiDung);
};

const del = async (commentId) => {
    if (!commentId) throw new Error("Mã bình luận không hợp lệ!");
    return await repo.deleteComment(commentId);
};

module.exports = { getList, add, edit, del };