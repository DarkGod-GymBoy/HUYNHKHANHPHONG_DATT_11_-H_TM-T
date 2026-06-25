/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Layout, Menu, Button, message, Badge, Popover, List, Dropdown, Space, Avatar, Typography } from "antd";
import {
    MenuUnfoldOutlined, MenuFoldOutlined, DashboardOutlined,
    ApartmentOutlined, UsergroupAddOutlined, IdcardOutlined, 
    TeamOutlined, UnorderedListOutlined, LogoutOutlined, BellOutlined, 
    UserOutlined, FileTextOutlined, SafetyCertificateOutlined, FolderOpenOutlined, ClockCircleOutlined
} from "@ant-design/icons";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import api from "../services/axios";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AdminLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const [userInfo] = useState(() => {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [notifications, setNotifications] = useState([]);
    const unreadCount = notifications.filter(n => !n.daDoc).length;

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications");
            if (res.data?.success || res.data) {
                const rawData = res.data?.data || res.data || [];
                const normalizedData = rawData.map(item => ({
                    maThongBao: item.MaThongBao ?? item.maThongBao,
                    tieuDe: item.TieuDe ?? item.tieuDe,
                    noiDung: item.NoiDung ?? item.noiDung,
                    daDoc: item.DaDoc === true || item.DaDoc === 1 || item.daDoc === true || item.daDoc === 1,
                    ngayTao: item.NgayTao ?? item.ngayTao,
                    duongDan: item.DuongDan ?? item.duongDan
                }));
                setNotifications(normalizedData);
            }
        } catch (error) {
            console.error("Lỗi tải thông báo hệ thống:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Quét chuông mỗi 15 giây
        const interval = setInterval(() => { fetchNotifications(); }, 15000); 

        // LẮNG NGHE SỰ KIỆN: Cập nhật chuông ngay lập tức
        const handleForceReload = () => fetchNotifications();
        window.addEventListener('reload_bell', handleForceReload);

        return () => { 
            clearInterval(interval); 
            window.removeEventListener('reload_bell', handleForceReload);
        };
    }, []);

    const handleNotificationClick = async (notif) => {
        const idThongBao = notif.maThongBao;
        const isRead = notif.daDoc;
        const duongDan = notif.duongDan;

        if (!isRead && idThongBao) {
            try {
                await api.put(`/notifications/${idThongBao}/read`);
                fetchNotifications(); 
            } catch (error) { 
                console.error("Lỗi cập nhật trạng thái đọc:", error); 
            }
        }
        if (duongDan) navigate(duongDan);
    };

    const handleLogout = () => {
        localStorage.clear(); 
        message.success("Đăng xuất khỏi hệ thống quản trị thành công!");
        navigate("/login");
    };

    const menuItems = [
        { key: "/admin", icon: <DashboardOutlined />, label: "Tổng quan Dashboard" },
        { key: "/admin/departments", icon: <ApartmentOutlined />, label: "Quản lý Phòng Ban" },
        { key: "/admin/positions", icon: <IdcardOutlined />, label: "Quản lý Chức Vụ" },
        { key: "/admin/roles", icon: <UsergroupAddOutlined />, label: "Quản lý Vai Trò" },
        { key: "/admin/employees", icon: <TeamOutlined />, label: "Quản lý Nhân Viên" },
        { key: "/admin/tasks", icon: <UnorderedListOutlined />, label: "Quản lý Công Việc" },
        { key: "/admin/proposals", icon: <FileTextOutlined />, label: "Quản lý Đề Xuất" },
        { key: "/admin/signatures", icon: <SafetyCertificateOutlined />, label: "Quản lý Chữ Ký Số" },
        { key: "/admin/documents", icon: <FolderOpenOutlined />, label: "Quản lý Tài Liệu" }
    ];

    const userMenuItems = [
        { key: "logout", icon: <LogoutOutlined />, danger: true, label: "Đăng xuất an toàn", onClick: handleLogout }
    ];

   
    const notificationContent = (
        <div style={{ width: 360, maxHeight: 450, overflowY: 'auto', padding: '8px 0' }}>
            <List
                itemLayout="horizontal"
                dataSource={notifications}
                locale={{ emptyText: "Tuyệt vời! Bạn không có thông báo nào bị bỏ lỡ." }}
                renderItem={(item) => (
                    <List.Item 
                        style={{ 
                            cursor: 'pointer', 
                            background: item.daDoc ? 'transparent' : '#f0f7ff', 
                            padding: '12px 16px', 
                            margin: '4px 12px', // Tách rời các thẻ thay vì dính liền
                            borderRadius: '8px', // Bo tròn từng dòng
                            border: item.daDoc ? '1px solid transparent' : '1px solid #bae0ff',
                            transition: 'all 0.2s ease-in-out'
                        }}
                        onClick={() => handleNotificationClick(item)}
                        className="notification-item-hover"
                    >
                        <List.Item.Meta
                            avatar={
                                <Badge dot={!item.daDoc} color="blue" offset={[-2, 6]}>
                                    <Avatar icon={<BellOutlined />} style={{ backgroundColor: item.daDoc ? '#f5f5f5' : '#1890ff', color: item.daDoc ? '#bfbfbf' : '#fff' }} />
                                </Badge>
                            }
                            title={<Text strong={!item.daDoc} style={{ fontSize: 14, color: item.daDoc ? '#595959' : '#0050b3' }}>{item.tieuDe}</Text>}
                            description={
                                <div>
                                    <div style={{ fontSize: 13, color: '#595959', marginTop: 4, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: item.noiDung }} />
                                    <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 8 }}>
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                        {item.ngayTao ? dayjs(item.ngayTao).format("DD/MM/YYYY HH:mm") : ""}
                                    </div>
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />
            {/* Thêm CSS inline cho hiệu ứng hover */}
            <style>{`
                .notification-item-hover:hover { background-color: #fafafa !important; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            `}</style>
        </div>
    );

    return (
        <Layout style={{ minHeight: "100vh" }}>
            {/* SIDER BÊN TRÁI MÀU ĐEN SANG TRỌNG */}
            <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={260} style={{ boxShadow: "2px 0 12px rgba(0,0,0,0.15)", zIndex: 20 }}>
                <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <SafetyCertificateOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        {!collapsed && <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: '1px' }}>ERP ADMIN</h2>}
                    </div>
                </div>
                <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={(e) => navigate(e.key)} style={{ borderRight: 0, marginTop: 16 }} />
            </Sider>
            
            <Layout style={{ background: '#f5f7fa' }}>
                {/* HEADER HIỆU ỨNG GLASSMORPHISM KÍNH MỜ GẮN CHẶT TRÊN CÙNG */}
                <Header style={{ 
                    background: "rgba(255, 255, 255, 0.8)", 
                    backdropFilter: "blur(12px)", // Hiệu ứng kính mờ
                    WebkitBackdropFilter: "blur(12px)",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    padding: "0 24px", 
                    boxShadow: "0 2px 12px rgba(0,0,0,0.04)", 
                    position: 'sticky', // Gim cố định Header
                    top: 0, 
                    zIndex: 10,
                    height: 64
                }}>
                    <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: "18px", width: 44, height: 44, color: '#595959' }} />
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        {/* Khu vực Chuông Thông báo */}
                        <Popover content={notificationContent} title={<Text strong style={{ fontSize: 16, padding: '8px 12px', display: 'block', borderBottom: '1px solid #f0f0f0' }}>Thông báo hệ thống</Text>} trigger="click" placement="bottomRight" overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}>
                            <Badge count={unreadCount} size="small" offset={[-4, 4]}>
                                <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 20, color: '#595959' }} />} style={{ width: 40, height: 40, background: '#f0f2f5' }} />
                            </Badge>
                        </Popover>

                        {/* Khu vực User Dropdown */}
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow={{ pointAtCenter: true }}>
                            <Space style={{ cursor: "pointer", padding: "6px 16px 6px 6px", borderRadius: "32px", background: "#f5f7fa", border: '1px solid #e8e8e8', transition: "all 0.3s" }}>
                                <Avatar src={userInfo?.Avatar} style={{ backgroundColor: "#0050b3" }} icon={<UserOutlined />} size="default" />
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                    <Text strong style={{ fontSize: 14, color: '#262626' }}>{userInfo?.HoTen || userInfo?.hoTen || "Quản trị viên"}</Text>
                                    <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Admin System</Text>
                                </div>
                            </Space>
                        </Dropdown>
                    </div>
                </Header>

                {/* Khu vực chứa nội dung chính */}
                <Content style={{ margin: 0, overflow: "initial" }}>
                    {/* Bọc Outlet vào một container mượt mà */}
                    <div className="fade-in" style={{ minHeight: 'calc(100vh - 64px)' }}>
                        <Outlet /> 
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;