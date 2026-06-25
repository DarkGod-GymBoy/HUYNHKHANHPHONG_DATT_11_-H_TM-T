const express = require("express");
const router = express.Router();
const notifController = require("../controllers/notification.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.use(verifyToken);

router.get("/", notifController.getMyNotifications);
router.put("/:id/read", notifController.markAsRead);

module.exports = router;