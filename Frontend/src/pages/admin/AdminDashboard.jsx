
import { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Tag, Typography, Space, Avatar, Table, Progress, Empty, Tooltip } from "antd";
import { 
    ApartmentOutlined, IdcardOutlined, TeamOutlined, 
    DashboardOutlined, UserOutlined, FileSyncOutlined, ClockCircleOutlined,
    CheckCircleOutlined, SyncOutlined, CloseCircleOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom"; // 🌟 Đã thêm useNavigate
import dayjs from "dayjs";
import api from "../../services/axios"; 

const { Title, Text } = Typography;

const AdminDashboard = () => {
    const navigate = useNavigate(); // Khởi tạo hook điều hướng
    const [userInfo] = useState(() => {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [dashboardStats, setDashboardStats] = useState({ 
        totalEmployees: 0, totalDepartments: 0, totalPositions: 0, activeTasks: 0 
    });
    const [recentTasks, setRecentTasks] = useState([]);
    const [pendingProposals, setPendingProposals] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const getGreeting = () => {
        const hour = dayjs().hour();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
    };

    const normalizeString = (str) => {
        return String(str || "").normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    useEffect(() => {
        let isMounted = true;
        const fetchAllData = async () => {
            setLoadingData(true);
            try {
                const [deptRes, posRes, roleRes, empRes, taskRes, propRes] = await Promise.allSettled([
                    api.get("/departments"), api.get("/positions"), api.get("/roles"), 
                    api.get("/employees"), api.get("/tasks"), api.get("/proposals/all")
                ]);

                const getDataLength = (res) => (res.status === "fulfilled" && Array.isArray(res.value.data?.data || res.value.data)) ? (res.value.data?.data || res.value.data).length : 0;

                let countActiveTasks = 0;
                let activeTasksList = [];
                
                if (taskRes.status === "fulfilled") {
                    const taskData = taskRes.value.data?.data || taskRes.value.data || [];
                    activeTasksList = taskData.filter(t => {
                        const statusStr = normalizeString(t.TrangThai || t.trangThai);
                        return !statusStr.includes("HOAN THANH");
                    });
                    countActiveTasks = activeTasksList.length;
                }

                let pendingPropsList = [];
                if (propRes.status === "fulfilled") {
                    const propData = propRes.value.data?.data || propRes.value.data || [];
                    pendingPropsList = propData.filter(p => {
                        const statusStr = normalizeString(p.TrangThai || p.trangThai);
                        return statusStr.includes("CHO") || statusStr.includes("DANG");
                    });
                }

                if (isMounted) {
                    setDashboardStats({
                        totalDepartments: getDataLength(deptRes),
                        totalPositions: getDataLength(posRes),
                        totalRoles: getDataLength(roleRes),
                        totalEmployees: getDataLength(empRes),
                        activeTasks: countActiveTasks
                    });
                    setRecentTasks(activeTasksList.slice(0, 5)); 
                    setPendingProposals(pendingPropsList.slice(0, 5)); 
                }
            } catch (error) { console.error("Lỗi tải dữ liệu", error); }
            finally { if (isMounted) setLoadingData(false); }
        };

        fetchAllData();
        return () => { isMounted = false; };
    }, []);

    // --- CẤU HÌNH BẢNG KÈM THEO ĐIỀU HƯỚNG ---
    const taskColumns = [
        { 
            title: "Tiêu đề công việc", 
            width: "45%",
            render: (_, record) => {
                const id = record.MaCongViec || record.maCongViec;
                return (
                    // 🌟 Thêm chuyển trang khi nhấp vào Tiêu đề
                    <div onClick={() => navigate(`/admin/tasks`)} style={{ cursor: 'pointer' }}>
                        <div style={{ color: '#0050b3', fontWeight: 600, fontSize: 14 }}>{record.TieuDe || record.tieuDe}</div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                            <Tag bordered={false} color="geekblue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                                CV-{id}
                            </Tag>
                        </div>
                    </div>
                );
            }
        },
        { 
            title: "Tiến độ", 
            width: "30%",
            render: (_, record) => {
                const percent = Number(record.TyLeHoanThanh || record.tyLeHoanThanh || 0);
                return (
                    <Tooltip title={`${percent}% hoàn thành`}>
                        <Progress percent={percent} size="small" status={percent === 100 ? "success" : "active"} strokeColor={percent === 100 ? "#52c41a" : "#1890ff"} />
                    </Tooltip>
                );
            }
        },
        { 
            title: "Hạn chót", 
            align: 'right',
            render: (_, record) => {
                const date = record.HanHoanThanh || record.hanHoanThanh;
                if (!date) return <Text type="secondary" italic>Chưa cấu hình</Text>;
                const isLate = dayjs(date).isBefore(dayjs(), 'day');
                return (
                    <div style={{ color: isLate ? '#cf1322' : '#595959', fontWeight: isLate ? 600 : 400 }}>
                        {isLate && <ClockCircleOutlined style={{ marginRight: 4 }} />}
                        {dayjs(date).format("DD/MM/YYYY")}
                    </div>
                );
            } 
        }
    ];

    const proposalColumns = [
        { 
            title: "Hồ sơ", 
            render: (_, record) => (
                // 🌟 Thêm chuyển trang khi nhấp vào Tiêu đề
                <div onClick={() => navigate(`/admin/proposals`)} style={{ cursor: 'pointer' }}>
                    <div style={{ color: '#262626', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                        {record.TieuDe || record.tieuDe}
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', borderRadius: 4 }}>
                            {record.SoDeXuat || record.soDeXuat || "N/A"}
                        </Tag>
                    </div>
                </div>
            )
        },
        { 
            title: "Trạng thái", 
            align: 'right',
            width: "35%",
            render: (_, record) => {
                const statusStr = String(record.TrangThai || record.trangThai || "").toUpperCase();
                const displayStatus = record.TrangThai || record.trangThai || "Đang xử lý";
                
                // 🌟 ĐÃ SỬ DỤNG CheckCircleOutlined (Lỗi bạn báo đã được giải quyết!)
                if (statusStr.includes("DA_DUYET") || statusStr.includes("THANH_CONG")) {
                    return <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 4 }}>{displayStatus}</Tag>;
                }
                if (statusStr.includes("TU_CHOI") || statusStr.includes("TRA_VE")) {
                    return <Tag icon={<CloseCircleOutlined />} color="error" style={{ borderRadius: 4 }}>{displayStatus}</Tag>;
                }
                return <Tag icon={<SyncOutlined spin />} color="processing" style={{ borderRadius: 4 }}>{displayStatus}</Tag>;
            } 
        }
    ];

    const cardStyle = { borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden', position: 'relative' };
    const watermarkStyle = { position: 'absolute', right: -20, bottom: -20, fontSize: 100, opacity: 0.08, transform: 'rotate(-15deg)' };

    return (
        <div style={{ padding: '24px 32px', background: '#f5f7fa', minHeight: '100vh' }} className="fade-in">
            
            <Card variant="borderless" style={{ marginBottom: 32, background: 'linear-gradient(to right, #ffffff, #e6f7ff)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', borderRadius: 16 }}>
                <Space size="large" align="center">
                    <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', boxShadow: '0 4px 8px rgba(24,144,255,0.3)' }} />
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#002766', fontWeight: 800 }}>
                            {getGreeting()}, {userInfo?.HoTen || userInfo?.hoTen || "Quản trị viên"}!
                        </Title>
                        <div style={{ marginTop: 6 }}>
                            <Text type="secondary" style={{ fontSize: 15 }}>
                                Chào mừng bạn đến với trung tâm điều hành tổng quan của hệ thống.
                            </Text>
                            <Tag color="volcano" style={{ marginLeft: 12, borderRadius: 4, fontWeight: 600 }}>Cấp quyền: Quyền Admin</Tag>
                        </div>
                    </div>
                </Space>
            </Card>

            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #1890ff' }} styles={{ body: { padding: '24px' } }}>
                        <TeamOutlined style={{ ...watermarkStyle, color: '#1890ff' }} />
                        <Statistic title={<Text strong style={{ color: '#8c8c8c' }}>TỔNG NHÂN VIÊN</Text>} value={dashboardStats.totalEmployees} valueStyle={{ color: '#1890ff', fontSize: 36, fontWeight: 800 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #52c41a' }} styles={{ body: { padding: '24px' } }}>
                        <ApartmentOutlined style={{ ...watermarkStyle, color: '#52c41a' }} />
                        <Statistic title={<Text strong style={{ color: '#8c8c8c' }}>TỔNG PHÒNG BAN</Text>} value={dashboardStats.totalDepartments} valueStyle={{ color: '#52c41a', fontSize: 36, fontWeight: 800 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #faad14' }} styles={{ body: { padding: '24px' } }}>
                        <IdcardOutlined style={{ ...watermarkStyle, color: '#faad14' }} />
                        <Statistic title={<Text strong style={{ color: '#8c8c8c' }}>TỔNG CHỨC VỤ</Text>} value={dashboardStats.totalPositions} valueStyle={{ color: '#faad14', fontSize: 36, fontWeight: 800 }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ ...cardStyle, borderBottom: '4px solid #ff4d4f' }} styles={{ body: { padding: '24px' } }}>
                        <DashboardOutlined style={{ ...watermarkStyle, color: '#ff4d4f' }} />
                        <Statistic title={<Text strong style={{ color: '#ff4d4f' }}>TÁC VỤ ĐANG XỬ LÝ</Text>} value={dashboardStats.activeTasks} valueStyle={{ color: '#ff4d4f', fontSize: 36, fontWeight: 800 }} />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={24} xl={13}>
                    <Card 
                        title={<><DashboardOutlined style={{ color: '#1890ff', marginRight: 8, fontSize: 18 }} /> <span style={{ color: '#002766', fontSize: 16 }}>Hiệu suất & Tiến độ công việc</span></>} 
                        variant="borderless" 
                        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', minHeight: 420 }}
                        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '0 24px 24px 24px' } }}
                    >
                        <Table 
                            dataSource={recentTasks} 
                            columns={taskColumns} 
                            rowKey={(record) => record.MaCongViec || record.maCongViec || Math.random()} 
                            pagination={false} 
                            loading={loadingData} 
                            size="middle"
                            locale={{ emptyText: <Empty description="Hệ thống không có tác vụ nào đang tồn đọng." /> }}
                        />
                    </Card>
                </Col>
                
                <Col xs={24} xl={11}>
                    <Card 
                        title={<><FileSyncOutlined style={{ color: '#faad14', marginRight: 8, fontSize: 18 }} /> <span style={{ color: '#002766', fontSize: 16 }}>Hồ sơ đang chờ kiểm duyệt</span></>} 
                        variant="borderless" 
                        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', minHeight: 420 }}
                        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '0 24px 24px 24px' } }}
                    >
                        <Table 
                            dataSource={pendingProposals} 
                            columns={proposalColumns} 
                            rowKey={(record) => record.MaDeXuat || record.maDeXuat || Math.random()} 
                            pagination={false} 
                            loading={loadingData} 
                            size="middle"
                            locale={{ emptyText: <Empty description="Chưa có đề xuất nào cần duyệt lúc này." /> }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboard;