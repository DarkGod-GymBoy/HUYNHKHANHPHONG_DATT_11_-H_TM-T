import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import './responsive.css';
// ----------------------------------------------------------------------
// 1. IMPORT CÁC TRANG (PAGES) VÀ BỐ CỤC (LAYOUTS)
// ----------------------------------------------------------------------
// Layouts (Bố cục dùng chung)
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';

// Các trang không cần đăng nhập
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';


// Các trang cần đăng nhập
import AdminDashboard from "./pages/admin/AdminDashboard";

import DepartmentManagement from "./pages/admin/DepartmentManagement";
import PositionManagement from "./pages/admin/PositionManagement";
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import ProposalManagement from './pages/admin/ProposalManagement';
import SignatureManagement from './pages/admin/SignatureManagement';
import TaskManager from "./pages/admin/TaskManager";
import TaskReportManager from "./pages/admin/TaskReportManager";
import RoleManager from "./pages/admin/RoleManager";
import DocumentManagement from './pages/admin/DocumentManagement';

import UserDashboard from './pages/user/UserDashboard'; 
import UserProfile from './pages/user/UserProfile';
import UserTasks from './pages/user/UserTasks';
import UserProposal from './pages/user/UserProposal';
import UserTaskReports from './pages/user/UserTaskReports';
import UserDocument from './pages/user/UserDocument';


// Trang Lỗi 404
const NotFoundPage = () => (
  <div style={{ textAlign: 'center', marginTop: '100px' }}>
    <h1>404 - Không tìm thấy trang</h1>
    <a href="/">Quay về trang chủ</a>
  </div>
);

// ----------------------------------------------------------------------
// 2. COMPONENT BẢO VỆ ROUTE (Phân quyền người dùng)
// ----------------------------------------------------------------------
const ProtectedRoute = ({ allowedRoles }) => {
  // ĐÃ SỬA: Đồng bộ key lấy từ localStorage thành 'token' cho khớp với Dashboard
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  // Nếu chưa có Token -> Đá văng về trang Đăng nhập
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  // Ép kiểu chuỗi JSON về Object để đọc thông tin
  const user = JSON.parse(userStr);
  const userRole = user.MaVaiTro;

  // Nếu người dùng không nằm trong nhóm quyền được phép vào Route này -> Trả về 404
  if (!allowedRoles.includes(userRole)) {
    return <NotFoundPage />;
  }

  // Nếu hợp lệ, cho phép render các trang con bên trong (Outlet)
  return <Outlet />;
};

// ----------------------------------------------------------------------
// 3. CẤU HÌNH ROUTER CHÍNH
// ----------------------------------------------------------------------
function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* === NHÓM 1: CÁC TRANG KHÔNG CẦN ĐĂNG NHẬP (Dùng chung AuthLayout) === */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* === NHÓM 2: KHU VỰC CỦA ADMIN (Mã vai trò = 1) === */}
        <Route element={<ProtectedRoute allowedRoles={[1]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/departments" element={<DepartmentManagement />} />
            <Route path="/admin/positions" element={<PositionManagement />} />
            <Route path="/admin/employees" element={<EmployeeManagement />} />
            <Route path="/admin/tasks" element={<TaskManager />} />
            <Route path="/admin/tasks/:taskId/reports" element={<TaskReportManager />} />
            <Route path="/admin/roles" element={<RoleManager />} />
            <Route path="/admin/proposals" element={<ProposalManagement />} />
            <Route path="/admin/signatures" element={<SignatureManagement/>}/>
            <Route path="/admin/documents" element={< DocumentManagement/>} />
            {/* Thêm các Route quản lý dành cho Admin ở đây sau */}
          </Route>
        </Route>

        {/* === NHÓM 3: KHU VỰC CỦA NHÂN VIÊN/TRƯỞNG PHÒNG (Mã vai trò = 2, 3, 4) === */}
        <Route element={<ProtectedRoute allowedRoles={[2, 3, 4, 5]} />}>
          <Route element={<UserLayout />}>
            <Route path="/user" element={<UserDashboard />} />
            <Route path="/user/profile" element={<UserProfile />} />
            <Route path="/user/tasks" element={<UserTasks />} />
            <Route path="/user/proposals" element={<UserProposal />} />
            <Route path="/user/tasks/:taskId/reports" element={<UserTaskReports />} />
            <Route path="/user/documents" element={ < UserDocument/>}/>
            {/* Thêm các Route dành cho Nhân viên/Trưởng phòng ở đây sau */}
          </Route>
        </Route>

        {/* === TRANG CATCH-ALL (Lỗi 404) === */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;