const dashboardRepo = require("../repositories/dashboard.repository");

const getDashboardData = async () => {
    // Chạy song song 3 truy vấn để tối ưu hiệu suất
    const [thongKeCongViec, thongKeDeXuat, tongNhanVien] = await Promise.all([
        dashboardRepo.getTaskStatistics(),
        dashboardRepo.getProposalStatistics(),
        dashboardRepo.getTotalEmployees()
    ]);

    // Gom dữ liệu lại thành 1 cấu trúc chuẩn cho Frontend dễ vẽ Chart
    return {
        tongNhanVien: tongNhanVien,
        congViec: thongKeCongViec,
        deXuat: thongKeDeXuat
    };
};

module.exports = {
    getDashboardData
};