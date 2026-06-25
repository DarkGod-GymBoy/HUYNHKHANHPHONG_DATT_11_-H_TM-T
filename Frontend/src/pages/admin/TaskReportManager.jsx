
import { useState, useEffect } from "react";
import { Button, Modal, Form, Input, InputNumber, message, Tag, Slider, Row, Col, Space, Alert, Tabs, Upload, Table } from "antd";
import { SendOutlined, PaperClipOutlined, MessageOutlined, UploadOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/axios";

const TaskReportManager = ({ taskId, taskName }) => {
    // ==========================================
    // 1. KHAI BÁO STATE
    // ==========================================
    const [reports, setReports] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // State cho tiến độ & Upload
    const [sliderValue, setSliderValue] = useState(0);
    const [uploadingReport, setUploadingReport] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Form
    const [formReport] = Form.useForm();
    const [formComment] = Form.useForm();

    // ==========================================
    // 2. TẢI DỮ LIỆU
    // ==========================================
    useEffect(() => { 
        let isMounted = true;

        const fetchAllData = async () => {
            if (!taskId) return;
            
            if (isMounted) setLoading(true);
            try {
                const [repRes, comRes] = await Promise.all([
                    api.get(`/task-reports/${taskId}`),
                    api.get(`/task-comments/${taskId}`)
                ]);
                
                if (isMounted) {
                    setReports(Array.isArray(repRes.data?.data) ? repRes.data.data : (Array.isArray(repRes.data) ? repRes.data : []));
                    setComments(Array.isArray(comRes.data?.data) ? comRes.data.data : (Array.isArray(comRes.data) ? comRes.data : []));
                }
            } catch (err) {
                console.error("Lỗi API:", err);
                if (isMounted) message.error("Lỗi kết nối server khi tải dữ liệu!");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAllData();

        return () => { isMounted = false; };
    }, [taskId, refreshKey]);

    // ==========================================
    // 3. XỬ LÝ BÁO CÁO TIẾN ĐỘ
    // ==========================================
    const handleSaveReport = async (values) => {
        const filesPayload = formReport.getFieldValue("danhSachFile") || [];
        const payload = { ...values, danhSachFile: Array.isArray(filesPayload) ? filesPayload : [filesPayload] };
        
        try {
            await api.post(`/task-reports/${taskId}`, payload);
            message.success("Hệ thống đã ghi nhận báo cáo thành công!");
            setIsModalVisible(false);
            formReport.resetFields();
            setSliderValue(0);
            setRefreshKey(prev => prev + 1);
        } catch (err) { 
            console.error(err);
            message.error("Gửi báo cáo tiến độ thất bại!"); 
        }
    };

    const handleReportFileUpload = async (info) => {
        const fd = new FormData();
        fd.append("files", info.file);
        setUploadingReport(true);
        try {
            const res = await api.post("/uploads/multi-files", fd, { headers: { "Content-Type": "multipart/form-data" }});
            const fileUrls = res?.data?.fileUrls || res?.fileUrls || [];
            if (Array.isArray(fileUrls) && fileUrls.length > 0) {
                const currentFiles = formReport.getFieldValue("danhSachFile") || [];
                formReport.setFieldsValue({ danhSachFile: [...currentFiles, ...fileUrls] });
                message.success("Tải tệp minh chứng kết quả thành công!");
            }
        } catch (err) { 
            console.error(err);
            message.error("Lỗi tải tệp minh chứng lên máy chủ!"); 
        } finally { 
            setUploadingReport(false); 
        }
    };

    // ==========================================
    // 4. XỬ LÝ KHÔNG GIAN BÌNH LUẬN (ĐÃ LOẠI BỎ CHỮ KÝ)
    // ==========================================
    const handleSendComment = async (values) => {
        const noiDung = values.noiDung?.trim(); 
        if (!noiDung) {
            message.warning("Vui lòng nhập nội dung trao đổi!");
            return;
        }

        setIsSending(true);
        try {
            await api.post(`/task-comments/${taskId}`, { 
                noiDung: noiDung
            });
            
            formComment.resetFields(); 
            setRefreshKey(prev => prev + 1); 
        } catch (err) { 
            console.error("Lỗi gửi thảo luận:", err);
            message.error("Gửi bình luận thất bại!"); 
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/task-comments/${commentId}`);
            message.success("Đã xóa nội dung trao đổi!");
            setRefreshKey(prev => prev + 1);
        } catch (err) { 
            console.error(err);
            message.error("Không thể xóa bình luận này!"); 
        }
    };

    // ==========================================
    // 5. CẤU HÌNH CỘT CHO BẢNG BÁO CÁO TIẾN ĐỘ
    // ==========================================
    const columns = [
        { title: "Ngày nộp", dataIndex: "NgayBaoCao", width: 140, render: (d) => dayjs(d).format("DD/MM/YYYY HH:mm") },
        { title: "Nội dung kết quả / Khó khăn", dataIndex: "NoiDungBaoCao" },
        { 
            title: "Tiến độ", dataIndex: "TyLeHoanThanh", width: 100, align: "center",
            render: (t) => {
                let color = Number(t) === 100 ? "green" : (Number(t) === 0 ? "default" : "blue");
                return <Tag color={color} style={{ fontWeight: 600 }}>{t}%</Tag>;
            }
        },
        { title: "Nhân sự báo cáo", dataIndex: "NguoiBaoCao", width: 140, render: (text) => <span style={{ fontWeight: 500 }}>{text || "Nhân sự"}</span> },
        {
            title: "Minh chứng", width: 160,
            render: (_, repRecord) => {
                const danhSachTep = repRecord.TepDinhKem || repRecord.TepMinhChung || repRecord.danhSachFile;

                if (Array.isArray(danhSachTep) && danhSachTep.length > 0) {
                    return (
                        <Space direction="vertical" size="small">
                            {danhSachTep.map((file, i) => {
                                const filePath = file.DuongDanTep || file.url || (typeof file === 'string' ? file : "");
                                if (!filePath) return null;
                                
                                const fName = file.TenTep || filePath.split("/").pop() || `File_${i+1}`;
                                const url = filePath.startsWith("http") ? filePath : `http://localhost:3000${filePath}`;
                                
                                return (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: '#1890ff', fontWeight: 500 }}>
                                        <PaperClipOutlined /> {decodeURIComponent(fName)}
                                    </a>
                                );
                            })}
                        </Space>
                    );
                }

                const chuoiFile = repRecord.DuongDanTep || repRecord.TepMinhChung;
                if (typeof chuoiFile === 'string' && chuoiFile.trim() !== "") {
                    const fileList = chuoiFile.split(',').map(item => item.trim()).filter(item => item !== "");
                    return (
                        <Space direction="vertical" size="small">
                            {fileList.map((filePath, i) => {
                                const fName = filePath.split("/").pop();
                                const url = filePath.startsWith("http") ? filePath : `http://localhost:3000${filePath}`;
                                return (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: '#1890ff', fontWeight: 500 }}>
                                        <PaperClipOutlined /> {decodeURIComponent(fName)}
                                    </a>
                                );
                            })}
                        </Space>
                    );
                }

                return <span style={{ color: "#bfbfbf", fontSize: "12px", fontStyle: "italic" }}>Không kèm tệp</span>;
            }
        }
    ];

    // ==========================================
    // 6. GIAO DIỆN (RENDER)
    // ==========================================
    return (
        <div>
            <Tabs defaultActiveKey="1" size="large">
                {/* --- TAB 1: LỊCH SỬ TIẾN ĐỘ --- */}
                <Tabs.TabPane tab={<span><PlusOutlined /> Nhật ký tiến độ</span>} key="1">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            onClick={() => { 
                                formReport.resetFields(); 
                                setSliderValue(0); 
                                formReport.setFieldsValue({ tyLeHoanThanh: 0, danhSachFile: [] }); 
                                setIsModalVisible(true); 
                            }} 
                            style={{ backgroundColor: '#0050b3', borderRadius: 6, fontWeight: 500 }}
                        >
                            Cập Nhật Tiến Độ Mới
                        </Button>
                    </div>
                    <Table 
                        dataSource={reports} 
                        rowKey="MaBaoCao" 
                        columns={columns} 
                        loading={loading} 
                        size="small" 
                        pagination={{ pageSize: 5 }} 
                        locale={{ emptyText: "Chưa có báo cáo tiến độ nào được ghi nhận." }} 
                    />
                </Tabs.TabPane>

                {/* --- TAB 2: THẢO LUẬN CÔNG VIỆC --- */}
                <Tabs.TabPane tab={<span><MessageOutlined /> Không gian trao đổi</span>} key="2">
                    {/* Khu vực hiển thị danh sách bình luận */}
                    <div style={{ height: 350, overflowY: 'auto', marginBottom: 15, padding: '16px', background: '#f5f5f5', borderRadius: 8, border: '1px solid #e8e8e8' }}>
                        {(!comments || comments.length === 0) ? (
                            <div style={{ textAlign: 'center', color: '#8c8c8c', marginTop: 50 }}>Chưa có nội dung trao đổi nội bộ nào.</div>
                        ) : (
                            Array.isArray(comments) && comments.map(c => (
                                <div key={c.MaBinhLuan} style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                                    <div style={{ marginTop: 4 }}>
                                        <UserOutlined style={{ fontSize: 20, padding: 8, background: '#1890ff', color: '#fff', borderRadius: '50%' }} />
                                    </div>
                                    <div style={{ flex: 1, background: '#fff', padding: 12, borderRadius: '0 8px 8px 8px', border: '1px solid #e8e8e8' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <strong style={{ color: '#0050b3' }}>{c.NguoiBinhLuan}</strong> 
                                            <small style={{ color: '#8c8c8c' }}>{dayjs(c.NgayBinhLuan).format('HH:mm DD/MM/YYYY')}</small>
                                        </div>
                                        <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap', color: '#262626' }}>{c.NoiDung}</p>
                                        <div style={{ textAlign: 'right', marginTop: -4 }}>
                                            <Button type="link" danger size="small" style={{ padding: 0 }} onClick={() => handleDeleteComment(c.MaBinhLuan)}>Xóa</Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Form gửi bình luận (Đã loại bỏ chức năng chữ ký số) */}
                    <Form form={formComment} onFinish={handleSendComment} layout="vertical" style={{ background: '#fff', padding: 15, borderRadius: 8, border: '1px solid #e8e8e8' }}>
                        <Form.Item name="noiDung" rules={[{required: true, message: "Vui lòng nhập nội dung phản hồi!"}]} style={{ marginBottom: 12 }}>
                            <Input.TextArea 
                                placeholder="Nhập nội dung trao đổi (Nhấn Enter để gửi đi, Shift+Enter để xuống dòng)..." 
                                rows={2} 
                                style={{ borderRadius: 6 }}
                                onPressEnter={(e) => {
                                    if (!e.shiftKey) {
                                        e.preventDefault();
                                        formComment.submit(); 
                                    }
                                }}
                            />
                        </Form.Item>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={isSending} style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', borderRadius: 6, fontWeight: 500 }}>
                                Gửi ý kiến trao đổi
                            </Button>
                        </div>
                    </Form>
                </Tabs.TabPane>
            </Tabs>

            {/* --- MODAL: BÁO CÁO TIẾN ĐỘ ĐÃ SỬA LỖI SLIDER --- */}
            <Modal 
                title={<span style={{ color: '#0050b3', fontWeight: 600 }}>LẬP BÁO CÁO CẬP NHẬT TIẾN ĐỘ</span>} 
                open={isModalVisible} 
                onCancel={() => setIsModalVisible(false)} 
                footer={null} 
                destroyOnClose 
                width={600}
            >
                <Alert
                    message={<span style={{ fontWeight: 600, color: '#002766' }}>Thông tin tác vụ đang vận hành</span>}
                    description={
                        <div style={{ marginTop: 8, fontSize: 13, color: '#595959' }}>
                            <div><b>Mã tác vụ:</b> <Tag color="blue">CV-{taskId}</Tag></div>
                            <div style={{ margin: '6px 0' }}><b>Công việc:</b> <span style={{ color: '#0050b3' }}>{taskName || "Chưa xác định"}</span></div>
                            <div><b>Thời gian báo cáo:</b> {dayjs().format('DD/MM/YYYY HH:mm')}</div>
                        </div>
                    }
                    type="info" 
                    showIcon 
                    style={{ marginBottom: 20, borderRadius: 6 }}
                />

                <Form form={formReport} layout="vertical" onFinish={handleSaveReport}>
                    <Form.Item name="tyLeHoanThanh" label="Tỷ lệ hoàn thành đạt được (%)" rules={[{ required: true }]}>
                        <Row gutter={16} align="middle">
                            <Col span={16}>
                                <Slider 
                                    min={0} 
                                    max={100} 
                                    step={5} 
                                    value={sliderValue} 
                                    onChange={(val) => { 
                                        setSliderValue(val); 
                                        formReport.setFieldsValue({ tyLeHoanThanh: val }); 
                                    }} 
                                    marks={{ 0: '0%', 50: '50%', 100: '100%' }} 
                                />
                            </Col>
                            <Col span={8}>
                                <InputNumber 
                                    min={0} 
                                    max={100} 
                                    style={{ width: '100%', borderRadius: 6 }} 
                                    value={sliderValue} 
                                    onChange={(val) => { 
                                        const num = Number(val); 
                                        setSliderValue(num); 
                                        formReport.setFieldsValue({ tyLeHoanThanh: num }); 
                                    }} 
                                />
                            </Col>
                        </Row>
                    </Form.Item>

                    <Form.Item name="noiDungBaoCao" label="Nội dung kết quả / Khó khăn" rules={[{ required: true, message: "Vui lòng nhập nội dung chi tiết!" }]}>
                        <Input.TextArea rows={4} placeholder="Mô tả cụ thể khối lượng công việc, tính năng hoặc kết quả đã xử lý được..." style={{ borderRadius: 6 }} />
                    </Form.Item>

                    <Form.Item label="Tệp đính kèm minh chứng sản phẩm (Bản vẽ, Code, Hình ảnh...)">
                        <Upload customRequest={handleReportFileUpload} showUploadList={false} multiple>
                            <Button icon={<UploadOutlined />} loading={uploadingReport} style={{ borderRadius: 6 }}>Đính kèm file kết quả</Button>
                        </Upload>
                        <Form.Item noStyle shouldUpdate>
                            {({ getFieldValue }) => {
                                const currentFiles = getFieldValue("danhSachFile") || [];
                                if (currentFiles.length === 0) return null;
                                return (
                                    <div style={{ marginTop: 12, padding: 10, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#389e0d' }}>Tài liệu đính kèm ({currentFiles.length}):</div>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            {currentFiles.map((url, i) => {
                                                const fileName = url.split('/').pop();
                                                return (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                        <span><PaperClipOutlined style={{ color: '#52c41a' }} /> {decodeURIComponent(fileName)}</span>
                                                        <Button 
                                                            type="link" 
                                                            danger 
                                                            size="small" 
                                                            style={{ padding: 0 }} 
                                                            onClick={() => {
                                                                const newFiles = currentFiles.filter((_, index) => index !== i);
                                                                formReport.setFieldsValue({ danhSachFile: newFiles });
                                                            }}
                                                        >
                                                            Gỡ bỏ
                                                        </Button>
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

                    <div style={{ textAlign: "right", marginTop: 24 }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)} style={{ borderRadius: 6 }}>Hủy bỏ</Button>
                            <Button type="primary" htmlType="submit" icon={<SendOutlined />} style={{ backgroundColor: '#0050b3', borderRadius: 6 }}>Nộp Báo Cáo</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default TaskReportManager;