import { useState, useEffect } from "react";
import { Card, Table, Button, Space, Popconfirm, message, Modal, Form, Input, Select, Tag, Avatar, Drawer, Tabs, Descriptions, DatePicker } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined, EyeOutlined, UserOutlined, FileTextOutlined, IdcardOutlined, FilterOutlined, CameraOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios"; 

const { Option } = Select;

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [roles, setRoles] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Quản lý Bộ lọc (Filter)
    const [filterDept, setFilterDept] = useState(null);
    const [filterPos, setFilterPos] = useState(null);

    // Quản lý Modal (Thêm/Sửa) & Avatar
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [form] = Form.useForm();
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);

    // Quản lý Drawer (Xem chi tiết)
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [detailEmp, setDetailEmp] = useState(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [deptRes, posRes, roleRes] = await Promise.all([
                    api.get("/departments"),
                    api.get("/positions"),
                    api.get("/roles")
                ]);
                setDepartments(deptRes.data?.data || deptRes.data || []);
                setPositions(posRes.data?.data || posRes.data || []);
                setRoles(roleRes.data?.data || roleRes.data || []);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu danh mục:", error);
                message.error("Lỗi tải danh mục cấu hình hệ thống!");
            }
        };
        fetchDropdownData();
    }, []);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await api.get("/employees");
                const data = res.data?.data || res.data;
                setEmployees(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error(error);
                message.error("Không thể tải danh sách nhân viên!");
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, [refreshKey]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("files", file);

        setAvatarUploading(true);
        try {
            const res = await api.post("/uploads/multi-files", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const fileUrls = res.data?.fileUrls || res.fileUrls || [];
            if (fileUrls.length > 0) {
                setAvatarUrl(fileUrls[0]);
                form.setFieldsValue({ anhDaiDien: fileUrls[0] });
                message.success("Tải ảnh đại diện thành công!");
            }
        } catch (error) {
            console.error(error);
            message.error("Lỗi kết nối, không thể tải ảnh lên máy chủ!");
        } finally {
            setAvatarUploading(false);
            e.target.value = "";
        }
    };

    const handleDelete = async (maTaiKhoan) => {
        try {
            await api.delete(`/employees/${maTaiKhoan}`);
            message.success("Xóa vĩnh viễn nhân viên khỏi hệ thống thành công!");
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            message.error(error.response?.data?.message || "Xóa nhân viên thất bại, có thể do vướng dữ liệu liên kết!");
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            const newStatus = Number(record.TrangThai) === 1 ? 0 : 1;
            await api.patch(`/employees/${record.MaTaiKhoan}/status`, { trangThai: newStatus });
            message.success(newStatus === 1 ? "Đã mở khóa tài khoản thành công!" : "Đã khóa tài khoản an toàn!");
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error(error);
            message.error("Lỗi hệ thống khi thay đổi trạng thái!");
        }
    };

    const handleOpenProfile = async (record) => {
        try {
            const res = await api.get(`/employees/${record.MaTaiKhoan}/full-profile`);
            const data = res.data?.data || res.data || record;
            setDetailEmp(data);
            setIsDrawerVisible(true);
        } catch (error) {
            console.error(error);
            setDetailEmp(record);
            setIsDrawerVisible(true);
        }
    };

    const handleAddNewClick = () => {
        setEditingEmp(null);
        form.resetFields();
        setAvatarUrl(null);
        form.setFieldsValue({ 
            trangThai: 1, 
            gioiTinh: "Nam", 
            loaiHopDong: "CHINH_THUC",
            trangThaiHopDong: "CON_HIEU_LUC", // Default trạng thái HĐ
            maVaiTro: 5 
        });
        setIsModalVisible(true);
    };

    const handleEditClick = async (record) => {
        try {
            const res = await api.get(`/employees/${record.MaTaiKhoan}/full-profile`);
            const empData = res.data?.data || res.data;

            setEditingEmp(empData);
            setAvatarUrl(empData.AnhDaiDien || null);
            
            // ĐÃ BỔ SUNG: Ánh xạ thêm các trường hợp đồng mới
            form.setFieldsValue({
                hoTen: empData.HoTen,
                email: empData.Email,
                soDienThoai: empData.SoDienThoai,
                tenDangNhap: empData.TenDangNhap,
                matKhau: "", 
                maVaiTro: empData.MaVaiTro,
                maPhongBan: empData.MaPhongBan,
                maChucVu: empData.MaChucVu,
                trangThai: empData.TrangThai !== undefined ? Number(empData.TrangThai) : 1,
                
                maNhanVienBV: empData.MaNhanVienBV,
                cccd: empData.CCCD,
                gioiTinh: empData.GioiTinh || "Nam",
                ngaySinh: empData.NgaySinh ? dayjs(empData.NgaySinh) : null,
                diaChi: empData.DiaChi,
                ngayVaoLam: empData.NgayVaoLam ? dayjs(empData.NgayVaoLam) : null,
                anhDaiDien: empData.AnhDaiDien,

                // Nhóm Hợp Đồng
                soHopDong: empData.SoHopDong,
                loaiHopDong: empData.LoaiHopDong || "CHINH_THUC",
                trangThaiHopDong: empData.TrangThaiHopDong || "CON_HIEU_LUC",
                ngayBatDau: empData.NgayBatDau ? dayjs(empData.NgayBatDau) : null,
                ngayKetThuc: empData.NgayKetThuc ? dayjs(empData.NgayKetThuc) : null
            });
            
            setIsModalVisible(true);
        } catch (error) {
            console.error(error);
            message.error("Không thể lấy thông tin chi tiết nhân viên này!");
        }
    };

    const handleSave = async (values) => {
        try {
            // ĐÃ BỔ SUNG: Format toàn bộ các trường Date mới thêm
            const payload = {
                ...values,
                ngaySinh: values.ngaySinh ? values.ngaySinh.format("YYYY-MM-DD") : null,
                ngayVaoLam: values.ngayVaoLam ? values.ngayVaoLam.format("YYYY-MM-DD") : null,
                ngayBatDau: values.ngayBatDau ? values.ngayBatDau.format("YYYY-MM-DD") : null,
                ngayKetThuc: values.ngayKetThuc ? values.ngayKetThuc.format("YYYY-MM-DD") : null
            };

            if (editingEmp) {
                await api.put(`/employees/${editingEmp.MaTaiKhoan}`, payload);
                message.success("Cập nhật thông tin nhân viên toàn diện thành công!");
            } else {
                await api.post("/employees", payload);
                message.success("Tạo tài khoản & hồ sơ nhân viên mới thành công!");
            }
            setIsModalVisible(false);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu!");
        }
    };

    const getDeptName = (id) => departments.find(d => d.MaPhongBan === id)?.TenPhongBan || "Chưa phân phòng";
    const getPosName = (id) => positions.find(p => p.MaChucVu === id)?.TenChucVu || "Chưa gán chức vụ";

    const filteredEmployees = employees.filter(emp => {
        return (!filterDept || emp.MaPhongBan === filterDept) && (!filterPos || emp.MaChucVu === filterPos);
    });

    const columns = [
        { 
            title: "Nhân viên", dataIndex: "HoTen", key: "HoTen",
            render: (text, record) => (
                <Space>
                    <Avatar 
                        src={record.AnhDaiDien?.startsWith('http') ? record.AnhDaiDien : (record.AnhDaiDien ? `http://localhost:3000${record.AnhDaiDien}` : null)} 
                        icon={<UserOutlined />} 
                        style={{ backgroundColor: '#0050b3' }} 
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: '#1890ff' }}>{text}</div>
                        <small style={{ color: '#8c8c8c' }}>{record.MaNhanVienBV || `ID: TK-${record.MaTaiKhoan}`}</small>
                    </div>
                </Space>
            )
        },
        { title: "Tên Đăng Nhập", dataIndex: "TenDangNhap", key: "TenDangNhap", render: (text) => <strong>{text}</strong> },
        { title: "SĐT / Email", dataIndex: "Email", key: "Email", render: (email, record) => (
            <div>
                <div>{record.SoDienThoai || "N/A"}</div>
                <small style={{ color: '#8c8c8c' }}>{email}</small>
            </div>
        )}, 
        { title: "Phòng Ban", dataIndex: "MaPhongBan", key: "MaPhongBan", render: (id) => <Tag color="blue">{getDeptName(id)}</Tag> },
        { title: "Chức Vụ", dataIndex: "MaChucVu", key: "MaChucVu", render: (id) => <Tag color="cyan">{getPosName(id)}</Tag> },
        { 
            title: "Trạng Thái", dataIndex: "TrangThai", key: "TrangThai", width: 130,
            render: (status) => (
                Number(status) === 1 ? <Tag color="green" icon={<UnlockOutlined />}>Hoạt động</Tag> 
                                     : <Tag color="red" icon={<LockOutlined />}>Đã khóa</Tag>
            )
        },
        { 
            title: "Hành động", key: "action", width: 180,
            render: (_, record) => (
                <Space size="small">
                    <Button type="text" icon={<EyeOutlined style={{ color: "#52c41a" }} />} onClick={() => handleOpenProfile(record)} />
                    <Button type="text" icon={<EditOutlined style={{ color: "#1890ff" }} />} onClick={() => handleEditClick(record)} />
                    
                    <Popconfirm 
                        title={Number(record.TrangThai) === 1 ? "Bạn muốn khóa tài khoản này?" : "Mở khóa tài khoản này?"} 
                        onConfirm={() => handleToggleStatus(record)}
                        okText="Đồng ý" cancelText="Hủy"
                    >
                        <Button type="text" icon={Number(record.TrangThai) === 1 ? <LockOutlined style={{ color: "#faad14" }}/> : <UnlockOutlined style={{ color: "#52c41a" }}/>} />
                    </Popconfirm>

                    <Popconfirm 
                        title="Xóa vĩnh viễn nhân sự này? (Cảnh báo: Dễ lỗi nếu có dữ liệu liên kết)" 
                        onConfirm={() => handleDelete(record.MaTaiKhoan)}
                        okText="Xóa" cancelText="Hủy"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="fade-in">
            <Card style={{ marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} variant="borderless">
                <Space size="middle" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space size="small" wrap>
                        <span style={{ fontWeight: 500 }}><FilterOutlined /> Bộ lọc:</span>
                        <Select placeholder="Lọc theo Phòng Ban" allowClear style={{ width: 180 }} onChange={value => setFilterDept(value)}>
                            {departments.map(d => <Option key={d.MaPhongBan} value={d.MaPhongBan}>{d.TenPhongBan}</Option>)}
                        </Select>
                        <Select placeholder="Lọc theo Chức Vụ" allowClear style={{ width: 180 }} onChange={value => setFilterPos(value)}>
                            {positions.map(p => <Option key={p.MaChucVu} value={p.MaChucVu}>{p.TenChucVu}</Option>)}
                        </Select>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNewClick} style={{ backgroundColor: '#0050b3' }}>
                        Thêm Nhân Viên Mới
                    </Button>
                </Space>
            </Card>

            <Card title={<span style={{ color: '#0050b3', fontWeight: 600 }}>DANH SÁCH NHÂN SỰ VÀ TÀI KHOẢN LIÊN KẾT</span>} variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <Table dataSource={filteredEmployees} columns={columns} rowKey="MaTaiKhoan" loading={loading} pagination={{ pageSize: 7 }} size="middle" />
            </Card>

            {/* DRAWER CHI TIẾT */}
            <Drawer title={<span style={{ color: '#0050b3' }}><IdcardOutlined /> HỒ SƠ ĐIỆN TỬ NHÂN VIÊN Y TẾ</span>} width={650} onClose={() => setIsDrawerVisible(false)} open={isDrawerVisible} destroyOnClose>
                {detailEmp && (
                    <Tabs defaultActiveKey="1" type="card">
                        <Tabs.TabPane tab={<span><UserOutlined />Tài khoản & Cá nhân</span>} key="1">
                            <div style={{ textAlign: "center", marginBottom: 16 }}>
                                <Avatar size={100} src={detailEmp.AnhDaiDien?.startsWith('http') ? detailEmp.AnhDaiDien : (detailEmp.AnhDaiDien ? `http://localhost:3000${detailEmp.AnhDaiDien}` : null)} icon={<UserOutlined />} style={{ backgroundColor: '#0050b3' }} />
                                <h3 style={{ marginTop: 8, color: '#0050b3' }}>{detailEmp.HoTen}</h3>
                                <Tag color={Number(detailEmp.TrangThai) === 1 ? "green" : "red"}>{Number(detailEmp.TrangThai) === 1 ? "Đang hoạt động" : "Bị khóa"}</Tag>
                            </div>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Tên Đăng Nhập"><strong>{detailEmp.TenDangNhap}</strong></Descriptions.Item>
                                <Descriptions.Item label="Email Cơ Quan">{detailEmp.Email}</Descriptions.Item>
                                <Descriptions.Item label="Số Điện Thoại">{detailEmp.SoDienThoai || "N/A"}</Descriptions.Item>
                                <Descriptions.Item label="Quyền Truy Cập"><Tag color="blue">{roles.find(r => r.MaVaiTro === detailEmp.MaVaiTro)?.TenVaiTro || "Nhân viên"}</Tag></Descriptions.Item>
                                <Descriptions.Item label="Phòng Ban">{getDeptName(detailEmp.MaPhongBan)}</Descriptions.Item>
                                <Descriptions.Item label="Chức Vụ">{getPosName(detailEmp.MaChucVu)}</Descriptions.Item>
                            </Descriptions>
                        </Tabs.TabPane>

                        <Tabs.TabPane tab={<span><IdcardOutlined />Lý lịch chuyên môn</span>} key="2">
                            <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                                <Descriptions.Item label="Mã Định Danh BV"><strong style={{ color: '#ff4d4f' }}>{detailEmp.MaNhanVienBV || "Chưa thiết lập"}</strong></Descriptions.Item>
                                <Descriptions.Item label="Số CCCD">{detailEmp.CCCD || "Chưa cập nhật"}</Descriptions.Item>
                                <Descriptions.Item label="Giới Tính">{detailEmp.GioiTinh || "Chưa xác định"}</Descriptions.Item>
                                <Descriptions.Item label="Ngày Sinh">{detailEmp.NgaySinh ? dayjs(detailEmp.NgaySinh).format("DD/MM/YYYY") : "Chưa cập nhật"}</Descriptions.Item>
                                <Descriptions.Item label="Địa Chỉ Thường Trú">{detailEmp.DiaChi || "Chưa cập nhật"}</Descriptions.Item>
                                <Descriptions.Item label="Ngày Vào Làm">{detailEmp.NgayVaoLam ? dayjs(detailEmp.NgayVaoLam).format("DD/MM/YYYY") : "N/A"}</Descriptions.Item>
                            </Descriptions>
                        </Tabs.TabPane>

                        <Tabs.TabPane tab={<span><FileTextOutlined />Hợp đồng lao động</span>} key="3">
                            {detailEmp.SoHopDong ? (
                                <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                                    <Descriptions.Item label="Số Quyết Định/HĐ"><strong>{detailEmp.SoHopDong}</strong></Descriptions.Item>
                                    <Descriptions.Item label="Loại Hợp Đồng"><Tag color="purple">{detailEmp.LoaiHopDong}</Tag></Descriptions.Item>
                                    <Descriptions.Item label="Ngày Ký Kết">{detailEmp.NgayBatDau ? dayjs(detailEmp.NgayBatDau).format("DD/MM/YYYY") : "N/A"}</Descriptions.Item>
                                    <Descriptions.Item label="Trạng Thế Pháp Lý">
                                        <Tag color={detailEmp.TrangThaiHopDong === 'CON_HIEU_LUC' ? 'green' : 'orange'}>{detailEmp.TrangThaiHopDong === 'CON_HIEU_LUC' ? "Còn hiệu lực" : (detailEmp.TrangThaiHopDong || "Đang hoạt động")}</Tag>
                                    </Descriptions.Item>
                                </Descriptions>
                            ) : (
                                <div style={{ padding: '30px 0', textAlign: 'center', color: '#bfbfbf' }}>Nhân sự này chưa được lập hồ sơ Hợp đồng lao động.</div>
                            )}
                        </Tabs.TabPane>
                    </Tabs>
                )}
            </Drawer>

            {/* MODAL FORM THÊM/SỬA */}
            <Modal
                title={editingEmp ? "Cập nhật thông tin nhân viên toàn diện" : "Đăng ký nhân sự & Cấp tài khoản mới"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={720}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
                    <Tabs defaultActiveKey="form_tk" size="small">
                        <Tabs.TabPane tab="1. Cấu hình Tài khoản" key="form_tk">
                            <div style={{ textAlign: "center", marginBottom: 20 }}>
                                <Avatar 
                                    size={80} 
                                    src={avatarUrl?.startsWith('http') ? avatarUrl : (avatarUrl ? `http://localhost:3000${avatarUrl}` : null)} 
                                    icon={<UserOutlined />} 
                                    style={{ backgroundColor: '#f0f2f5', color: '#bfbfbf', marginBottom: 10 }} 
                                />
                                <div>
                                    <input type="file" id="avatar-upload" style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
                                    <Button size="small" icon={<CameraOutlined />} loading={avatarUploading} onClick={() => document.getElementById("avatar-upload").click()}>
                                        Tải ảnh lên
                                    </Button>
                                    <Form.Item name="anhDaiDien" hidden><Input /></Form.Item>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                <Form.Item name="hoTen" label="Họ và Tên" rules={[{ required: true, message: "Nhập họ tên nhân viên!" }]}>
                                    <Input placeholder="Nguyễn Văn A" />
                                </Form.Item>
                                <Form.Item name="email" label="Email cơ quan" rules={[{ type: 'email', message: "Email không hợp lệ!" }, { required: true, message: "Nhập email!" }]}>
                                    <Input placeholder="nguyenvana@giadinh.vn" />
                                </Form.Item>
                                <Form.Item name="soDienThoai" label="Số Điện Thoại" rules={[{ required: true, message: "Nhập số điện thoại!" }]}>
                                    <Input placeholder="0912345678" />
                                </Form.Item>
                                <Form.Item name="tenDangNhap" label="Tên Đăng Nhập" rules={[{ required: true, message: "Nhập tên đăng nhập!" }]}>
                                    <Input placeholder="nva.giadinh" disabled={!!editingEmp} /> 
                                </Form.Item>
                                <Form.Item name="matKhau" label="Mật Khẩu Truy Cập" rules={[{ required: !editingEmp, message: "Bắt buộc điền mật khẩu tài khoản mới!" }]}>
                                    <Input.Password placeholder={editingEmp ? "Bỏ trống nếu giữ nguyên mật khẩu cũ" : "Nhập mật khẩu khởi tạo"} />
                                </Form.Item>
                                <Form.Item name="maVaiTro" label="Quyền Hạn Hệ Thống" rules={[{ required: true, message: "Phân quyền tài khoản!" }]}>
                                    <Select placeholder="-- Chọn Quyền --">
                                        {roles.map(r => <Option key={r.MaVaiTro} value={r.MaVaiTro}>{r.TenVaiTro}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item name="maPhongBan" label="Phòng Ban Trực Thuộc" rules={[{ required: true, message: "Chọn phòng ban!" }]}>
                                    <Select placeholder="-- Chọn Phòng Ban --">
                                        {departments.map(d => <Option key={d.MaPhongBan} value={d.MaPhongBan}>{d.TenPhongBan}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item name="maChucVu" label="Chức Vụ Chuyên Môn" rules={[{ required: true, message: "Chọn chức vụ!" }]}>
                                    <Select placeholder="-- Chọn Chức Vụ --">
                                        {positions.map(p => <Option key={p.MaChucVu} value={p.MaChucVu}>{p.TenChucVu}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item name="trangThai" label="Trạng Thái Hoạt Động">
                                    <Select>
                                        <Option value={1}><span style={{ color: '#52c41a' }}>🟢 Đang hoạt động</span></Option>
                                        <Option value={0}><span style={{ color: '#ff4d4f' }}>🔴 Khóa tài khoản</span></Option>
                                    </Select>
                                </Form.Item>
                            </div>
                        </Tabs.TabPane>
                        
                        <Tabs.TabPane tab="2. Lý lịch & Hợp đồng" key="form_hl">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                {/* Phần Lý Lịch */}
                                <Form.Item name="maNhanVienBV" label="Mã Định Danh Nhân Viên BV">
                                    <Input placeholder="Ví dụ: NV-0204" />
                                </Form.Item>
                                <Form.Item name="cccd" label="Số Thẻ CCCD">
                                    <Input placeholder="Điền 12 chữ số căn cước" />
                                </Form.Item>
                                <Form.Item name="gioiTinh" label="Giới tính">
                                    <Select>
                                        <Option value="Nam">Nam</Option>
                                        <Option value="Nữ">Nữ</Option>
                                        <Option value="Khác">Khác</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="ngaySinh" label="Ngày sinh">
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="diaChi" label="Địa Chỉ Thường Trú" style={{ gridColumn: 'span 2' }}>
                                    <Input placeholder="Số nhà, Đường, Quận/Huyện" />
                                </Form.Item>
                                
                                {/* ĐÃ BỔ SUNG: Phần Hợp Đồng */}
                                <div style={{ gridColumn: 'span 2', margin: '16px 0 8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <strong><FileTextOutlined /> Cấu hình Hợp đồng Lao động</strong>
                                </div>
                                
                                <Form.Item name="soHopDong" label="Số Quyết Định / Hợp Đồng">
                                    <Input placeholder="Ví dụ: 123/QD-NS" />
                                </Form.Item>
                                <Form.Item name="loaiHopDong" label="Hình Thức Hợp Đồng">
                                    <Select>
                                        <Option value="CHINH_THUC">Chính thức (Vô thời hạn)</Option>
                                        <Option value="THU_VIEC">Thử việc / Thực tập</Option>
                                        <Option value="THOI_VU">Thời vụ / Hợp đồng khoán</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="ngayBatDau" label="Ngày Ký Kết (Bắt đầu)">
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="ngayKetThuc" label="Ngày Hết Hạn (Nếu có)">
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="trangThaiHopDong" label="Trạng Thái Hợp Đồng">
                                    <Select>
                                        <Option value="CON_HIEU_LUC"><span style={{ color: '#52c41a' }}>Còn hiệu lực</span></Option>
                                        <Option value="DA_HET_HAN"><span style={{ color: '#ff4d4f' }}>Đã hết hạn</span></Option>
                                        <Option value="DA_CHAM_DUT"><span style={{ color: '#faad14' }}>Đã chấm dứt</span></Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="ngayVaoLam" label="Ngày Chính Thức Vào Làm">
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                </Form.Item>
                            </div>
                        </Tabs.TabPane>
                    </Tabs>

                    <Form.Item style={{ textAlign: "right", marginBottom: 0, marginTop: 24 }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>Đóng lại</Button>
                            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#0050b3' }}>Lưu thông tin tổng hợp</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default EmployeeManagement;