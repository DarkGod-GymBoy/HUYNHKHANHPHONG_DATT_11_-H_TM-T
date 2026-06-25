/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { 
    Card, Table, Tag, Button, Typography, Input, Spin, 
    message, Modal, Form, Upload, Space, Popconfirm, Select, Row, Col 
} from "antd";
import { 
    PlusOutlined, DeleteOutlined, EditOutlined, UploadOutlined, PrinterOutlined, FilePdfOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios";
import ProposalPrintPreview from "../ProposalPrintPreview"; 

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ProposalManagement = () => {
    const [proposals, setProposals] = useState([]);
    const [employees, setEmployees] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    
    // State cho In Ấn
    const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
    const [currentPrintId, setCurrentPrintId] = useState(null);

    const fetchAllProposals = async () => {
        setLoading(true);
        try {
            const res = await api.get("/proposals/all");
            // Axios interceptor đã bóc sẵn .data, nên ở đây kiểm tra res.success hoặc res.data trực tiếp
            if (res?.success) {
                setProposals(res.data || []);
            } else if (res.data?.success) {
                setProposals(res.data.data || []);
            }
        } catch (error) { 
            message.error(error?.message || "Không thể tải danh sách đề xuất"); 
        } finally { 
            setLoading(false); 
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get("/employees");
            const data = res?.data || res || [];
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Lỗi lấy danh sách nhân sự", error);
        }
    };

    useEffect(() => { 
        fetchAllProposals(); 
        fetchEmployees();
    }, []);

    const handleSave = async (values) => {
        try {
            const formData = new FormData();
            
            formData.append("tieuDe", values.tieuDe);
            formData.append("loaiDeXuat", values.loaiDeXuat || "Khác");
            formData.append("noiDung", values.noiDung || "");
            formData.append("nguoiNhanDuyet", values.nguoiNhanDuyet); 

            if (fileList.length > 0) {
                formData.append("file", fileList[0].originFileObj || fileList[0]);
            }

            if (isEditMode) {
                await api.put(`/proposals/${values.maDeXuat}`, formData);
                message.success("Cập nhật quy trình đề xuất thành công");
            } else {
                await api.post("/proposals", formData);
                message.success("Đã khởi tạo quy trình đề xuất mới");
            }
            
            setIsModalOpen(false);
            form.resetFields();
            setFileList([]);
            fetchAllProposals();
        } catch (error) { 
            message.error(error?.message || "Thao tác thất bại"); 
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/proposals/${id}`);
            message.success("Đã xóa đề xuất");
            fetchAllProposals();
        } catch (error) { 
            message.error("Xóa thất bại"); 
        }
    };

    // 🌟 CẤU HÌNH CÁC CỘT HIỂN THỊ ĐÃ CẬP NHẬT THEO DATABASE MỚI
    const columns = [
        { title: "Mã ĐX", dataIndex: "SoDeXuat", key: "SoDeXuat", width: 110, render: (t) => <b>{t}</b> },
        { 
            title: "Tiêu đề Đề xuất", dataIndex: "TieuDe", key: "TieuDe",
            filteredValue: searchText ? [searchText] : null,
            onFilter: (value, record) => record.TieuDe?.toLowerCase().includes(value.toLowerCase()),
            render: (t) => <span style={{ color: '#0050b3', fontWeight: 500 }}>{t}</span>
        },
        { 
            title: "Loại ĐX", dataIndex: "LoaiDeXuat", key: "LoaiDeXuat", width: 110,
            render: (loai) => <Tag color="purple">{loai || "Khác"}</Tag>
        },
        { title: "Người tạo", dataIndex: "TenNguoiTao", key: "TenNguoiTao", width: 140 },
        { title: "Ngày tạo", dataIndex: "NgayTao", width: 110, render: (d) => d ? dayjs(d).format("DD/MM/YYYY") : "" },
        {
            title: "Tài liệu", dataIndex: "DuongDanFile", key: "DuongDanFile", width: 110,
            render: (path) => path ? (
                <Button 
                    type="link" 
                    icon={<FilePdfOutlined />} 
                    href={`http://localhost:3000/${path}`} 
                    target="_blank"
                    style={{ padding: 0 }}
                >
                    Xem File
                </Button>
            ) : <span style={{ color: '#aaa', fontStyle: 'italic' }}>Không có</span>
        },
        { 
            title: "Trạng thái", dataIndex: "TrangThai", width: 120,
            render: (s) => {
                const colorMap = { "CHO_DUYET": "blue", "DA_DUYET": "green", "TU_CHOI": "red", "TRA_VE": "orange" };
                return <Tag color={colorMap[s] || "default"}>{s || "Chưa rõ"}</Tag>;
            } 
        },
        {
            title: "Thao tác",
            width: 140,
            render: (_, record) => (
                <Space>
                    {record.TrangThai === "DA_DUYET" && (
                        <Button size="small" type="primary" ghost icon={<PrinterOutlined />} onClick={() => {
                            setCurrentPrintId(record.MaDeXuat);
                            setIsPrintModalVisible(true);
                        }}>In</Button>
                    )}
                    <Button size="small" icon={<EditOutlined />} onClick={() => {
                        form.setFieldsValue({
                            maDeXuat: record.MaDeXuat,
                            tieuDe: record.TieuDe,
                            loaiDeXuat: record.LoaiDeXuat,
                            noiDung: record.NoiDung,
                            nguoiNhanDuyet: record.MaNguoiDuyet 
                        });
                        setIsEditMode(true);
                        setIsModalOpen(true);
                    }} />
                    <Popconfirm title="Xóa đề xuất này?" onConfirm={() => handleDelete(record.MaDeXuat)} okText="Xóa" cancelText="Hủy">
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card bordered={false} style={{ margin: 24, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <Title level={4}>Quản trị hệ thống Đề xuất (Admin)</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { 
                    setIsEditMode(false); 
                    form.resetFields();
                    setFileList([]);
                    setIsModalOpen(true); 
                }}>
                    Khởi tạo Đề xuất
                </Button>
            </div>

            <Input.Search 
                placeholder="Tìm kiếm tiêu đề đề xuất..." 
                onChange={e => setSearchText(e.target.value)} 
                style={{ width: 300, marginBottom: 16 }} 
                allowClear
            />

            <Table dataSource={proposals} columns={columns} rowKey="MaDeXuat" loading={loading} pagination={{ pageSize: 10 }} />

            <Modal 
                title={isEditMode ? "Cập nhật luồng đề xuất" : "Khởi tạo luồng đề xuất mới"} 
                open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} width={750} destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="maDeXuat" hidden><Input /></Form.Item>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="tieuDe" label="Tiêu đề đề xuất" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
                                <Input placeholder="VD: Đề xuất cấp kinh phí..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="loaiDeXuat" label="Loại đề xuất" initialValue="Khác">
                                <Select>
                                    <Option value="Tài chính">Tài chính</Option>
                                    <Option value="Nhân sự">Nhân sự</Option>
                                    <Option value="Khác">Khác</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={16}>
                            <Form.Item name="nguoiNhanDuyet" label="Gửi trình ký cho (Người duyệt)" rules={[{ required: true, message: "Vui lòng chọn người duyệt" }]}>
                                <Select placeholder="Chọn Giám đốc / Trưởng phòng..." showSearch optionFilterProp="children">
                                    {employees
                                        .filter(emp => !(emp.TenChucVu || emp.tenChucVu || "").toLowerCase().includes("nhân viên"))
                                        .map(emp => (
                                            <Option key={emp.MaTaiKhoan} value={emp.MaTaiKhoan}>
                                                {emp.HoTen} - {emp.TenChucVu || "Quản lý"}
                                            </Option>
                                        ))
                                    }
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="noiDung" label="Nội dung chi tiết">
                        <TextArea rows={4} placeholder="Nhập lý do, diễn giải chi tiết..." />
                    </Form.Item>

                    <Form.Item label="Upload tài liệu đính kèm (Quyết định, Báo giá, Hợp đồng...)">
                        <Upload 
                            beforeUpload={(f) => { setFileList([f]); return false; }} 
                            onRemove={() => setFileList([])}
                            fileList={fileList}
                            maxCount={1}
                        >
                            <Button icon={<UploadOutlined />}>Chọn file đính kèm</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            <ProposalPrintPreview 
                visible={isPrintModalVisible} 
                onClose={() => setIsPrintModalVisible(false)} 
                maDeXuat={currentPrintId} 
            />
        </Card>
    );
};

export default ProposalManagement;