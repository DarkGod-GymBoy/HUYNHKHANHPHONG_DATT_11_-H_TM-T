const notifService = require("../services/notification.service");

const getMyNotifications = async (req, res) => {
    try {
        const maTaiKhoan = req.user.MaTaiKhoan;
        const data = await notifService.getMyNotifications(maTaiKhoan);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const maTaiKhoan = req.user.MaTaiKhoan;
        const { id } = req.params;
        await notifService.markAsRead(id, maTaiKhoan);
        return res.status(200).json({ success: true, message: "Đã đọc thông báo" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMyNotifications,
    markAsRead
};