/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/immutability */
import { useState, useEffect, useRef } from "react";
import { Modal, Button, Spin, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../services/axios";

const ProposalPrintPreview = ({ visible, onClose, maDeXuat }) => {
    const [printData, setPrintData] = useState(null);
    const [loading, setLoading] = useState(false);
    const printRef = useRef();

    useEffect(() => {
        if (visible && maDeXuat) fetchPrintData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, maDeXuat]);

    const fetchPrintData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/proposals/${maDeXuat}/print`);
            setPrintData(res?.data || res);
        } catch (error) { message.error("Lỗi lấy dữ liệu in ấn!"); onClose(); } 
        finally { setLoading(false); }
    };

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>In Văn Bản Số Hóa</title>
                    <style>
                        body { font-family: "Times New Roman", Times, serif; color: #000; padding: 20px 40px; font-size: 16px; line-height: 1.5; }
                        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .header-table td { vertical-align: top; text-align: center; }
                        .opinion-table { width: 100%; margin-top: 15px; page-break-inside: avoid; border: none; }
                        .opinion-table td { padding: 10px; vertical-align: top; }
                    </style>
                </head>
                <body>${printContent}</body>
            </html>
        `);
        printWindow.document.close(); printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); onClose(); }, 250);
    };

    const doc = printData?.thongTinChung || printData?.ThongTinChung || printData;
    const history = printData?.lichSuPheDuyet || printData?.LichSuPheDuyet || [];

    // 🌟 LẤY DANH SÁCH "KÍNH GỬI" ĐỘNG (Từ danh sách người duyệt)
    const danhSachKinhGui = [...new Set(history.map(h => h.TenChucVu || h.tenChucVu || h.TenVaiTro || "Ban Giám Đốc"))];

    // 🌟 ĐỔI TITLE DỰA VÀO LOẠI TÀI LIỆU
    const isDeXuat = String(doc?.TenLoaiTaiLieu || doc?.LoaiDeXuat || "").toUpperCase().includes("ĐỀ XUẤT");
    const documentTitle = isDeXuat ? "GIẤY ĐỀ XUẤT" : "TỜ TRÌNH";

    return (
        <Modal title={<span style={{ color: '#0050b3' }}>XEM TRƯỚC BẢN IN VĂN BẢN KÝ SỐ</span>} open={visible} onCancel={onClose} width={900}
            footer={[ <Button key="cancel" onClick={onClose}>Đóng</Button>, <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint} style={{ backgroundColor: '#0050b3' }} disabled={!doc}> Xác nhận Xuất PDF / In phôi </Button> ]} destroyOnClose
        >
            <Spin spinning={loading} tip="Đang dựng hình ảnh phôi in...">
                {doc ? (
                    <div ref={printRef} style={{ padding: '10px 20px', fontFamily: '"Times New Roman", Times, serif', color: '#000', fontSize: '16px', lineHeight: '1.5' }}>
                        
                        <table className="header-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'top' }}>
                                        BỆNH VIỆN NHÂN DÂN GIA ĐỊNH<br/>
                                        <b style={{ textTransform: 'uppercase' }}>PHÒNG {doc.TenPhongBan || doc.tenPhongBan || "CHUYÊN MÔN"}</b><br/>
                                        <hr style={{ width: '40%', borderTop: '1px solid #000', margin: '5px auto' }}/>
                                    </td>
                                    <td style={{ width: '60%', textAlign: 'center', verticalAlign: 'top' }}>
                                        <b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br/>
                                        <b>Độc lập - Tự do - Hạnh phúc</b><br/>
                                        <hr style={{ width: '50%', borderTop: '1px solid #000', margin: '5px auto' }}/>
                                        <i style={{ fontSize: '15px' }}>
                                            Thành phố Hồ Chí Minh, ngày {dayjs(doc.NgayTao || doc.ngayTao).format("DD")} tháng {dayjs(doc.NgayTao || doc.ngayTao).format("MM")} năm {dayjs(doc.NgayTao || doc.ngayTao).format("YYYY")}
                                        </i>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ textAlign: 'center', margin: '20px 0 30px 0' }}>
                            <b style={{ fontSize: '22px' }}>{documentTitle}</b><br/>
                            <b style={{ fontSize: '16px' }}>Về việc {doc.TieuDe || doc.tieuDe}</b>
                        </div>

                        {/* 🌟 KÍNH GỬI TỰ ĐỘNG PHÁT SINH */}
                        <div style={{ paddingLeft: '40px', marginBottom: '20px' }}>
                            <b style={{ fontStyle: 'italic' }}>Kính gửi:</b>
                            <ul style={{ margin: '5px 0', paddingLeft: '40px', listStyleType: 'circle' }}>
                                {danhSachKinhGui.map((nguoiNhan, idx) => (
                                    <li key={idx}><b>{nguoiNhan}</b>;</li>
                                ))}
                            </ul>
                        </div>

                        {/* NỘI DUNG TỜ TRÌNH */}
                        <div style={{ textAlign: 'justify', whiteSpace: 'pre-wrap', marginBottom: '30px' }}>
                            {doc.NoiDung || doc.noiDung}
                            <div style={{ marginTop: '20px' }}><i>Kính đề xuất Ban Giám đốc xem xét, phê duyệt./.</i></div>
                        </div>

                        {/* CHỮ KÝ NGƯỜI LẬP */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                            <div style={{ textAlign: 'center', width: '300px' }}>
                                <b style={{ fontSize: '16px' }}>NGƯỜI LẬP VĂN BẢN</b><br/>
                                <i style={{ fontSize: '14px' }}>(Đã ký điện tử)</i>
                                <div style={{ height: '90px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
                                    {(doc.ChuKyNguoiTao || doc.chuKyNguoiTao) ? (
                                        <img src={(doc.ChuKyNguoiTao || doc.chuKyNguoiTao).startsWith('http') ? (doc.ChuKyNguoiTao || doc.chuKyNguoiTao) : `http://localhost:3000${doc.ChuKyNguoiTao || doc.chuKyNguoiTao}`} alt="Chữ ký người lập" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                                    ) : <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: '13px' }}>(Chưa cài đặt chữ ký số)</span>}
                                </div>
                                <b>{doc.NguoiTaoTen || doc.nguoiTaoTen || "Nhân viên"}</b>
                            </div>
                        </div>

                        {/* Ý KIẾN CÁC SẾP (Giữ nguyên bố cục 2 cột đỉnh cao) */}
                        <div style={{ marginTop: '30px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                            {history.filter(h => (h.TrangThai || h.trangThai) === 'DA_KY').map((approver, index) => {
                                const roleName = approver.TenChucVu || approver.tenChucVu || approver.TenVaiTro || approver.tenVaiTro || "LÃNH ĐẠO";
                                const signaturePath = approver.DuongDanAnhChuKy || approver.duongDanAnhChuKy;
                                const url = signaturePath ? (signaturePath.startsWith('http') ? signaturePath : `http://localhost:3000${signaturePath}`) : null;
                                return (
                                    <table key={index} className="opinion-table">
                                        <tbody>
                                            <tr>
                                                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'left', paddingRight: '20px' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>❖ Ý KIẾN CHỈ ĐẠO CỦA {roleName}:</div>
                                                    <div style={{ fontStyle: 'italic', marginTop: '10px', minHeight: '50px' }}>"{approver.YKien || approver.yKien || "Đồng ý đề xuất."}"</div>
                                                    <div style={{ fontSize: '13px', color: '#555', marginTop: '10px' }}>Xác nhận lúc: {dayjs(approver.ThoiGianKy || approver.thoiGianKy).format("HH:mm DD/MM/YYYY")}</div>
                                                </td>
                                                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>{roleName}</div>
                                                    <div style={{ fontStyle: 'italic', fontSize: '14px', marginBottom: '10px' }}>(Đã ký điện tử)</div>
                                                    <div style={{ height: '90px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        {url ? <img src={url} alt="Chữ ký" style={{ maxHeight: '80px', objectFit: 'contain' }} /> : <span style={{ color: 'red', border: '2px solid red', padding: '5px', transform: 'rotate(-15deg)', fontWeight: 'bold' }}>ĐÃ DUYỆT</span>}
                                                    </div>
                                                    <b style={{ color: 'red', fontSize: '16px' }}>{approver.NguoiDuyet || approver.nguoiDuyet}</b>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                );
                            })}
                        </div>
                    </div>
                ) : ( <div style={{ textAlign: 'center', padding: '40px' }}>Không có dữ liệu hiển thị.</div> )}
            </Spin>
        </Modal>
    );
};

export default ProposalPrintPreview;