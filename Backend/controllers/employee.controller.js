const employeeService = require("../services/employee.service");

// CÁ NHÂN
const getMyProfile = async (req, res) => {
    try {
        const maTaiKhoan = req.user.MaTaiKhoan; 
        const result = await employeeService.getDetail(maTaiKhoan);
        return res.status(200).json({ success: true, data: result });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

const updateMyProfile = async (req, res) => {
    try {
        const maTaiKhoan = req.user.MaTaiKhoan;
        const result = await employeeService.updateProfile(maTaiKhoan, req.body);
        return res.status(200).json({ success: true, message: "Cập nhật hồ sơ thành công", data: result });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

// ADMIN
const getAllEmployees = async (req, res) => {
    try {
        const result = await employeeService.getAll();
        return res.status(200).json({ success: true, data: result });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

const getFullProfile = async (req, res) => {
    try {
        const result = await employeeService.getDetail(req.params.id); 
        return res.status(200).json({ success: true, data: result });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

const createEmployee = async (req, res) => {
    try {
        await employeeService.create(req.body);
        return res.status(201).json({ success: true, message: "Tạo tài khoản và hồ sơ nhân sự mới thành công" });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

const updateEmployee = async (req, res) => {
    try {
        await employeeService.update(req.params.id, req.body);
        return res.status(200).json({ success: true, message: "Cập nhật hồ sơ nhân sự thành công" });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

// 🌟 API KHÓA TÀI KHOẢN (SOFT DELETE)
const toggleEmployeeStatus = async (req, res) => {
    try {
        const { trangThai } = req.body;
        await employeeService.toggleStatus(req.params.id, trangThai);
        return res.status(200).json({ success: true, message: trangThai ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản thành công" });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

// XÓA VĨNH VIỄN
const deleteEmployee = async (req, res) => {
    try {
        await employeeService.remove(req.params.id);
        return res.status(200).json({ success: true, message: "Xóa vĩnh viễn nhân viên khỏi hệ thống thành công" });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

module.exports = { getMyProfile, updateMyProfile, getAllEmployees, getFullProfile, createEmployee, updateEmployee, toggleEmployeeStatus, deleteEmployee };