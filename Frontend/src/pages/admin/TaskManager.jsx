/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { 
    Card, Table, Button, Space, Popconfirm, message, Modal, 
    Form, Input, Select, DatePicker, Tag, Progress, Row, Col, 
    Statistic, Divider, Drawer, Tooltip, Empty ,Typography
} from "antd";
import { 
    PlusOutlined, EditOutlined, DeleteOutlined, OrderedListOutlined, 
    CheckCircleOutlined, ClockCircleOutlined, PaperClipOutlined, 
    HistoryOutlined, LineChartOutlined, SyncOutlined, ExclamationCircleOutlined,
    UploadOutlined, FileTextOutlined // Đã bổ sung các icon cần thiết
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios";
import TaskReportManager from "./TaskReportManager";

const { Option } = Select;
const { Title, Text } = Typography || {}; // Dự phòng nếu bạn chưa import Typography ở trên

const TaskManager = () => {
    // --- STATES ---
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskReports, setTaskReports] = useState([]); 
    const [loadingReports, setLoadingReports] = useState(false);
    
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);

    const [reportDrawerVisible, setReportDrawerVisible] = useState(false);
    const [currentReportTask, setCurrentReportTask] = useState(null);

    // 🌟 CHUẨN HÓA TRẠNG THÁI
    const getStandardStatus = (rawStatus) => {
        if (!rawStatus) return "CHUA_THUC_HIEN";
        const s = String(rawStatus).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        if (s.includes("DANG") || s.includes("DANG_THUC_HIEN")) return "DANG_THUC_HIEN";
        if (s.includes("HOAN") || s.includes("HOAN_THANH")) return "HOAN_THANH";
        if (s.includes("TRE") || s.includes("TRE_HAN")) return "TRE_HAN";
        return "CHUA_THUC_HIEN";
    };

    // --- FETCH DATA ---
    const fetchTasksAndEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const [taskRes, empRes] = await Promise.all([
                api.get("/tasks"),
                api.get("/employees")
            ]);
            const taskData = taskRes?.data?.data !== undefined ? taskRes.data.data : (Array.isArray(taskRes.data) ? taskRes.data : []);
            const empData = empRes?.data?.data !== undefined ? empRes.data.data : (Array.isArray(empRes.data) ? empRes.data : []);
            
            setTasks(Array.isArray(taskData) ? taskData : []);
            setEmployees(Array.isArray(empData) ? empData : []);
        } catch (error) {
            message.error("Không thể kết nối hoặc tải danh sách dữ liệu!");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasksAndEmployees();
    }, [fetchTasksAndEmployees]);

    // --- ACTIONS ---
    const openReportDrawer = (record) => {
        setCurrentReportTask(record);
        setReportDrawerVisible(true);
    };

    const handleSave = async (values) => {
        const filesPayload = form.getFieldValue("danhSachFile") || [];
        const payload = {
            ...values,
            danhSachFile: Array.isArray(filesPayload) ? filesPayload : [filesPayload],
            ngayBatDau: values.ngayBatDau ? values.ngayBatDau.format("YYYY-MM-DD HH:mm:ss") : null,
            hanHoanThanh: values.hanHoanThanh ? values.hanHoanThanh.format("YYYY-MM-DD HH:mm:ss") : null,
        };

        try {
            if (editingTask) {
                const id = editingTask.MaCongViec || editingTask.maCongViec;
                await api.put(`/tasks/${id}`, payload);
                message.success("Cập nhật trạng thái công việc thành công!");
            } else {
                await api.post("/tasks", payload);
                message.success("Phát hành chỉ thị và phân công nhân sự thành công!");
                window.dispatchEvent(new Event('reload_bell')); // Kích hoạt nảy chuông cho UserLayout/AdminLayout
            }
            setIsModalVisible(false);
            setEditingTask(null);
            setTaskReports([]);
            form.resetFields();
            fetchTasksAndEmployees();
        } catch (error) {
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi đồng bộ dữ liệu!");
        }
    };

    const handleDelete = async (maCongViec) => {
        try {
            await api.delete(`/tasks/${maCongViec}`);
            message.success("Đã thu hồi và xóa sạch dữ liệu công việc liên đới!");
            fetchTasksAndEmployees();
        } catch (error) {
            message.error("Lỗi xóa hệ thống, không thể thu hồi công việc!");
        }
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }

        setUploading(true); 
        try {
            const res = await api.post("/uploads/multi-files", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            let fileUrls = res?.data?.fileUrls || res?.data?.data || res?.fileUrls;
            
            if (!fileUrls && Array.isArray(res?.data)) fileUrls = res.data;
            if (typeof fileUrls === 'string') fileUrls = [fileUrls];

            if (Array.isArray(fileUrls) && fileUrls.length > 0) {
                const currentFormFiles = form.getFieldValue("danhSachFile") || [];
                form.setFieldsValue({ danhSachFile: [...currentFormFiles, ...fileUrls] });
                message.success("Tải file đính kèm chỉ thị thành công!");
            } else {
                message.warning("Hệ thống chưa nhận diện được cấu trúc tệp từ máy chủ!");
            }
        } catch (error) {
            message.error("Lỗi tải tệp tin lên máy chủ!");
        } finally {
            setUploading(false); 
            e.target.value = ""; 
        }
    };

    const handleOpenCreateModal = () => {
        setEditingTask(null); 
        setTaskReports([]);
        form.resetFields(); 
        form.setFieldsValue({ mucDoUuTien: "TRUNG_BINH", trangThai: "CHUA_THUC_HIEN", danhSachFile: [] });
        setIsModalVisible(true); 
    };

    const handleOpenEditModal = async (record) => {
        setEditingTask(record);
        
        let mangFile = [];
        let rawFiles = record.TepDinhKem || record.tepDinhKem || record.DuongDanTep || record.duongDanTep || record.danhSachFile;

        if (typeof rawFiles === 'string' && rawFiles.trim() !== "") {
            try {
                const parsed = JSON.parse(rawFiles);
                if (Array.isArray(parsed)) {
                    mangFile = parsed.map(f => f.DuongDanTep || f.duongDanTep || f.DuongDan || f.url || f).filter(Boolean);
                }
            } catch (e) {
                mangFile = rawFiles.split(',').map(f => f.trim()).filter(Boolean);
            }
        } else if (Array.isArray(rawFiles)) {
            mangFile = rawFiles.map(f => f.DuongDanTep || f.duongDanTep || f.DuongDan || f.url || (typeof f === 'string' ? f : null)).filter(Boolean);
        }

        const ngayBatDau = record.NgayBatDau || record.ngayBatDau;
        const hanHoanThanh = record.HanHoanThanh || record.hanHoanThanh;
        const statusVal = getStandardStatus(record.TrangThai || record.trangThai);

        form.setFieldsValue({
            maCongViecNoiBo: record.MaCongViecNoiBo || record.maCongViecNoiBo,
            tieuDe: record.TieuDe || record.tieuDe,
            noiDung: record.NoiDung || record.noiDung,
            mucDoUuTien: record.MucDoUuTien || record.mucDoUuTien || "TRUNG_BINH",
            trangThai: statusVal,
            ngayBatDau: ngayBatDau && dayjs(ngayBatDau).isValid() ? dayjs(ngayBatDau) : null,
            hanHoanThanh: hanHoanThanh && dayjs(hanHoanThanh).isValid() ? dayjs(hanHoanThanh) : null,
            danhSachFile: mangFile
        });
        
        setIsModalVisible(true);

        const taskId = record.MaCongViec || record.maCongViec;
        setLoadingReports(true);
        try {
            const res = await api.get(`/task-reports/${taskId}`);
            const resData = res?.data?.data !== undefined ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setTaskReports(Array.isArray(resData) ? resData : []);
        } catch (error) {
            setTaskReports([]);
        } finally {
            setLoadingReports(false);
        }
    };

    // --- Tính toán thống kê ---
    const total = tasks.length;
    const completed = tasks.filter(t => getStandardStatus(t.TrangThai || t.trangThai) === "HOAN_THANH").length;
    const processing = tasks.filter(t => {
        const s = getStandardStatus(t.TrangThai || t.trangThai);
        return s === "DANG_THUC_HIEN" || s === "TRE_HAN";
    }).length;

    // --- CẤU HÌNH BẢNG (TABLE COLUMNS) ---
    const columns = [
        { 
            title: "Mã số", 
            width: 90, 
            render: (_, record) => <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.MaCongViecNoiBo || record.maCongViecNoiBo || `CV-${record.MaCongViec || record.maCongViec}`}</span> 
        },
        { 
            title: "Tiêu đề công việc", 
            render: (_, record) => (
                <div style={{ cursor: 'pointer' }} onClick={() => openReportDrawer(record)}>
                    <span style={{ fontWeight: 600, color: '#0050b3', fontSize: 14 }}>{record.TieuDe || record.tieuDe}</span>
                </div>
            )
        },
        { 
            title: "Mức độ", 
            width: 120,
            render: (_, record) => {
                const priority = String(record.MucDoUuTien || record.mucDoUuTien || "TRUNG_BINH").toUpperCase();
                if (priority === "CAO" || priority === "KHAN_CAP") return <Tag color="volcano" style={{ fontWeight: 600, borderRadius: 4 }}>Cao</Tag>;
                if (priority === "THAP") return <Tag color="green" style={{ fontWeight: 600, borderRadius: 4 }}>Thấp</Tag>;
                return <Tag color="blue" style={{ fontWeight: 600, borderRadius: 4 }}>Bình thường</Tag>;
            }
        },
        { 
            title: "Tiến độ", 
            width: 150, 
            render: (_, record) => {
                const percent = record.TyLeHoanThanh || record.tyLeHoanThanh || 0;
                return (
                    <Tooltip title={`${percent}% hoàn thành`}>
                        <Progress percent={percent} size="small" status={percent === 100 ? "success" : "active"} strokeColor={percent === 100 ? "#52c41a" : "#1890ff"} />
                    </Tooltip>
                );
            }
        },
        { 
            title: "Trạng thái", 
            width: 140,
            render: (_, record) => {
                const statusStr = getStandardStatus(record.TrangThai || record.trangThai);
                if (statusStr === "HOAN_THANH") return <Tag color="success" icon={<CheckCircleOutlined />}>Hoàn tất</Tag>;
                if (statusStr === "DANG_THUC_HIEN") return <Tag color="processing" icon={<SyncOutlined spin />}>Đang làm</Tag>;
                if (statusStr === "TRE_HAN") return <Tag color="error" icon={<ExclamationCircleOutlined />}>Trễ hạn</Tag>;
                return <Tag color="default" icon={<ClockCircleOutlined />}>Chờ xử lý</Tag>;
            }
        },
        { 
            title: "Hạn chót", 
            width: 120, 
            render: (_, record) => {
                const d = record.HanHoanThanh || record.hanHoanThanh;
                const isLate = dayjs(d).isBefore(dayjs(), 'day') && getStandardStatus(record.TrangThai || record.trangThai) !== "HOAN_THANH";
                return d && dayjs(d).isValid() ? <span style={{ color: isLate ? '#cf1322' : '#595959', fontWeight: isLate ? 600 : 400 }}>{dayjs(d).format("DD/MM/YYYY")}</span> : "";
            }
        },
        {
            title: "Hành động", 
            key: "action", 
            width: 160, 
            align: 'center',
            render: (_, record) => {
                const id = record.MaCongViec || record.maCongViec;
                return (
                    <Space size="small">
                        <Tooltip title="Xem báo cáo / Tiến độ">
                            <Button size="small" type="text" style={{ color: '#096dd9', background: '#e6f7ff' }} icon={<LineChartOutlined />} onClick={() => openReportDrawer(record)} />
                        </Tooltip>
                        <Tooltip title="Chỉnh sửa">
                            <Button size="small" type="text" icon={<EditOutlined style={{ color: "#1890ff" }} />} onClick={() => handleOpenEditModal(record)} />
                        </Tooltip>
                        <Tooltip title="Xóa">
                            <Popconfirm title="Thu hồi và xóa vĩnh viễn công việc này?" onConfirm={() => handleDelete(id)} okText="Xóa" cancelText="Hủy">
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                );
            }
        }
    ];

    const reportColumns = [
        { title: "Thời gian", dataIndex: "NgayBaoCao", width: 140, render: (d) => dayjs(d).format("DD/MM HH:mm") },
        { title: "Người báo cáo", dataIndex: "NguoiBaoCao", width: 140 },
        { title: "Tiến độ", dataIndex: "TyLeHoanThanh", width: 80, render: (p) => <Tag color="blue">{p}%</Tag> },
        { title: "Nội dung", dataIndex: "NoiDungBaoCao" },
        {
            title: "Tệp đính kèm", 
            width: 120,
            render: (_, repRecord) => {
                let files = repRecord.TepDinhKem || repRecord.tepDinhKem || repRecord.TepMinhChung || repRecord.danhSachFile;
                if (typeof files === 'string') {
                    try { files = JSON.parse(files); } 
                    catch (e) { files = files.split(',').filter(Boolean).map(f => ({ DuongDanTep: f.trim() })); }
                }
                if (Array.isArray(files) && files.length > 0) {
                    return (
                        <Space direction="vertical" size="small">
                            {files.map((file, i) => {
                                const path = file.DuongDanTep || file.duongDanTep || file.url || (typeof file === 'string' ? file : "");
                                if (!path) return null;
                                const url = path.startsWith("http") ? path : `http://localhost:3000${path}`;
                                return (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: '#1890ff' }} title={path.split("/").pop()}>
                                        <PaperClipOutlined /> File {i+1}
                                    </a>
                                );
                            })}
                        </Space>
                    );
                }
                return <span style={{ color: "#bfbfbf", fontSize: "12px" }}>--</span>;
            }
        }
    ];

    // --- STYLES DÙNG CHUNG ---
    const cardStyle = { borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden', position: 'relative' };
    const watermarkStyle = { position: 'absolute', right: -15, bottom: -25, fontSize: 100, opacity: 0.05, transform: 'rotate(-15deg)' };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 🌟 NÂNG CẤP: KHỐI THỐNG KÊ (WATERMARK CARDS) */}
            <Row gutter={24}>
                <Col span={8}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #1890ff', background: '#fff' }} styles={{ body: { padding: '24px' } }}>
                        <OrderedListOutlined style={{ ...watermarkStyle, color: '#1890ff' }} />
                        <Statistic title={<span style={{ color: '#8c8c8c', fontWeight: 600 }}>TÁC VỤ ĐANG VẬN HÀNH</span>} value={total} valueStyle={{ color: '#1890ff', fontSize: 32, fontWeight: 800 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #52c41a', background: '#fff' }} styles={{ body: { padding: '24px' } }}>
                        <CheckCircleOutlined style={{ ...watermarkStyle, color: '#52c41a' }} />
                        <Statistic title={<span style={{ color: '#8c8c8c', fontWeight: 600 }}>CÔNG VIỆC ĐÃ HOÀN TẤT</span>} value={completed} valueStyle={{ color: '#52c41a', fontSize: 32, fontWeight: 800 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #faad14', background: '#fff' }} styles={{ body: { padding: '24px' } }}>
                        <ClockCircleOutlined style={{ ...watermarkStyle, color: '#faad14' }} />
                        <Statistic title={<span style={{ color: '#8c8c8c', fontWeight: 600 }}>CÔNG VIỆC ĐANG XỬ LÝ</span>} value={processing} valueStyle={{ color: '#faad14', fontSize: 32, fontWeight: 800 }} />
                    </Card>
                </Col>
            </Row>

            {/* BẢNG QUẢN LÝ DỮ LIỆU */}
            <Card 
                title={<><FileTextOutlined style={{ color: '#0050b3', marginRight: 8, fontSize: 18 }} /> <span style={{ color: '#002766', fontSize: 16 }}>HỆ THỐNG GIÁM SÁT & ĐIỀU PHỐI TÁC VỤ</span></>}
                variant="borderless" 
                style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
                styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '24px' } }}
                extra={
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleOpenCreateModal} style={{ backgroundColor: '#0050b3', borderRadius: 8, fontWeight: 600 }}>
                        Phát hành Chỉ thị Mới
                    </Button>
                }
            >
                <Table 
                    dataSource={tasks} 
                    rowKey={(record) => record.MaCongViec || record.maCongViec || Math.random()} 
                    columns={columns} 
                    loading={loading} 
                    size="middle" 
                    pagination={{ pageSize: 8 }} 
                    locale={{ emptyText: <Empty description="Hệ thống chưa ghi nhận tác vụ nào." /> }}
                />

                {/* MODAL TẠO MỚI / CHỈNH SỬA CÔNG VIỆC */}
                <Modal 
                    title={<span style={{ color: '#0050b3', fontWeight: 700, fontSize: 16 }}>{editingTask ? "CẤU HÌNH CHI TIẾT & TIẾN ĐỘ" : "PHÁT HÀNH CÔNG VIỆC & PHÂN QUYỀN"}</span>} 
                    open={isModalVisible} 
                    onCancel={() => { setIsModalVisible(false); setEditingTask(null); setTaskReports([]); form.resetFields(); }} 
                    footer={null} destroyOnClose width={800} style={{ top: 30 }}
                >
                    <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 24 }}>
                        <Row gutter={24}>
                            <Col span={8}><Form.Item name="maCongViecNoiBo" label={<span style={{ fontWeight: 600 }}>Mã số lưu trữ</span>}><Input placeholder="Ví dụ: CV-01" style={{ borderRadius: 6 }} /></Form.Item></Col>
                            <Col span={16}><Form.Item name="tieuDe" label={<span style={{ fontWeight: 600 }}>Tiêu đề đầu việc / Chỉ thị</span>} rules={[{required: true, message: "Vui lòng cung cấp tiêu đề!"}]}><Input placeholder="Nhập tên nhiệm vụ..." style={{ borderRadius: 6 }} /></Form.Item></Col>
                        </Row>

                        <Form.Item name="noiDung" label={<span style={{ fontWeight: 600 }}>Nội dung chi tiết & Yêu cầu</span>}><Input.TextArea rows={4} placeholder="Mô tả cụ thể các bước triển khai..." style={{ borderRadius: 6 }} /></Form.Item>
                        
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="mucDoUuTien" label={<span style={{ fontWeight: 600 }}>Mức độ khẩn thiết</span>} initialValue="TRUNG_BINH">
                                    <Select style={{ borderRadius: 6 }}><Option value="THAP">Thường quy (Thấp)</Option><Option value="TRUNG_BINH">Ưu tiên xử lý (Trung bình)</Option><Option value="KHAN_CAP">🔴 Tối khẩn (Khẩn cấp)</Option></Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="trangThai" label={<span style={{ fontWeight: 600 }}>Trạng thái vận hành</span>} initialValue="CHUA_THUC_HIEN">
                                    <Select style={{ borderRadius: 6 }}><Option value="CHUA_THUC_HIEN">Chờ xử lý</Option><Option value="DANG_THUC_HIEN">Đang tiến hành</Option><Option value="HOAN_THANH">✅ Đã hoàn tất</Option><Option value="TRE_HAN">❌ Trễ hạn</Option></Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        {!editingTask && (
                            <Form.Item name="danhSachNguoiNhan" label={<span style={{ fontWeight: 600 }}>Nhân sự chịu trách nhiệm thực thi</span>} rules={[{ required: true, message: "Vui lòng chỉ định người thực hiện!" }]}>
                                <Select mode="multiple" placeholder="Tìm kiếm và thêm nhân sự..." optionFilterProp="children" style={{ borderRadius: 6 }}>
                                    {Array.isArray(employees) && employees.map(e => <Option key={e.MaTaiKhoan || e.maTaiKhoan} value={e.MaTaiKhoan || e.maTaiKhoan}>{e.HoTen || e.hoTen}</Option>)}
                                </Select>
                            </Form.Item>
                        )}

                        {/* 🌟 NÂNG CẤP: KHU VỰC KÉO THẢ TẢI FILE */}
                        <Form.Item label={<span style={{ fontWeight: 600 }}>Văn bản quy định / Tài liệu đính kèm</span>}>
                            <div 
                                style={{ padding: '24px', background: '#fafafa', border: '2px dashed #d9d9d9', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
                                onClick={() => document.getElementById("admin-file-input").click()}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = '#1890ff'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = '#d9d9d9'}
                            >
                                <input type="file" multiple id="admin-file-input" style={{ display: 'none' }} onChange={handleFileChange} />
                                <UploadOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 12 }} />
                                <div><span style={{ fontWeight: 600, color: '#1890ff' }}>Nhấp để tải lên</span> hoặc kéo thả file vào khu vực này</div>
                                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>Hỗ trợ PDF, DOCX, XLSX, JPG, PNG (Tối đa 10MB/file)</div>
                                {uploading && <div style={{ marginTop: 12, color: '#52c41a', fontWeight: 600 }}><SyncOutlined spin /> Đang đẩy tệp lên máy chủ...</div>}
                            </div>

                            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.danhSachFile !== currentValues.danhSachFile}>
                                {({ getFieldValue }) => {
                                    const currentFiles = getFieldValue("danhSachFile") || [];
                                    if (!Array.isArray(currentFiles) || currentFiles.length === 0) return null;
                                    return (
                                        <div style={{ marginTop: '16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px', padding: '12px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#52c41a' }}>Tài liệu đã đính kèm ({currentFiles.length}):</div>
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                {currentFiles.map((fileItem, index) => {
                                                    const url = typeof fileItem === 'string' ? fileItem : (fileItem.DuongDanTep || fileItem.url || "");
                                                    if (!url) return null;
                                                    const fileName = url.split('/').pop();
                                                    return (
                                                        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
                                                            <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                                                                <PaperClipOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                                                <a href={url.startsWith('http') ? url : `http://localhost:3000${url}`} target="_blank" rel="noreferrer" style={{ color: '#1890ff', fontWeight: 500 }}>{decodeURIComponent(fileName)}</a>
                                                            </span>
                                                            <Button type="link" danger size="small" style={{ padding: 0 }} onClick={(e) => {
                                                                e.stopPropagation(); // Tránh kích hoạt ô Upload
                                                                const updatedFiles = currentFiles.filter((_, i) => i !== index);
                                                                form.setFieldsValue({ danhSachFile: updatedFiles });
                                                            }}>Xóa</Button>
                                                        </div>
                                                    );
                                                })}
                                            </Space>
                                        </div>
                                    );
                                }}
                            </Form.Item>
                        </Form.Item>

                        <Form.Item name="danhSachFile" hidden><Input /></Form.Item>

                        <Row gutter={24}>
                            <Col span={12}><Form.Item name="ngayBatDau" label={<span style={{ fontWeight: 600 }}>Thời gian bắt đầu</span>}><DatePicker showTime style={{width: '100%', borderRadius: 6}} format="DD/MM/YYYY HH:mm"/></Form.Item></Col>
                            <Col span={12}><Form.Item name="hanHoanThanh" label={<span style={{ fontWeight: 600 }}>Hạn chót (Deadline)</span>}><DatePicker showTime style={{width: '100%', borderRadius: 6}} format="DD/MM/YYYY HH:mm"/></Form.Item></Col>
                        </Row>

                        {editingTask && (
                            <>
                                <Divider orientation="left" style={{ margin: "32px 0 16px 0", borderColor: '#d9d9d9' }}>
                                    <span style={{ color: "#002766", fontWeight: 600, fontSize: 14 }}><HistoryOutlined /> NHẬT KÝ BÁO CÁO TỪ NHÂN VIÊN</span>
                                </Divider>
                                <Table 
                                    dataSource={taskReports} 
                                    columns={reportColumns} 
                                    rowKey={(record) => record.MaBaoCao || record.maBaoCao} 
                                    size="small" 
                                    loading={loadingReports}
                                    pagination={{ pageSize: 3 }}
                                    locale={{ emptyText: "Chưa có báo cáo tiến độ nào được gửi lên." }}
                                    style={{ marginBottom: "24px", border: "1px solid #f0f0f0", borderRadius: "8px", overflow: 'hidden' }}
                                />
                            </>
                        )}

                        <Form.Item style={{ textAlign: "right", marginBottom: 0, marginTop: 24 }}>
                            <Space size="middle">
                                <Button size="large" onClick={() => { setIsModalVisible(false); setEditingTask(null); setTaskReports([]); form.resetFields(); }} style={{ borderRadius: 8 }}>Hủy bỏ</Button>
                                <Button size="large" type="primary" htmlType="submit" style={{ backgroundColor: '#0050b3', borderRadius: 8, fontWeight: 600 }}>{editingTask ? 'Cập nhật Hệ thống' : 'Lưu & Phát hành Chỉ thị'}</Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </Card>

            {/* DRAWER THEO DÕI TIẾN ĐỘ */}
            <Drawer
                title={
                    <span style={{ color: '#002766', fontWeight: 700, fontSize: 16 }}>
                        BÁO CÁO TIẾN ĐỘ - {currentReportTask ? `CV-${currentReportTask.MaCongViec || currentReportTask.maCongViec}` : ''}
                    </span>
                }
                width={800} 
                placement="right"
                onClose={() => {
                    setReportDrawerVisible(false);
                    fetchTasksAndEmployees();
                }}
                open={reportDrawerVisible}
                destroyOnClose
            >
                {currentReportTask && (
                    <TaskReportManager 
                        taskId={currentReportTask.MaCongViec || currentReportTask.maCongViec} 
                        taskName={currentReportTask.TieuDe || currentReportTask.tieuDe} 
                    />
                )}
            </Drawer>
        </div>
    );
};

export default TaskManager;