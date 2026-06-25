import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            // Kết hợp màu Gradient và Pattern chìm của Ant Design
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e6f7ff 100%)',
            backgroundImage: 'url("https://gw.alipayobjects.com/zos/rmsportal/TVYTbAXqs5PhCGxNVZPl.png")', 
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center 110px',
            backgroundSize: '100%',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Gỡ bỏ hoàn toàn maxWidth: 400px.
                Khu vực này giờ đây là không gian mở, cho phép trang Đăng ký bung rộng tối đa */}
            <div style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                zIndex: 10,
                padding: '20px'
            }}>
                <Outlet /> 
            </div>

            {/* Footer chân trang Auth */}
            <div style={{ 
                position: 'absolute', 
                bottom: 24, 
                width: '100%', 
                textAlign: 'center', 
                color: '#8c8c8c',
                fontSize: '13px',
                zIndex: 1
            }}>
                Hệ thống Quản trị ERP ©2026 • Tích hợp Chữ ký số điện tử
            </div>
        </div>
    );
};

export default AuthLayout;