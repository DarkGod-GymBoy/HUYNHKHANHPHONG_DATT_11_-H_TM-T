/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { 
    Card, Tabs, Table, Tag, Button, Modal, Steps, Select,
    Input, Space, Typography, Row, Col, Form, Spin, Upload, Divider, message, Alert,
    Descriptions, Timeline, Avatar
} from "antd";
import { 
    CheckCircleOutlined, CloseCircleOutlined, FilePdfOutlined, 
    SafetyCertificateOutlined, RollbackOutlined, SendOutlined, 
    FileTextOutlined, UploadOutlined, PrinterOutlined, EditOutlined,
    UserSwitchOutlined, FormOutlined, PaperClipOutlined, WarningOutlined,
    PartitionOutlined, ClockCircleOutlined, UserOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios";
import ProposalPrintPreview from "../ProposalPrintPreview";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const getFileUrl = (path) => {
    if (!path) return null;
    let cleanPath = path.replace(/\\/g, '/');
    if (!cleanPath.startsWith('/') && !cleanPath.startsWith('http')) {
        cleanPath = '/' + cleanPath;
    }
    return cleanPath.startsWith('http') ? cleanPath : `http://localhost:3000${cleanPath}`;
};

const UserProposal = () => {
    const [userInfo] = useState(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            return { ...user, roleId: user?.MaVaiTro || user?.MaChucVu || 5 };
        } catch { return { roleId: 5, HoTen: "Nhân sự" }; }
    });

    const [proposals, setProposals] = useState({ created: [], toApprove: [] });
    const [employees, setEmployees] = useState([]);
    const [templates, setTemplates] = useState([]); 
    const [docTypes, setDocTypes] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [workflows, setWorkflows] = useState([]);
    
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); 

    const [currentRecord, setCurrentRecord] = useState(null);
    const [yKien, setYKien] = useState("");
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();
    const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [propRes, empRes, docRes, typeRes, workflowRes] = await Promise.all([
                api.get("/proposals/my"), 
                api.get("/employees"),
                api.get("/documents"),
                api.get("/documents/types"),
                api.get("/proposals/workflows")
            ]);
            
            const allData = propRes.data?.data || propRes.data || []; 
            setProposals({
                created: allData.filter(item => String(item.PhanLoai || item.phanLoai || "").toUpperCase() === 'DA_TAO'),
                toApprove: allData.filter(item => String(item.PhanLoai || item.phanLoai || "").toUpperCase() === 'CAN_DUYET')
            });
            
            setEmployees(empRes.data?.data || empRes.data || []);
            setTemplates(docRes.data?.data || docRes.data || []);
            setDocTypes(typeRes.data?.data || typeRes.data || []);
            setWorkflows(workflowRes.data?.data || workflowRes.data || []);

        } catch (error) { message.error("Lỗi tải dữ liệu hệ thống!"); } finally { setLoading(false); }
    };

    useEffect(() => { fetchAllData(); }, []);

    const groupedTemplates = templates.reduce((acc, doc) => {
        const typeName = doc.TenLoaiTaiLieu || doc.tenLoaiTaiLieu || "Chưa phân loại";
        if (!acc[typeName]) acc[typeName] = [];
        acc[typeName].push(doc);
        return acc;
    }, {});

    const handleTemplateChange = (maTaiLieu) => {
        if (!maTaiLieu) { form.setFieldsValue({ tieuDe: "", noiDung: "" }); return; }
        const selectedDoc = templates.find(t => (t.MaTaiLieu || t.maTaiLieu) === maTaiLieu);
        if (selectedDoc) {
            form.setFieldsValue({ 
                tieuDe: selectedDoc.TenTaiLieu || selectedDoc.tenTaiLieu, 
                noiDung: selectedDoc.MoTa || selectedDoc.moTa || "",
                loaiDeXuat: selectedDoc.MaLoaiTaiLieu || selectedDoc.maLoaiTaiLieu 
            });
            message.success(`Đã tải khung nội dung từ mẫu văn bản!`);
        }
    };

    const handleAction = async (actionType) => {
        if (!yKien && actionType !== 'GUI_LAI' && actionType !== 'KY_DUYET') return message.warning("Vui lòng nhập ý kiến!");
        try {
            const payload = { maPheDuyet: currentRecord?.MaPheDuyet || currentRecord?.maPheDuyet || currentRecord?.MaDeXuat, yKien: yKien || "Đồng ý thông qua" }; 
            if (actionType === 'KY_DUYET') { await api.post("/proposals/sign", payload); message.success("Đã ký duyệt thành công!"); } 
            else if (actionType === 'TRA_VE') { await api.post("/proposals/return", payload); message.warning("Đã trả đề xuất về!"); } 
            else if (actionType === 'TU_CHOI') { await api.post("/proposals/reject", payload); message.error("Đã từ chối!"); } 
            else if (actionType === 'GUI_LAI') { await api.post("/proposals/resubmit", { maDeXuat: currentRecord?.MaDeXuat || currentRecord?.maDeXuat }); message.success("Đã trình lại!"); }
            
            window.dispatchEvent(new Event('reload_bell'));
            setIsApproveModalOpen(false); setYKien(""); fetchAllData();
        } catch (error) { message.error(error.response?.data?.message || "Lỗi thao tác!"); }
    };

    const handleEditClick = (record) => {
        setCurrentRecord(record);
        setIsEditMode(true);
        
        let approvers = record.DanhSachNguoiDuyet || record.danhSachNguoiDuyet;
        if (typeof approvers === 'string' && approvers.trim() !== "") {
            try { approvers = JSON.parse(approvers); } catch (e) { approvers = []; }
        }
        const oldApproverIds = Array.isArray(approvers) ? approvers.map(emp => emp.MaTaiKhoan || emp.maTaiKhoan) : [];

        form.setFieldsValue({
            tieuDe: record.TieuDe,
            noiDung: record.NoiDung,
            loaiDeXuat: record.LoaiDeXuat,
            maQuyTrinh: record.MaQuyTrinh || record.maQuyTrinh || 2, 
            nguoiNhanDuyet: oldApproverIds 
        });

        let files = record.DanhSachFile || record.danhSachFile;
        if (typeof files === 'string' && files.trim() !== "") {
            try { files = JSON.parse(files); } catch (e) { files = []; }
        }
        if (Array.isArray(files)) {
            const formattedFiles = files.map((f, i) => ({
                uid: `-${i}`,
                name: f.TenTep || f.tenTep || `File_${i+1}`,
                status: 'done',
                url: getFileUrl(f.DuongDanTep || f.duongDanTep)
            }));
            setFileList(formattedFiles);
        } else {
            setFileList([]);
        }

        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = async (values) => {
        setSubmitLoading(true);
        try {
            const formData = new FormData();
            formData.append("tieuDe", values.tieuDe);
            formData.append("loaiDeXuat", values.loaiDeXuat || ""); 
            formData.append("noiDung", values.noiDung || "");
            formData.append("maQuyTrinh", values.maQuyTrinh || 2); 
            
            const nguoiDuyetList = Array.isArray(values.nguoiNhanDuyet) ? values.nguoiNhanDuyet.join(',') : values.nguoiNhanDuyet;
            formData.append("nguoiNhanDuyet", nguoiDuyetList);
            
            if (fileList && fileList.length > 0) {
                fileList.forEach(file => {
                    if (!file.url) { 
                        formData.append("files", file.originFileObj || file);
                    }
                });
            }

            if (isEditMode) {
                const id = currentRecord?.MaDeXuat || currentRecord?.maDeXuat;
                if (!id) throw new Error("Không tìm thấy mã đề xuất để cập nhật!");
                
                await api.put(`/proposals/${id}`, formData);
                message.success("Cập nhật dữ liệu điều chỉnh đề xuất thành công!");
            } else {
                await api.post("/proposals", formData);
                message.success("Tạo văn bản và chuyển đến Hội đồng Ký duyệt thành công!");
            }
            
            window.dispatchEvent(new Event('reload_bell'));
            setIsCreateModalOpen(false); 
            setIsEditMode(false); 
            form.resetFields(); 
            setFileList([]); 
            fetchAllData();

        } catch (error) { 
            if (error.response && error.response.data) {
                console.error("🚨 LÝ DO TỪ BACKEND:", error.response.data.message);
            }
            const backendError = error.response?.data?.message || error.message || "Lỗi không xác định";
            message.error((isEditMode ? "Lỗi cập nhật: " : "Lỗi khởi tạo: ") + backendError); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    const columns = [
        { title: "Mã VB", dataIndex: "SoDeXuat", width: 120, render: (t) => <b>{t}</b> },
        { title: "Tiêu đề văn bản", dataIndex: "TieuDe", render: (t) => <span style={{ color: '#0050b3', fontWeight: 600 }}>{t}</span> },
        { 
            title: "Loại văn bản", 
            dataIndex: "LoaiDeXuat", 
            render: (loaiId) => {
                const matchedType = docTypes.find(type => String(type.MaLoaiTaiLieu) === String(loaiId));
                const displayName = matchedType ? matchedType.TenLoaiTaiLieu : (loaiId || "Khác");
                return <Tag color="geekblue">{displayName}</Tag>;
            } 
        },
        { title: "Ngày trình", dataIndex: "NgayTao", render: (date) => date ? dayjs(date).format("DD/MM/YYYY") : "" },
        { title: "Trạng thái", dataIndex: "TrangThai", render: (status) => {
            const colorMap = { "CHO_DUYET": "blue", "DA_DUYET": "green", "TU_CHOI": "red", "TRA_VE": "orange" };
            return <Tag color={colorMap[status] || "default"}>{status || "Đang xử lý"}</Tag>;
        }},
        {
            title: "Tệp đính kèm",
            width: 220,
            render: (_, record) => {
                let files = record.DanhSachFile || record.danhSachFile;
                if (typeof files === 'string' && files.trim() !== "") {
                    try { files = JSON.parse(files); } catch (e) { return null; }
                }
                if (Array.isArray(files) && files.length > 0) {
                    return (
                        <Space direction="vertical" size="small">
                            {files.map((file, i) => {
                                const path = file.DuongDanTep || file.duongDanTep;
                                if (!path) return null;
                                const url = path.startsWith("http") ? path : `http://localhost:3000/${path}`;
                                return (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: '#1890ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <PaperClipOutlined /> {file.TenTep || file.tenTep || `Tài_liệu_${i+1}`}
                                    </a>
                                );
                            })}
                        </Space>
                    );
                }
                return <span style={{ color: "#bfbfbf", fontSize: 12, fontStyle: 'italic' }}>Không có</span>;
            }
        },
        { title: "Thao tác", width: 160, align: 'center', render: (_, record) => {
            const status = String(record.TrangThai || record.trangThai).toUpperCase();
            const phanLoai = String(record.PhanLoai || record.phanLoai).toUpperCase();
            return (
                <Space direction="vertical" size="small">
                    <Button type="primary" ghost size="small" onClick={() => { setCurrentRecord(record); setIsApproveModalOpen(true); }}>Chi tiết</Button>
                    {status === "DA_DUYET" && (
                        <Button style={{ color: '#52c41a', borderColor: '#52c41a' }} size="small" icon={<PrinterOutlined />} onClick={() => { setCurrentRecord(record); setIsPrintModalVisible(true); }}>In phôi</Button>
                    )}
                    {phanLoai === 'DA_TAO' && (status === "TRA_VE" || status === "CHO_DUYET") && (
                        <Button type="dashed" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(record)} style={{ color: '#fa8c16', borderColor: '#fa8c16' }}>Sửa Đề Xuất</Button>
                    )}
                </Space>
            )
        }}
    ];

    const tabItems = [];
    if (userInfo.roleId !== 5 || proposals.toApprove.length > 0) {
        tabItems.push({ key: "1", label: <span style={{ color: proposals.toApprove.length > 0 ? '#f5222d' : 'inherit', fontWeight: 600 }}>📩 Cần tôi cho ý kiến ({proposals.toApprove.length})</span>, children: <Table dataSource={proposals.toApprove} columns={columns} rowKey={(r) => r.MaPheDuyet || r.maPheDuyet || r.MaDeXuat} pagination={{ pageSize: 8 }} locale={{ emptyText: "Không có văn bản nào đang chờ bạn duyệt." }} bordered /> });
    }
    tabItems.push({ key: "2", label: <span style={{ fontWeight: 600 }}>📑 Hồ sơ tôi trình ký ({proposals.created.length})</span>, children: <Table dataSource={proposals.created} columns={columns} rowKey={(r) => r.MaDeXuat || r.maDeXuat} pagination={{ pageSize: 8 }} bordered /> });

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" tip="Đang nạp dữ liệu..." /></div>;

    // 🌟 HÀM PHỤ TRỢ CHO MODAL CHI TIẾT
    // Phân tích danh sách người duyệt từ JSON
    let parsedApprovers = [];
    let parsedFiles = [];
    if (currentRecord) {
        try { parsedApprovers = JSON.parse(currentRecord.DanhSachNguoiDuyet || currentRecord.danhSachNguoiDuyet || "[]"); } catch(e) { /* empty */ }
        try { parsedFiles = JSON.parse(currentRecord.DanhSachFile || currentRecord.danhSachFile || "[]"); } catch(e) { /* empty */ }
    }

    return (
        <div style={{ padding: 24, background: '#f5f7fa', minHeight: '80vh' }}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div><Title level={4} style={{ margin: 0, color: '#0050b3', fontWeight: 700 }}>HỆ THỐNG PHÊ DUYỆT VÀ TRÌNH KÝ SỐ</Title></div>
                    <Button type="primary" size="large" icon={<EditOutlined />} onClick={() => { setIsEditMode(false); setIsCreateModalOpen(true); setTimeout(() => form.resetFields(), 0); }} style={{ backgroundColor: '#1890ff', borderRadius: 6, fontWeight: 600 }}>Tạo Hồ Sơ Trình Ký</Button>
                </div>
                <Tabs items={tabItems} defaultActiveKey={proposals.toApprove.length > 0 ? "1" : "2"} size="large" />
            </Card>

            {/* 🌟 UX/UI MỚI: MODAL CHI TIẾT TOÀN DIỆN */}
            <Modal 
                title={<span style={{ color: '#0050b3', fontSize: 18, fontWeight: 700 }}><FileTextOutlined /> HỒ SƠ: {currentRecord?.TieuDe}</span>} 
                open={isApproveModalOpen} onCancel={() => setIsApproveModalOpen(false)} 
                width={1100} footer={null} destroyOnHidden
            >
                <Row gutter={24} style={{ marginTop: 16 }}>
                    <Col span={15}>
                        {/* 1. THÔNG TIN CHUNG (Lấy dữ liệu từ lúc Tạo) */}
                        <Descriptions title="Thông tin thuộc tính" bordered size="small" column={2} style={{ marginBottom: 20 }}>
                            <Descriptions.Item label="Mã văn bản"><Text strong>{currentRecord?.SoDeXuat}</Text></Descriptions.Item>
                            <Descriptions.Item label="Ngày khởi tạo">{dayjs(currentRecord?.NgayTao).format("DD/MM/YYYY HH:mm")}</Descriptions.Item>
                            <Descriptions.Item label="Người lập">
                                <Tag color="blue">{currentRecord?.NguoiTaoHoTen || "Nhân viên"}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Loại quy trình">
                                {currentRecord?.MaQuyTrinh === 2 || currentRecord?.LoaiQuyTrinh === 'TU_DO' ? <Tag color="purple" icon={<PartitionOutlined/>}>Ký tự do</Tag> : <Tag color="geekblue" icon={<PartitionOutlined/>}>Ký theo cấp bậc</Tag>}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* 2. NỘI DUNG VĂN BẢN */}
                        <Card type="inner" title="Nội dung chi tiết" style={{ marginBottom: 20, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ background: '#fcfcfc', padding: '16px', borderRadius: 6, border: '1px solid #f0f0f0', minHeight: 120, maxHeight: 300, overflowY: 'auto' }}>
                                <p style={{ whiteSpace: "pre-wrap", color: '#262626', margin: 0, lineHeight: 1.8, fontSize: 14 }}>{currentRecord?.NoiDung || "Chưa có nội dung."}</p>
                            </div>
                        </Card>

                        {/* 3. TÀI LIỆU ĐÍNH KÈM */}
                        {parsedFiles.length > 0 && (
                            <Card type="inner" title="Tài liệu đính kèm" style={{ marginBottom: 20, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <Space direction="vertical">
                                    {parsedFiles.map((file, i) => {
                                        const path = file.DuongDanTep || file.duongDanTep;
                                        if (!path) return null;
                                        const url = path.startsWith("http") ? path : `http://localhost:3000/${path}`;
                                        return (
                                            <Button key={i} type="text" icon={<FilePdfOutlined style={{ color: '#cf1322' }}/>} href={url} target="_blank" style={{ padding: 0, height: 'auto', fontWeight: 500 }}>
                                                {file.TenTep || file.tenTep || `Tai_Lieu_Dinh_Kem_${i+1}.pdf`}
                                            </Button>
                                        );
                                    })}
                                </Space>
                            </Card>
                        )}
                    </Col>
                    
                    <Col span={9}>
                        {/* 4. KHU VỰC HIỂN THỊ Ý KIẾN HỘI ĐỒNG (Bảo lưu toàn bộ lịch sử) */}
                        <Card type="inner" title="Tiến trình & Ý kiến chỉ đạo" style={{ borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20 }}>
                            {parsedApprovers.length > 0 ? (
                                <Timeline>
                                    {parsedApprovers.map((appr, index) => {
                                        // Tìm tên sếp từ mảng employees
                                        const empInfo = employees.find(e => (e.MaTaiKhoan || e.maTaiKhoan) === (appr.MaTaiKhoan || appr.maTaiKhoan));
                                        const empName = empInfo ? empInfo.HoTen : `Người duyệt #${index + 1}`;
                                        const status = String(appr.TrangThai || appr.trangThai).toUpperCase();
                                        
                                        let color = "blue"; let statusText = "Đang chờ duyệt";
                                        if (status === "DA_KY") { color = "green"; statusText = "Đã phê duyệt"; }
                                        else if (status === "TRA_VE") { color = "orange"; statusText = "Yêu cầu sửa đổi (Trả về)"; }
                                        else if (status === "TU_CHOI") { color = "red"; statusText = "Đã từ chối"; }

                                        return (
                                            <Timeline.Item key={index} color={color}>
                                                <div style={{ marginBottom: 4 }}>
                                                    <Text strong>{empName}</Text> <Tag color={color} style={{ marginLeft: 8 }}>{statusText}</Tag>
                                                </div>
                                                {/* Hiển thị ý kiến nếu sếp đã để lại comment */}
                                                {(appr.YKien || appr.yKien) && (
                                                    <div style={{ backgroundColor: '#fafafa', padding: '8px 12px', borderRadius: 4, borderLeft: `3px solid ${color === 'orange' ? '#faad14' : (color === 'red' ? '#ff4d4f' : '#52c41a')}`, marginTop: 8, fontSize: 13 }}>
                                                        <i>"{appr.YKien || appr.yKien}"</i>
                                                    </div>
                                                )}
                                            </Timeline.Item>
                                        );
                                    })}
                                </Timeline>
                            ) : (
                                <Steps direction="vertical" current={String(currentRecord?.TrangThai).toUpperCase() === 'CHO_DUYET' ? 1 : (String(currentRecord?.TrangThai).toUpperCase() === 'DA_DUYET' ? 2 : 1)} size="small" items={[{ title: 'Khởi tạo', description: 'Đã gửi' }, { title: 'Chờ xét duyệt', description: currentRecord?.TrangThai }, { title: 'Hoàn tất' }]} />
                            )}
                        </Card>

                        {/* 5. KHU VỰC NHẬP Ý KIẾN VÀ KÝ (Dành cho sếp) */}
                        {(String(currentRecord?.PhanLoai || currentRecord?.phanLoai).toUpperCase() === 'CAN_DUYET' && String(currentRecord?.TrangThaiCuaToi || currentRecord?.trangThaiCuaToi).toUpperCase() !== 'DA_KY') && (
                            <Card type="inner" title={<span><UserSwitchOutlined /> Xử lý hồ sơ</span>} style={{ background: "#f6ffed", borderColor: "#b7eb8f", borderRadius: 6 }}>
                                <TextArea rows={3} value={yKien} onChange={(e) => setYKien(e.target.value)} placeholder="Nhập ý kiến phê duyệt hoặc lý do trả về..." style={{ marginBottom: 16, borderRadius: 6 }} />
                                <Space wrap>
                                    <Button type="primary" style={{ background: "#52c41a", borderColor: "#52c41a" }} icon={<SafetyCertificateOutlined />} onClick={() => handleAction('KY_DUYET')}>Ký duyệt</Button>
                                    <Button icon={<RollbackOutlined />} onClick={() => handleAction('TRA_VE')} style={{ color: '#fa8c16', borderColor: '#fa8c16' }}>Trả về</Button>
                                    <Button danger icon={<CloseCircleOutlined />} onClick={() => handleAction('TU_CHOI')}>Bác bỏ</Button>
                                </Space>
                            </Card>
                        )}
                        
                        {/* Nút gửi lại (nếu bị trả về) */}
                        {String(currentRecord?.PhanLoai || currentRecord?.phanLoai).toUpperCase() === 'DA_TAO' && String(currentRecord?.TrangThai).toUpperCase() === 'TRA_VE' && (
                             <Button type="primary" icon={<SendOutlined />} onClick={() => handleAction('GUI_LAI')} block style={{ background: '#fa8c16', borderColor: '#fa8c16', marginTop: 16 }}>Trình ký lại (Nếu đã sửa xong)</Button>
                        )}
                    </Col>
                </Row>
            </Modal>

            {/* Modal Form Tạo Mới / Sửa (Giữ nguyên) */}
            <Modal 
                title={<span style={{ color: '#0050b3', fontWeight: 600 }}>{isEditMode ? "🛠️ ĐIỀU CHỈNH VÀ SỬA ĐỀ XUẤT" : "KHỞI TẠO HỒ SƠ TRÌNH KÝ MỚI"}</span>} 
                open={isCreateModalOpen} 
                onCancel={() => { setIsCreateModalOpen(false); setIsEditMode(false); form.resetFields(); setFileList([]); }} 
                onOk={() => form.submit()} 
                destroyOnHidden width={750} confirmLoading={submitLoading} 
                okText={isEditMode ? "Lưu chỉnh sửa & Trình lại" : "Phát hành trình ký"} cancelText="Hủy bỏ"
            >
                {!isEditMode && (
                    <>
                        <Form.Item label={<Text strong><FormOutlined style={{ color: '#1890ff', marginRight: 5 }}/>Dùng văn bản mẫu hệ thống</Text>}>
                            <Select placeholder="-- Chọn mẫu văn bản để tự động điền --" onChange={handleTemplateChange} allowClear showSearch size="large">
                                {Object.entries(groupedTemplates).map(([typeName, docs]) => (
                                    <Select.OptGroup key={typeName} label={typeName.toUpperCase()}>
                                        {docs.map(doc => <Option key={doc.MaTaiLieu || doc.maTaiLieu} value={doc.MaTaiLieu || doc.maTaiLieu}>{doc.TenTaiLieu || doc.tenTaiLieu}</Option>)}
                                    </Select.OptGroup>
                                ))}
                            </Select>
                        </Form.Item>
                        <Divider style={{ margin: '16px 0' }} />
                    </>
                )}

                <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
                    <Form.Item name="tieuDe" label={<Text strong>Về việc (Tiêu đề)</Text>} rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}><Input placeholder="Nhập trích yếu..." size="large" /></Form.Item>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="loaiDeXuat" label={<Text strong>Phân loại văn bản</Text>} rules={[{ required: true, message: "Vui lòng chọn loại" }]}>
                                <Select size="large" placeholder="Chọn loại...">
                                    {docTypes.map(type => <Option key={type.MaLoaiTaiLieu} value={type.MaLoaiTaiLieu}>{type.TenLoaiTaiLieu}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        
                        <Col span={12}>
                            <Form.Item name="maQuyTrinh" label={<Text strong><PartitionOutlined style={{ color: '#722ed1', marginRight: 4 }} /> Hình thức ký số / Quy trình</Text>} rules={[{ required: true, message: "Vui lòng chọn loại hình quy trình" }]} initialValue={2}>
                                <Select size="large" placeholder="Chọn hình thức ký...">
                                        {workflows.map(wf => (
                                            <Option key={wf.MaQuyTrinh} value={wf.MaQuyTrinh}>
                                                {wf.LoaiKy === 'THEO_CAP_BAC' ? '📋 ' : '⚡ '} 
                                                {wf.TenQuyTrinh} 
                                                <span style={{ fontSize: '12px', color: '#8c8c8c', marginLeft: 8 }}>({wf.MoTa})</span>
                                            </Option>
                                        ))}
                                    </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="nguoiNhanDuyet" label={<Text strong>Gửi trình ký cho (Hội đồng cấp trên duyệt)</Text>} rules={[{ required: true, message: "Vui lòng chọn sếp duyệt" }]}>
                        <Select mode="multiple" placeholder="Chọn các cấp lãnh đạo phê duyệt..." showSearch optionFilterProp="children" size="large" maxTagCount="responsive">
                            {employees.filter(emp => emp.MaVaiTro !== 5).map(emp => (
                                <Option key={emp.MaTaiKhoan || emp.maTaiKhoan} value={emp.MaTaiKhoan || emp.maTaiKhoan}>{emp.TenVaiTro || emp.tenVaiTro} - {emp.HoTen || emp.hoTen}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="noiDung" label={<Text strong>Nội dung chi tiết</Text>}>
                        <TextArea rows={6} placeholder="Nhập căn cứ và nội dung trình ký chi tiết..." />
                    </Form.Item>

                    <Form.Item label={<Text strong>Tệp minh chứng / Văn bản đi kèm</Text>}>
                        <Upload 
                            beforeUpload={(f) => { setFileList(prev => [...prev, f]); return false; }} 
                            onRemove={(file) => { setFileList(prev => prev.filter(item => item.uid !== file.uid)); }} 
                            fileList={fileList} multiple={true}
                        >
                            <Button icon={<UploadOutlined />}>Tải tệp lên</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            <ProposalPrintPreview visible={isPrintModalVisible} onClose={() => setIsPrintModalVisible(false)} maDeXuat={currentRecord?.MaDeXuat || currentRecord?.maDeXuat} />
        </div>
    );
};

export default UserProposal;