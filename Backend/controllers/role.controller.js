const roleService = require("../services/role.service");

const getAllRoles = async (req, res) => {
    try {
        const result = await roleService.getRoles();
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllRoles
};