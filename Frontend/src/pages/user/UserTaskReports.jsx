/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import { 
    Table, Button, Modal, Form, Input, InputNumber, message, Tag, Slider, 
    Row, Col, Space, Tabs, Upload, Breadcrumb, Card, Avatar, Typography 
} from "antd";
import { 
    PlusOutlined, SendOutlined, PaperClipOutlined, MessageOutlined, 
    UploadOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined, 
    SyncOutlined, ExclamationCircleOutlined, HistoryOutlined
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../services/axios";

const { TextArea } = Input;
const { Title, Text } = Typography;

const UserTaskReports = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const chatContainerRef = useRef(null);

    const [taskInfo, setTaskInfo] = useState(null);
    const [reports, setReports] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // State Modal & Nộp Báo cáo
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [sliderValue, setSliderValue] = useState(0);
    const [uploadingReport, setUploadingReport] = useState(false);
    const [fileList, setFileList] = useState([]); // 🌟 ĐÃ FIX: Chứa file trực tiếp
    const [isSending, setIsSending] = useState(false);

    const [formReport] = Form.useForm();
    const [formComment] = Form.useForm();

    const fetchAllData = async () => {
        if (!taskId) return;
        setLoading(true);
        try {
            const [taskRes, repRes, comRes] = await Promise.all([
                api.get(`/tasks/${taskId}`).catch(() => ({ data: { data: null } })), 
                api.get(`/task-reports/${taskId}`),
                api.get(`/task-comments/${taskId}`)
            ]);
            
            setTaskInfo(taskRes.data?.data || taskRes.data);
            setReports(Array.isArray(repRes.data?.data) ? repRes.data.data : (Array.isArray(repRes.data) ? repRes.data : []));
            setComments(Array.isArray(comRes.data?.data) ? comRes.data.data : (Array.isArray(comRes.data) ? comRes.data : []));
            
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 100);
        } catch (err) {
            message.error("Lỗi kết nối server khi tải dữ liệu!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchAllData(); 
    }, [taskId, refreshKey]);

    // ==========================================
    // 1. XỬ LÝ NỘP BÁO CÁO TIẾN ĐỘ (ĐÃ GỘP FORMDATA)
    // ==========================================
    const handleSaveReport = async (values) => {
        setUploadingReport(true);
        try {
            // Đóng gói chung text và file đính kèm
            const formData = new FormData();
            formData.append("noiDungBaoCao", values.noiDungBaoCao || "");
            formData.append("tyLeHoanThanh", values.tyLeHoanThanh || 0);

            if (fileList && fileList.length > 0) {
                fileList.forEach(file => {
                    formData.append("files", file.originFileObj || file);
                });
            }

            // Gửi thẳng qua API chính (Không gọi /multi-files nữa)
            await api.post(`/task-reports/${taskId}`, formData);
            
            message.success("Hệ thống đã ghi nhận báo cáo thành công!");
            setIsModalVisible(false);
            formReport.resetFields();
            setFileList([]);
            setSliderValue(0);
            setRefreshKey(prev => prev + 1);
        } catch (error) { 
            const backendError = error.response?.data?.message || "Gửi báo cáo thất bại!";
            message.error(backendError); 
        } finally {
            setUploadingReport(false);
        }
    };

    const getUploadProps = () => ({
        onRemove: (file) => {
            setFileList(prev => prev.filter(item => item.uid !== file.uid));
        },
        beforeUpload: (file) => {
            setFileList(prev => [...prev, file]);
            return false; // Ngăn chặn tự động upload của antd
        },
        fileList: fileList,
        multiple: true,
    });

    // ==========================================
    // 2. XỬ LÝ THẢO LUẬN
    // ==========================================
    const handleSendComment = async () => {
        const noiDung = formComment.getFieldValue("noiDung")?.trim();
        if (!noiDung) return message.warning("Vui lòng nhập nội dung!");

        setIsSending(true);
        try {
            await api.post(`/task-comments/${taskId}`, { noiDung });
            formComment.resetFields();
            setRefreshKey(prev => prev + 1);
        } catch (err) { 
            message.error("Gửi bình luận thất bại!"); 
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/task-comments/${commentId}`);
            message.success("Đã xóa bình luận!");
            setRefreshKey(prev => prev + 1);
        } catch (err) { 
            message.error("Không thể xóa bình luận này!"); 
        }
    };

    // ==========================================
    // RENDER: GIAO DIỆN BẢNG VÀ CHAT
    // ==========================================
    const renderStatusTag = (statusStr) => {
        if (!statusStr) return <Tag color="default" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
        const s = statusStr.toUpperCase();
        if (s.includes("THANH_CONG") || s.includes("HOAN_THANH")) return <Tag color="success" icon={<CheckCircleOutlined />}>Thành công</Tag>;
        if (s.includes("THAT_BAI") || s.includes("TRE_HAN")) return <Tag color="error" icon={<ExclamationCircleOutlined />}>Thất bại</Tag>;
        if (s.includes("DANG_THUC_HIEN") || s.includes("DANG_LAM")) return <Tag color="processing" icon={<SyncOutlined spin />}>Đang tiến hành</Tag>;
        return <Tag color="default" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
    };

    const columns = [
        { title: "Thời gian", dataIndex: "NgayBaoCao", width: 140, render: (d) => dayjs(d).format("DD/MM/YYYY HH:mm") },
        { title: "Người nộp", dataIndex: "NguoiBaoCao", width: 160, render: (text) => <span style={{ fontWeight: 600, color: '#0050b3' }}>{text || "Nhân sự"}</span> },
        { 
            title: "Tiến độ", dataIndex: "TyLeHoanThanh", width: 100, align: 'center',
            render: (t) => <Tag color={Number(t) === 100 ? "green" : "blue"} style={{ fontWeight: 700, borderRadius: 4 }}>{t}%</Tag>
        },
        { title: "Nội dung báo cáo", dataIndex: "NoiDungBaoCao" },
        {
            title: "Minh chứng đính kèm", width: 220,
            render: (_, r) => {
                let files = r.TepDinhKem || r.TepDinhKemCongViec || r.DanhSachFile || [];
                
                // Cố gắng chuyển đổi nếu đang ở dạng chuỗi JSON
                if (typeof files === 'string') {
                    try { files = JSON.parse(files); } catch (e) { files = []; }
                }

                if (Array.isArray(files) && files.length > 0) {
                    return (
                        <Space direction="vertical" size="small">
                            {files.map((file, i) => {
                                // 🌟 ĐÃ FIX: Lấy đúng thuộc tính từ object cấu trúc mới
                                const path = file.DuongDanTep || file.duongDanTep;
                                if (!path) return null;
                                
                                const url = path.startsWith("http") ? path : `http://localhost:3000/${path.replace(/^\/+/, '')}`;
                                const fName = file.TenTep || file.tenTep || `Tai_Lieu_${i+1}`;
                                
                                return (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: '#1890ff', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <PaperClipOutlined /> {fName}
                                    </a>
                                );
                            })}
                        </Space>
                    );
                }
                return <span style={{ color: "#bfbfbf", fontStyle: "italic" }}>Không có</span>;
            }
        }
    ];

    const currentProgress = reports.length > 0 ? (reports[0].TyLeHoanThanh || reports[0].tyLeHoanThanh || 0) : 0;

    const tabItems = [
        {
            key: "1",
            label: <span><HistoryOutlined /> Lịch sử tiến độ</span>,
            children: (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => { 
                            formReport.resetFields(); 
                            setFileList([]); // Xóa file cũ trên UI
                            setSliderValue(currentProgress); 
                            formReport.setFieldsValue({ tyLeHoanThanh: currentProgress }); 
                            setIsModalVisible(true); 
                        }} style={{ backgroundColor: '#1890ff', borderRadius: 6, fontWeight: 600 }}>
                            Nộp Báo Cáo Tiến Độ
                        </Button>
                    </div>
                    <Table dataSource={reports} rowKey={(r) => r.MaBaoCao || Math.random()} columns={columns} loading={loading} pagination={{ pageSize: 5 }} bordered />
                </>
            )
        },
        {
            key: "2",
            label: <span><MessageOutlined /> Thảo luận nhóm</span>,
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: 500, background: '#f0f2f5', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
                    <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                        {(!comments || comments.length === 0) ? (
                            <div style={{ textAlign: 'center', color: '#8c8c8c', marginTop: 100 }}>
                                <MessageOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} /><br/>
                                Chưa có thảo luận nào. Hãy là người mở đầu!
                            </div>
                        ) : (
                            comments.map(c => {
                                const id = c.MaBinhLuan || c.maBinhLuan;
                                return (
                                    <div key={id} style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
                                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', marginTop: 4 }} size="large" />
                                        <div style={{ maxWidth: '80%' }}>
                                            <div style={{ marginBottom: 4 }}>
                                                <strong style={{ color: '#0050b3', marginRight: 8 }}>{c.NguoiBinhLuan || c.nguoiBinhLuan || "Nhân sự"}</strong>
                                                <small style={{ color: '#8c8c8c' }}>{dayjs(c.NgayBinhLuan || c.ngayBinhLuan).format('HH:mm DD/MM/YYYY')}</small>
                                            </div>
                                            <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '0 12px 12px 12px', border: '1px solid #e8e8e8', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#262626', fontSize: 14, lineHeight: 1.6 }}>{c.NoiDung || c.noiDung}</p>
                                            </div>
                                            <div style={{ marginTop: 4 }}>
                                                <Button type="link" danger size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => handleDeleteComment(id)}>Xóa</Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div style={{ padding: 16, background: '#fff', borderTop: '1px solid #e8e8e8' }}>
                        <Form form={formComment} onFinish={handleSendComment} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <Form.Item name="noiDung" style={{ margin: 0, flex: 1 }}>
                                <Input.TextArea 
                                    placeholder="Nhập nội dung thảo luận (Nhấn Enter để gửi, Shift+Enter để xuống dòng)..." 
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                    style={{ borderRadius: 8 }}
                                    onPressEnter={(e) => {
                                        if (!e.shiftKey) { e.preventDefault(); formComment.submit(); }
                                    }}
                                />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={isSending} style={{ height: 'auto', minHeight: 52, borderRadius: 8, padding: '0 24px' }}>
                                Gửi
                            </Button>
                        </Form>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: '24px 32px', background: '#f5f7fa', minHeight: '85vh' }} className="fade-in">
            <Breadcrumb 
                style={{ marginBottom: 20, fontSize: 15 }} 
                items={[
                    { title: <a onClick={() => navigate("/user/tasks")}>Quản lý Công việc</a> },
                    { title: `Hồ sơ CV-${taskId}` }
                ]}
            />

            <Card bordered={false} style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <Row gutter={24} align="middle">
                    <Col span={16}>
                        <Title level={3} style={{ margin: 0, color: '#002766' }}>{taskInfo?.TieuDe || taskInfo?.tieuDe || "Đang tải dữ liệu..."}</Title>
                        <Space style={{ marginTop: 12 }}>
                            {renderStatusTag(taskInfo?.TrangThai || taskInfo?.trangThai)}
                            <Text type="secondary"><UserOutlined /> Phân công bởi: <b>{taskInfo?.NguoiGiaoViec || taskInfo?.nguoiGiaoViec || taskInfo?.NguoiTaoTen || "Ban Quản Trị"}</b></Text>
                        </Space>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                        <div style={{ padding: '16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, display: 'inline-block', minWidth: 200, textAlign: 'center' }}>
                            <div style={{ color: '#595959', fontSize: 13, marginBottom: 4 }}>TIẾN ĐỘ HIỆN TẠI</div>
                            <span style={{ fontSize: 28, fontWeight: 800, color: '#52c41a' }}>{currentProgress}%</span>
                        </div>
                    </Col>
                </Row>
            </Card>

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }} styles={{ body: { padding: '20px 24px' } }}>
                <Tabs defaultActiveKey="1" size="large" items={tabItems} />
            </Card>

            {/* MODAL NỘP BÁO CÁO MỚI */}
            <Modal title={<span style={{ color: '#0050b3', fontWeight: 700 }}>LẬP BÁO CÁO TIẾN ĐỘ</span>} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} destroyOnClose width={650}>
                <Form form={formReport} layout="vertical" onFinish={handleSaveReport} style={{ marginTop: 16 }}>
                    <Form.Item label={<Text strong>Tỷ lệ hoàn thành đạt được (%)</Text>} required>
                        <Row gutter={16} align="middle">
                            <Col span={16}>
                                <Slider min={0} max={100} step={5} value={sliderValue} 
                                    onChange={(val) => { setSliderValue(val); formReport.setFieldsValue({ tyLeHoanThanh: val }); }} 
                                    marks={{ 0: '0%', 50: '50%', 100: '100%' }} 
                                />
                            </Col>
                            <Col span={8}>
                                <InputNumber min={0} max={100} style={{ width: '100%' }} value={sliderValue} 
                                    onChange={(val) => { const num = Number(val); setSliderValue(num); formReport.setFieldsValue({ tyLeHoanThanh: num }); }} addonAfter="%" 
                                />
                            </Col>
                        </Row>
                        <Form.Item name="tyLeHoanThanh" hidden><Input /></Form.Item>
                    </Form.Item>

                    <Form.Item name="noiDungBaoCao" label={<Text strong>Nội dung kết quả / Khó khăn</Text>} rules={[{ required: true, message: "Vui lòng nhập nội dung!" }]}>
                        <Input.TextArea rows={4} placeholder="Mô tả khối lượng công việc đã làm..." style={{ borderRadius: 6 }} />
                    </Form.Item>

                    {/* 🌟 ĐÃ FIX: Khu vực tải tệp trực quan, dễ quản lý hơn */}
                    <Form.Item label={<Text strong>Minh chứng đính kèm (Hình ảnh, tài liệu...)</Text>}>
                        <Upload {...getUploadProps()}>
                            <Button icon={<UploadOutlined />} style={{ borderRadius: 6 }}>Chọn file từ thiết bị</Button>
                        </Upload>
                    </Form.Item>

                    <div style={{ textAlign: "right", marginTop: 30 }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)} size="large" style={{ borderRadius: 6 }}>Hủy bỏ</Button>
                            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={uploadingReport} size="large" style={{ backgroundColor: '#0050b3', borderRadius: 6 }}>Gửi Báo Cáo</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default UserTaskReports;