const express = require("express");

const router = express.Router();

const authController =
    require(
        "../controllers/auth.controller"
    );

const {
    verifyToken
} = require(
    "../middleware/auth.middleware"
);

router.post(
    "/login",
    authController.login
);

router.post(
    "/profile",
    verifyToken,
    authController.profile
);

router.post("/register", authController.register);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;