const { getPool } = require("../config/database");

const getAllRoles = async () => {
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT MaVaiTro, TenVaiTro, MoTa 
        FROM VaiTro
        ORDER BY MaVaiTro ASC
    `);
    return result.recordset;
};

module.exports = {
    getAllRoles
};