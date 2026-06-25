/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { 
    Card, Descriptions, Avatar, Row, Col, Typography, 
    Tag, Tabs, Button, Modal, Form, Input, Select,
    Space, DatePicker, Spin, message, Upload, Tooltip 
} from "antd";
import { 
    UserOutlined, SafetyCertificateOutlined, EditOutlined, 
    FilePdfOutlined, UploadOutlined, CameraOutlined 
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios"; 

const { Title, Text } = Typography;

// Hàm xử lý đường dẫn ảnh an toàn
const getImageUrl = (path) => {
    if (!path) return "";
    return path.startsWith('/') ? `http://localhost:3000${path}` : `http://localhost:3000/${path}`;
};

const UserProfile = () => {
    const [user, setUser] = useState(() => {
        try {
            const cached = localStorage.getItem("user");
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    });
    
    const [signatureUrl, setSignatureUrl] = useState(null);
    const [loading, setLoading] = useState(true); 
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();

    // --- 1. TẢI DỮ LIỆU TỪ BACKEND ---
    const fetchUserProfileData = async () => {
        setLoading(true);
        try {
            const profileRes = await api.get("/employees/my-profile");
            const userData = profileRes.data?.data || profileRes.data;

            if (userData && Object.keys(userData).length > 0) {
                setUser(userData);
                localStorage.setItem("user", JSON.stringify(userData));
            }

            const signatureRes = await api.get("/signatures");
            
            if (signatureRes.data?.success && Array.isArray(signatureRes.data?.data)) {
                const activeSignature = signatureRes.data.data.find(
                    s => s.DangSuDung === true || s.DangSuDung === 1 
                );
                const path = activeSignature?.DuongDanAnhChuKy;
                if (path) {
                    setSignatureUrl(getImageUrl(path));
                }
            }
        } catch (error) {
            console.error("Lỗi đồng bộ:", error);
            message.error("Không thể kết nối với máy chủ!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserProfileData();
    }, []);

    const u_hoTen = user.HoTen || user.hoTen || "Chưa cập nhật họ tên";
    const u_email = user.Email || user.email;
    const u_soDienThoai = user.SoDienThoai || user.soDienThoai;
    const u_maNhanVienBV = user.MaNhanVienBV || user.maNhanVienBV;
    const u_tenDangNhap = user.TenDangNhap || user.tenDangNhap;
    const u_cccd = user.CCCD || user.cccd;
    const u_ngaySinh = user.NgaySinh || user.ngaySinh;
    const u_gioiTinh = user.GioiTinh || user.gioiTinh;
    const u_ngayVaoLam = user.NgayVaoLam || user.ngayVaoLam;
    const u_diaChi = user.DiaChi || user.diaChi;
    const u_anhDaiDien = user.AnhDaiDien || user.anhDaiDien;
    
    const u_tenVaiTro = user.TenVaiTro || user.tenVaiTro;
    const u_tenPhongBan = user.TenPhongBan || user.tenPhongBan;
    const u_tenChucVu = user.TenChucVu || user.tenChucVu;
    const u_soHopDong = user.SoHopDong || user.soHopDong;
    const u_loaiHopDong = user.LoaiHopDong || user.loaiHopDong;
    const u_ngayBatDau = user.NgayBatDau || user.ngayBatDau;
    const u_ngayKetThuc = user.NgayKetThuc || user.ngayKetThuc;
    const u_trangThaiHopDong = user.TrangThaiHopDong || user.trangThaiHopDong;
    const u_duongDanHopDong = user.DuongDanHopDong || user.duongDanHopDong;

    const beforeUpload = (file) => {
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Dung lượng ảnh phải nhỏ hơn 2MB!');
        }
        return isLt2M;
    };

    // --- 2. XỬ LÝ UPLOAD ẢNH ĐẠI DIỆN ---
    const handleUploadAvatar = async (options) => {
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        
        // 🌟 ĐÃ FIX: Lấy đúng File Object Native để tải lên
        formData.append("files", file.originFileObj || file);

        setAvatarUploading(true);
        try {
            // 🌟 ĐÃ FIX: Không thiết lập header Content-Type bằng tay. Để Axios tự lo!
            const uploadRes = await api.post("/uploads/multi-files", formData);
            
            const fileUrls = uploadRes.data?.fileUrls || uploadRes.fileUrls || [];
            if (fileUrls.length > 0) {
                const newAvatarUrl = fileUrls[0];
                const payload = {
                    hoTen: u_hoTen !== "Chưa cập nhật họ tên" ? u_hoTen : "",
                    soDienThoai: u_soDienThoai,
                    cccd: u_cccd,
                    gioiTinh: u_gioiTinh,
                    diaChi: u_diaChi,
                    ngaySinh: u_ngaySinh,
                    anhDaiDien: newAvatarUrl 
                };
                
                await api.put("/employees/my-profile", payload);
                message.success("Cập nhật ảnh đại diện thành công!");
                await fetchUserProfileData();
                onSuccess("ok");
            }
        } catch (error) {
            console.error(error);
            message.error("Tải ảnh đại diện thất bại!");
            onError(error);
        } finally {
            setAvatarUploading(false);
        }
    };

    // --- 3. XỬ LÝ UPLOAD CHỮ KÝ SỐ ---
    const handleUploadSignatureProcess = async (options) => {
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        
        // 🌟 ĐÃ FIX: Trích xuất đúng đối tượng file để tránh lỗi từ Backend
        formData.append("image", file.originFileObj || file);
        formData.append("tenChuKy", `Chữ ký - ${dayjs().format('DD/MM/YYYY HH:mm')}`);

        try {
            const res = await api.post("/signatures", formData);
            
            if (res.data?.success || res.success) {
                message.success("Cập nhật chữ ký số thành công!");
                
                const responseData = res.data?.data || res.data || res;
                if (responseData?.DuongDanAnhChuKy || responseData?.duongDanAnhChuKy) {
                    const newPath = responseData.DuongDanAnhChuKy || responseData.duongDanAnhChuKy;
                    setSignatureUrl(getImageUrl(newPath));
                } else {
                    await fetchUserProfileData();
                }
                
                onSuccess("ok");
            } else {
                throw new Error(res.data?.message || "Lỗi upload");
            }
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || "Tải lên chữ ký thất bại!");
            onError(error);
        }
    };

    // --- 4. SỬA THÔNG TIN CÁ NHÂN ---
    const handleOpenEditModal = () => {
        form.setFieldsValue({
            hoTen: u_hoTen !== "Chưa cập nhật họ tên" ? u_hoTen : "",
            soDienThoai: u_soDienThoai,
            cccd: u_cccd,
            gioiTinh: u_gioiTinh || "Nam",
            diaChi: u_diaChi,
            ngaySinh: u_ngaySinh ? dayjs(u_ngaySinh) : null
        });
        setIsEditModalVisible(true);
    };

    const handleUpdateProfile = async (values) => {
        setSubmitLoading(true);
        try {
            const payload = {
                hoTen: values.hoTen,
                soDienThoai: values.soDienThoai,
                cccd: values.cccd,
                gioiTinh: values.gioiTinh,
                diaChi: values.diaChi,
                ngaySinh: values.ngaySinh ? values.ngaySinh.format("YYYY-MM-DD") : null,
                anhDaiDien: u_anhDaiDien 
            };

            await api.put("/employees/my-profile", payload);
            message.success("Cập nhật dữ liệu cá nhân thành công!");
            setIsEditModalVisible(false);
            await fetchUserProfileData(); 
        } catch (error) {
            message.error("Lỗi cập nhật hồ sơ!");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleOpenContractDocument = () => {
        if (u_duongDanHopDong) {
            window.open(getImageUrl(u_duongDanHopDong), "_blank");
        } else {
            message.info("Chưa có tệp bản số hóa hợp đồng đính kèm trên hệ thống.");
        }
    };

    // 🌟 ĐÃ FIX: Cấu trúc hóa mảng dữ liệu cho component Descriptions theo chuẩn Ant Design v5
    const profileItems = [
        { key: '1', label: 'Mã nhân sự', children: <Text strong type="warning">{u_maNhanVienBV || "Chưa cấp"}</Text> },
        { key: '2', label: 'Tên đăng nhập', children: u_tenDangNhap },
        { key: '3', label: 'Email', children: u_email || "Trống" },
        { key: '4', label: 'SĐT', children: u_soDienThoai || "Trống" },
        { key: '5', label: 'Số CCCD', children: u_cccd || "Chưa cập nhật" },
        { key: '6', label: 'Ngày sinh', children: u_ngaySinh ? dayjs(u_ngaySinh).format("DD/MM/YYYY") : "Chưa cập nhật" },
        { key: '7', label: 'Giới tính', children: <Tag color={u_gioiTinh === "Nam" ? "blue" : "magenta"}>{u_gioiTinh || "Nam"}</Tag> },
        { key: '8', label: 'Ngày vào làm', children: u_ngayVaoLam ? dayjs(u_ngayVaoLam).format("DD/MM/YYYY") : "Đang cập nhật" },
        { key: '9', label: 'Nơi cư trú', span: { xs: 1, sm: 1, md: 2 }, children: u_diaChi || "Chưa cập nhật" }
    ];

    const contractItems = [
        { key: '1', label: 'Số hợp đồng', children: <Text strong>{u_soHopDong || "Đang chờ cấp"}</Text> },
        { key: '2', label: 'Loại hợp đồng', children: <Tag color="cyan">{u_loaiHopDong === "CHINH_THUC" ? "Hợp đồng chính thức" : (u_loaiHopDong || "Chưa xác định")}</Tag> },
        { key: '3', label: 'Bắt đầu hiệu lực', children: u_ngayBatDau ? dayjs(u_ngayBatDau).format("DD/MM/YYYY") : "Trống" },
        { key: '4', label: 'Kết thúc kỳ hạn', children: u_ngayKetThuc ? dayjs(u_ngayKetThuc).format("DD/MM/YYYY") : <Text type="secondary">Vô thời hạn</Text> },
        { key: '5', label: 'Trạng thái hợp đồng', span: { xs: 1, sm: 1, md: 2 }, children: (
            <Tag color={u_trangThaiHopDong === 'CON_HIEU_LUC' ? 'green' : (u_trangThaiHopDong === 'DA_HET_HAN' ? 'red' : 'default')}>
                {u_trangThaiHopDong === 'CON_HIEU_LUC' ? "Còn hiệu lực thi hành" : (u_trangThaiHopDong === 'DA_HET_HAN' ? "Đã hết hạn" : "Chưa kích hoạt")}
            </Tag>
        )}
    ];

    // 🌟 ĐÃ FIX: Chuyển đổi Tabs.TabPane sang mảng items theo chuẩn Ant Design v5
    const tabItems = [
        {
            key: "1",
            label: "Thông tin chung",
            children: (
                <>
                    <Button type="primary" icon={<EditOutlined />} onClick={handleOpenEditModal} style={{ marginBottom: 16 }}>Chỉnh sửa hồ sơ</Button>
                    <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="middle" items={profileItems} />
                </>
            )
        },
        {
            key: "2",
            label: "Chữ ký số cá nhân",
            children: (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
                        Hỗ trợ định dạng PNG, JPG, JPEG (Khuyên dùng ảnh nền trong suốt - Tối đa 2MB).
                    </Text>
                    <div style={{ margin: "0 auto 24px auto", width: 320, height: 160, border: "2px dashed #1890ff", borderRadius: 8, background: "#e6f7ff", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                        {signatureUrl ? (
                            <img src={signatureUrl} alt="Chữ ký" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 10 }} />
                        ) : (
                            <div style={{ padding: 20 }}>
                                <UserOutlined style={{ fontSize: 36, color: "#1890ff", marginBottom: 10 }} />
                                <p style={{ margin: 0, color: "#1890ff", fontWeight: 500 }}>Chưa cấu hình tệp ảnh chữ ký</p>
                            </div>
                        )}
                    </div>
                    <Upload customRequest={handleUploadSignatureProcess} beforeUpload={beforeUpload} showUploadList={false} accept="image/png,image/jpeg,image/jpg">
                        <Button type="primary" icon={<UploadOutlined />} style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}>Tải lên chữ ký mới</Button>
                    </Upload>
                    <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
                        *Ảnh tải lên tại đây sẽ tự động được đặt làm chữ ký mặc định. Để quản lý nhiều chữ ký, vui lòng truy cập menu Quản lý Chữ ký.
                    </Text>
                </div>
            )
        },
        {
            key: "3",
            label: "Hợp đồng lao động",
            children: (
                <>
                    <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="middle" items={contractItems} style={{ marginBottom: 16 }} />
                    <Button type="primary" danger icon={<FilePdfOutlined />} onClick={handleOpenContractDocument}>Xem bản PDF Hợp đồng</Button>
                </>
            )
        }
    ];

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

    return (
        <Row justify="center">
            <Col xs={24} md={20} lg={16}>
                {/* THẺ AVATAR & THÔNG TIN CHUNG */}
                <Card bordered={false} style={{ marginBottom: 24, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: "wrap" }}>
                        <div style={{ position: 'relative' }}>
                            <Avatar size={100} src={u_anhDaiDien ? getImageUrl(u_anhDaiDien) : null} icon={<UserOutlined />} style={{ backgroundColor: "#1890ff" }} />
                            <Upload customRequest={handleUploadAvatar} beforeUpload={beforeUpload} showUploadList={false} accept="image/png, image/jpeg, image/jpg">
                                <Tooltip title="Đổi ảnh đại diện">
                                    <Button shape="circle" icon={<CameraOutlined />} size="small" loading={avatarUploading} style={{ position: 'absolute', bottom: 0, right: 0, border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                                </Tooltip>
                            </Upload>
                        </div>
                        <div>
                            <Title level={3} style={{ margin: "0 0 4px 0" }}>{u_hoTen}</Title>
                            <Space size="middle" style={{ flexWrap: "wrap" }}>
                                <Tag color="blue" icon={<SafetyCertificateOutlined />}>{u_tenVaiTro || "Nhân viên"}</Tag>
                                <Text type="secondary">Phòng ban: <b>{u_tenPhongBan || "Chưa xếp"}</b></Text>
                                <Text type="secondary">Chức vụ: <b>{u_tenChucVu || "Chưa xếp"}</b></Text>
                            </Space>
                        </div>
                    </div>
                </Card>

                {/* THẺ TABS ĐÃ ĐƯỢC CHUẨN HÓA CÚ PHÁP */}
                <Card bordered={false} style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <Tabs defaultActiveKey="1" items={tabItems} />
                </Card>

                {/* MODAL CẬP NHẬT THÔNG TIN */}
                <Modal 
                    title="Cập nhật thông tin cá nhân" 
                    open={isEditModalVisible} 
                    onCancel={() => setIsEditModalVisible(false)} 
                    onOk={() => form.submit()} 
                    confirmLoading={submitLoading}
                    destroyOnHidden /* 🌟 ĐÃ FIX: Sửa cảnh báo destroyOnClose */
                >
                    <Form form={form} layout="vertical" onFinish={handleUpdateProfile}>
                        <Form.Item name="hoTen" label="Họ tên" rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}><Input /></Form.Item>
                        
                        <Form.Item name="gioiTinh" label="Giới tính">
                            <Select>
                                <Select.Option value="Nam">Nam</Select.Option>
                                <Select.Option value="Nữ">Nữ</Select.Option>
                            </Select>
                        </Form.Item>
                        
                        <Form.Item name="soDienThoai" label="SĐT"><Input /></Form.Item>
                        <Form.Item name="cccd" label="CCCD"><Input /></Form.Item>
                        <Form.Item name="ngaySinh" label="Ngày sinh"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
                        <Form.Item name="diaChi" label="Địa chỉ"><Input.TextArea rows={3} /></Form.Item>
                    </Form>
                </Modal>
            </Col>
        </Row>
    );
};

export default UserProfile;