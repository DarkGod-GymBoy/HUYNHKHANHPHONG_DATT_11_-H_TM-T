/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { 
    Table, Button, Modal, Form, Input, Upload, Select,
    message, Space, Typography, Tag, Spin, Popconfirm, Switch
} from "antd";
import { 
    CheckCircleOutlined, SafetyCertificateOutlined, 
    PictureOutlined, PlusOutlined, DeleteOutlined, EditOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios";

const { Title, Text } = Typography;
const { Option } = Select;

const getImageUrl = (path) => {
    if (!path) return "";
    return path.startsWith('/') ? `http://localhost:3000${path}` : `http://localhost:3000/${path}`;
};

const SignatureManagement = () => {
    const [signatures, setSignatures] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State quản lý Modal và trạng thái Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();

    const fetchSignaturesAndEmployees = async () => {
        setLoading(true);
        try {
            const [sigRes, empRes] = await Promise.all([
                api.get("/signatures"), // Đã khớp với Backend dùng chung
                api.get("/employees")       
            ]);
            setSignatures(sigRes.data?.data || sigRes.data || []);
            setEmployees(empRes.data?.data || empRes.data || []);
        } catch (error) {
            console.error("Lỗi API:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSignaturesAndEmployees();
    }, []);

    // Mở Form Thêm Mới
    const handleAddNew = () => {
        setIsEditMode(false);
        setEditingId(null);
        form.resetFields();
        setFileList([]);
        setIsModalOpen(true);
    };

    // Mở Form Sửa
    const handleEdit = (record) => {
        setIsEditMode(true);
        setEditingId(record.MaChuKyNguoiDung || record.maChuKyNguoiDung);
        form.setFieldsValue({
            maTaiKhoan: record.MaTaiKhoan || record.maTaiKhoan,
            tenChuKy: record.TenChuKy || record.tenChuKy,
            dangSuDung: record.DangSuDung || record.dangSuDung
        });
        setFileList([]);
        setIsModalOpen(true);
    };

    // Xử lý Submit (Chung cho cả Thêm và Sửa)
    const handleUploadSubmit = async (values) => {
        if (!isEditMode && fileList.length === 0) return message.warning("Vui lòng chọn ảnh chữ ký!");

        try {
            const formData = new FormData();
            formData.append("maTaiKhoan", values.maTaiKhoan); 
            formData.append("tenChuKy", values.tenChuKy || "Chữ ký cá nhân");
            
            // Nếu đang ở chế độ sửa, gửi thêm trạng thái Bật/Tắt
            if (isEditMode) {
                formData.append("dangSuDung", values.dangSuDung ? 1 : 0);
            }

            // Nếu có up file ảnh mới thì mới gửi
            if (fileList.length > 0) {
                formData.append("image", fileList[0].originFileObj || fileList[0]);
            }

            if (isEditMode) {
                await api.put(`/signatures/${editingId}`, formData);
                message.success("Cập nhật chữ ký thành công!");
            } else {
                await api.post("/signatures", formData);
                message.success("Thêm chữ ký cho nhân viên thành công!");
            }
            
            setIsModalOpen(false);
            form.resetFields();
            setFileList([]);
            fetchSignaturesAndEmployees();
        } catch (error) {
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi tải lên!");
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/signatures/${id}`);
            message.success("Đã xóa chữ ký!");
            fetchSignaturesAndEmployees();
        } catch (error) {
            message.error("Lỗi khi xóa chữ ký");
        }
    };

    const columns = [
        { title: "ID", dataIndex: "MaChuKyNguoiDung", width: 60, render: (t, r) => t || r.maChuKyNguoiDung },
        { 
            title: "Nhân viên", 
            dataIndex: "TenNhanVien", 
            render: (text, r) => <Text strong color="#1890ff">{text || r.tenNhanVien || "Không xác định"}</Text> 
        },
        { title: "Tên chữ ký", dataIndex: "TenChuKy", render: (t, r) => t || r.tenChuKy },
        { 
            title: "Hình ảnh", 
            dataIndex: "DuongDanAnhChuKy",
            render: (path, r) => (
                <div style={{ background: '#f0f0f0', padding: 4, borderRadius: 4, width: 80, textAlign: 'center' }}>
                    <img src={getImageUrl(path || r.duongDanAnhChuKy)} alt="Chữ ký" style={{ maxHeight: 40, maxWidth: '100%' }} />
                </div>
            )
        },
        { 
            title: "Trạng thái", 
            dataIndex: "DangSuDung",
            render: (active, r) => (active || r.dangSuDung) 
                ? <Tag color="blue" icon={<CheckCircleOutlined />}>Đang dùng</Tag> 
                : <Tag color="default">Đã tắt</Tag>
        },
        { title: "Ngày tạo", dataIndex: "NgayTao", render: (date, r) => dayjs(date || r.ngayTao).format("DD/MM/YYYY") },
        {
            title: "Thao tác",
            render: (_, record) => {
                const id = record.MaChuKyNguoiDung || record.maChuKyNguoiDung;
                return (
                    <Space>
                        <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                        <Popconfirm title="Bạn có chắc chắn muốn xóa chữ ký này?" onConfirm={() => handleDelete(id)}>
                            <Button danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

    return (
        <div style={{ padding: 24, background: '#fff', borderRadius: 8, minHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0, color: '#1890ff' }}><SafetyCertificateOutlined /> Quản lý Chữ ký Hệ thống</Title>
                    <Text type="secondary">Admin: Cấp phát, chỉnh sửa và quản lý chứng thư số của toàn bộ nhân sự.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNew} style={{ backgroundColor: '#1890ff' }}>
                    Cấp Chữ Ký Mới
                </Button>
            </div>

            <Table dataSource={signatures} columns={columns} rowKey={(r) => r.MaChuKyNguoiDung || r.maChuKyNguoiDung} bordered />

            <Modal
                title={<span style={{ color: '#1890ff' }}>{isEditMode ? "SỬA CHỮ KÝ" : "CẤP CHỮ KÝ CHO NHÂN VIÊN"}</span>}
                open={isModalOpen} onCancel={() => { setIsModalOpen(false); form.resetFields(); setFileList([]); }}
                onOk={() => form.submit()} destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleUploadSubmit}>
                    <Form.Item name="maTaiKhoan" label="Chọn Nhân viên" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Chọn người dùng..." optionFilterProp="children" disabled={isEditMode}>
                            {employees.map(emp => (
                                <Option key={emp.MaTaiKhoan || emp.maTaiKhoan} value={emp.MaTaiKhoan || emp.maTaiKhoan}>
                                    {emp.HoTen || emp.hoTen}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item name="tenChuKy" label="Tên gợi nhớ" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    {/* Nút Bật/Tắt trạng thái chỉ hiện ra khi đang Sửa */}
                    {isEditMode && (
                        <Form.Item name="dangSuDung" label="Trạng thái sử dụng" valuePropName="checked">
                            <Switch checkedChildren="Đang dùng" unCheckedChildren="Đã tắt" />
                        </Form.Item>
                    )}

                    <Form.Item label={`Hình ảnh chữ ký (.PNG trong suốt) ${isEditMode ? "- Bỏ trống nếu giữ ảnh cũ" : ""}`}>
                        <Upload.Dragger beforeUpload={(f) => { setFileList([f]); return false; }} fileList={fileList} maxCount={1}>
                            <p className="ant-upload-drag-icon"><PictureOutlined /></p>
                            <p className="ant-upload-text">Nhấp hoặc kéo thả ảnh chữ ký vào đây</p>
                        </Upload.Dragger>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SignatureManagement;