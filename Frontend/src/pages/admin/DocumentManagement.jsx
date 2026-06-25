/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { 
    Table, Button, Modal, Form, Input, Upload, Select,
    message, Space, Tag, Spin, Popconfirm, Tooltip 
} from "antd";
import { 
    PlusOutlined, DeleteOutlined, EditOutlined, 
    FileTextOutlined, DownloadOutlined, InboxOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios";

const { Option } = Select;

const getFileUrl = (path) => {
    if (!path) return "";
    return path.startsWith('/') ? `http://localhost:3000${path}` : `http://localhost:3000/${path}`;
};

const DocumentManagement = () => {
    const [documents, setDocuments] = useState([]);
    const [docTypes, setDocTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);

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
            console.error("Lỗi API:", error);
            message.error("Không thể tải danh sách tài liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddNew = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFileList([]);
        setIsModalOpen(true);
        setTimeout(() => form.resetFields(), 0);
    };

    const handleEdit = (record) => {
        setIsEditMode(true);
        setEditingId(record.MaTaiLieu || record.maTaiLieu);
        setFileList([]); 
        setIsModalOpen(true);

        setTimeout(() => {
            form.setFieldsValue({
                tenTaiLieu: record.TenTaiLieu || record.tenTaiLieu,
                maLoaiTaiLieu: record.MaLoaiTaiLieu || record.maLoaiTaiLieu,
                moTa: record.MoTa || record.moTa
            });
        }, 0);
    };

    const handleSubmit = async (values) => {
        if (!isEditMode && fileList.length === 0) {
            return message.warning("Vui lòng đính kèm tệp tài liệu!");
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("tenTaiLieu", values.tenTaiLieu);
            formData.append("maLoaiTaiLieu", values.maLoaiTaiLieu);
            formData.append("moTa", values.moTa || "");
            
            if (fileList.length > 0) {
                // Đảm bảo lấy đúng file thuần (Native File Object)
                const fileToUpload = fileList[0].originFileObj || fileList[0];
                formData.append("file", fileToUpload);
            }

            // 🌟 ĐÃ FIX LỖI 400: Tuyệt đối không set "Content-Type" thủ công ở đây. 
            // Cứ đẩy FormData đi, trình duyệt sẽ tự động thêm Header + chuỗi Boundary cực chuẩn cho Multer đọc.
            if (isEditMode) {
                await api.put(`/documents/${editingId}`, formData);
                message.success("Cập nhật tài liệu thành công! Đã lưu phiên bản mới.");
            } else {
                await api.post("/documents", formData);
                message.success("Số hóa tài liệu thành công!");
            }
            
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Upload error:", error);
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu!");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/documents/${id}`);
            message.success("Đã xóa tài liệu!");
            fetchData();
        } catch (error) {
            console.error(error);
            message.error("Lỗi khi xóa tài liệu");
        }
    };

    // 🌟 ĐÃ FIX LỖI CRASH: Loại bỏ toàn bộ thẻ <Text> của Ant Design, thay bằng <span>, <strong> HTML tiêu chuẩn
    const columns = [
        { title: "ID", dataIndex: "MaTaiLieu", width: 60, render: (t, r) => String(t || r.maTaiLieu || "") },
        { title: "Tên tài liệu", dataIndex: "TenTaiLieu", render: (t, r) => <strong>{String(t || r.tenTaiLieu || "")}</strong> },
        { 
            title: "Loại tài liệu", 
            dataIndex: "TenLoaiTaiLieu", 
            render: (t, r) => <Tag color="cyan">{String(t || r.tenLoaiTaiLieu || "Chưa phân loại")}</Tag> 
        },
        { title: "Mô tả", dataIndex: "MoTa", render: (t, r) => String(t || r.moTa || "") || <span style={{ color: '#aaa', fontStyle: 'italic' }}>Không có</span> },
        { 
            title: "Người tải lên", 
            dataIndex: "NguoiTaiLen", 
            render: (t, r) => <span style={{ color: "#1890ff", fontWeight: 500 }}>{String(t || r.nguoiTaiLen || "Hệ thống")}</span> 
        },
        { title: "Ngày tạo", dataIndex: "NgayTaiLen", render: (date, r) => dayjs(date || r.ngayTaiLen).format("DD/MM/YYYY HH:mm") },
        { 
            title: "Tệp đính kèm", 
            dataIndex: "DuongDanFile",
            render: (path, r) => {
                const url = getFileUrl(path || r.duongDanFile);
                return url ? (
                    <Tooltip title="Nhấp để xem/tải tài liệu">
                        <Button type="link" icon={<DownloadOutlined />} href={url} target="_blank">
                            Tải về
                        </Button>
                    </Tooltip>
                ) : <span style={{ color: '#aaa', fontStyle: 'italic' }}>Trống</span>;
            }
        },
        {
            title: "Thao tác",
            render: (_, record) => {
                const id = record.MaTaiLieu || record.maTaiLieu;
                return (
                    <Space>
                        <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                        <Popconfirm title="Bạn có chắc chắn muốn xóa toàn bộ tài liệu này?" onConfirm={() => handleDelete(id)}>
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
                    <h3 style={{ margin: 0, color: '#1890ff', fontSize: '20px', fontWeight: 600 }}>
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        Quản lý Tài liệu số hóa (Admin)
                    </h3>
                    <span style={{ color: '#8c8c8c' }}>Quản lý, phân loại và lưu trữ tài liệu toàn hệ thống.</span>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNew} style={{ backgroundColor: '#1890ff' }}>
                    Thêm Tài Liệu Mới
                </Button>
            </div>

            <Table dataSource={documents} columns={columns} rowKey={(record) => record.MaTaiLieu || record.maTaiLieu} bordered />

            <Modal
                title={<span style={{ color: '#1890ff' }}>{isEditMode ? "SỬA TÀI LIỆU" : "TẢI LÊN TÀI LIỆU MỚI"}</span>}
                open={isModalOpen} onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()} 
                confirmLoading={uploading}
                destroyOnClose 
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="tenTaiLieu" label="Tên tài liệu" rules={[{ required: true, message: 'Vui lòng nhập tên tài liệu' }]}>
                        <Input placeholder="VD: Mẫu Đơn xin nghỉ phép năm 2026" />
                    </Form.Item>

                    <Form.Item name="maLoaiTaiLieu" label="Phân loại tài liệu" rules={[{ required: true, message: 'Vui lòng chọn loại tài liệu' }]}>
                        <Select showSearch placeholder="Chọn danh mục..." optionFilterProp="children">
                            {docTypes.map(type => (
                                <Option key={type.MaLoaiTaiLieu} value={type.MaLoaiTaiLieu}>{type.TenLoaiTaiLieu}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="moTa" label="Mô tả / Ghi chú">
                        <Input.TextArea rows={3} placeholder="Mô tả ngắn gọn về tài liệu này..." />
                    </Form.Item>

                    <Form.Item label={`Tệp đính kèm ${isEditMode ? "(Bỏ trống nếu giữ tệp cũ)" : ""}`}>
                        <Upload.Dragger beforeUpload={(f) => { setFileList([f]); return false; }} fileList={fileList} maxCount={1}>
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1890ff' }} /></p>
                            <p className="ant-upload-text">Nhấp hoặc kéo thả tệp vào khu vực này</p>
                            <p className="ant-upload-hint">Hỗ trợ định dạng PDF, DOCX, XLSX (Tối đa 5MB)</p>
                        </Upload.Dragger>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DocumentManagement;