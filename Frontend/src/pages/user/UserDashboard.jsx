/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Button, Progress, Space, Typography, Tooltip, Avatar } from "antd";
import { 
    SyncOutlined, ClockCircleOutlined, InfoCircleOutlined, FileTextOutlined, 
    SafetyCertificateOutlined, RightOutlined, ProjectOutlined, EditOutlined, 
    UserOutlined, CheckCircleOutlined, FlagOutlined, CloseCircleOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../services/axios";

const { Title, Text } = Typography;

const UserDashboard = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [proposals, setProposals] = useState({ toApprove: [], created: [] });
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [loadingProposals, setLoadingProposals] = useState(false);
    
    const [userName, setUserName] = useState("Bạn");
    const [greeting, setGreeting] = useState("Chào buổi sáng");

    useEffect(() => {
        const hour = dayjs().hour();
        if (hour < 12) setGreeting("Chào buổi sáng");
        else if (hour < 18) setGreeting("Chào buổi chiều");
        else setGreeting("Chào buổi tối");

        try {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user && (user.HoTen || user.hoTen)) {
                setUserName(user.HoTen || user.hoTen);
            }
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
            console.error("Không thể đọc thông tin người dùng.");
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchMyTasks = async () => {
            if (isMounted) setLoadingTasks(true);
            try {
                const res = await api.get("/tasks/my-tasks"); 
                const data = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
                if (isMounted) setTasks(data);
            } catch (error) {
                console.error("Lỗi lấy danh sách công việc:", error);
            } finally {
                if (isMounted) setLoadingTasks(false);
            }
        };

        const fetchMyProposals = async () => {
            if (isMounted) setLoadingProposals(true);
            try {
                const res = await api.get("/proposals/my");
                const allData = res.data?.data || res.data || res || [];
                
                if (isMounted && Array.isArray(allData)) {
                    // 🌟 ĐÃ FIX LỖI: Đồng bộ lọc chữ hoa/thường tránh rớt dữ liệu về 0
                    setProposals({
                        created: allData.filter(item => String(item.PhanLoai || item.phanLoai || "").toUpperCase() === 'DA_TAO'),
                        toApprove: allData.filter(item => String(item.PhanLoai || item.phanLoai || "").toUpperCase() === 'CAN_DUYET')
                    });
                }
            } catch (error) {
                console.error("Lỗi lấy danh sách đề xuất:", error);
            } finally {
                if (isMounted) setLoadingProposals(false);
            }
        };

        fetchMyTasks();
        fetchMyProposals();

        return () => { isMounted = false; };
    }, []);

    // --- Tính toán thống kê an toàn ---
    const totalTasks = tasks.length;
    const inProgressTasks = tasks.filter(t => {
        const status = String(t.TrangThai || t.trangThai || "").toUpperCase();
        const percent = Number(t.TyLeHoanThanh || t.tyLeHoanThanh || 0);
        return status === "DANG_THUC_HIEN" || (percent > 0 && percent < 100);
    }).length;
    
    const pendingApproveProposals = proposals.toApprove.length;
    const totalCreatedProposals = proposals.created.length;

    // --- Cấu hình Cột Bảng Công Việc Chống Sập ---
    const taskColumns = [
        { 
            title: "Mã CV", 
            key: "MaCongViec", 
            width: 90, 
            align: "center", 
            render: (_, record) => <b>CV-{record.MaCongViec || record.maCongViec}</b> 
        },
        { 
            title: "Tiêu đề công tác", 
            dataIndex: "TieuDe",
            render: (text, record) => {
                const id = record.MaCongViec || record.maCongViec;
                return (
                    <div onClick={() => navigate(`/user/tasks/${id}/reports`)} style={{ cursor: 'pointer' }}>
                        <div style={{ color: '#0050b3', fontWeight: 600, fontSize: 14 }}>{text || record.tieuDe}</div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }}/>
                            Hạn cuối: <span style={{ color: '#ff4d4f' }}>{record.HanHoanThanh || record.hanHoanThanh ? dayjs(record.HanHoanThanh || record.hanHoanThanh).format("DD/MM/YYYY") : "Chưa cấu hình"}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            title: "Tiến độ", width: 140,
            render: (_, record) => {
                const percent = Number(record.TyLeHoanThanh || record.tyLeHoanThanh || 0);
                const statusStr = String(record.TrangThai || record.trangThai || "").toUpperCase();
                const isComplete = percent === 100 || statusStr.includes("HOAN_THANH") || statusStr.includes("THANH_CONG");
                return (
                    <Tooltip title={`${percent}% hoàn thành`}>
                        <Progress percent={percent} size="small" status={isComplete ? "success" : "active"} strokeColor={isComplete ? "#52c41a" : "#1890ff"} />
                    </Tooltip>
                );
            }
        },
        {
            title: "Trạng thái", align: "center", width: 130,
            render: (_, record) => {
                const statusStr = String(record.TrangThai || record.trangThai || "").toUpperCase();
                if (statusStr.includes("THANH_CONG") || statusStr.includes("HOAN_THANH")) return <Tag color="success" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>;
                if (statusStr.includes("THAT_BAI") || statusStr.includes("TRE_HAN")) return <Tag color="error" icon={<CloseCircleOutlined />}>Thất bại</Tag>;
                if (statusStr.includes("DANG_THUC_HIEN") || statusStr.includes("DANG_LAM")) return <Tag color="processing" icon={<SyncOutlined spin />}>Đang tiến hành</Tag>;
                return <Tag color="default" icon={<ClockCircleOutlined />}>Chờ thực hiện</Tag>;
            }
        }
    ];

    // --- Cấu hình Cột Bảng Trình Ký Chống Sập ---
    const proposalColumns = [
        { 
            title: "Hồ sơ", 
            render: (_, record) => (
                <div onClick={() => navigate(`/user/proposals`)} style={{ cursor: 'pointer' }}>
                    <div style={{ color: '#1890ff', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{record.TieuDe || record.tieuDe}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        <Tag color="geekblue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>{record.SoDeXuat || "Hồ sơ mẫu"}</Tag>
                        {dayjs(record.NgayTao || record.ngayTao).format("DD/MM/YYYY")}
                    </div>
                </div>
            )
        },
        {
            title: "Trạng thái", align: "center", width: 120,
            render: (_, record) => {
                const status = String(record.TrangThai || record.trangThai || "").toUpperCase();
                const colorMap = { "CHO_DUYET": "blue", "DA_DUYET": "green", "TU_CHOI": "red", "TRA_VE": "orange" };
                const iconMap = { "CHO_DUYET": <SyncOutlined spin />, "DA_DUYET": <CheckCircleOutlined /> };
                return <Tag color={colorMap[status] || "default"} icon={iconMap[status] || null} style={{ width: 95, textAlign: 'center' }}>{status || "ĐANG XỬ LÝ"}</Tag>;
            }
        }
    ];

    // Cấu hình chuẩn CSS AntD v5 loại bỏ hoàn toàn bStyle cũ
    const cardStyle = { borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden', position: 'relative' };
    const watermarkStyle = { position: 'absolute', right: -20, bottom: -20, fontSize: 100, opacity: 0.08, transform: 'rotate(-15deg)' };

    return (
        <div style={{ padding: '24px 32px', background: '#f5f7fa', minHeight: '100vh' }}>
            
            {/* KHU VỰC HEADER & LỜI CHÀO */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 32 }}>
                <Col>
                    <Space size="middle">
                        <Avatar size={56} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                            <Title level={4} style={{ margin: 0, color: '#002766', fontWeight: 700 }}>
                                👋 {greeting}, {userName}!
                            </Title>
                            <Text type="secondary">Bạn đang điều phối <b>{totalTasks}</b> công việc chuyên môn khoa phòng.</Text>
                        </div>
                    </Space>
                </Col>
                <Col>
                    <Space>
                        <Button type="default" size="large" icon={<ProjectOutlined />} style={{ borderRadius: 8, fontWeight: 500 }} onClick={() => navigate("/user/tasks")}>
                            Sổ Công Việc
                        </Button>
                        <Button type="primary" size="large" icon={<EditOutlined />} style={{ borderRadius: 8, backgroundColor: '#0050b3', fontWeight: 600 }} onClick={() => navigate("/user/proposals")}>
                            Tạo Tờ Trình Mới
                        </Button>
                    </Space>
                </Col>
            </Row>
            
            {/* KHU VỰC 4 THẺ THỐNG KÊ (🌟 ĐÃ ĐỔI SANG CÚ PHÁP STYLES TIÊU CHUẨN ANTD V5) */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #1890ff' }} styles={{ body: { padding: '24px' } }}>
                        <InfoCircleOutlined style={{ ...watermarkStyle, color: '#1890ff' }} />
                        <Statistic title={<Text strong style={{ color: '#8c8c8c' }}>TỔNG SỐ CÔNG VIỆC</Text>} value={totalTasks} valueStyle={{ color: '#1890ff', fontSize: 36, fontWeight: 800 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #faad14' }} styles={{ body: { padding: '24px' } }}>
                        <SyncOutlined style={{ ...watermarkStyle, color: '#faad14' }} />
                        <Statistic title={<Text strong style={{ color: '#8c8c8c' }}>ĐANG TIẾN HÀNH</Text>} value={inProgressTasks} valueStyle={{ color: '#faad14', fontSize: 36, fontWeight: 800 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #ff4d4f', background: pendingApproveProposals > 0 ? '#fff1f0' : '#fff' }} styles={{ body: { padding: '24px' } }}>
                        <SafetyCertificateOutlined style={{ ...watermarkStyle, color: '#ff4d4f' }} />
                        <Statistic title={<Text strong style={{ color: '#ff4d4f' }}>CHỜ TÔI KÝ DUYỆT</Text>} value={pendingApproveProposals} valueStyle={{ color: '#ff4d4f', fontSize: 36, fontWeight: 800 }} suffix={pendingApproveProposals > 0 ? <FlagOutlined style={{ fontSize: 16 }} /> : null} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #52c41a' }} styles={{ body: { padding: '24px' } }}>
                        <FileTextOutlined style={{ ...watermarkStyle, color: '#52c41a' }} />
                        <Statistic title={<Text strong style={{ color: '#8c8c8c' }}>HỒ SƠ ĐÃ TRÌNH KÝ</Text>} value={totalCreatedProposals} valueStyle={{ color: '#52c41a', fontSize: 36, fontWeight: 800 }} />
                    </Card>
                </Col>
            </Row>

            {/* KHU VỰC BẢNG DỮ LIỆU TỔNG QUAN */}
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={15}>
                    <Card 
                        title={<><ClockCircleOutlined style={{ color: '#1890ff', marginRight: 8, fontSize: 18 }} /> <span style={{ color: '#002766', fontSize: 16 }}>Tiến độ công việc chuyên môn</span></>} 
                        bordered={false}
                        extra={<Button type="text" onClick={() => navigate("/user/tasks")} style={{ color: '#1890ff', fontWeight: 500 }}>Xem tất cả <RightOutlined /></Button>}
                        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', minHeight: 420 }}
                        styles={{ body: { padding: '0 24px 24px 24px' } }}
                    >
                        <Table 
                            dataSource={tasks.slice(0, 5)} 
                            rowKey={(record) => record.MaCongViec || record.maCongViec || Math.random()} 
                            columns={taskColumns} 
                            loading={loadingTasks}
                            pagination={false}
                            size="middle"
                            locale={{ emptyText: "Bạn chưa có công việc nào đang thực hiện." }}
                        />
                    </Card>
                </Col>
                
                <Col xs={24} lg={9}>
                    <Card 
                        title={<><SafetyCertificateOutlined style={{ color: '#ff4d4f', marginRight: 8, fontSize: 18 }} /> <span style={{ color: '#002766', fontSize: 16 }}>Hồ sơ chờ tôi xử lý</span></>} 
                        bordered={false}
                        extra={<Button type="text" onClick={() => navigate("/user/proposals")} style={{ color: '#1890ff', fontWeight: 500 }}>Quản lý <RightOutlined /></Button>}
                        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', minHeight: 420 }}
                        styles={{ body: { padding: '0 24px 24px 24px' } }}
                    >
                        <Table 
                            dataSource={proposals.toApprove.slice(0, 5)} 
                            rowKey={(record) => record.MaPheDuyet || record.maPheDuyet || record.MaDeXuat || Math.random()} 
                            columns={proposalColumns} 
                            loading={loadingProposals}
                            pagination={false}
                            size="middle"
                            showHeader={false}
                            locale={{ emptyText: "Tuyệt vời! Không có hồ sơ nào đang chờ duyệt." }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default UserDashboard;