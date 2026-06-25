import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message, Select, Row, Col, Spin, Divider } from 'antd';
import { 
    UserOutlined, LockOutlined, MailOutlined, IdcardOutlined, 
    PhoneOutlined, UserAddOutlined, AppstoreOutlined, SolutionOutlined, TeamOutlined 
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/axios';

const { Title, Text } = Typography;
const { Option } = Select;

const RegisterPage = () => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true); 
    
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [roles, setRoles] = useState([]);
    
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [deptRes, posRes, roleRes] = await Promise.all([
                    api.get('/departments'),
                    api.get('/positions'),
                    api.get('/roles') 
                ]);
                
                const deptData = deptRes?.data?.data || deptRes?.data || (deptRes?.success ? deptRes.data : []);
                const posData = posRes?.data?.data || posRes?.data || (posRes?.success ? posRes.data : []);
                const roleData = roleRes?.data?.data || roleRes?.data || (roleRes?.success ? roleRes.data : []);

                setDepartments(Array.isArray(deptData) ? deptData : []);
                setPositions(Array.isArray(posData) ? posData : []);
                setRoles(Array.isArray(roleData) ? roleData : []);
            // eslint-disable-next-line no-unused-vars
            } catch (error) {
                message.error('Không thể kết nối máy chủ để nạp dữ liệu cấu hình!');
            } finally {
                setFetching(false);
            }
        };

        fetchMasterData();
    }, []);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await api.post('/auths/register', values);
            if (response?.success || response?.data?.success) {
                message.success('Đăng ký hồ sơ tài khoản nhân sự thành công!');
                navigate('/login');
            } else {
                message.error('Đăng ký thất bại, hệ thống từ chối cấp phát hồ sơ!');
            }
        } catch (error) {
            message.error(error.response?.data?.message || error.message || 'Đăng ký thất bại, vui lòng kiểm tra lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{
            width: '100%',
            maxWidth: '760px', 
            background: '#ffffff',
            borderRadius: '24px', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)', 
            padding: '40px 48px',
            position: 'relative',
            overflow: 'hidden',
            margin: '0 auto'
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: '#52c41a' }}></div>

            <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '5px' }}>
                <div style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                    width: '68px', height: '68px', borderRadius: '50%', 
                    background: '#f6ffed', marginBottom: '16px' 
                }}>
                    <UserAddOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                </div>
                <Title level={3} style={{ margin: 0, color: '#002766', fontWeight: 800 }}>
                    ĐĂNG KÝ HỒ SƠ NHÂN SỰ
                </Title>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                    Thiết lập thông tin tài khoản chuyên môn thuộc hệ thống quản trị
                </Text>
            </div>

            <Spin spinning={fetching} tip="Đang đồng bộ dữ liệu danh mục...">
                <Form name="register_form" onFinish={onFinish} size="large" layout="vertical">
                    <Row gutter={32}>
                        {/* CỘT TRÁI */}
                        <Col xs={24} md={12}>
                            <Form.Item label={<Text strong>Họ và tên nhân sự</Text>} name="hoTen" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
                                <Input prefix={<IdcardOutlined style={{ color: '#bfbfbf' }}/>} placeholder="Nhập đầy đủ họ tên..." style={{ borderRadius: '10px', padding: '8px 14px' }} />
                            </Form.Item>

                            <Form.Item label={<Text strong>Email liên hệ</Text>} name="email" rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}>
                                <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }}/>} placeholder="example@hospital.com" style={{ borderRadius: '10px', padding: '8px 14px' }} />
                            </Form.Item>

                            <Form.Item label={<Text strong>Số điện thoại di động</Text>} name="soDienThoai" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}>
                                <Input prefix={<PhoneOutlined style={{ color: '#bfbfbf' }}/>} placeholder="Nhập số điện thoại..." style={{ borderRadius: '10px', padding: '8px 14px' }} />
                            </Form.Item>

                            <Form.Item label={<Text strong>Phòng ban trực thuộc</Text>} name="maPhongBan" rules={[{ required: true, message: 'Vui lòng chọn phòng ban!' }]}>
                                <Select placeholder="-- Chọn phòng ban --" suffixIcon={<AppstoreOutlined />} style={{ borderRadius: '10px', height: '42px' }}>
                                    {departments.map(dept => <Option key={dept.MaPhongBan} value={dept.MaPhongBan}>{dept.TenPhongBan}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>

                        {/* CỘT PHẢI */}
                        <Col xs={24} md={12}>
                            <Form.Item label={<Text strong>Tên đăng nhập hệ thống</Text>} name="tenDangNhap" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}>
                                <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }}/>} placeholder="Viết liền không dấu" style={{ borderRadius: '10px', padding: '8px 14px' }} />
                            </Form.Item>

                            <Form.Item label={<Text strong>Mật khẩu an toàn</Text>} name="matKhau" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
                                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }}/>} placeholder="Nhập mật khẩu truy cập" style={{ borderRadius: '10px', padding: '8px 14px' }} />
                            </Form.Item>

                            <Form.Item label={<Text strong>Chức danh / Chức vụ</Text>} name="maChucVu" rules={[{ required: true, message: 'Vui lòng chọn chức vụ!' }]}>
                                <Select placeholder="-- Chọn chức danh --" suffixIcon={<SolutionOutlined />} style={{ borderRadius: '10px', height: '42px' }}>
                                    {positions.map(pos => <Option key={pos.MaChucVu} value={pos.MaChucVu}>{pos.TenChucVu}</Option>)}
                                </Select>
                            </Form.Item>

                            <Form.Item label={<Text strong>Quyền hạn điều phối</Text>} name="maVaiTro" rules={[{ required: true, message: 'Vui lòng chọn quyền hạn!' }]}>
                                <Select placeholder="-- Chọn phân quyền --" suffixIcon={<TeamOutlined />} style={{ borderRadius: '10px', height: '42px' }}>
                                    {roles.map(role => <Option key={role.MaVaiTro} value={role.MaVaiTro}>{role.TenVaiTro}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ 
                            width: '280px', height: '48px', borderRadius: '12px', 
                            fontSize: '15px', fontWeight: 600, background: '#52c41a', borderColor: '#52c41a',
                            boxShadow: '0 6px 16px rgba(82, 196, 26, 0.3)'
                        }}>
                            KHỞI TẠO HỒ SƠ
                        </Button>
                    </div>
                </Form>
            </Spin>

            <Divider style={{ margin: '28px 0 16px 0' }} />

            <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: '14px' }}>
                Đã có tài khoản nội bộ? <Link to="/login" style={{ fontWeight: 600, color: '#1890ff' }}>Đăng nhập ngay</Link>
            </div>
        </div>
    );
};

export default RegisterPage;