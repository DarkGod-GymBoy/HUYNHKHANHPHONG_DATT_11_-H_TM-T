const bcrypt = require("bcryptjs"); 
const employeeRepo = require("../repositories/employee.repository");
const { getPool } = require("../config/database"); // ✅ FIX LỖI SẬP APP DO THIẾU POOL

// LOGIC CÁ NHÂN (USER PORTAL)
const getDetail = async (maTaiKhoan) => {
    const profile = await employeeRepo.getEmployeeDetail(maTaiKhoan);
    if (!profile) throw new Error("Không tìm thấy thông tin nhân viên");
    return profile;
};

const updateProfile = async (maTaiKhoan, data) => {
    const profileExists = await employeeRepo.getEmployeeDetail(maTaiKhoan);
    if (!profileExists) throw new Error("Tài khoản không tồn tại trong hệ thống");
    await employeeRepo.updateEmployeeProfile(maTaiKhoan, data);
    return await employeeRepo.getEmployeeDetail(maTaiKhoan);
};

// LOGIC QUẢN TRỊ (ADMIN)
const getAll = async () => {
    return await employeeRepo.getAll();
};

const create = async (data) => {
    if (!data.matKhau) throw new Error("Mật khẩu là bắt buộc khi tạo tài khoản!");
    const pool = await getPool();

    const checkUsername = await pool.request().input("TenDangNhap", data.tenDangNhap).query("SELECT 1 FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap");
    if (checkUsername.recordset.length > 0) throw new Error("Tên đăng nhập này đã được sử dụng!");

    if (data.email) {
        const checkEmail = await pool.request().input("Email", data.email).query("SELECT 1 FROM TaiKhoan WHERE Email = @Email");
        if (checkEmail.recordset.length > 0) throw new Error("Địa chỉ Email này đã được đăng ký cho nhân sự khác!");
    }

    if (data.cccd && data.cccd.trim() !== "") {
        const checkCCCD = await pool.request().input("CCCD", data.cccd).query("SELECT 1 FROM HoSoNhanVien WHERE CCCD = @CCCD");
        if (checkCCCD.recordset.length > 0) throw new Error("Số CCCD này đã tồn tại trên một hồ sơ nhân viên khác!");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.matKhau, salt);
    const employeeData = { ...data, matKhau: hashedPassword };
    
    return await employeeRepo.create(employeeData);
};

const update = async (id, data) => {
    const currentEmp = await employeeRepo.getEmployeeDetail(id);
    if (!currentEmp) throw new Error("Nhân viên không tồn tại hoặc đã bị xóa khỏi hệ thống");

    const pool = await getPool();

    if (data.email && data.email !== currentEmp.Email) {
        const checkEmailUpdate = await pool.request().input("Email", data.email).input("CurrentId", id).query("SELECT 1 FROM TaiKhoan WHERE Email = @Email AND MaTaiKhoan <> @CurrentId");
        if (checkEmailUpdate.recordset.length > 0) throw new Error("Email mới này đã được sử dụng bởi một nhân sự khác!");
    }

    if (data.cccd && data.cccd !== currentEmp.CCCD) {
        const checkCCCDUpdate = await pool.request().input("CCCD", data.cccd).input("CurrentId", id).query("SELECT 1 FROM HoSoNhanVien WHERE CCCD = @CCCD AND MaTaiKhoan <> @CurrentId");
        if (checkCCCDUpdate.recordset.length > 0) throw new Error("Số CCCD mới này đã tồn tại trên một hồ sơ nhân viên khác!");
    }

    let employeeData = { ...data };

    if (data.matKhau && data.matKhau.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        employeeData.matKhau = await bcrypt.hash(data.matKhau, salt);
    } else {
        delete employeeData.matKhau;
    }

    return await employeeRepo.update(id, employeeData);
};

// 🌟 THÊM LOGIC KHÓA TÀI KHOẢN
const toggleStatus = async (id, trangThai) => {
    const currentEmp = await employeeRepo.getEmployeeDetail(id);
    if (!currentEmp) throw new Error("Tài khoản không tồn tại trên hệ thống!");
    return await employeeRepo.toggleStatus(id, trangThai);
};

const remove = async (id) => {
    const currentEmp = await employeeRepo.getEmployeeDetail(id);
    if (!currentEmp) throw new Error("Nhân viên không tồn tại trên hệ thống hoặc đã bị xóa trước đó");
    return await employeeRepo.remove(id);
};

module.exports = { getDetail, updateProfile, getAll, create, update, toggleStatus, remove };