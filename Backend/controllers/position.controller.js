const positionService = require("../services/position.service");

const getAllPositions = async (req, res) => {
    try {
        const result = await positionService.getAllPositions();
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createPosition = async (req, res) => {
    try {
        if (!req.body.tenChucVu) {
            return res.status(400).json({ success: false, message: "Tên chức vụ không được để trống" });
        }
        const result = await positionService.create(req.body);
        return res.status(201).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const updatePosition = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await positionService.update(id, req.body);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const deletePosition = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await positionService.remove(id);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllPositions,
    createPosition,
    updatePosition,
    deletePosition  
};