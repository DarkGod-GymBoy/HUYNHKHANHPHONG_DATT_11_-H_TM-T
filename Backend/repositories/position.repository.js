const { getPool } = require("../config/database");

const getAllPositions = async () => {
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT MaChucVu, TenChucVu, MoTa 
        FROM ChucVu 
        ORDER BY MaChucVu DESC
    `);
    return result.recordset;
};

const findByName = async (tenChucVu) => {
    const pool = getPool();
    const result = await pool.request()
        .input("TenChucVu", tenChucVu)
        .query("SELECT * FROM ChucVu WHERE TenChucVu = @TenChucVu");
    return result.recordset[0];
};

const createPosition = async (tenChucVu, moTa) => {
    const pool = getPool();
    const result = await pool.request()
        .input("TenChucVu", tenChucVu)
        .input("MoTa", moTa)
        .query(`
            INSERT INTO ChucVu (TenChucVu, MoTa) 
            OUTPUT INSERTED.* VALUES (@TenChucVu, @MoTa)
        `);
    return result.recordset[0];
};

const updatePosition = async (maChucVu, tenChucVu, moTa) => {
    const pool = getPool();
    const result = await pool.request()
        .input("MaChucVu", maChucVu)
        .input("TenChucVu", tenChucVu)
        .input("MoTa", moTa)
        .query(`
            UPDATE ChucVu 
            SET TenChucVu = @TenChucVu, MoTa = @MoTa 
            OUTPUT INSERTED.*
            WHERE MaChucVu = @MaChucVu  
        `);
    return result.recordset[0];
};

const deletePosition = async (maChucVu) => {
    const pool = getPool();
    await pool.request()
        .input("MaChucVu", maChucVu)
        .query("DELETE FROM ChucVu WHERE MaChucVu = @MaChucVu");
    return true;
};

// Kiểm tra xem chức vụ có nhân viên nào đang trực thuộc không (để chặn xóa)
const checkEmployeesInPosition = async (maChucVu) => {
    const pool = getPool();
    const result = await pool.request()
        .input("MaChucVu", maChucVu)
        .query("SELECT COUNT(*) AS TongSo FROM TaiKhoan WHERE MaChucVu = @MaChucVu");
    return result.recordset[0].TongSo > 0;
};

module.exports = {
    getAllPositions,
    findByName,
    createPosition,
    updatePosition,
    deletePosition,
    checkEmployeesInPosition    
};