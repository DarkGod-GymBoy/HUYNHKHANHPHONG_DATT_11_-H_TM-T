import { useState } from 'react';
import { Form, Input, Button, Checkbox, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/axios';

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await api.post('/auths/login', {
                tenDangNhap: values.tenDangNhap,
                matKhau: values.matKhau
            });

            const responseData = response.data?.data || response.data;
            const userData = responseData?.user;
            const token = responseData?.token;

            if (!token || !userData) {
                message.error("Hệ thống chưa nhận được dữ liệu phiên đăng nhập hợp lệ!");
                setLoading(false);
                return;
            }

            message.success('Đăng nhập thành công!');

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            if (Number(userData.MaVaiTro) === 1 || Number(userData.MaChucVu) === 1) {
                navigate('/admin');
            } else {
                navigate('/user');
            }

        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            message.error(error.response?.data?.message || 'Thông tin đăng nhập không chính xác!');
        } finally {
            setLoading(false);
        }
    };

    return (
        // 🌟 Chỉ giữ lại đúng khối Card nội dung, AuthLayout sẽ lo phần căn giữa
        <div className="fade-in" style={{
            width: '100%',
            maxWidth: '450px',
            background: '#ffffff',
            borderRadius: '24px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)', 
            padding: '40px 32px',
            position: 'relative',
            overflow: 'hidden',
            margin: '0 auto' // Đảm bảo luôn nằm giữa nếu AuthLayout co giãn
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#1890ff' }}></div>

            <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '10px' }}>
                <div style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                    width: '72px', height: '72px', borderRadius: '50%', 
                    background: '#e6f7ff', marginBottom: '16px' 
                }}>
                    <SafetyCertificateOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
                </div>
                <Title level={3} style={{ margin: 0, color: '#002766', fontWeight: 800 }}>
                    HỆ THỐNG QUẢN TRỊ
                </Title>
                <Text type="secondary" style={{ fontSize: '15px' }}>
                    Cổng đăng nhập dành cho nhân viên
                </Text>
            </div>

            <Form name="login_form" initialValues={{ remember: true }} onFinish={onFinish} size="large" layout="vertical">
                <Form.Item name="tenDangNhap" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#bfbfbf', marginRight: 8 }}/>} placeholder="Tên đăng nhập" style={{ borderRadius: '10px', padding: '10px 16px' }} />
                </Form.Item>

                <Form.Item name="matKhau" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
                    <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf', marginRight: 8 }}/>} placeholder="Mật khẩu bảo mật" style={{ borderRadius: '10px', padding: '10px 16px' }} />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox>Lưu đăng nhập</Checkbox>
                    </Form.Item>
                    <Link to="/forgot-password" style={{ color: '#1890ff', fontWeight: 500 }}>
                        Quên mật khẩu?
                    </Link>
                </div>

                <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" loading={loading} style={{ 
                        width: '100%', height: '50px', borderRadius: '12px', 
                        fontSize: '16px', fontWeight: 600, background: '#1890ff',
                        boxShadow: '0 6px 16px rgba(24,144,255,0.3)'
                    }}>
                        ĐĂNG NHẬP
                    </Button>
                </Form.Item>
            </Form>

            <Divider style={{ margin: '28px 0 20px 0' }} />

            <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
                Chưa có tài khoản nội bộ? <Link to="/register" style={{ fontWeight: 600, color: '#1890ff' }}>Đăng ký ngay</Link>
            </div>
        </div>
    );
};

export default LoginPage;