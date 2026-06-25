const express = require("express");
const router = express.Router();
const proposalController = require("../controllers/proposal.controller");
const { verifyToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

router.use(verifyToken);
router.get("/my", proposalController.getMyProposals);
router.get("/all", proposalController.getAllProposals);
router.get("/:id/print", proposalController.getProposalForPrint); 
router.post("/", upload.array("files"), proposalController.createProposal);
router.post("/sign", proposalController.signProposal);
router.post("/reject", proposalController.rejectProposal);
router.post("/return", proposalController.returnProposal);
router.post("/resubmit", proposalController.resubmitProposal);
router.post("/:id/upload", upload.array("files"), proposalController.uploadFile);
router.put("/:id", upload.array("files"), proposalController.updateProposal);
router.get("/workflows", proposalController.getWorkflows);


module.exports = router;