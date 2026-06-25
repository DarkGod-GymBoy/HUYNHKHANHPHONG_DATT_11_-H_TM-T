import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Spin, Divider } from 'antd'; 
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/axios';

const { Title, Text } = Typography;

const ResetPasswordPage = () => {
    const [loading, setLoading] = useState(false);
    const [isValidLink, setIsValidLink] = useState(true); 
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsValidLink(false); 
            message.error('Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu thông tin.');
            navigate('/login');
        }
    }, [token, email, navigate]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await api.post('/auths/reset-password', { token, email, newPassword: values.password });
            message.success('Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại.');
            navigate('/login');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Liên kết đã hết hạn hoặc không hợp lệ.';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isValidLink) {
        return <Spin size="large" tip="Đang chuyển hướng về trang đăng nhập..." />;
    }

    return (
        <Card 
            className="fade-in"
            bordered={false} 
            style={{ 
                width: '100%', maxWidth: '460px', margin: '0 auto',
                borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                position: 'relative', overflow: 'hidden'
            }}
            styles={{ body: { padding: '48px 40px' } }}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: '#0050b3' }}></div>

            <div style={{ textAlign: 'center', marginBottom: '36px', marginTop: '10px' }}>
                <div style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                    width: '72px', height: '72px', borderRadius: '50%', 
                    background: '#e6f7ff', marginBottom: '16px' 
                }}>
                    <SafetyCertificateOutlined style={{ fontSize: '34px', color: '#0050b3' }} />
                </div>
                <Title level={3} style={{ margin: 0, color: '#002766', fontWeight: 800 }}>
                    ĐẶT LẠI MẬT KHẨU
                </Title>
                <Text type="secondary" style={{ fontSize: '14px', marginTop: '4px', display: 'block' }}>
                    Vui lòng thiết lập mật khẩu bảo mật mới cho tài khoản.
                </Text>
            </div>
            
            <Form onFinish={onFinish} layout="vertical" size="large">
                <Form.Item 
                    name="password" 
                    label={<Text strong style={{ color: '#595959' }}>Mật khẩu mới</Text>}
                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới!' }, { min: 6, message: 'Ít nhất 6 ký tự!' }]}
                >
                    <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf', marginRight: 6 }} />} placeholder="Nhập mật khẩu mới" style={{ borderRadius: '10px', padding: '10px 16px' }} />
                </Form.Item>
                
                <Form.Item 
                    name="confirm" 
                    label={<Text strong style={{ color: '#595959' }}>Xác nhận mật khẩu mới</Text>}
                    dependencies={['password']} 
                    rules={[
                        { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) return Promise.resolve();
                                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                            },
                        }),
                    ]}
                    style={{ marginTop: '20px' }}
                >
                    <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf', marginRight: 6 }} />} placeholder="Nhập lại mật khẩu mới" style={{ borderRadius: '10px', padding: '10px 16px' }} />
                </Form.Item>
                
                <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ 
                        height: '50px', borderRadius: '12px', fontSize: '16px', fontWeight: 600, 
                        background: '#0050b3', borderColor: '#0050b3', boxShadow: '0 6px 16px rgba(0, 80, 179, 0.25)'
                    }}>
                        CẬP NHẬT MẬT KHẨU
                    </Button>
                </Form.Item>
            </Form>

            <Divider style={{ margin: '32px 0 20px 0', borderColor: '#f0f0f0' }} />

            <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: '14px' }}>
                <Link to="/login" style={{ fontWeight: 600, color: '#1890ff' }}>Quay lại Đăng nhập</Link>
            </div>
        </Card>
    );
};

export default ResetPasswordPage;