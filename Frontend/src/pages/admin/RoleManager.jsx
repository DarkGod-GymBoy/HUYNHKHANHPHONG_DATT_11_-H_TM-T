import { useState, useEffect } from "react";
import { Card, Table, Button, Space, Popconfirm, message, Modal, Form, Input } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../services/axios";

const RoleManager = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [form] = Form.useForm();

    // Hàm fetch được gọi bên trong useEffect
    useEffect(() => {
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const res = await api.get("/roles");
                setRoles(res.data?.data || res.data || []);
            } catch (error) {
                console.error("Lỗi lấy danh sách vai trò:", error);
                message.error("Không thể tải danh sách vai trò!");
            } finally {
                setLoading(false);
            }
        };
        fetchRoles();
    }, []);

    // Hàm lưu (Thêm/Sửa)
    const handleSave = async (values) => {
        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.MaVaiTro}`, values);
                message.success("Cập nhật thành công!");
            } else {
                await api.post("/roles", values);
                message.success("Thêm vai trò mới thành công!");
            }
            setIsModalVisible(false);
            setEditingRole(null);
            form.resetFields();
            
           
            const res = await api.get("/roles");
            setRoles(res.data?.data || res.data || []);
        } catch (error) {
            message.error(error.response?.data?.message || "Có lỗi xảy ra!");
        }
    };

    // Hàm xóa
    const handleDelete = async (maVaiTro) => {
        try {
            await api.delete(`/roles/${maVaiTro}`);
            message.success("Xóa thành công!");
            const res = await api.get("/roles");
            setRoles(res.data?.data || res.data || []);
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            message.error("Lỗi xóa vai trò!");
        }
    };

    const columns = [
        { title: "Mã", dataIndex: "MaVaiTro", width: 80 },
        { title: "Tên Vai Trò", dataIndex: "TenVaiTro" },
        { title: "Mô tả", dataIndex: "MoTa" },
        {
            title: "Hành động",
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined style={{ color: "#1890ff" }} />} onClick={() => {
                        setEditingRole(record);
                        form.setFieldsValue(record);
                        setIsModalVisible(true);
                    }} />
                    <Popconfirm title="Xóa vai trò này?" onConfirm={() => handleDelete(record.MaVaiTro)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Card title="Quản Lý Vai Trò" extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRole(null); form.resetFields(); setIsModalVisible(true); }}>
                Thêm Vai Trò
            </Button>
        }>
            <Table dataSource={roles} rowKey="MaVaiTro" columns={columns} loading={loading} />

            <Modal 
                title={editingRole ? "Cập nhật vai trò" : "Thêm vai trò mới"} 
                open={isModalVisible} 
                onCancel={() => setIsModalVisible(false)} 
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="tenVaiTro" label="Tên vai trò" rules={[{required: true}]}><Input /></Form.Item>
                    <Form.Item name="moTa" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
                    <Button type="primary" htmlType="submit" style={{width: '100%'}}>Lưu lại</Button>
                </Form>
            </Modal>
        </Card>
    );
};

export default RoleManager;