const { getPool } = require("../config/database");

const getTaskStatistics = async () => {
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT TrangThai, TongSo 
        FROM VW_ThongKeCongViec
    `);
    return result.recordset;
};

const getProposalStatistics = async () => {
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT TrangThai, TongSo 
        FROM VW_ThongKeDeXuat
    `);
    return result.recordset;
};

const getTotalEmployees = async () => {
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT COUNT(*) AS TongSoNhanVien 
        FROM TaiKhoan 
        WHERE TrangThai = 1
    `);
    return result.recordset[0].TongSoNhanVien;
};

module.exports = {
    getTaskStatistics,
    getProposalStatistics,
    getTotalEmployees
};