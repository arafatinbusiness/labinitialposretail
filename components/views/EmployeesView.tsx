import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  CalendarCheck, 
  Banknote, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Search,
  BarChart3,
  Eye,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Employee, AttendanceRecord, SalaryRecord, BusinessSettings } from '../../types';

type SubTab = 'manage' | 'new' | 'attendance' | 'salary' | 'reports';

interface EmployeesViewProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  salaries: SalaryRecord[];
  setSalaries: React.Dispatch<React.SetStateAction<SalaryRecord[]>>;
  t: (key: string) => string;
  business: BusinessSettings;
}

const EmployeesView: React.FC<EmployeesViewProps> = ({ 
  employees, 
  setEmployees, 
  attendance, 
  setAttendance, 
  salaries, 
  setSalaries, 
  t,
  business
}) => {
  const [activeTab, setActiveTab] = useState<SubTab>('manage');
  const [search, setSearch] = useState('');

  // Manage State
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Employee State
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({});

  // Attendance State
  const [attendDate, setAttendDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tempAttendance, setTempAttendance] = useState<Record<string, string>>({});

  // Salary State
  const [salaryMonth, setSalaryMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payingEmp, setPayingEmp] = useState<Employee | null>(null);

  // Report State
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [reportType, setReportType] = useState<'attendance' | 'salary'>('attendance');
  const [detailedEmp, setDetailedEmp] = useState<Employee | null>(null);

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  // --- Actions ---

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.phone) return;
    
    const emp: Employee = {
      id: Date.now().toString(),
      name: newEmp.name,
      designation: newEmp.designation || 'Staff',
      phone: newEmp.phone,
      salary: Number(newEmp.salary) || 0,
      joinDate: newEmp.joinDate || new Date().toISOString().split('T')[0],
      status: 'active'
    };

    setEmployees([...employees, emp]);
    setNewEmp({});
    setActiveTab('manage');
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('Are you sure you want to remove this employee?')) {
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  const saveAttendance = () => {
    const existing = attendance.filter(a => a.date !== attendDate);
    
    const newRecords: AttendanceRecord[] = Object.entries(tempAttendance).map(([empId, status]) => ({
      id: `${empId}_${attendDate}`,
      employeeId: empId,
      date: attendDate,
      status: status as any
    }));

    const finalRecords = [...existing, ...newRecords];
    setAttendance(finalRecords);
    alert('Attendance Saved!');
  };

  const loadAttendanceForDate = (date: string) => {
    const records = attendance.filter(a => a.date === date);
    const map: Record<string, string> = {};
    employees.forEach(e => {
      const rec = records.find(r => r.employeeId === e.id);
      map[e.id] = rec ? rec.status : 'present'; // Default to present
    });
    setTempAttendance(map);
  };

  React.useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceForDate(attendDate);
    }
  }, [attendDate, activeTab]);

  const handlePaySalary = () => {
    if (!payingEmp) return;
    const existing = salaries.find(s => s.employeeId === payingEmp.id && s.monthStr === salaryMonth);
    if (existing) {
      alert('Salary already paid for this month!');
      return;
    }

    const record: SalaryRecord = {
      id: Date.now().toString(),
      employeeId: payingEmp.id,
      amount: payingEmp.salary,
      date: new Date().toISOString().split('T')[0],
      monthStr: salaryMonth
    };
    setSalaries([...salaries, record]);
    setPayingEmp(null);
  };

  // --- Helpers for Reports ---
  const getAttendanceStats = (empId: string) => {
    const relevantRecords = attendance.filter(a => a.employeeId === empId && a.date.startsWith(reportMonth));
    const stats = { present: 0, absent: 0, leave: 0, half_day: 0 };
    relevantRecords.forEach(r => {
        if (stats[r.status] !== undefined) stats[r.status]++;
    });
    return stats;
  };

  const getDaysInMonth = (yearMonth: string) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });
  };

  // --- Renderers ---

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">{t('employees')}</h2>
        
        {/* Sub-Navigation */}
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto max-w-full">
           {[
             { id: 'manage', icon: Users, label: t('manage_employee') },
             { id: 'new', icon: UserPlus, label: t('new_employee') },
             { id: 'attendance', icon: CalendarCheck, label: t('attendance') },
             { id: 'salary', icon: Banknote, label: t('salary') },
             { id: 'reports', icon: BarChart3, label: t('employee_reports') },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as SubTab)}
               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
             >
               <tab.icon className="w-4 h-4" />
               {tab.label}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
        
        {/* --- MANAGE EMPLOYEES --- */}
        {activeTab === 'manage' && (
          <div className="p-4 md:p-6">
             <div className="flex justify-between mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input 
                    className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900" 
                    placeholder="Search employees..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-gray-50 border-b">
                   <tr>
                     <th className="p-3 font-medium">{t('name')}</th>
                     <th className="p-3 font-medium">{t('designation')}</th>
                     <th className="p-3 font-medium">{t('phone')}</th>
                     <th className="p-3 font-medium">{t('salary')}</th>
                     <th className="p-3 font-medium">{t('status')}</th>
                     <th className="p-3 font-medium text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {filteredEmployees.map(emp => (
                     <tr key={emp.id} className="hover:bg-gray-50">
                       <td className="p-3 font-medium">{emp.name}</td>
                       <td className="p-3 text-gray-600">{emp.designation}</td>
                       <td className="p-3 text-gray-600">{emp.phone}</td>
                       <td className="p-3 font-mono">{business.currency} {emp.salary.toLocaleString()}</td>
                       <td className="p-3">
                         <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                           {emp.status}
                         </span>
                       </td>
                       <td className="p-3 text-right">
                         <div className="flex justify-end gap-2">
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                   {filteredEmployees.length === 0 && (
                     <tr><td colSpan={6} className="p-8 text-center text-gray-400">No employees found</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* --- NEW EMPLOYEE --- */}
        {activeTab === 'new' && (
          <div className="p-6 max-w-2xl mx-auto">
             <h3 className="text-lg font-bold mb-6 text-gray-800">Add New Employee</h3>
             <form onSubmit={handleAddEmployee} className="space-y-4">
                <Input label={t('name')} value={newEmp.name || ''} onChange={e => setNewEmp({...newEmp, name: e.target.value})} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label={t('phone')} value={newEmp.phone || ''} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} required />
                  <Input label={t('designation')} value={newEmp.designation || ''} onChange={e => setNewEmp({...newEmp, designation: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label={t('salary')} type="number" value={newEmp.salary || ''} onChange={e => setNewEmp({...newEmp, salary: Number(e.target.value)})} />
                  <Input label={t('join_date')} type="date" value={newEmp.joinDate || ''} onChange={e => setNewEmp({...newEmp, joinDate: e.target.value})} />
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full md:w-auto">{t('save')}</Button>
                </div>
             </form>
          </div>
        )}

        {/* --- ATTENDANCE --- */}
        {activeTab === 'attendance' && (
           <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <div className="flex items-center gap-3">
                    <label className="font-medium text-gray-700">{t('date')}:</label>
                    <input 
                      type="date" 
                      value={attendDate} 
                      onChange={e => setAttendDate(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                    />
                 </div>
                 <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => {
                        const map: any = {};
                        employees.forEach(e => map[e.id] = 'present');
                        setTempAttendance(map);
                    }}>Mark All Present</Button>
                    <Button onClick={saveAttendance}><Save className="w-4 h-4"/> {t('save')}</Button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {employees.filter(e => e.status === 'active').map(emp => (
                    <div key={emp.id} className="border rounded-xl p-4 flex items-center justify-between bg-gray-50">
                       <div>
                          <p className="font-bold text-gray-800">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.designation}</p>
                       </div>
                       <select 
                         value={tempAttendance[emp.id] || 'present'}
                         onChange={e => setTempAttendance({...tempAttendance, [emp.id]: e.target.value})}
                         className={`text-sm font-bold rounded-lg px-2 py-1 border-2 outline-none cursor-pointer bg-white
                           ${(tempAttendance[emp.id] || 'present') === 'present' ? 'border-green-200 text-green-700' : ''}
                           ${(tempAttendance[emp.id] || 'present') === 'absent' ? 'border-red-200 text-red-700' : ''}
                           ${(tempAttendance[emp.id] || 'present') === 'half_day' ? 'border-orange-200 text-orange-700' : ''}
                           ${(tempAttendance[emp.id] || 'present') === 'leave' ? 'border-blue-200 text-blue-700' : ''}
                         `}
                       >
                          <option value="present">{t('present')}</option>
                          <option value="absent">{t('absent')}</option>
                          <option value="half_day">{t('half_day')}</option>
                          <option value="leave">{t('leave')}</option>
                       </select>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- SALARY --- */}
        {activeTab === 'salary' && (
           <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-gray-700">Salary Disbursement</h3>
                 <input 
                    type="month" 
                    value={salaryMonth} 
                    onChange={e => setSalaryMonth(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                 />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                     <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Base Salary</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {employees.filter(e => e.status === 'active').map(emp => {
                        const paidRecord = salaries.find(s => s.employeeId === emp.id && s.monthStr === salaryMonth);
                        return (
                           <tr key={emp.id} className="hover:bg-gray-50">
                              <td className="p-3 font-medium">
                                 {emp.name}
                                 <div className="text-xs text-gray-400">{emp.designation}</div>
                              </td>
                              <td className="p-3 font-mono">{business.currency} {emp.salary}</td>
                              <td className="p-3 text-center">
                                 {paidRecord ? (
                                    <span className="flex items-center justify-center gap-1 text-green-600 font-bold text-xs uppercase bg-green-50 py-1 px-2 rounded-full">
                                       <CheckCircle2 className="w-3 h-3"/> Paid ({paidRecord.amount})
                                    </span>
                                 ) : (
                                    <span className="text-orange-500 font-bold text-xs uppercase bg-orange-50 py-1 px-2 rounded-full">Unpaid</span>
                                 )}
                              </td>
                              <td className="p-3 text-right">
                                 {!paidRecord && (
                                    <button 
                                      onClick={() => setPayingEmp(emp)}
                                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                                    >
                                       Pay Now
                                    </button>
                                 )}
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
                </table>
              </div>

              {/* Payment Confirmation Modal */}
              {payingEmp && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
                       <h3 className="text-lg font-bold mb-2">Confirm Payment</h3>
                       <p className="text-sm text-gray-600 mb-4">
                          Paying <b>{payingEmp.name}</b> for <b>{salaryMonth}</b>
                       </p>
                       <div className="bg-gray-100 p-3 rounded-lg mb-4 text-center">
                          <span className="text-sm text-gray-500 block">Amount</span>
                          <span className="text-2xl font-bold text-indigo-700">{business.currency}{payingEmp.salary.toLocaleString()}</span>
                       </div>
                       <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setPayingEmp(null)} className="flex-1">Cancel</Button>
                          <Button onClick={handlePaySalary} className="flex-1">Confirm Pay</Button>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        )}

        {/* --- REPORTS --- */}
        {activeTab === 'reports' && (
           <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <div className="flex items-center gap-3">
                    <label className="font-medium text-gray-700">Month:</label>
                    <input 
                      type="month" 
                      value={reportMonth} 
                      onChange={e => setReportMonth(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                    />
                 </div>
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                       onClick={() => setReportType('attendance')}
                       className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${reportType === 'attendance' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                       {t('attendance_summary')}
                    </button>
                    <button 
                       onClick={() => setReportType('salary')}
                       className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${reportType === 'salary' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                       {t('salary_statement')}
                    </button>
                 </div>
              </div>

              <div className="bg-white border rounded-xl overflow-hidden">
                 {reportType === 'attendance' ? (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-gray-50 border-b">
                         <tr>
                            <th className="p-4 font-medium">{t('name')}</th>
                            <th className="p-4 font-medium text-center text-green-600">{t('present')}</th>
                            <th className="p-4 font-medium text-center text-red-600">{t('absent')}</th>
                            <th className="p-4 font-medium text-center text-orange-600">{t('half_day')}</th>
                            <th className="p-4 font-medium text-center text-blue-600">{t('leave')}</th>
                            <th className="p-4 font-medium text-right">Details</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y">
                          {employees.filter(e => e.status === 'active').map(emp => {
                             const stats = getAttendanceStats(emp.id);
                             return (
                               <tr key={emp.id} className="hover:bg-gray-50">
                                  <td className="p-4 font-medium">
                                    {emp.name}
                                    <div className="text-xs text-gray-400">{emp.designation}</div>
                                  </td>
                                  <td className="p-4 text-center font-bold">{stats.present}</td>
                                  <td className="p-4 text-center text-gray-600">{stats.absent}</td>
                                  <td className="p-4 text-center text-gray-600">{stats.half_day}</td>
                                  <td className="p-4 text-center text-gray-600">{stats.leave}</td>
                                  <td className="p-4 text-right">
                                    <button 
                                      onClick={() => setDetailedEmp(emp)}
                                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                      title="View Calendar"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </td>
                               </tr>
                             );
                          })}
                       </tbody>
                     </table>
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                      <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                         <span className="text-indigo-900 font-bold text-sm uppercase tracking-wide">{t('total_paid')}</span>
                         <span className="text-xl font-bold text-indigo-700">
                           {business.currency}
                           {salaries
                              .filter(s => s.monthStr === reportMonth)
                              .reduce((sum, rec) => sum + rec.amount, 0)
                              .toLocaleString()}
                         </span>
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                             <th className="p-4 font-medium">{t('name')}</th>
                             <th className="p-4 font-medium">{t('status')}</th>
                             <th className="p-4 font-medium">Payment Date</th>
                             <th className="p-4 font-medium text-right">{t('salary')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                           {employees.filter(e => e.status === 'active').map(emp => {
                              const paidRecord = salaries.find(s => s.employeeId === emp.id && s.monthStr === reportMonth);
                              return (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                   <td className="p-4 font-medium">
                                      {emp.name}
                                      <div className="text-xs text-gray-400">{emp.designation}</div>
                                   </td>
                                   <td className="p-4">
                                      {paidRecord ? (
                                         <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 uppercase">Paid</span>
                                      ) : (
                                         <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 uppercase">Unpaid</span>
                                      )}
                                   </td>
                                   <td className="p-4 text-gray-600">
                                      {paidRecord ? paidRecord.date : '-'}
                                   </td>
                                   <td className="p-4 text-right font-mono font-medium">
                                      {paidRecord ? (business.currency + paidRecord.amount.toLocaleString()) : '-'}
                                   </td>
                                </tr>
                              );
                           })}
                        </tbody>
                      </table>
                   </div>
                 )}
              </div>
           </div>
        )}

      </div>

      {/* --- Detailed Attendance Modal --- */}
      {detailedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800">{detailedEmp.name}</h3>
                    <p className="text-sm text-gray-500">Attendance Log: <span className="font-mono font-medium text-gray-700">{reportMonth}</span></p>
                 </div>
                 <button onClick={() => setDetailedEmp(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {getDaysInMonth(reportMonth).map(date => {
                       const record = attendance.find(a => a.employeeId === detailedEmp.id && a.date === date);
                       const status = record?.status;
                       const dayNum = date.split('-')[2];
                       
                       let statusClass = "bg-gray-50 border-gray-100 text-gray-400"; // Default / No Data
                       let label = "No Data";

                       if (status === 'present') {
                          statusClass = "bg-green-50 border-green-200 text-green-700";
                          label = "Present";
                       } else if (status === 'absent') {
                          statusClass = "bg-red-50 border-red-200 text-red-700";
                          label = "Absent";
                       } else if (status === 'half_day') {
                          statusClass = "bg-orange-50 border-orange-200 text-orange-700";
                          label = "Half Day";
                       } else if (status === 'leave') {
                          statusClass = "bg-blue-50 border-blue-200 text-blue-700";
                          label = "Leave";
                       }

                       return (
                          <div key={date} className={`border rounded-lg p-3 flex flex-col items-center justify-center text-center transition-all hover:shadow-md ${statusClass}`}>
                             <span className="text-lg font-bold mb-1">{dayNum}</span>
                             <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
                          </div>
                       );
                    })}
                 </div>
              </div>

              <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                 <Button onClick={() => setDetailedEmp(null)}>Close</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesView;