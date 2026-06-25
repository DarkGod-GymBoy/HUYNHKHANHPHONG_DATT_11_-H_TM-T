const positionRepo = require("../repositories/position.repository");

const getAllPositions = async () => {
    return await positionRepo.getAllPositions();
};

const create = async (data) => {
    const { tenChucVu, moTa } = data;

    // Logic: Tên chức vụ không được trùng lặp
    const exists = await positionRepo.findByName(tenChucVu);
    if (exists) {
        throw new Error("Tên chức vụ đã tồn tại trong hệ thống");
    }

    return await positionRepo.createPosition(tenChucVu, moTa);
};

const update = async (id, data) => {
    const { tenChucVu, moTa } = data;

    // Nếu đổi tên, kiểm tra xem tên mới có bị trùng với chức vụ khác không
    const exists = await positionRepo.findByName(tenChucVu);
    if (exists && exists.MaChucVu != id) {
        throw new Error("Tên chức vụ đã tồn tại");
    }

    const updated = await positionRepo.updatePosition(id, tenChucVu, moTa);
    if (!updated) throw new Error("Không tìm thấy chức vụ để cập nhật");
    
    return updated;
};

const remove = async (id) => {
    // Logic RẤT QUAN TRỌNG: Không được xóa chức vụ đang có nhân viên
    const hasEmployees = await positionRepo.checkEmployeesInPosition(id);
    if (hasEmployees) {
        throw new Error("Không thể xóa chức vụ đang có nhân viên trực thuộc");
    }

    await positionRepo.deletePosition(id);
    return { message: "Xóa chức vụ thành công" };
};

module.exports = {
    getAllPositions,
    create,
    update,
    remove
};