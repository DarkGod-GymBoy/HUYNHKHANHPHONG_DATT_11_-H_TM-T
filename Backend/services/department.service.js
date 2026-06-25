const departmentRepo = require("../repositories/department.repository");

const getAllDepartments = async () => {
    return await departmentRepo.getAllDepartments();
};

const create = async (data) => {
    const { tenPhongBan, moTa } = data;

    // Logic: Tên phòng ban không được trùng lặp
    const exists = await departmentRepo.findByName(tenPhongBan);
    if (exists) {
        throw new Error("Tên phòng ban đã tồn tại trong hệ thống");
    }

    return await departmentRepo.createDepartment(tenPhongBan, moTa);
};

const update = async (id, data) => {
    const { tenPhongBan, moTa } = data;
    
    // Nếu đổi tên, kiểm tra xem tên mới có bị trùng với phòng khác không
    const exists = await departmentRepo.findByName(tenPhongBan);
    if (exists && exists.MaPhongBan != id) {
        throw new Error("Tên phòng ban đã tồn tại");
    }

    const updated = await departmentRepo.updateDepartment(id, tenPhongBan, moTa);
    if (!updated) throw new Error("Không tìm thấy phòng ban để cập nhật");
    
    return updated;
};

const remove = async (id) => {
    // Logic RẤT QUAN TRỌNG: Không được xóa phòng ban đang có nhân viên
    const hasEmployees = await departmentRepo.checkEmployeesInDepartment(id);
    if (hasEmployees) {
        throw new Error("Không thể xóa phòng ban đang có nhân viên trực thuộc");
    }

    await departmentRepo.deleteDepartment(id);
    return { message: "Xóa phòng ban thành công" };
};

module.exports = {
    getAllDepartments,
    create,
    update,
    remove
};