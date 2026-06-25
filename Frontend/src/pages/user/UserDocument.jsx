/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { 
    Table, Button, Modal, Form, Input, Upload, Select,
    message, Space, Typography, Tag, Spin, Popconfirm, Tooltip, Card
} from "antd";
import { 
    PlusOutlined, DeleteOutlined, EditOutlined, 
    FileTextOutlined, DownloadOutlined, InboxOutlined, EyeOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios";

const { Title, Text } = Typography;
const { Option } = Select;

// 🌟 ĐÃ FIX: Dọn dẹp dấu gạch chéo của Windows để thẻ iframe đọc được
const getFileUrl = (path) => {
    if (!path) return "";
    let cleanPath = path.replace(/\\/g, '/'); // Chuyển toàn bộ \ thành /
    if (!cleanPath.startsWith('/') && !cleanPath.startsWith('http')) {
        cleanPath = '/' + cleanPath;
    }
    return cleanPath.startsWith('http') ? cleanPath : `http://localhost:3000${cleanPath}`;
};

// 🌟 Hàm kiểm tra xem file có thể xem trực tiếp trên Web được không
const isPreviewable = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif'].includes(ext);
};

const UserDocument = () => {
    const [documents, setDocuments] = useState([]);
    const [docTypes, setDocTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docRes, typeRes] = await Promise.all([
                api.get("/documents"), 
                api.get("/documents/types")       
            ]);
            setDocuments(docRes.data?.data || docRes.data || []);
            setDocTypes(typeRes.data?.data || typeRes.data || []);
        } catch (error) {
            message.error("Không thể tải kho tài liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handlePreview = (url) => {
        setPreviewUrl(url);
        setPreviewVisible(true);
    };

    const handleAddNew = () => {
        setIsEditMode(false); setEditingId(null);
        form.resetFields(); setFileList([]);
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setIsEditMode(true);
        setEditingId(record.MaTaiLieu || record.maTaiLieu);
        form.setFieldsValue({
            tenTaiLieu: record.TenTaiLieu || record.tenTaiLieu,
            maLoaiTaiLieu: record.MaLoaiTaiLieu || record.maLoaiTaiLieu,
            moTa: record.MoTa || record.moTa
        });
        setFileList([]); setIsModalOpen(true);
    };

    const handleSubmit = async (values) => {
        if (!isEditMode && fileList.length === 0) return message.warning("Vui lòng đính kèm tệp tài liệu!");
        try {
            const formData = new FormData();
            formData.append("tenTaiLieu", values.tenTaiLieu);
            formData.append("maLoaiTaiLieu", values.maLoaiTaiLieu);
            formData.append("moTa", values.moTa || "");
            if (fileList.length > 0) formData.append("file", fileList[0].originFileObj || fileList[0]);

            if (isEditMode) {
                await api.put(`/documents/${editingId}`, formData);
                message.success("Cập nhật tài liệu thành công!");
            } else {
                await api.post("/documents", formData);
                message.success("Tải tài liệu lên thành công!");
            }
            setIsModalOpen(false); fetchData();
        } catch (error) { message.error("Lỗi lưu tài liệu!"); }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/documents/${id}`);
            message.success("Đã xóa tài liệu!"); fetchData();
        } catch (error) { message.error("Lỗi khi xóa tài liệu"); }
    };

    const columns = [
        { title: "ID", dataIndex: "MaTaiLieu", width: 60, render: (t, r) => t || r.maTaiLieu },
        { title: "Tên tài liệu", dataIndex: "TenTaiLieu", render: (t, r) => <Text strong style={{ color: '#0050b3' }}>{t || r.tenTaiLieu}</Text> },
        { title: "Phân loại", dataIndex: "TenLoaiTaiLieu", render: (t, r) => <Tag color="geekblue">{t || r.tenLoaiTaiLieu}</Tag> },
        { title: "Mô tả / Ghi chú", dataIndex: "MoTa", render: (t, r) => t || r.moTa || <Text type="secondary">Trống</Text> },
        { title: "Ngày tạo", dataIndex: "NgayTaiLen", render: (date, r) => dayjs(date || r.ngayTaiLen).format("DD/MM/YYYY") },
        { 
            title: "Tệp đính kèm", dataIndex: "DuongDanFile", width: 150,
            render: (path, r) => {
                const url = getFileUrl(path || r.duongDanFile);
                return url ? (
                    <Space>
                        <Button type="primary" ghost size="small" icon={<EyeOutlined />} onClick={() => handlePreview(url)}>Xem</Button>
                        <Tooltip title="Tải xuống"><Button size="small" icon={<DownloadOutlined />} href={url} target="_blank" /></Tooltip>
                    </Space>
                ) : <Text type="secondary" italic>Lỗi file</Text>;
            }
        },
        {
            title: "Thao tác", width: 100, align: 'center',
            render: (_, record) => {
                const id = record.MaTaiLieu || record.maTaiLieu;
                return (
                    <Space>
                        <Button type="text" style={{ color: '#1890ff' }} icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                        <Popconfirm title="Xóa tài liệu này khỏi kho?" onConfirm={() => handleDelete(id)}>
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" tip="Đang nạp kho tài liệu..." /></div>;

    return (
        <div style={{ padding: 24, background: '#f5f7fa', minHeight: '80vh' }}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <Title level={4} style={{ margin: 0, color: '#0050b3' }}><FileTextOutlined style={{ marginRight: 8 }} /> Kho Tài Liệu Số</Title>
                        <Text type="secondary">Quản lý, lưu trữ các biểu mẫu, quy trình và văn bản tham khảo.</Text>
                    </div>
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAddNew} style={{ backgroundColor: '#1890ff', borderRadius: 6 }}>
                        Tải Lên Tài Liệu Mới
                    </Button>
                </div>

                <Table dataSource={documents} columns={columns} rowKey={(record) => record.MaTaiLieu || record.maTaiLieu} pagination={{ pageSize: 8 }} />
            </Card>

            <Modal title={<span style={{ color: '#0050b3' }}>{isEditMode ? "CẬP NHẬT TÀI LIỆU" : "TẢI LÊN TÀI LIỆU MỚI"}</span>} open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} destroyOnClose width={600}>
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
                    <Form.Item name="tenTaiLieu" label={<Text strong>Tên gọi tài liệu</Text>} rules={[{ required: true, message: 'Vui lòng nhập tên tài liệu' }]}><Input placeholder="VD: Mẫu giấy xin phép nghỉ..." size="large" /></Form.Item>
                    <Form.Item name="maLoaiTaiLieu" label={<Text strong>Phân loại tài liệu</Text>} rules={[{ required: true, message: 'Vui lòng chọn loại tài liệu' }]}>
                        <Select showSearch placeholder="Chọn danh mục..." size="large">
                            {docTypes.map(type => <Option key={type.MaLoaiTaiLieu} value={type.MaLoaiTaiLieu}>{type.TenLoaiTaiLieu}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="moTa" label={<Text strong>Khung sườn / Ghi chú (Dùng làm mẫu Tờ trình)</Text>}><Input.TextArea rows={4} placeholder="Nếu đây là Biểu mẫu, hãy nhập khung sườn văn bản vào đây để nhân viên điền nhanh..." /></Form.Item>
                    <Form.Item label={<Text strong>Tệp tin đính kèm (PDF, DOCX) {isEditMode ? "(Bỏ trống nếu giữ tệp cũ)" : ""}</Text>}>
                        <Upload.Dragger beforeUpload={(f) => { setFileList([f]); return false; }} fileList={fileList} maxCount={1}>
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1890ff' }} /></p>
                            <p className="ant-upload-text">Nhấp hoặc kéo thả file vào khu vực này để tải lên</p>
                        </Upload.Dragger>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 🌟 ĐÃ FIX: Trình xem thông minh phân biệt PDF và Word/Excel */}
            <Modal title={<span style={{ color: '#0050b3', fontWeight: 'bold' }}>Trình Xem Tài Liệu</span>} open={previewVisible} onCancel={() => setPreviewVisible(false)} footer={null} width="85%" style={{ top: 20 }} destroyOnClose>
                <div style={{ height: "78vh", width: "100%", background: '#f0f2f5', borderRadius: 8, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {isPreviewable(previewUrl) ? (
                        <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none' }} title="Document Preview" />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <FileTextOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 16 }} />
                            <Title level={4}>Trình duyệt không hỗ trợ xem trực tiếp tệp này</Title>
                            <Text type="secondary">Định dạng file Word (.docx) hoặc Excel (.xlsx) cần được tải xuống để xem.</Text>
                            <br />
                            <Button type="primary" size="large" icon={<DownloadOutlined />} href={previewUrl} target="_blank" style={{ marginTop: 24, borderRadius: 6 }}>
                                Tải Xuống Ngay
                            </Button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default UserDocument;