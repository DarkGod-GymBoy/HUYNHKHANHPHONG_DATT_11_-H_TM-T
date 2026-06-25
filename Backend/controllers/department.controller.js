const departmentService = require("../services/department.service");

const getAllDepartments = async (req, res) => {
    try {
        const result = await departmentService.getAllDepartments();
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createDepartment = async (req, res) => {
    try {
        if (!req.body.tenPhongBan) {
            return res.status(400).json({ success: false, message: "Tên phòng ban không được để trống" });
        }
        const result = await departmentService.create(req.body);
        return res.status(201).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await departmentService.update(id, req.body);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await departmentService.remove(id);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
};