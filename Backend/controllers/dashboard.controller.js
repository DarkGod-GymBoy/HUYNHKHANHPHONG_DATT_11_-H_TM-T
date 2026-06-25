const dashboardService = require("../services/dashboard.service");

const getDashboardStats = async (req, res) => {
    try {
        const result = await dashboardService.getDashboardData();

        return res.status(200).json({ 
            success: true, 
            data: result 
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

module.exports = {
    getDashboardStats
};