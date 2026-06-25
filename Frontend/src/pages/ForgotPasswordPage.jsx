import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Result, Divider } from 'antd';
import { MailOutlined, KeyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../services/axios';

const { Title, Text } = Typography;

const ForgotPasswordPage = () => {
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await api.post('/auths/forgot-password', { email: values.email });
            const resData = response?.data !== undefined ? response.data : response;

            if (resData && (resData.success === true || resData.success === 'true')) {
                setIsSuccess(true);
            } else {
                message.error(resData?.message || 'Địa chỉ Email không hợp lệ hoặc không tồn tại!');
            }
        } catch (error) {
            const serverMessage = error.response?.data?.message || error.message || 'Không thể kết nối đến máy chủ!';
            message.error(serverMessage);
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <Card
                className="fade-in"
                bordered={false}
                style={{
                    width: '100%', maxWidth: '500px', margin: '0 auto',
                    borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                    overflow: 'hidden', position: 'relative'
                }}
                styles={{ body: { padding: '32px 24px' } }}
            >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: '#52c41a' }}></div>
                <Result
                    status="success"
                    title={<span style={{ fontWeight: 700, color: '#002766' }}>GỬI YÊU CẦU THÀNH CÔNG!</span>}
                    subTitle="Hệ thống quản trị nội bộ đã tiếp nhận yêu cầu. Vui lòng kiểm tra hộp thư điện tử của bạn để lấy liên kết thiết lập lại mật khẩu."
                    extra={[
                        <Link to="/login" key="login">
                            <Button type="primary" size="large" style={{ width: '200px', height: '46px', borderRadius: '10px', backgroundColor: '#1890ff', fontWeight: 600 }}>
                                Quay lại Đăng nhập
                            </Button>
                        </Link>,
                    ]}
                />
            </Card>
        );
    }

    return (
        <Card
            className="fade-in"
            bordered={false}
            style={{
                width: '100%', maxWidth: '460px', margin: '0 auto',
                borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', 
                overflow: 'hidden', position: 'relative'
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
                    <KeyOutlined style={{ fontSize: '34px', color: '#0050b3' }} />
                </div>
                <Title level={3} style={{ margin: 0, color: '#002766', fontWeight: 800 }}>
                    QUÊN MẬT KHẨU
                </Title>
                <Text type="secondary" style={{ fontSize: '14px', marginTop: '4px', display: 'block' }}>
                    Cung cấp Email nhân sự để khôi phục quyền truy cập
                </Text>
            </div>

            <Form name="forgot_password_form" onFinish={onFinish} size="large" layout="vertical">
                <Form.Item 
                    name="email" 
                    label={<Text strong style={{ color: '#595959' }}>Email đăng ký hệ thống</Text>}
                    rules={[{ required: true, message: 'Vui lòng cung cấp địa chỉ Email!' }, { type: 'email', message: 'Định dạng địa chỉ Email không chính xác!' }]}
                >
                    <Input prefix={<MailOutlined style={{ color: '#bfbfbf', marginRight: 6 }}/>} placeholder="example@hospital.com" style={{ borderRadius: '10px', padding: '10px 16px' }} />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, marginTop: '28px' }}>
                    <Button type="primary" htmlType="submit" loading={loading} style={{ 
                        width: '100%', height: '50px', borderRadius: '12px', 
                        fontSize: '16px', fontWeight: 600, background: '#0050b3', borderColor: '#0050b3',
                        boxShadow: '0 6px 16px rgba(0, 80, 179, 0.25)'
                    }}>
                        GỬI YÊU CẦU XÁC THỰC
                    </Button>
                </Form.Item>
            </Form>

            <Divider style={{ margin: '32px 0 20px 0', borderColor: '#f0f0f0' }} />

            <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: '14px' }}>
                Nhớ ra thông tin tài khoản? <Link to="/login" style={{ fontWeight: 600, color: '#1890ff' }}>Đăng nhập ngay</Link>
            </div>
        </Card>
    );
};

export default ForgotPasswordPage;