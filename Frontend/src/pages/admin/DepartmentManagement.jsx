import { useState, useEffect } from "react";
import { Card, Table, Button, Space, Popconfirm, message, Modal, Form, Input } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../services/axios";

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // 💡 TUYỆT CHIÊU: Dùng một biến state nhỏ để làm "công tắc" tải lại bảng
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Quản lý trạng thái của Form (Thêm/Sửa)
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [form] = Form.useForm();

    // 1. Đưa hàm fetch vào TRONG useEffect (Linter sẽ im lặng tuyệt đối)
    useEffect(() => {
        const fetchDepartments = async () => {
            setLoading(true);
            try {
                const res = await api.get("/departments");
                const data = res.data?.data || res.data;
                setDepartments(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Lỗi lấy danh sách:", error);
                message.error("Không thể tải danh sách phòng ban!");
            } finally {
                setLoading(false);
            }
        };

        fetchDepartments();
    }, [refreshKey]); // 💡 Hễ refreshKey thay đổi, useEffect sẽ tự động chạy lại

    // 2. Hàm Xử lý Xóa
    const handleDelete = async (maPhongBan) => {
        try {
            await api.delete(`/departments/${maPhongBan}`);
            message.success("Xóa phòng ban thành công!");
            
            // Bật "công tắc" tải lại bảng thay vì gọi hàm trực tiếp
            setRefreshKey(prev => prev + 1); 
        } catch (error) {
            message.error(error.response?.data?.message || "Xóa thất bại!");
        }
    };

    // 3. Hàm Mở Modal để Thêm mới hoặc Sửa
    const openModal = (record = null) => {
        setEditingDept(record);
        if (record) {
            // Nếu là sửa, đổ dữ liệu cũ vào form
            form.setFieldsValue({
                tenPhongBan: record.TenPhongBan,
                moTa: record.MoTa
            });
        } else {
            // Nếu là thêm mới, làm sạch form
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    // 4. Hàm Lưu dữ liệu (Submit Form)
    const handleSave = async (values) => {
        try {
            if (editingDept) {
                // Gọi API Cập nhật (Sửa)
                await api.put(`/departments/${editingDept.MaPhongBan}`, values);
                message.success("Cập nhật phòng ban thành công!");
            } else {
                // Gọi API Thêm mới
                await api.post("/departments", values);
                message.success("Thêm phòng ban mới thành công!");
            }
            setIsModalVisible(false);
            
            // Bật "công tắc" tải lại bảng
            setRefreshKey(prev => prev + 1); 
        } catch (error) {
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu!");
        }
    };

    // 5. Cấu hình Cột cho Bảng
    const columns = [
        { 
            title: "Mã PB", 
            dataIndex: "MaPhongBan", 
            key: "MaPhongBan", 
            width: 100 
        },
        { 
            title: "Tên Phòng Ban", 
            dataIndex: "TenPhongBan", 
            key: "TenPhongBan" 
        },
        { 
            title: "Mô Tả", 
            dataIndex: "MoTa", 
            key: "MoTa" 
        },
        { 
            title: "Hành động", 
            key: "action", 
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    <Button 
                        type="text" 
                        icon={<EditOutlined style={{ color: "#1890ff" }} />} 
                        onClick={() => openModal(record)} 
                    />
                    <Popconfirm 
                        title="Bạn có chắc chắn muốn xóa phòng ban này?" 
                        onConfirm={() => handleDelete(record.MaPhongBan)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="fade-in">
            <Card 
                title="Quản Lý Danh Mục Phòng Ban" 
                variant="borderless"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                        Thêm Phòng Ban
                    </Button>
                }
            >
                <Table 
                    dataSource={departments} 
                    columns={columns} 
                    rowKey="MaPhongBan" 
                    loading={loading} 
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            {/* Khung nhập liệu (Modal) bật lên khi nhấn Thêm/Sửa */}
            <Modal
                title={editingDept ? "Chỉnh sửa Phòng Ban" : "Thêm Phòng Ban mới"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null} // Ẩn footer mặc định để dùng nút của Form
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item 
                        name="tenPhongBan" 
                        label="Tên Phòng Ban" 
                        rules={[{ required: true, message: "Vui lòng nhập tên phòng ban!" }]}
                    >
                        <Input placeholder="Ví dụ: Phòng Kế Toán" />
                    </Form.Item>

                    <Form.Item 
                        name="moTa" 
                        label="Mô Tả"
                    >
                        <Input.TextArea rows={4} placeholder="Nhập mô tả chức năng của phòng ban..." />
                    </Form.Item>

                    <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>Hủy bỏ</Button>
                            <Button type="primary" htmlType="submit">
                                Lưu lại
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DepartmentManagement;