/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { 
    Table, Button, Modal, Form, Input, Select, DatePicker,
    message, Space, Typography, Tag, Spin, Popconfirm, Card, Row, Col, Statistic, Upload, InputNumber, Slider 
} from "antd";
import { 
    PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined,
    CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, 
    CloseCircleOutlined, ProjectOutlined, CalendarOutlined, ExclamationCircleOutlined,
    FormOutlined, UploadOutlined, PaperClipOutlined, HistoryOutlined
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from 'dayjs/plugin/isBetween';
import api from "../../services/axios";

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const UserTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State Bộ lọc
    const [monthFilter, setMonthFilter] = useState(dayjs()); // Lọc Dashboard theo tháng
    const [searchText, setSearchText] = useState("");        // Tìm kiếm Table
    const [dateRange, setDateRange] = useState(null);        // Lọc ngày Table
    
    // --- State cho Modal Giao việc / Tạo mới (Mới + Cũ) ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();

    // --- State cho Modal Báo cáo Tiến độ (Giữ nguyên từ bản cũ) ---
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [reportFileList, setReportFileList] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportProgress, setReportProgress] = useState(0); 
    const [reportForm] = Form.useForm();

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await api.get("/tasks/my-tasks"); 
            const data = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setTasks(data);
        } catch (error) {
            console.error("Lỗi tải công việc:", error);
            message.error("Không thể tải danh sách công việc hiện tại!");
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get("/employees");
            const data = res.data?.data || res.data || [];
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Lỗi đồng bộ danh sách nhân sự:", error);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchEmployees();
    }, []);

    // 🌟 LOGIC LỌC DỮ LIỆU
    // 1. Lọc cho Dashboard (Chỉ đếm các task thuộc Tháng/Năm được chọn)
    const dashboardTasks = tasks.filter(t => {
        if (!monthFilter) return true;
        const targetDate = dayjs(t.NgayBatDau || t.ngayBatDau || t.NgayTao || t.ngayTao);
        return targetDate.month() === monthFilter.month() && targetDate.year() === monthFilter.year();
    });

    // --- Tính toán số liệu thống kê nhanh cho Card Thống Kê (Từ bản mới) ---
    const getStats = () => {
        const total = tasks.length;
        const pending = tasks.filter(t => ["CHO_THUC_HIEN", "Chờ thực hiện"].includes(t.TrangThai || t.trangThai)).length;
        const processing = tasks.filter(t => ["DANG_THUC_HIEN", "Đang thực hiện"].includes(t.TrangThai || t.trangThai)).length;
        const success = tasks.filter(t => ["THANH_CONG", "Thành công"].includes(t.TrangThai || t.trangThai)).length;
        const failed = tasks.filter(t => ["THAT_BAI", "Thất bại"].includes(t.TrangThai || t.trangThai)).length;
        return { total, pending, processing, success, failed };
    };

    //Tính đánh giá
    const calculatePerformanceScore = () => {
        let score = 0;
        tasks.forEach(t => {
            const status = String(t.TrangThai || t.trangThai).toUpperCase();
            
            if (status === 'THANH_CONG' || status === 'HOAN_THANH') {
                // Nếu hoàn thành, kiểm tra ngày hoàn thành so với hạn chót
                const endDate = dayjs(t.HanHoanThanh || t.hanHoanThanh);
                const finishDate = t.NgayHoanThanh || t.ngayHoanThanh ? dayjs(t.NgayHoanThanh || t.ngayHoanThanh) : dayjs();
                
                // Nếu hoàn thành TRƯỚC hoặc ĐÚNG hạn -> CỘNG 1 SAO
                if (finishDate.isBefore(endDate) || finishDate.isSame(endDate, 'day')) {
                    score += 1;
                } else {
                    // Nếu hoàn thành nhưng TRỄ HẠN -> TRỪ 1 SAO
                    score -= 1;
                }
            } else if (status === 'THAT_BAI' || status === 'TRE_HAN') {
                // Nếu bị hệ thống quét thất bại -> TRỪ 1 SAO
                score -= 1;
            }
        });
        return score;
    };

    const performanceScore = calculatePerformanceScore();

    // 2. Lọc cho Bảng (Theo Text tìm kiếm và Khoảng ngày)
    const tableTasks = tasks.filter(t => {
        const titleMatch = (t.TieuDe || t.tieuDe || "").toLowerCase().includes(searchText.toLowerCase());
        let dateMatch = true;
        if (dateRange && dateRange.length === 2) {
            const taskDate = dayjs(t.NgayBatDau || t.ngayBatDau);
            dateMatch = taskDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
        }
        return titleMatch && dateMatch;
    });

    const stats = getStats();

    // ==========================================
    // 1. XỬ LÝ TẠO/SỬA CÔNG VIỆC MỚI (ĐÃ CẬP NHẬT GỬI FILE QUA FORMDATA)
    // ==========================================
    const handleAddNew = () => {
        setIsEditMode(false);
        setEditingId(null);
        setIsCreateModalOpen(true);
        setTimeout(() => {
            form.resetFields();
            setFileList([]);
            form.setFieldsValue({
                trangThai: "CHO_THUC_HIEN",
                mucDoUuTien: "BINH_THUONG",
                ngayBatDau: dayjs(),
                hanHoanThanh: dayjs().add(3, 'day')
            });
        }, 0);
    };

    const handleEdit = (record) => {
        setIsEditMode(true);
        setEditingId(record.MaCongViec || record.maCongViec);
        setIsCreateModalOpen(true);
        setFileList([]);
        
        let statusKey = record.TrangThai || record.trangThai || "CHO_THUC_HIEN";
        if (statusKey === "Chờ thực hiện") statusKey = "CHO_THUC_HIEN";
        if (statusKey === "Đang thực hiện") statusKey = "DANG_THUC_HIEN";
        if (statusKey === "Thành công") statusKey = "THANH_CONG";
        if (statusKey === "Thất bại") statusKey = "THAT_BAI";

        setTimeout(() => {
            form.setFieldsValue({
                tieuDe: record.TieuDe || record.tieuDe,
                noiDung: record.NoiDung || record.noiDung,
                mucDoUuTien: record.MucDoUuTien || record.mucDoUuTien || "BINH_THUONG",
                trangThai: statusKey,
                danhSachNguoiNhan: record.DanhSachNguoiNhan || [], 
                ngayBatDau: record.NgayBatDau || record.ngayBatDau ? dayjs(record.NgayBatDau || record.ngayBatDau) : null,
                hanHoanThanh: record.HanHoanThanh || record.hanHoanThanh ? dayjs(record.HanHoanThanh || record.hanHoanThanh) : null,
            });
        }, 0);
    };

    const handleCreateSubmit = async (values) => {
        setSubmitLoading(true);
        try {
            const formData = new FormData();
            formData.append("tieuDe", values.tieuDe || "");
            formData.append("noiDung", values.noiDung || "");
            formData.append("mucDoUuTien", values.mucDoUuTien || "BINH_THUONG");
            formData.append("trangThai", values.trangThai || "CHO_THUC_HIEN");
            
            const startDate = values.ngayBatDau ? values.ngayBatDau.format("YYYY-MM-DD HH:mm:ss") : dayjs().format("YYYY-MM-DD HH:mm:ss");
            formData.append("ngayBatDau", startDate);
            
            if (values.hanHoanThanh) {
                formData.append("hanHoanThanh", values.hanHoanThanh.format("YYYY-MM-DD HH:mm:ss"));
            }

            // Gắn mảng người nhận
            if (values.danhSachNguoiNhan && values.danhSachNguoiNhan.length > 0) {
                values.danhSachNguoiNhan.forEach(id => {
                    formData.append("danhSachNguoiNhan", id);
                });
            }

            // Gắn danh sách file
            if (fileList && fileList.length > 0) {
                fileList.forEach(file => {
                    if (!file.url) { // Chỉ tải lên file mới chọn từ thiết bị
                        formData.append("files", file.originFileObj || file);
                    }
                });
            }

            // Không cần cấu hình header, để Axios tự sinh Boundary
            if (isEditMode) {
                await api.put(`/tasks/${editingId}`, formData);
                message.success("Cập nhật trạng thái và nội dung công việc thành công!");
            } else {
                await api.post("/tasks", formData);
                message.success("Phát hành và giao chỉ thị tác vụ thành công!");
            }
            
            setIsCreateModalOpen(false);
            form.resetFields();
            setFileList([]);
            fetchTasks(); 
        } catch (error) {
            const backendError = error.response?.data?.message || "Lỗi hệ thống khi lưu công việc!";
            message.error(backendError);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/tasks/${id}`);
            message.success("Đã xóa công việc khỏi danh sách chuyên môn!");
            fetchTasks();
        } catch (error) {
            message.error("Lỗi khi xóa dữ liệu công việc.");
        }
    };

    // ==========================================
    // 2. XỬ LÝ NỘP BÁO CÁO TIẾN ĐỘ (ĐÃ CẬP NHẬT GỬI FILE QUA FORMDATA)
    // ==========================================
    const openReportModal = (record) => {
        setCurrentTask(record);
        reportForm.resetFields();
        const initVal = record.TyLeHoanThanh || record.tyLeHoanThanh || 0;
        setReportProgress(initVal); 
        
        reportForm.setFieldsValue({
            tyLeHoanThanh: initVal
        });
        setReportFileList([]);
        setIsReportModalOpen(true);
    };

    const handleSubmitReport = async (values) => {
        setReportLoading(true);
        try {
            const formData = new FormData();
            formData.append("noiDungBaoCao", values.noiDungBaoCao || "");
            formData.append("tyLeHoanThanh", values.tyLeHoanThanh || 0);

            // Gắn mảng file báo cáo
            if (reportFileList && reportFileList.length > 0) {
                reportFileList.forEach(file => {
                    if (!file.url) { 
                        formData.append("files", file.originFileObj || file);
                    }
                });
            }

            const taskId = currentTask.MaCongViec || currentTask.maCongViec;

            // Đẩy thẳng lên API addReport (Vì route đã đón file qua multer upload.array)
            await api.post(`/task-reports/${taskId}`, formData);
            
            message.success("Hệ thống đã ghi nhận báo cáo và cập nhật tiến độ!");
            setIsReportModalOpen(false);
            reportForm.resetFields();
            setReportFileList([]);
            fetchTasks(); 
        } catch (error) {
            const backendError = error.response?.data?.message || "Gửi báo cáo thất bại, vui lòng kiểm tra kết nối mạng!";
            message.error(backendError);
        } finally {
            setReportLoading(false);
        }
    };

    const getUploadProps = (list, setList) => ({
        onRemove: (file) => {
            setList(list.filter(item => item.uid !== file.uid));
        },
        beforeUpload: (file) => {
            setList([...list, file]);
            return false; 
        },
        fileList: list,
        multiple: true,
    });

    const columns = [
        { 
            title: "Mã CV", width: 90, align: "center", 
            render: (_, r) => <b>CV-{r.MaCongViec || r.maCongViec}</b> 
        },
        { 
            title: "Tiêu đề công việc", 
            key: "TieuDe",
            render: (_, r) => (
                <div>
                    <Text strong style={{ color: '#0050b3' }}>{r.TieuDe || r.tieuDe}</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>
                        {r.NoiDung || r.noiDung || "Không có mô tả chi tiết"}
                    </div>
                </div>
            )
        },
        { 
            title: "Người phân công", 
            width: 160,
            render: (_, r) => r.NguoiGiaoViec || r.nguoiGiaoViec || r.NguoiTaoTen || r.nguoiTaoTen || "Ban Quản Trị" 
        },
        { 
            title: "Mức độ", width: 120, align: "center",
            render: (_, r) => {
                const priority = String(r.MucDoUuTien || r.mucDoUuTien || "").toUpperCase();
                if (priority === "CAO" || priority === "KHAN_CAP") return <Tag color="volcano" style={{ fontWeight: 600 }}>Cao</Tag>;
                if (priority === "THAP") return <Tag color="green" style={{ fontWeight: 600 }}>Thấp</Tag>;
                return <Tag color="blue" style={{ fontWeight: 600 }}>Bình thường</Tag>;
            }
        },
        { 
            title: "Thời hạn quy định", width: 220,
            render: (_, record) => {
                // 🌟 ĐÃ FIX: Nếu không có ngày bắt đầu, lấy mặc định là ngày Tạo công việc
                const start = record.NgayBatDau || record.ngayBatDau || record.NgayTao || record.ngayTao;
                const end = record.HanHoanThanh || record.hanHoanThanh;
                return (
                    <div style={{ fontSize: '13px' }}>
                        <div><CalendarOutlined style={{ color: '#52c41a', marginRight: 4 }} /> Bắt đầu: {start ? dayjs(start).format("DD/MM/YYYY") : "Chưa xác định"}</div>
                        <div style={{ marginTop: 2 }}><ClockCircleOutlined style={{ color: '#f5222d', marginRight: 4 }} /> Hạn cuối: {end ? dayjs(end).format("DD/MM/YYYY") : "Không có hạn"}</div>
                    </div>
                );
            } 
        },
        { 
            title: "Tiến độ", align: "center", width: 100,
            render: (_, r) => {
                const progress = r.TyLeHoanThanh || r.tyLeHoanThanh || 0;
                return <Tag color={Number(progress) === 100 ? "success" : "processing"} style={{ fontWeight: 700, borderRadius: 4 }}>{progress}%</Tag>;
            }
        },
        {
            title: "Trạng thái", align: "center", width: 140,
            render: (_, r) => {
                const statusStr = String(r.TrangThai || r.trangThai || "").toUpperCase();
                if (statusStr.includes("THANH_CONG") || statusStr.includes("HOAN_THANH")) return <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '2px 8px' }}>Thành công</Tag>;
                if (statusStr.includes("THAT_BAI") || statusStr.includes("TRE_HAN")) return <Tag color="error" icon={<CloseCircleOutlined />} style={{ padding: '2px 8px' }}>Thất bại</Tag>;
                if (statusStr.includes("DANG_THUC_HIEN") || statusStr.includes("DANG_LAM")) return <Tag color="processing" icon={<SyncOutlined spin />} style={{ padding: '2px 8px' }}>Đang tiến hành</Tag>;
                return <Tag color="default" icon={<ClockCircleOutlined />} style={{ padding: '2px 8px' }}>Chờ thực hiện</Tag>;
            }
        },
        {
            title: "Hành động & Điều phối", align: "center", width: 220,
            render: (_, record) => {
                const taskId = record.MaCongViec || record.maCongViec;
                return (
                    <Space size="small" direction="vertical" style={{ width: '100%' }}>
                        <Space>
                            <Button type="primary" size="small" icon={<FormOutlined />} onClick={() => openReportModal(record)} style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 4, fontWeight: 500 }}>
                                Báo cáo
                            </Button>
                            <Link to={`/user/tasks/${taskId}/reports`}>
                                <Button size="small" icon={<HistoryOutlined />} style={{ color: '#1890ff', borderColor: '#1890ff', borderRadius: 4, fontWeight: 500 }}>
                                    Nhật ký
                                </Button>
                            </Link>
                        </Space>
                        <Space style={{ marginTop: 4 }}>
                            <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                            <Popconfirm title="Xóa bỏ công việc này?" onConfirm={() => handleDelete(taskId)} icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}>
                                <Button danger size="small" icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </Space>
                    </Space>
                );
            }
        }   
    ];

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" tip="Đang tải danh mục công việc..." /></div>;

    return (
        <div className="fade-in task-container" style={{ padding: '24px', background: '#f5f7fa', minHeight: '80vh' }}>
            
            {/* 🌟 DASHBOARD CÓ BỘ LỌC THÁNG */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} className="dashboard-header">
                <Title level={4} style={{ margin: 0, color: '#0050b3' }}>TỔNG QUAN HIỆU SUẤT</Title>
                <DatePicker 
                    picker="month" 
                    value={monthFilter} 
                    onChange={(date) => setMonthFilter(date)} 
                    format="MM/YYYY" 
                    allowClear={false}
                    size="large"
                />
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="stats-row">
                {/* 🌟 ĐÃ FIX GRID: 24/6 = 4 (Trên Desktop mỗi thẻ chiếm 4 phần) */}
                <Col xs={12} sm={12} md={8} lg={4}>
                    <Card bordered={false} className="stat-card">
                        <Statistic title="Tổng công việc" value={stats.total} valueStyle={{ color: '#1890ff', fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={4}>
                    <Card bordered={false} className="stat-card">
                        <Statistic title="Chờ thực hiện" value={stats.pending} valueStyle={{ color: '#d9d9d9', fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={4}>
                    <Card bordered={false} className="stat-card">
                        <Statistic title="Đang tiến hành" value={stats.processing} valueStyle={{ color: '#fa8c16', fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={4}>
                    <Card bordered={false} className="stat-card">
                        <Statistic title="Thành công" value={stats.success} valueStyle={{ color: '#52c41a', fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={4}>
                    <Card bordered={false} className="stat-card">
                        <Statistic title="Thất bại (Quá hạn)" value={stats.failed} valueStyle={{ color: '#f5222d', fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={8} lg={4}>
                    {/* 🌟 ĐÃ ĐỒNG BỘ: Dùng chung class "stat-card" cho thống nhất UI */}
                    <Card bordered={false} className="stat-card">
                        <Statistic 
                            title="Điểm hiệu suất" 
                            value={performanceScore > 0 ? `+${performanceScore}` : performanceScore} 
                            prefix="⭐"
                            valueStyle={{ color: performanceScore >= 0 ? '#faad14' : '#f5222d', fontWeight: 800 }} 
                        />
                    </Card>
                </Col>
            </Row>

            {/* 🌟 BẢNG DANH SÁCH CÓ THANH TÌM KIẾM */}
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }} className="filter-group">
                        <Input 
                            placeholder="Tìm kiếm tiêu đề..." 
                            prefix={<SearchOutlined />} 
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 250, borderRadius: 6 }} 
                            size="large"
                        />
                        <RangePicker 
                            format="DD/MM/YYYY" 
                            onChange={(dates) => setDateRange(dates)} 
                            size="large" 
                            style={{ borderRadius: 6 }}
                        />
                    </div>
                    
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAddNew} style={{ backgroundColor: '#1890ff', borderRadius: 6, fontWeight: 500 }}>
                        Thêm Công Việc Mới
                    </Button>
                </div>

                {/* Chú ý: dataSource đổi từ 'tasks' thành 'tableTasks' */}
                <Table 
                    dataSource={tableTasks} 
                    columns={columns} 
                    rowKey={(record) => record.MaCongViec || record.maCongViec} 
                    bordered 
                    pagination={{ pageSize: 7 }} 
                    scroll={{ x: 1000 }} // Hỗ trợ trượt ngang trên mobile
                />
            </Card>

            {/* --- MODAL TẠO MỚI / SỬA (Kết hợp Cũ + Mới) --- */}
            <Modal 
                title={<span style={{ color: '#1890ff', fontWeight: 700, fontSize: 16 }}>{isEditMode ? "CẬP NHẬT CÔNG VIỆC" : "PHÁT HÀNH CHỈ THỊ & PHÂN CÔNG"}</span>} 
                open={isCreateModalOpen} 
                onCancel={() => { setIsCreateModalOpen(false); setFileList([]); form.resetFields(); }} 
                onOk={() => form.submit()}
                confirmLoading={submitLoading}
                width={750}
                destroyOnClose
                okText={isEditMode ? "Lưu thay đổi" : "Phát hành chỉ thị"}
                cancelText="Hủy bỏ"
                okButtonProps={{ style: { borderRadius: 4 } }}
                cancelButtonProps={{ style: { borderRadius: 4 } }}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateSubmit} style={{ marginTop: 20 }}>
                    <Form.Item name="tieuDe" label={<Text strong>Tiêu đề chỉ thị tác vụ</Text>} rules={[{ required: true, message: "Vui lòng nhập tiêu đề chỉ thị ngắn gọn!" }]}>
                        <Input placeholder="VD: Khắc phục sự cố trục trặc cổng kết nối dữ liệu API hệ thống..." style={{ borderRadius: 4 }} size="large" />
                    </Form.Item>
                    
                    <Row gutter={24}>
                        <Col span={24}>
                            <Form.Item name="danhSachNguoiNhan" label={<Text strong>Nhân sự phối hợp thực hiện</Text>} rules={[{ required: true, message: "Vui lòng chỉ định ít nhất 1 nhân sự xử lý!" }]}>
                                <Select mode="multiple" placeholder="Chọn các kỹ sư/nhân sự tham gia..." allowClear showSearch optionFilterProp="children" size="large" style={{ borderRadius: 4 }}>
                                    {employees.map(emp => (
                                        <Option key={emp.MaTaiKhoan || emp.maTaiKhoan} value={emp.MaTaiKhoan || emp.maTaiKhoan}>
                                            {emp.HoTen || emp.hoTen}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="mucDoUuTien" label={<Text strong>Mức độ ưu tiên</Text>} initialValue="BINH_THUONG">
                                <Select size="large" style={{ borderRadius: 4 }}>
                                    <Option value="THAP">🟢 Thấp (Xử lý tuần tự)</Option>
                                    <Option value="BINH_THUONG">🔵 Bình thường</Option>
                                    <Option value="CAO">🔴 Cao / Khẩn cấp</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            {/* 🌟 ĐÃ MANG LÊN TỪ BẢN MỚI: Ô Trạng Thái Đồng Bộ */}
                            <Form.Item name="trangThai" label={<Text strong>Trạng thái hiện tại</Text>} rules={[{ required: true }]}>
                                <Select size="large">
                                    <Option value="CHO_THUC_HIEN">⚪ Chờ thực hiện</Option>
                                    <Option value="DANG_THUC_HIEN">🔵 Đang thực hiện</Option>
                                    <Option value="THANH_CONG">🟢 Thành công</Option>
                                    <Option value="THAT_BAI">🔴 Thất bại</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="ngayBatDau" label={<Text strong>Thời gian bắt đầu</Text>}>
                                <DatePicker showTime style={{ width: '100%', borderRadius: 4 }} format="DD/MM/YYYY HH:mm" size="large" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="hanHoanThanh" label={<Text strong>Hạn chót hoàn thành (Deadline)</Text>} rules={[{ required: true, message: "Vui lòng thiết lập hạn chót!" }]}>
                                <DatePicker showTime style={{ width: '100%', borderRadius: 4 }} format="DD/MM/YYYY HH:mm" size="large" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="noiDung" label={<Text strong>Mô tả nội dung chi tiết / Chỉ đạo thực hiện</Text>}>
                        <TextArea rows={4} placeholder="Nhập các bước triển khai chi tiết, ghi chú chỉ tiêu chất lượng bệnh viện..." style={{ borderRadius: 4 }} />
                    </Form.Item>

                    <Form.Item label={<Text strong>Tài liệu/Biểu mẫu đính kèm đi kèm chỉ thị</Text>}>
                        <Upload {...getUploadProps(fileList, setFileList)}>
                            <Button icon={<UploadOutlined />} style={{ borderRadius: 4 }}>Tải file đính kèm từ thiết bị</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            {/* --- MODAL NỘP BÁO CÁO TIẾN ĐỘ --- */}
            <Modal
                title={<span style={{ color: '#52c41a', fontWeight: 700, fontSize: 16 }}>📝 CẬP NHẬT TIẾN ĐỘ & BÁO CÁO KẾT QUẢ TÁC VỤ</span>}
                open={isReportModalOpen}
                onCancel={() => setIsReportModalOpen(false)}
                onOk={() => reportForm.submit()}
                confirmLoading={reportLoading}
                okText="Gửi báo cáo"
                cancelText="Hủy bỏ"
                destroyOnClose
                okButtonProps={{ style: { borderRadius: 4, background: '#52c41a', borderColor: '#52c41a' } }}
                cancelButtonProps={{ style: { borderRadius: 4 } }}
            >
                <Form form={reportForm} layout="vertical" onFinish={handleSubmitReport} style={{ marginTop: 20 }}>
                    <Form.Item 
                        name="tyLeHoanThanh" 
                        label={<Text strong>Tỷ lệ hoàn thành đạt được hiện tại (%)</Text>}
                        rules={[{ required: true, message: "Vui lòng thiết lập phần trăm kết quả!" }]}
                    >
                        <Row align="middle" gutter={16}>
                            <Col span={16}>
                                <Slider 
                                    min={0} 
                                    max={100} 
                                    step={5}
                                    value={reportProgress} 
                                    onChange={(val) => {
                                        setReportProgress(val);
                                        reportForm.setFieldsValue({ tyLeHoanThanh: val });
                                    }} 
                                    marks={{ 0: '0%', 50: '50%', 100: '100%' }} 
                                />
                            </Col>
                            <Col span={8}>
                                <InputNumber 
                                    min={0} 
                                    max={100} 
                                    style={{ width: '100%', borderRadius: 4 }} 
                                    value={reportProgress} 
                                    onChange={(val) => {
                                        const num = Number(val);
                                        setReportProgress(num);
                                        reportForm.setFieldsValue({ tyLeHoanThanh: num });
                                    }} 
                                    addonAfter="%"
                                />
                            </Col>
                        </Row>
                    </Form.Item>

                    <Form.Item 
                        name="noiDungBaoCao" 
                        label={<Text strong>Nội dung báo cáo chi tiết / Khó khăn vướng mắc phát sinh</Text>} 
                        rules={[{ required: true, message: "Vui lòng nhập nội dung mô tả khối lượng công việc!" }]}
                    >
                        <TextArea rows={4} placeholder="Ví dụ: Đã xử lý xong dữ liệu thô tầng DB, đang cấu hình viết API kiểm thử đầu cuối..." style={{ borderRadius: 4 }} />
                    </Form.Item>

                    <Form.Item label={<Text strong>Tệp minh chứng sản phẩm đính kèm (Hình ảnh kết quả, file code, nén zip...)</Text>}>
                        <Upload {...getUploadProps(reportFileList, setReportFileList)}>
                            <Button icon={<PaperClipOutlined />} style={{ borderRadius: 4 }}>Chọn tài liệu minh chứng từ thiết bị</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserTasks;