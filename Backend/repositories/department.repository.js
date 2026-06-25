const { getPool } = require("../config/database");

const getAllDepartments = async () => {
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT MaPhongBan, TenPhongBan, MoTa, NgayTao 
        FROM PhongBan 
        ORDER BY MaPhongBan DESC
    `);
    return result.recordset;
};

const findByName = async (tenPhongBan) => {
    const pool = getPool();
    const result = await pool.request()
        .input("TenPhongBan", tenPhongBan)
        .query("SELECT * FROM PhongBan WHERE TenPhongBan = @TenPhongBan");
    return result.recordset[0];
};

const createDepartment = async (tenPhongBan, moTa) => {
    const pool = getPool();
    const result = await pool.request()
        .input("TenPhongBan", tenPhongBan)
        .input("MoTa", moTa)
        .query(`
            INSERT INTO PhongBan (TenPhongBan, MoTa, NgayTao) 
            OUTPUT INSERTED.* VALUES (@TenPhongBan, @MoTa, GETDATE())
        `);
    return result.recordset[0];
};

const updateDepartment = async (maPhongBan, tenPhongBan, moTa) => {
    const pool = getPool();
    const result = await pool.request()
        .input("MaPhongBan", maPhongBan)
        .input("TenPhongBan", tenPhongBan)
        .input("MoTa", moTa)
        .query(`
            UPDATE PhongBan 
            SET TenPhongBan = @TenPhongBan, MoTa = @MoTa 
            OUTPUT INSERTED.*
            WHERE MaPhongBan = @MaPhongBan
        `);
    return result.recordset[0];
};

const deleteDepartment = async (maPhongBan) => {
    const pool = getPool();
    await pool.request()
        .input("MaPhongBan", maPhongBan)
        .query("DELETE FROM PhongBan WHERE MaPhongBan = @MaPhongBan");
    return true;
};

// Kiểm tra xem phòng ban có nhân viên nào đang trực thuộc không (để chặn xóa)
const checkEmployeesInDepartment = async (maPhongBan) => {
    const pool = getPool();
    const result = await pool.request()
        .input("MaPhongBan", maPhongBan)
        .query("SELECT COUNT(*) AS TongSo FROM TaiKhoan WHERE MaPhongBan = @MaPhongBan");
    return result.recordset[0].TongSo > 0;
};

module.exports = {
    getAllDepartments,
    findByName,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    checkEmployeesInDepartment
};