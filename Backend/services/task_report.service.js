// backend/services/task_report.service.js
const reportRepo = require("../repositories/task_report.repository");
const taskRepository = require("../repositories/task.repository"); 

// 1. Nhân viên lập báo cáo tiến độ mới
const createReport = async (taskId, reportData, maTaiKhoan) => {
    try {
        const { tyLeHoanThanh, noiDungBaoCao, danhSachFile } = reportData;

    
        const dataPayload = { 
            tyLeHoanThanh: tyLeHoanThanh || 0, 
            noiDungBaoCao: noiDungBaoCao 
        };

        const maBaoCao = await reportRepo.createReportTransaction(
            taskId, 
            maTaiKhoan, 
            dataPayload, 
            danhSachFile || []
        );

        return { maBaoCao };
    } catch (error) {
        throw new Error(error.message);
    }
};

// 2. Lấy danh sách việc được phân công riêng cho nhân sự đang đăng nhập
const getMyTasks = async (maTaiKhoan) => {
    if (!maTaiKhoan) throw new Error("Mã định danh tài khoản không hợp lệ!");
    return await reportRepo.getMyAssignedTasks(maTaiKhoan);
};

// 3. Lấy danh sách các lần nộp báo cáo của 1 Task (Hiển thị lên Timeline Drawer chi tiết)
const getTaskReports = async (maCongViec) => {
    if (!maCongViec) throw new Error("Mã công việc chuyên môn không hợp lệ!");
    return await reportRepo.getReportsByTask(maCongViec);
};

// 🔄 CÁC HÀM CRUD KHÁC 
const getList = async (maCongViec) => {
    if (!maCongViec) throw new Error("Mã công việc không hợp lệ!");
    return await reportRepo.getAllByTask(maCongViec);
};

const add = async (data) => {
    if (!data.maCongViec || !data.maTaiKhoan) throw new Error("Dữ liệu đầu vào bị thiếu!");
    return await reportRepo.create(data); 
};

const edit = async (id, data) => {
    if (!id) throw new Error("Mã bản báo cáo không hợp lệ!");
    return await reportRepo.update(id, data); 
};

const del = async (id) => {
    if (!id) throw new Error("Mã bản báo cáo không hợp lệ!");
    return await reportRepo.remove(id); 
};

module.exports = {
    createReport,
    getMyTasks,       
    getTaskReports,
    getList,
    add,
    edit,
    del
};