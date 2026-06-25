/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Layout, Menu, Dropdown, Avatar, Space, Typography, theme, Badge, Popover, List, message, Button } from "antd";
import { 
    DashboardOutlined, ProjectOutlined, UserOutlined, LogoutOutlined,
    FileTextOutlined, BellOutlined, FolderOpenOutlined, ClockCircleOutlined 
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import api from "../services/axios"; 

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const UserLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { token: { colorBgContainer } } = theme.useToken();
    
    const [userInfo] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user")) || { HoTen: "Người dùng", TenVaiTro: "Nhân viên" };
        } catch {
            return { HoTen: "Người dùng", TenVaiTro: "Nhân viên" };
        }
    });

    const [notifications, setNotifications] = useState([]);
    const unreadCount = notifications.filter(n => !n.daDoc).length;

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications");
            if (res.data?.success) {
                const rawData = res.data.data || [];
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
            if (error.response?.status !== 404) console.error("Lỗi tải thông báo:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Giảm xuống 15 giây để quét chuông nhạy hơn
        const interval = setInterval(() => { fetchNotifications(); }, 15000); 

        // 🌟 LẮNG NGHE SỰ KIỆN: Tải lại chuông ngay lập tức khi có lệnh từ trang con
        const handleForceReload = () => fetchNotifications();
        window.addEventListener('reload_bell', handleForceReload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('reload_bell', handleForceReload);
        };
    }, []);

    const handleNotificationClick = async (notif) => {
        if (!notif.daDoc && notif.maThongBao) {
            try {
                await api.put(`/notifications/${notif.maThongBao}/read`);
                fetchNotifications();
            } catch (error) { console.error("Lỗi:", error); }
        }
        if (notif.duongDan) navigate(notif.duongDan);
    };

    const handleLogout = () => {
        localStorage.clear();
        message.success("Đăng xuất thành công!");
        navigate("/login");
    };

    const getActiveMenuKey = () => {
        if (location.pathname.startsWith("/user/tasks")) return "/user/tasks";
        if (location.pathname.startsWith("/user/proposals")) return "/user/proposals";
        if (location.pathname.startsWith("/user/documents")) return "/user/documents";
        if (location.pathname.startsWith("/user/profile")) return "none"; 
        return "/user"; 
    };

    const menuItems = [
        { key: "/user", icon: <DashboardOutlined />, label: "Tổng quan" },
        { key: "/user/tasks", icon: <ProjectOutlined />, label: "Công việc" },
        { key: "/user/proposals", icon: <FileTextOutlined />, label: "Trình ký & Đề xuất" },
        { key: "/user/documents", icon: <FolderOpenOutlined />, label: "Tài liệu của tôi" }
    ];

    const notificationContent = (
        <div style={{ width: 360, maxHeight: 450, overflowY: 'auto', padding: '8px 0' }}>
            <List
                itemLayout="horizontal"
                dataSource={notifications}
                locale={{ emptyText: "Tuyệt vời! Bạn không có thông báo nào bị bỏ lỡ." }}
                renderItem={(item) => (
                    <List.Item 
                        style={{ cursor: 'pointer', background: item.daDoc ? 'transparent' : '#f0f7ff', padding: '12px 16px', margin: '4px 12px', borderRadius: '8px', border: item.daDoc ? '1px solid transparent' : '1px solid #bae0ff', transition: 'all 0.2s ease-in-out' }}
                        className="notification-item-hover"
                        onClick={() => handleNotificationClick(item)}
                    >
                        <List.Item.Meta
                            avatar={<Badge dot={!item.daDoc} color="blue" offset={[-2, 6]}><Avatar icon={<BellOutlined />} style={{ backgroundColor: item.daDoc ? '#f5f5f5' : '#1890ff', color: item.daDoc ? '#bfbfbf' : '#fff' }} /></Badge>}
                            title={<Text strong={!item.daDoc} style={{ fontSize: 14, color: item.daDoc ? '#595959' : '#0050b3' }}>{item.tieuDe}</Text>}
                            description={
                                <div>
                                    <div style={{ fontSize: 13, color: '#595959', marginTop: 4, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: item.noiDung }} />
                                    <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 8 }}><ClockCircleOutlined style={{ marginRight: 4 }} />{item.ngayTao ? dayjs(item.ngayTao).format("DD/MM/YYYY HH:mm") : ""}</div>
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />
            <style>{`.notification-item-hover:hover { background-color: #fafafa !important; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.05); } .ant-menu-horizontal { border-bottom: none !important; }`}</style>
        </div>
    );

    return (
        <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
            <Header style={{ position: 'sticky', top: 0, zIndex: 1000, width: '100%', display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: "0 2px 12px rgba(0,0,0,0.04)", padding: "0 32px", height: 64 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: 48, cursor: 'pointer' }} onClick={() => navigate('/user')}>
                    <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, #1890ff 0%, #0050b3 100%)", borderRadius: 10, marginRight: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: 18, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(24,144,255,0.3)' }}>E</div>
                    <Text strong style={{ fontSize: 18, color: "#001529", letterSpacing: 0.5 }}>WORKSPACE</Text>
                </div>
                <Menu mode="horizontal" selectedKeys={[getActiveMenuKey()]} items={menuItems} onClick={({ key }) => navigate(key)} style={{ flex: 1, fontSize: 15, background: 'transparent' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <Popover content={notificationContent} title={<div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}><Text strong style={{ fontSize: 16 }}>Thông báo hệ thống</Text></div>} trigger="click" placement="bottomRight" overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}>
                        <Badge count={unreadCount} size="small" offset={[-2, 4]}><Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 20, color: '#595959' }} />} style={{ width: 40, height: 40, background: '#f0f2f5' }} /></Badge>
                    </Popover>
                    <Dropdown menu={{ items: [{ key: "profile", icon: <UserOutlined />, label: "Hồ sơ cá nhân", onClick: () => navigate("/user/profile") }, { type: "divider" }, { key: "logout", icon: <LogoutOutlined />, danger: true, label: "Đăng xuất", onClick: handleLogout }] }} placement="bottomRight" arrow={{ pointAtCenter: true }}>
                        <Space style={{ cursor: "pointer", padding: "6px 16px 6px 6px", borderRadius: 32, border: '1px solid #e8e8e8', background: "#fff", transition: "all 0.3s" }}>
                            <Avatar src={(userInfo.AnhDaiDien || userInfo.anhDaiDien) ? `http://localhost:3000${userInfo.AnhDaiDien || userInfo.anhDaiDien}` : null} style={{ backgroundColor: "#1890ff" }} icon={<UserOutlined />} size="default" />
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, paddingRight: 4 }}>
                                <Text strong style={{ fontSize: 14, color: '#262626' }}>{userInfo.HoTen || userInfo.hoTen}</Text>
                                <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{userInfo.TenVaiTro || userInfo.tenVaiTro || userInfo.TenChucVu || "Nhân viên"}</Text>
                            </div>
                        </Space>
                    </Dropdown>
                </div>
            </Header>
            <Content style={{ padding: '32px 48px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
                <div className="fade-in" style={{ background: colorBgContainer, minHeight: 'calc(100vh - 180px)', padding: 32, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
                    <Outlet />
                </div>
            </Content>
            <Footer style={{ textAlign: 'center', color: '#8c8c8c', background: 'transparent' }}>
                ERP System ©{dayjs().format('YYYY')} Tích hợp Chữ ký số điện tử
            </Footer>
        </Layout>
    );
};

export default UserLayout;