const express = require("express");
const router = express.Router();
const positionController = require("../controllers/position.controller");
const { verifyToken } = require("../middleware/auth.middleware");




router.get("/", positionController.getAllPositions);


router.use(verifyToken);


router.post("/", positionController.createPosition);
router.put("/:id", positionController.updatePosition);
router.delete("/:id", positionController.deletePosition);



module.exports = router;