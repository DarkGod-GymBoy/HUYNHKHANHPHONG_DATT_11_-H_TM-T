const roleRepo = require("../repositories/role.repository");

const getRoles = async () => {
    return await roleRepo.getAllRoles();
};

module.exports = {
    getRoles
};