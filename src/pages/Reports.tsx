import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/auth';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export default function Reports() {
  const { user } = useAuthStore();
  const [reportType, setReportType] = useState('staff_movements');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [departmentId, setDepartmentId] = useState('all');
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    let endpoint = '';
    if (reportType === 'staff_movements') endpoint = '/api/reports/daily-staff-movements';
    else if (reportType === 'visitor_analytics') endpoint = '/api/reports/visitor-analytics';
    else if (reportType === 'security_violations') endpoint = '/api/reports/security-violations';
    
    try {
      const { data: result } = await axios.get(`${endpoint}?startDate=${startDate}&endDate=${endDate}&departmentId=${departmentId}`);
      const parsedData = reportType === 'visitor_analytics' ? result.types || [] : result || [];
      setData(Array.isArray(parsedData) ? parsedData : []);
    } catch (e) {
      console.error(e);
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, departmentId]);

  const exportToCSV = () => {
    if (!data.length) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report.csv`;
    a.click();
  };

  const exportToExcel = () => {
    if (!data.length) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${reportType}_report.xlsx`);
  };

  const exportToPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.text(`Nelson Hospital - ${reportType.replace('_', ' ').toUpperCase()}`, 14, 15);
    
    const headers = Object.keys(data[0]);
    const body = data.map(obj => Object.values(obj).map(v => String(v)));
    
    (doc as any).autoTable({
      head: [headers],
      body: body,
      startY: 20,
    });
    
    doc.save(`${reportType}_report.pdf`);
  };

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER')) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-500">You do not have permission to view reports.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-[#003366]">Comprehensive Reports</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-1">Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full border p-2 rounded">
                <option value="staff_movements">Daily Staff Movements</option>
                <option value="visitor_analytics">Visitor Analytics</option>
                <option value="security_violations">Security Violations & Late Returns</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full border p-2 rounded">
                <option value="all">All Departments</option>
                <option value="1">Administration</option>
                <option value="2">Clinical Services</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button onClick={exportToPDF} className="bg-red-500 text-white px-4 py-2 rounded font-semibold hover:bg-red-600 transition">Export PDF</button>
            <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition">Export Excel</button>
            <button onClick={exportToCSV} className="bg-blue-500 text-white px-4 py-2 rounded font-semibold hover:bg-blue-600 transition">Export CSV</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading data...</div>
          ) : data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003366] text-white text-sm">
                  <tr>
                    {Object.keys(data[0]).map(key => (
                      <th key={key} className="px-4 py-3 capitalize">{key.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-200">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-4 py-3">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">No data found for the selected criteria.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
