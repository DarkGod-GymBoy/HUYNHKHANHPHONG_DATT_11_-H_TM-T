import { useState, useEffect } from "react";
import { Card, Table, Button, Space, Popconfirm, message, Modal, Form, Input } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../services/axios";

const PositionManagement = () => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Biến trạng thái kích hoạt tải lại bảng
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Quản lý Modal Form
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPos, setEditingPos] = useState(null);
    const [form] = Form.useForm();

    // 1. Lấy danh sách Chức Vụ
    useEffect(() => {
        const fetchPositions = async () => {
            setLoading(true);
            try {
                const res = await api.get("/positions");
                const data = res.data?.data || res.data;
                setPositions(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Lỗi lấy danh sách chức vụ:", error);
                message.error("Không thể tải danh sách chức vụ!");
            } finally {
                setLoading(false);
            }
        };

        fetchPositions();
    }, [refreshKey]);

    // 2. Xóa Chức Vụ
    const handleDelete = async (maChucVu) => {
        try {
            await api.delete(`/positions/${maChucVu}`);
            message.success("Xóa chức vụ thành công!");
            setRefreshKey(prev => prev + 1); // Tải lại bảng
        } catch (error) {
            message.error(error.response?.data?.message || "Xóa thất bại!");
        }
    };

    // 3. Mở Modal Thêm/Sửa
    const openModal = (record = null) => {
        setEditingPos(record);
        if (record) {
            form.setFieldsValue({
                tenChucVu: record.TenChucVu,
                moTa: record.MoTa
            });
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    // 4. Lưu dữ liệu
    const handleSave = async (values) => {
        try {
            if (editingPos) {
                await api.put(`/positions/${editingPos.MaChucVu}`, values);
                message.success("Cập nhật chức vụ thành công!");
            } else {
                await api.post("/positions", values);
                message.success("Thêm chức vụ mới thành công!");
            }
            setIsModalVisible(false);
            setRefreshKey(prev => prev + 1); // Tải lại bảng
        } catch (error) {
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu!");
        }
    };

    // 5. Cấu hình Cột
    const columns = [
        { 
            title: "Mã CV", 
            dataIndex: "MaChucVu", 
            key: "MaChucVu", 
            width: 100 
        },
        { 
            title: "Tên Chức Vụ", 
            dataIndex: "TenChucVu", 
            key: "TenChucVu" 
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
                        title="Bạn có chắc chắn muốn xóa chức vụ này?" 
                        onConfirm={() => handleDelete(record.MaChucVu)}
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
                title="Quản Lý Danh Mục Chức Vụ" 
                variant="borderless"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                        Thêm Chức Vụ
                    </Button>
                }
            >
                <Table 
                    dataSource={positions} 
                    columns={columns} 
                    rowKey="MaChucVu" 
                    loading={loading} 
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            <Modal
                title={editingPos ? "Chỉnh sửa Chức Vụ" : "Thêm Chức Vụ mới"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item 
                        name="tenChucVu" 
                        label="Tên Chức Vụ" 
                        rules={[{ required: true, message: "Vui lòng nhập tên chức vụ!" }]}
                    >
                        <Input placeholder="Ví dụ: Trưởng Phòng" />
                    </Form.Item>

                    <Form.Item 
                        name="moTa" 
                        label="Mô Tả"
                    >
                        <Input.TextArea rows={4} placeholder="Nhập mô tả quyền hạn chức vụ..." />
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

export default PositionManagement;