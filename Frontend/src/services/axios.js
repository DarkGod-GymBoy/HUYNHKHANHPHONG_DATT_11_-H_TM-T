import axios from 'axios';

// 1. Khởi tạo một instance của Axios trỏ đến domain của Backend
const api = axios.create({
    baseURL: 'http://localhost:3000/api', // Địa chỉ Backend hệ thống ERP Workspace
    timeout: 10000, // Quá 10 giây không phản hồi thì ngắt kết nối báo lỗi
});

// 2. INTERCEPTOR REQUEST: Tự động đính kèm chứng thư token trước khi gửi yêu cầu
api.interceptors.request.use(
    (config) => {
        // Lấy mã Token xác thực từ bộ nhớ LocalStorage
        const token = localStorage.getItem('token');
        
        // Nếu tồn tại token, tự động cấu hình ngầm vào Header Authorization
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 3. INTERCEPTOR RESPONSE: Tiền xử lý dữ liệu và bẫy lỗi tập trung
api.interceptors.response.use(
    (response) => {
        // Trả về thẳng dữ liệu lõi để tầng UI giảm thiểu việc viết .data.data nhiều lần
        return response.data;
    },
    (error) => {
        // Xử lý bẫy lỗi tập trung từ máy chủ
        if (error.response) {
            // Trường hợp 401: Token hết hạn hoặc phiên làm việc không hợp lệ
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Trục xuất an toàn người dùng quay về trang đăng nhập hệ thống
                window.location.href = '/login'; 
            }
        }
        
        // 🌟 ĐÃ FIX: Trả về nguyên vẹn object 'error' của Axios.
        // Điều này đảm bảo cú pháp 'error.response?.data?.message' ở toàn bộ các file giao diện UI (.jsx)
        // bóc tách dữ liệu chuẩn xác, hiển thị đúng câu thông báo lỗi từ SQL Server gửi lên.
        return Promise.reject(error);
    }
);

export default api;