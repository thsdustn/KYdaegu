import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, FileText, BarChart3, Calendar, Clock, Printer, Search, ChevronRight, School, 
  MessageSquare, CalendarCheck, X, FileSpreadsheet, PenTool, CheckCircle2,
  Plus, Upload, ChevronLeft, Phone, Building, Bookmark, ChevronDown, LayoutList, UploadCloud, DownloadCloud,
  ArrowDownAZ, ArrowUpZA, Settings, Trash2, UserPlus, ListChecks, Trophy, LayoutDashboard, AlertTriangle
} from 'lucide-react';

const ATTENDANCE_OPTIONS = ['출석', '결석', '지각', '조퇴', '사전통보', '병결', '알바', '가족사정', '개인사정', '컨디션 난조', '학교', '시험', '과제', '실습', '타학원', '독서실', '기타'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DISPLAY_MONTHS = MONTHS.slice(0, 11); 

const calculateTimeDiff = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return '-';
  const parse = (t) => { const parts = t.split(':'); return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0); };
  let inMins = parse(timeIn); let outMins = parse(timeOut);
  if (outMins < inMins) outMins += 24 * 60; 
  const diff = outMins - inMins;
  if (isNaN(diff) || diff <= 0) return '-';
  return `${Math.floor(diff / 60)}시간 ${diff % 60}분`;
};

const parseTimeDiffToMins = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;
  const parse = (t) => { const parts = t.split(':'); return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0); };
  let inMins = parse(timeIn); let outMins = parse(timeOut);
  if (outMins < inMins) outMins += 24 * 60; 
  const diff = outMins - inMins;
  return (isNaN(diff) || diff <= 0) ? 0 : diff;
};

const formatMinsToTime = (mins) => {
    if (!mins) return '0시간 0분';
    return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
};

const calculateTotalStudyTime = (dailyArray) => {
  let totalMins = 0;
  dailyArray.forEach(d => { totalMins += parseTimeDiffToMins(d.in, d.out); });
  return formatMinsToTime(totalMins);
};

const getStudyTimeStats = (student) => {
    let totalMins = 0;
    let daysStudied = 0;
    MONTHS.forEach(m => {
        const daily = student.studyTime[m] || [];
        daily.forEach(d => {
            const diff = parseTimeDiffToMins(d.in, d.out);
            if (diff > 0) { totalMins += diff; daysStudied++; }
        });
    });
    const avgMins = daysStudied > 0 ? Math.floor(totalMins / daysStudied) : 0;
    return { totalStr: formatMinsToTime(totalMins), totalMins, avgStr: formatMinsToTime(avgMins), daysStudied };
};

const emptyMonthlyScore = { score: '', percent: '', classRank: '', totalRank: '', trackAvg: '', top30Avg: '', trackAvgDiff: '', top30Diff: '' };

const generateEmptyMonthlyData = () => {
  const data = {}; 
  MONTHS.forEach(m => { data[m] = { english: { ...emptyMonthlyScore }, math: { ...emptyMonthlyScore }, total: { ...emptyMonthlyScore } }; }); 
  return data;
};

const generateEmptyMonthlyAttendance = () => {
    const data = {};
    MONTHS.forEach(m => { data[m] = { am: Array(31).fill(''), pm: Array(31).fill(''), amMemo: Array(31).fill(''), pmMemo: Array(31).fill('') }; });
    return data;
};

const generateEmptyMonthlyStudyTime = () => {
    const data = {};
    MONTHS.forEach(m => { data[m] = Array.from({length: 31}, () => ({in: '', out: ''})); });
    return data;
}

const generateEmptyMonthlyDaily = () => {
    const data = {};
    MONTHS.forEach(m => { data[m] = Array.from({length: 31}, () => ({ t1: '', t2: '' })); });
    return data;
}

const createStudent = (id, userId, name, startMonth, targetTrack, mEng, mMath, wEng, wMath, monData) => {
    const baseMonthly = generateEmptyMonthlyData();
    if(monData) {
        Object.keys(monData).forEach(m => {
            if(baseMonthly[m]) {
                baseMonthly[m] = {
                    english: { ...baseMonthly[m].english, ...(monData[m].english || {}) },
                    math: { ...baseMonthly[m].math, ...(monData[m].math || {}) },
                    total: { ...baseMonthly[m].total, ...(monData[m].total || {}) }
                }
            }
        });
    }

    return {
      id, userId, name, startMonth: startMonth || '1월', className: "GB1A", gender: id.includes("586") ? "여" : "남",
      contact: "010-0000-0000", parentContact: "010-1111-1111", address: "대구/경북",
      university: "대학교", major: "전공", gradStatus: "재학/휴학", transferType: "일반",
      targetTrack, credits: 70, gpa: "3.5", motivation: "학벌", englishScore: "토익",
      notes: "", consulting: { "4월": "성실하게 진행 중." },
      studyTime: generateEmptyMonthlyStudyTime(),
      attendance: generateEmptyMonthlyAttendance(),
      dailyRecords: generateEmptyMonthlyDaily(),
      scores: { 
          mockEnglish: mEng || {}, mockMath: mMath || {}, 
          weeklyEnglish: wEng || {}, weeklyMath: wMath || {}, 
          monthly: baseMonthly, weeklyDetails: {}, weeklyDetailsMath: {} 
      }
    }
};

const initialMockData = [
  createStudent("K01028546", "jac1215141", "옥영빈", "1월", "인문계", { m4: 96.5, percent: 98.2, date: '2026-04-25' }, {}, { w1: 90, w2: 85, avg: 87.5 }, {}, { '4월': { english: { score: 96.5, percent: 98.2 } }}),
  createStudent("K00987586", "m020305", "강가윤", "1월", "사범계", {}, {}, {}, {}, {}),
  createStudent("K01027609", "mathking", "이수학", "3월", "자연계", {}, {}, {}, {}, {})
];

export default function App() {
  const [academicYear, setAcademicYear] = useState('2026');
  const [classes, setClasses] = useState(['GB1A', 'GB1B', 'GB2A', 'S-CLASS']);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newClassName, setNewClassName] = useState('');
  const [students, setStudents] = useState(initialMockData);
  const [isXlsxReady, setIsXlsxReady] = useState(false);

  // 2단계 & 4단계: 학년도별 localStorage 최상위 자동 저장 및 불러오기 통합
  useEffect(() => {
    const savedData = localStorage.getItem(`studentManagement_${academicYear}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.classes) setClasses(parsed.classes);
      } catch (e) {
        console.error("데이터 로드 실패", e);
      }
    } else {
      // 저장된 데이터가 없으면 학년도에 따라 초기화
      if (academicYear === '2026') {
        setStudents(initialMockData);
      } else {
        setStudents([]);
      }
      setClasses(['GB1A', 'GB1B', 'GB2A', 'S-CLASS']);
    }
  }, [academicYear]);

  // 4단계: 학년도별 localStorage 자동 저장
  useEffect(() => {
    localStorage.setItem(`studentManagement_${academicYear}`, JSON.stringify({ classes, students }));
  }, [classes, students, academicYear]);

  /* * [7단계: Supabase/Firebase 연동 준비 가이드 (데이터 구조 분리 제안)]
   * 현재는 localStorage를 이용해 JSON 통짜 데이터를 저장하고 있지만,
   * 추후 클라우드 DB 연동 시에는 아래와 같이 컬렉션(테이블)을 분리하는 것이 효율적입니다.
   * * 1. users (학번, 이름, 계열, 연락처 등 신상 정보)
   * 2. attendance (키: userId_month_day, 값: 출석상태, 메모)
   * 3. studyTime (키: userId_month_day, 값: 등원/하원 시간)
   * 4. scores_daily (키: userId_month_day, 값: t1, t2 점수)
   * 5. scores_weekly (키: userId_month_week, 값: 점수 및 문항별 정오답)
   * 6. scores_monthly (키: userId_month, 값: 영/수 백분위 및 원점수)
   * * ※ 다음 스텝에서 Firebase 라이브러리 추가 및 useEffect 내 fetch/subscribe 로직을 적용하면 됩니다.
   * ※ 현재 localStorage를 대체하는 방식으로 setStudents()를 덮어씌울 예정이므로 기존 UI는 변경 없이 유지됩니다.
   */

  // 3단계: JSON 백업 (Export) - 학년도 파일명 반영
  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ classes, students }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Academy_Backup_${academicYear}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 3단계: JSON 불러오기 (Import)
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.classes) setClasses(parsed.classes);
        alert("데이터 복원이 완료되었습니다.");
      } catch (err) {
        alert("유효하지 않은 백업 파일입니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 초기화
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    script.onload = () => setIsXlsxReady(true);
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const handleAddClass = (e) => {
    e.preventDefault();
    if (newClassName.trim() && !classes.includes(newClassName.trim().toUpperCase())) {
      setClasses([...classes, newClassName.trim().toUpperCase()]); setNewClassName('');
    }
  };

  const classStats = useMemo(() => {
    const stats = { '대구캠퍼스 전체': students.length };
    classes.forEach(cls => stats[cls] = 0);
    students.forEach(s => { if (stats[s.className] !== undefined) stats[s.className]++; });
    return stats;
  }, [students, classes]);

  if (!selectedClass) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative">
        {/* 3단계: JSON 백업 / 불러오기 상단 관리자 버튼 */}
        <div className="absolute top-6 right-6 flex gap-3">
           <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              <UploadCloud size={16} /> 데이터 복원 (JSON)
              <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
           </label>
           <button onClick={handleExportJSON} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white shadow-sm rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
              <DownloadCloud size={16} /> 데이터 백업 (JSON)
           </button>
        </div>

        <div className="max-w-5xl w-full mt-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl mb-5 shadow-sm"><School size={36} /></div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">종합반 학생 관리 시스템</h1>
            <p className="text-lg text-slate-500 font-medium">신상정보 연동 및 성적/출결 데이터를 관리할 영역을 선택하세요.</p>
            
            <div className="mt-6 inline-flex items-center gap-3 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
               <span className="text-sm font-bold text-slate-600 pl-3">학년도 선택:</span>
               <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="bg-slate-100 border-none outline-none font-bold text-indigo-700 py-1.5 px-4 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                  <option value="2026">2026학년도</option>
                  <option value="2027">2027학년도</option>
                  <option value="2028">2028학년도</option>
               </select>
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-xl font-bold text-slate-700 mb-4 px-2">캠퍼스 전체 통합 관리</h2>
            <div onClick={() => setSelectedClass('대구캠퍼스 전체')} className="bg-indigo-600 rounded-3xl p-8 shadow-lg hover:shadow-xl hover:bg-indigo-700 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-full bg-white opacity-5 transform skew-x-12 translate-x-10 group-hover:translate-x-0 transition-transform duration-500"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6">
                <div className="flex items-center gap-6"><div className="bg-white/20 p-5 rounded-2xl text-white"><School size={40} /></div>
                  <div><h2 className="text-3xl font-extrabold text-white mb-2">대구캠퍼스 전체</h2><p className="text-indigo-100 font-medium">캠퍼스 전체 학생 명단, 통합 성적 및 출결을 일괄로 관리합니다.</p></div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                   <div className="text-right"><div className="text-indigo-200 text-sm font-bold mb-1">총 등록 인원</div><div className="text-white text-3xl font-extrabold">{classStats['대구캠퍼스 전체']}명</div></div>
                   <div className="flex items-center bg-white text-indigo-600 px-5 py-3 rounded-xl font-bold shadow-sm group-hover:scale-105 transition-transform">접속하기 <ChevronRight size={20} className="ml-1"/></div>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-700 mb-4 px-2">개별 반 관리</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {classes.map((clsName) => (
              <div key={clsName} onClick={() => setSelectedClass(clsName)} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all cursor-pointer group transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors">{clsName}</h2>
                  <span className="bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 px-3 py-1 text-sm font-bold rounded-full transition-colors">{classStats[clsName]}명</span>
                </div>
                <div className="flex items-center text-slate-400 group-hover:text-indigo-500 text-sm font-bold gap-1 transition-colors">명단 접속 <ChevronRight size={16} /></div>
              </div>
            ))}
            <form onSubmit={handleAddClass} className="bg-slate-100/50 rounded-2xl p-6 border-2 border-dashed border-slate-300 flex flex-col justify-center transition-colors focus-within:border-indigo-400 focus-within:bg-indigo-50/30">
              <h2 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-1.5"><Plus size={16}/> 새 반 기입하기</h2>
              <div className="flex gap-2">
                <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="반 이름 입력..." className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" />
                <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap">추가</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <ClassDashboard academicYear={academicYear} className={selectedClass} classes={classes} onBack={() => setSelectedClass(null)} students={students} setStudents={setStudents} isXlsxReady={isXlsxReady} />;
}

function ClassDashboard({ academicYear, className, classes, onBack, students, setStudents, isXlsxReady }) {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [activeTestTab, setActiveTestTab] = useState('monthly'); 
  const [activeDailyTab, setActiveDailyTab] = useState('input'); 
  const [activeWeeklyTab, setActiveWeeklyTab] = useState('setup'); 
  const [testViewMode, setTestViewMode] = useState('input'); 
  const [activeAttendanceTab, setActiveAttendanceTab] = useState('studyTime'); 
  const [activeStudyTimeTab, setActiveStudyTimeTab] = useState('input'); 
  const [weeklySubject, setWeeklySubject] = useState('english'); 
  
  // Custom Alert/Confirm State
  const [toast, useStateToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showAlert = (msg) => {
    useStateToast(msg);
    setTimeout(() => useStateToast(null), 3000);
  };

  const showConfirm = (msg, onConfirm) => {
    setConfirmDialog({ msg, onConfirm });
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('name'); 
  const [sortOrder, setSortOrder] = useState('asc'); 
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [viewingGradeId, setViewingGradeId] = useState(null); 
  const [editingMonthlyStudentId, setEditingMonthlyStudentId] = useState(null); 
  const [viewingWeeklySummary, setViewingWeeklySummary] = useState(null); 
  const [viewingDailySummary, setViewingDailySummary] = useState(null);
  const [viewingStudyTimeSummary, setViewingStudyTimeSummary] = useState(null); 
  const [viewingWeeklyMonthlySummary, setViewingWeeklyMonthlySummary] = useState(null); 
  const [viewingAttendanceSummary, setViewingAttendanceSummary] = useState(null); 
  const [reportStudentId, setReportStudentId] = useState(null);

  // 6단계: 선택 학생 state 및 일괄 처리 로직 추가
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [batchAttendanceDate, setBatchAttendanceDate] = useState(0);
  const [batchAttendanceTimeOfDay, setBatchAttendanceTimeOfDay] = useState('am');
  const [batchAttendanceStatus, setBatchAttendanceStatus] = useState('');
  
  const [batchStudyTimeDate, setBatchStudyTimeDate] = useState(0);
  const [batchStudyTimeIn, setBatchStudyTimeIn] = useState('');
  const [batchStudyTimeOut, setBatchStudyTimeOut] = useState('');

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = (isAll) => {
    if (isAll) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleBatchAttendanceChange = () => {
    if (selectedStudents.length === 0) {
      showAlert('일괄 적용할 학생을 선택해주세요.');
      return;
    }
    if (batchAttendanceStatus === '') {
      showAlert('적용할 출결 상태를 선택해주세요.');
      return;
    }

    showConfirm(`선택한 ${selectedStudents.length}명의 ${attendanceMonth} ${Number(batchAttendanceDate) + 1}일 ${batchAttendanceTimeOfDay === 'am' ? '오전' : '오후'} 출결을 '${batchAttendanceStatus}'(으)로 변경하시겠습니까?`, () => {
      setStudents(prev => prev.map(student => {
        if (!selectedStudents.includes(student.id)) return student;
        
        const updatedAm = [...(student.attendance[attendanceMonth]?.am || Array(31).fill(''))]; 
        const updatedPm = [...(student.attendance[attendanceMonth]?.pm || Array(31).fill(''))];
        
        if (batchAttendanceTimeOfDay === 'am') updatedAm[batchAttendanceDate] = batchAttendanceStatus;
        if (batchAttendanceTimeOfDay === 'pm') updatedPm[batchAttendanceDate] = batchAttendanceStatus;
        
        return { 
          ...student, 
          attendance: { 
            ...student.attendance, 
            [attendanceMonth]: { ...student.attendance[attendanceMonth], am: updatedAm, pm: updatedPm } 
          } 
        };
      }));
      showAlert(`출결 일괄 적용이 완료되었습니다.`);
      setSelectedStudents([]); // 선택 초기화
    });
  };

  const handleBatchStudyTimeChange = () => {
    if (selectedStudents.length === 0) {
      showAlert('일괄 적용할 학생을 선택해주세요.');
      return;
    }
    if (!batchStudyTimeIn && !batchStudyTimeOut) {
      showAlert('등원 또는 하원 시간을 입력해주세요.');
      return;
    }

    showConfirm(`선택한 ${selectedStudents.length}명의 ${studyTimeMonth} ${Number(batchStudyTimeDate) + 1}일 학습시간을 일괄 변경하시겠습니까?`, () => {
      setStudents(prev => prev.map(student => {
        if (!selectedStudents.includes(student.id)) return student;
        
        const newDaily = [...(student.studyTime[studyTimeMonth] || Array.from({length: 31}, () => ({in: '', out: ''})))];
        if (batchStudyTimeIn !== '') newDaily[batchStudyTimeDate] = { ...newDaily[batchStudyTimeDate], in: batchStudyTimeIn };
        if (batchStudyTimeOut !== '') newDaily[batchStudyTimeDate] = { ...newDaily[batchStudyTimeDate], out: batchStudyTimeOut };
        
        return { 
          ...student, 
          studyTime: { 
            ...student.studyTime, 
            [studyTimeMonth]: newDaily 
          } 
        };
      }));
      showAlert(`학습시간 일괄 적용이 완료되었습니다.`);
      setSelectedStudents([]); // 선택 초기화
      setBatchStudyTimeIn('');
      setBatchStudyTimeOut('');
    });
  };

  // PDF 인쇄용 함수 (1단계 적용 완료)
  const handlePrint = () => {
    window.print();
  };

  // 5단계: 학생 명단 엑셀 다운로드 (Export)
  const handleExportStudentsExcel = () => {
    if (typeof window.XLSX === 'undefined') { showAlert("엑셀 모듈 로딩중입니다."); return; }
    const data = filteredStudents.map((s, i) => ({
      "NO": i + 1,
      "학생명": s.name,
      "아이디": s.userId || s.id,
      "수강반": s.className,
      "캠퍼스": "대구",
      "성별": s.gender || '-',
      "편입구분": s.transferType || '-',
      "계열": s.targetTrack || '-'
    }));
    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "학생명단");
    window.XLSX.writeFile(wb, `학생명단_${academicYear}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // 5단계: 월별 출결 데이터 엑셀 다운로드 (Export)
  const handleExportAttendanceExcel = () => {
    if (typeof window.XLSX === 'undefined') { showAlert("엑셀 모듈 로딩중입니다."); return; }
    const data = [];
    filteredStudents.forEach((s) => {
      const amData = s.attendance[attendanceMonth]?.am || Array(31).fill('');
      const pmData = s.attendance[attendanceMonth]?.pm || Array(31).fill('');
      
      const amRow = { "이름": s.name, "아이디": s.userId || s.id, "출석률": getAttendanceRate(s, attendanceMonth), "구분": "오전" };
      const pmRow = { "이름": s.name, "아이디": s.userId || s.id, "출석률": getAttendanceRate(s, attendanceMonth), "구분": "오후", "벌점": getAttendancePenalty(s, attendanceMonth) };
      
      for(let i=0; i<31; i++) {
         amRow[`${i+1}일`] = amData[i] || '';
         pmRow[`${i+1}일`] = pmData[i] || '';
      }
      data.push(amRow);
      data.push(pmRow);
    });

    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, `${attendanceMonth}_출결`);
    window.XLSX.writeFile(wb, `${attendanceMonth}_출결현황_${academicYear}.xlsx`);
  };
  
  const [attendanceMonth, setAttendanceMonth] = useState('4월');
  const [studyTimeMonth, setStudyTimeMonth] = useState('4월');
  const [dailyMonth, setDailyMonth] = useState('4월');
  const [weeklyMonth, setWeeklyMonth] = useState('4월');
  const [selectedMonth, setSelectedMonth] = useState('4월'); 
  const [detailSelectedMonth, setDetailSelectedMonth] = useState('4월');
  const [dashboardMonth, setDashboardMonth] = useState('4월');

  const [dailySettings, setDailySettings] = useState(() => {
    const settings = {};
    MONTHS.forEach(m => settings[m] = { excludedDays: [] });
    return settings;
  });

  const [attendanceSettings, setAttendanceSettings] = useState(() => {
    const settings = {};
    MONTHS.forEach(m => settings[m] = { excludedDays: [] });
    return settings;
  });

  const [penaltyRules, setPenaltyRules] = useState(() => {
      const rules = {};
      ['출석', '결석', '지각', '조퇴', '사전통보', '병결', '알바', '가족사정', '개인사정', '컨디션 난조', '학교', '시험', '과제', '실습', '타학원', '독서실', '기타'].forEach(opt => {
          rules[opt] = { apply: opt === '결석' || opt === '지각' || opt === '조퇴', score: opt === '결석' ? 2 : opt === '지각' || opt === '조퇴' ? 1 : 0 };
      });
      return { maxPenalty: 20, rules };
  });

  const handlePenaltyRuleChange = (opt, field, val) => {
      setPenaltyRules(prev => ({
          ...prev,
          rules: { ...prev.rules, [opt]: { ...prev.rules[opt], [field]: val } }
      }));
  };

  const [monthlySummaries, setMonthlySummaries] = useState({
    '3월': { engAvg: 55, engTop30: 80, mathAvg: 60, mathTop30: 85, totAvg: 115, totTop30: 165 },
    '4월': { engAvg: 57.1, engTop30: 78.2, mathAvg: 74.3, mathTop30: 93.6, totAvg: 131.4, totTop30: 171.8 }
  });

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [weeklySettings, setWeeklySettings] = useState(() => {
    const settings = { english: {}, math: {} };
    MONTHS.forEach(m => {
      settings.english[m] = {
        1: { answers: Array(40).fill(''), types: Array(40).fill('') }, 2: { answers: Array(40).fill(''), types: Array(40).fill('') },
        3: { answers: Array(40).fill(''), types: Array(40).fill('') }, 4: { answers: Array(40).fill(''), types: Array(40).fill('') },
        5: { answers: Array(40).fill(''), types: Array(40).fill('') }
      };
      settings.math[m] = {
        1: { answers: Array(30).fill(''), types: Array(30).fill(''), qCount: 20, qScore: 5 },
        2: { answers: Array(30).fill(''), types: Array(30).fill(''), qCount: 20, qScore: 5 },
        3: { answers: Array(30).fill(''), types: Array(30).fill(''), qCount: 20, qScore: 5 },
        4: { answers: Array(30).fill(''), types: Array(30).fill(''), qCount: 20, qScore: 5 },
        5: { answers: Array(30).fill(''), types: Array(30).fill(''), qCount: 20, qScore: 5 }
      };
    });
    return settings;
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState('student'); 
  const [uploadTargetDay, setUploadTargetDay] = useState(null); 
  const fileInputRef = useRef(null);
  const omrFileInputRef = useRef(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({ name: '', userId: '', targetTrack: '인문계', startMonth: '1월' });

  const classStudents = useMemo(() => {
    if (className === '대구캠퍼스 전체') return students;
    return students.filter(s => s.className === className);
  }, [students, className]);

  const getAttendanceRate = (student, month) => {
      const excluded = attendanceSettings[month]?.excludedDays || [];
      const am = student.attendance[month]?.am || [];
      const pm = student.attendance[month]?.pm || [];
      let totalDays = 0, attendedDays = 0;
      for(let i=0; i<31; i++) {
          if(!excluded.includes(i)) {
              const hasAm = am[i] !== '';
              const hasPm = pm[i] !== '';
              if (hasAm || hasPm) {
                  totalDays++;
                  const isAmAttended = am[i] === '출석' || am[i] === '지각';
                  const isPmAttended = pm[i] === '출석' || pm[i] === '지각';
                  if (isAmAttended || isPmAttended) {
                      attendedDays++;
                  }
              }
          }
      }
      return totalDays === 0 ? "0%" : `${Math.round((attendedDays / totalDays) * 100)}%`;
  }

  const getAttendanceRateNum = (student, month) => {
      const excluded = attendanceSettings[month]?.excludedDays || [];
      const am = student.attendance[month]?.am || [];
      const pm = student.attendance[month]?.pm || [];
      let totalDays = 0, attendedDays = 0;
      for(let i=0; i<31; i++) {
          if(!excluded.includes(i)) {
              const hasAm = am[i] !== '';
              const hasPm = pm[i] !== '';
              if (hasAm || hasPm) {
                  totalDays++;
                  const isAmAttended = am[i] === '출석' || am[i] === '지각';
                  const isPmAttended = pm[i] === '출석' || pm[i] === '지각';
                  if (isAmAttended || isPmAttended) {
                      attendedDays++;
                  }
              }
          }
      }
      return totalDays === 0 ? 0 : Math.round((attendedDays / totalDays) * 100);
  }

  const getDashboardAlerts = () => {
    const alerts = { attendance: [], dailyScore: [], studyTime: [] };
    classStudents.forEach(s => {
      const attRate = getAttendanceRateNum(s, dashboardMonth);
      if(attRate > 0 && attRate < 80) alerts.attendance.push({name: s.name, val: `${attRate}%`});
      
      const dRecords = s.dailyRecords[dashboardMonth] || Array(31).fill({t1:'', t2:''});
      const dStats = getDailyStats(dRecords, dashboardMonth);
      if(dStats.count > 0 && Number(dStats.avg) < 60) alerts.dailyScore.push({name: s.name, val: `${dStats.avg}점`});
    });

    const studyRanks = [...classStudents].map(s => ({name: s.name, val: getStudyTimeStats(s).totalMins})).sort((a,b) => a.val - b.val);
    alerts.studyTime = studyRanks.slice(0, 3).filter(s => s.val > 0).map(s => ({name: s.name, val: formatMinsToTime(s.val)}));
    
    return alerts;
  };

  const getAttendancePenalty = (student, month) => {
      const excluded = attendanceSettings[month]?.excludedDays || [];
      const am = student.attendance[month]?.am || [];
      const pm = student.attendance[month]?.pm || [];
      let penalty = 0;
      for(let i=0; i<31; i++) {
          if(!excluded.includes(i)) {
              const v1 = am[i]; const v2 = pm[i];
              if (v1 && penaltyRules.rules[v1]?.apply) penalty += penaltyRules.rules[v1].score;
              if (v2 && penaltyRules.rules[v2]?.apply) penalty += penaltyRules.rules[v2].score;
          }
      }
      return penalty;
  }

  const getStudyTimeCurrent = (student, month) => {
      const daily = student.studyTime[month] || [];
      return calculateTotalStudyTime(daily);
  }

  const getDailyStats = (records, month) => {
    const excluded = dailySettings[month]?.excludedDays || [];
    let sum = 0, count = 0; 
    const validDays = 31 - excluded.length;
    const MAX_POSSIBLE = validDays * 2; 

    if(!records) return { sum: 0, avg: 0, rate: 0, missedRate: 0, count: 0, MAX_POSSIBLE };

    records.forEach((r, idx) => { 
        if(!excluded.includes(idx)) {
            if (r.t1 !== '') { sum += Number(r.t1); count++; } 
            if (r.t2 !== '') { sum += Number(r.t2); count++; } 
        }
    });
    
    const avg = count > 0 ? (sum / count).toFixed(1) : 0; 
    const rate = MAX_POSSIBLE > 0 ? Math.round((count / MAX_POSSIBLE) * 100) : 0;
    const missedRate = MAX_POSSIBLE > 0 ? Math.round(((MAX_POSSIBLE - count) / MAX_POSSIBLE) * 100) : 0;
    
    return { sum, avg, rate, missedRate, count, MAX_POSSIBLE };
  };

  const getMonthlyWeeklyStats = (student, month, subject) => {
      let totalScore = 0, testCount = 0, totalCorrect = 0, totalQuestions = 0;
      const typeStats = {};

      for(let w=1; w<=5; w++) {
          const weekKey = `${month}_w${w}`;
          const scoreKey = subject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
          const detailKey = subject === 'english' ? 'weeklyDetails' : 'weeklyDetailsMath';
          
          const score = student.scores[scoreKey]?.[weekKey];
          const details = student.scores[detailKey]?.[weekKey];

          if (score !== undefined && score !== null) { totalScore += score; testCount++; }
          if (details && details.length > 0) {
              details.forEach(item => {
                  if (!typeStats[item.type]) typeStats[item.type] = { correct: 0, total: 0 };
                  typeStats[item.type].total++; totalQuestions++;
                  if (item.isCorrect) { typeStats[item.type].correct++; totalCorrect++; }
              });
          }
      }
      const avgScore = testCount > 0 ? (totalScore / testCount).toFixed(1) : '-';
      const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : '-';
      return { avgScore, overallRate, typeStats, testCount };
  }

  const getOverallWeeklyStats = (student, subject) => {
      let totalScore = 0, testCount = 0, totalCorrect = 0, totalQuestions = 0;
      const typeStats = {}; const monthlyScores = {};
      const startIdx = MONTHS.indexOf(student.startMonth || '1월');

      MONTHS.forEach((m, idx) => {
          let mScore = 0, mCount = 0;
          for(let w=1; w<=5; w++) {
              const weekKey = `${m}_w${w}`;
              const scoreKey = subject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
              const detailKey = subject === 'english' ? 'weeklyDetails' : 'weeklyDetailsMath';
              const score = student.scores[scoreKey]?.[weekKey];
              const details = student.scores[detailKey]?.[weekKey];

              if (idx >= startIdx) {
                  if (score !== undefined && score !== null) {
                      totalScore += score; testCount++; mScore += score; mCount++;
                  }
                  if (details && details.length > 0) {
                      details.forEach(item => {
                          if (!typeStats[item.type]) typeStats[item.type] = { correct: 0, total: 0 };
                          typeStats[item.type].total++; totalQuestions++;
                          if (item.isCorrect) { typeStats[item.type].correct++; totalCorrect++; }
                      });
                  }
              }
          }
          if (idx < startIdx) monthlyScores[m] = '-'; else monthlyScores[m] = mCount > 0 ? (mScore / mCount).toFixed(1) : '-';
      });

      const avgScore = testCount > 0 ? (totalScore / testCount).toFixed(1) : '-';
      const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : '-';
      return { avgScore, overallRate, typeStats, testCount, monthlyScores };
  }

  const getOverallDailyStats = (student) => {
      let totalSum = 0, totalCount = 0, totalMax = 0;
      const startIdx = MONTHS.indexOf(student.startMonth || '1월');

      MONTHS.forEach((m, idx) => {
          if (idx < startIdx) return;
          const dRecords = student.dailyRecords[m] || Array(31).fill({t1:'', t2:''});
          const stats = getDailyStats(dRecords, m);
          totalSum += stats.sum; totalCount += stats.count; totalMax += stats.MAX_POSSIBLE;
      });
      const avgScore = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;
      const rate = totalMax > 0 ? Math.round((totalCount / totalMax) * 100) : 0;
      const missedRate = totalMax > 0 ? Math.round(((totalMax - totalCount) / totalMax) * 100) : 0;
      return { avgScore, rate, missedRate };
  }

  const classAvgAttendance = useMemo(() => {
    let totalDays = 0, attendedDays = 0;
    const excluded = attendanceSettings[attendanceMonth]?.excludedDays || [];
    classStudents.forEach(s => {
      const am = s.attendance[attendanceMonth]?.am || [];
      const pm = s.attendance[attendanceMonth]?.pm || [];
      for(let i=0; i<31; i++) {
          if(!excluded.includes(i)) {
              const hasAm = am[i] !== '';
              const hasPm = pm[i] !== '';
              if (hasAm || hasPm) {
                  totalDays++;
                  const isAmAttended = am[i] === '출석' || am[i] === '지각';
                  const isPmAttended = pm[i] === '출석' || pm[i] === '지각';
                  if (isAmAttended || isPmAttended) {
                      attendedDays++;
                  }
              }
          }
      }
    });
    return totalDays === 0 ? 0 : Math.round((attendedDays / totalDays) * 100);
  }, [classStudents, attendanceMonth, attendanceSettings]);

  const classAvgStudyTime = useMemo(() => {
    if (classStudents.length === 0) return '0시간 0분';
    let totalMins = 0;
    classStudents.forEach(s => totalMins += getStudyTimeStats(s).totalMins);
    const avgMins = Math.floor(totalMins / classStudents.length);
    return formatMinsToTime(avgMins);
  }, [classStudents]);

  const dailyClassStats = useMemo(() => {
    let totalSum = 0, totalCount = 0, totalMax = 0;
    classStudents.forEach(s => {
        const dRecords = s.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:''});
        const stats = getDailyStats(dRecords, dailyMonth);
        totalSum += stats.sum; totalCount += stats.count; totalMax += stats.MAX_POSSIBLE;
    });
    const avgScore = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;
    const avgRate = totalMax > 0 ? Math.round((totalCount / totalMax) * 100) : 0;
    return { avgScore, avgRate };
  }, [classStudents, dailyMonth, dailySettings]);

  const studyTimeRankings = useMemo(() => {
    const sorted = [...classStudents].sort((a,b) => getStudyTimeStats(b).totalMins - getStudyTimeStats(a).totalMins);
    const ranks = {};
    sorted.forEach((s, i) => ranks[s.id] = i + 1);
    return ranks;
  }, [classStudents]);

  const getLatestMonthlyScore = (monthlyScores) => {
    for(let i = 11; i >= 0; i--) {
      const m = MONTHS[i];
      if(monthlyScores[m] && (monthlyScores[m].english?.score || monthlyScores[m].math?.score)) return { month: m, data: monthlyScores[m] };
    }
    return { month: '-', data: { english: { ...emptyMonthlyScore }, math: { ...emptyMonthlyScore }, total: { ...emptyMonthlyScore } } };
  };

  const filteredStudents = useMemo(() => {
    let result = classStudents.filter(s => s.name.includes(searchTerm) || s.id.includes(searchTerm) || s.contact.includes(searchTerm));
    
    result.sort((a, b) => {
      let valA, valB;
      if (sortKey === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortKey === 'studyTime') {
        valA = getStudyTimeStats(a).totalMins; valB = getStudyTimeStats(b).totalMins;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortKey === 'attendanceRate') {
        valA = getAttendanceRateNum(a, attendanceMonth); valB = getAttendanceRateNum(b, attendanceMonth);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortKey === 'dailyRate') {
        valA = getDailyStats(a.dailyRecords[dailyMonth], dailyMonth).rate; valB = getDailyStats(b.dailyRecords[dailyMonth], dailyMonth).rate;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortKey === 'dailyAvg') {
        valA = Number(getDailyStats(a.dailyRecords[dailyMonth], dailyMonth).avg); valB = Number(getDailyStats(b.dailyRecords[dailyMonth], dailyMonth).avg);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortKey === 'weeklyAvg') {
        valA = getMonthlyWeeklyStats(a, weeklyMonth, weeklySubject).avgScore === '-' ? 0 : Number(getMonthlyWeeklyStats(a, weeklyMonth, weeklySubject).avgScore);
        valB = getMonthlyWeeklyStats(b, weeklyMonth, weeklySubject).avgScore === '-' ? 0 : Number(getMonthlyWeeklyStats(b, weeklyMonth, weeklySubject).avgScore);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortKey === 'weeklyOverallAvg') {
        valA = getOverallWeeklyStats(a, weeklySubject).avgScore === '-' ? 0 : Number(getOverallWeeklyStats(a, weeklySubject).avgScore);
        valB = getOverallWeeklyStats(b, weeklySubject).avgScore === '-' ? 0 : Number(getOverallWeeklyStats(b, weeklySubject).avgScore);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortKey.startsWith('monthly_')) {
        const subject = sortKey.split('_')[1];
        valA = Number(a.scores?.monthly?.[selectedMonth]?.[subject]?.score || 0); valB = Number(b.scores?.monthly?.[selectedMonth]?.[subject]?.score || 0);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return result;
  }, [classStudents, searchTerm, sortKey, sortOrder, selectedMonth, studyTimeMonth, dailyMonth, weeklyMonth, dailySettings, weeklySubject]);

  const handleSort = (key) => {
    if (sortKey === key) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder(key === 'name' ? 'asc' : 'desc'); }
  };

  const handleDeleteStudent = (e, id, name) => {
    e.stopPropagation();
    showConfirm(`${name} 학생을 명단에서 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`, () => {
      setStudents(prev => prev.filter(s => s.id !== id));
      showAlert(`${name} 학생이 삭제되었습니다.`);
    });
  };

  const handleAddStudentSubmit = () => {
    if(!newStudentForm.name.trim() || !newStudentForm.userId.trim()) { showAlert("이름과 아이디를 모두 입력해주세요."); return; }
    const newId = `S-${Date.now()}`;
    const newStu = createStudent(newId, newStudentForm.userId, newStudentForm.name, newStudentForm.startMonth, newStudentForm.targetTrack, {}, {}, {}, {}, {});
    newStu.className = className === '대구캠퍼스 전체' ? 'S-CLASS' : className; 
    setStudents(prev => [newStu, ...prev]);
    setShowAddModal(false);
    setNewStudentForm({ name: '', userId: '', targetTrack: '인문계', startMonth: '1월' });
    showAlert(`${newStudentForm.name} 학생이 수기 등록되었습니다.`);
  };

  const handleProfileChange = (studentId, field, value) => {
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: value } : s));
  };

  const toggleDailyExcluded = (month, dayIndex) => {
    setDailySettings(prev => {
        const currentArr = prev[month]?.excludedDays || [];
        const isExcluded = currentArr.includes(dayIndex);
        const newArr = isExcluded ? currentArr.filter(i => i !== dayIndex) : [...currentArr, dayIndex];
        return { ...prev, [month]: { ...prev[month], excludedDays: newArr } };
    });
  };

  const toggleAttendanceExcluded = (month, dayIndex) => {
    setAttendanceSettings(prev => {
        const currentArr = prev[month]?.excludedDays || [];
        const isExcluded = currentArr.includes(dayIndex);
        const newArr = isExcluded ? currentArr.filter(i => i !== dayIndex) : [...currentArr, dayIndex];
        return { ...prev, [month]: { ...prev[month], excludedDays: newArr } };
    });
  };

  const handleGenericFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof window.XLSX === 'undefined') { showAlert("엑셀 모듈 로딩중입니다."); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        if(importType === 'student') processStudentRows(rows, workbook);
        else if(importType === 'daily') processDailyRows(rows);
        else if(importType === 'weekly') processWeeklyRows(rows);
        else if(importType === 'monthly') processMonthlyRows(rows);
        else if(importType === 'studyTimeDaily') processStudyTimeDailyRows(rows, uploadTargetDay);
      } catch (err) { showAlert("파싱 중 오류가 발생했습니다.\n" + err.message); }
      finally { 
        if (fileInputRef.current) fileInputRef.current.value = ''; 
        if (omrFileInputRef.current) omrFileInputRef.current.value = ''; 
        setShowImportModal(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const findHeaderRow = (rows, keywords) => {
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      if (!rows[i] || !Array.isArray(rows[i])) continue;
      const rowStr = rows[i].map(v => String(v || '').replace(/\s/g, ''));
      if (keywords.every(kw => rowStr.some(cell => cell.includes(kw)))) { headerRowIdx = i; break; }
    }
    return { headerRowIdx, headerRow: headerRowIdx !== -1 ? rows[headerRowIdx] : [] };
  };

  const openImportModal = (type) => { setImportType(type); setShowImportModal(true); };

  const triggerDirectUpload = (type, dayIdx = null) => {
    setImportType(type);
    if (dayIdx !== null) setUploadTargetDay(dayIdx);
    if (type === 'weekly') { if (omrFileInputRef.current) omrFileInputRef.current.click(); } 
    else { if (fileInputRef.current) fileInputRef.current.click(); }
  };

  const processStudentRows = (rows, workbook) => {
    let targetSheetName = workbook.SheetNames.find(n => n.includes('신상정보') || n.includes('목록')) || workbook.SheetNames[0];
    const targetRows = window.XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName], { header: 1 });
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, targetRows.length); i++) {
      if (!targetRows[i] || !Array.isArray(targetRows[i])) continue;
      const rowStr = targetRows[i].map(v => String(v || '').replace(/\s/g, ''));
      if (rowStr.some(c => c.includes('이름') || c.includes('성명'))) { headerRowIdx = i; break; }
    }
    if (headerRowIdx === -1) { showAlert("이름 열을 찾을 수 없습니다."); return; }

    const headerRow = targetRows[headerRowIdx].map(v => String(v || '').replace(/\s/g, ''));
    const getIdx = (kws) => headerRow.findIndex(h => h && kws.some(k => h.includes(k)));

    const idxs = { 
      id: getIdx(['학번','수험번호']), userId: getIdx(['아이디']), name: getIdx(['이름','성명']), contact: getIdx(['연락처']), 
      track: getIdx(['희망계열','계열']), gender: getIdx(['성별']), address: getIdx(['거주지역','거주지']),
      univ: getIdx(['출신대학']), major: getIdx(['출신학과']), grad: getIdx(['졸업여부']),
      type: getIdx(['편입구분']), credits: getIdx(['이수학점']), gpa: getIdx(['학점']),
      motiv: getIdx(['편입준비계기','계기']), eng: getIdx(['공인영어']), parent: getIdx(['부모님연락처','부모님']),
      notes: getIdx(['특이사항','상담'])
    };
    
    let importedCount = 0; const newStudents = [];
    for (let i = headerRowIdx + 1; i < targetRows.length; i++) {
      const row = targetRows[i]; 
      if (!row || !Array.isArray(row) || row[idxs.name] === undefined || String(row[idxs.name]).trim() === '') continue;
      const sName = String(row[idxs.name]).trim();
      const sId = idxs.id >= 0 && row[idxs.id] !== undefined ? String(row[idxs.id]).trim() : '';
      const sUserId = idxs.userId >= 0 && row[idxs.userId] !== undefined ? String(row[idxs.userId]).trim() : '';
      
      newStudents.push({
        id: sId || sUserId || `NEW-${Date.now()}-${i}`,
        userId: sUserId, name: sName, startMonth: '1월', 
        className: className === '대구캠퍼스 전체' ? 'S-CLASS' : className, 
        contact: idxs.contact >= 0 && row[idxs.contact] !== undefined ? String(row[idxs.contact]) : '', 
        gender: idxs.gender >= 0 && row[idxs.gender] !== undefined ? String(row[idxs.gender]) : '', 
        address: idxs.address >= 0 && row[idxs.address] !== undefined ? String(row[idxs.address]) : '', 
        university: idxs.univ >= 0 && row[idxs.univ] !== undefined ? String(row[idxs.univ]) : '', 
        major: idxs.major >= 0 && row[idxs.major] !== undefined ? String(row[idxs.major]) : '', 
        gradStatus: idxs.gradStatus >= 0 && row[idxs.gradStatus] !== undefined ? String(row[idxs.gradStatus]) : '',
        transferType: idxs.type >= 0 && row[idxs.type] !== undefined ? String(row[idxs.type]) : '일반', 
        targetTrack: idxs.track >= 0 && row[idxs.track] !== undefined ? String(row[idxs.track]) : '미정', 
        credits: idxs.credits >= 0 && row[idxs.credits] !== undefined ? row[idxs.credits] : '', 
        gpa: idxs.gpa >= 0 && row[idxs.gpa] !== undefined ? String(row[idxs.gpa]) : '', 
        motivation: idxs.motiv >= 0 && row[idxs.motiv] !== undefined ? String(row[idxs.motiv]) : '', 
        englishScore: idxs.eng >= 0 && row[idxs.eng] !== undefined ? String(row[idxs.eng]) : '', 
        parentContact: idxs.parent >= 0 && row[idxs.parent] !== undefined ? String(row[idxs.parent]) : '', 
        notes: idxs.notes >= 0 && row[idxs.notes] !== undefined ? String(row[idxs.notes]) : '', 
        consulting: {}, studyTime: generateEmptyMonthlyStudyTime(), attendance: generateEmptyMonthlyAttendance(),
        dailyRecords: generateEmptyMonthlyDaily(),
        scores: { mockEnglish: {}, mockMath: {}, weeklyEnglish: {}, weeklyMath: {}, monthly: generateEmptyMonthlyData(), weeklyDetails: {}, weeklyDetailsMath: {} }
      }); 
      importedCount++;
    }

    setStudents(prev => {
      const updated = [...prev]; 
      newStudents.forEach(newStu => {
        const existingIdx = updated.findIndex(s => {
            const isIdMatch = (newStu.userId && s.userId === newStu.userId) || (newStu.id && !newStu.id.startsWith('NEW') && s.id === newStu.id);
            const isNameMatch = s.name === newStu.name && (className === '대구캠퍼스 전체' ? true : s.className === className);
            return isIdMatch || isNameMatch;
        });
        if(existingIdx >= 0) {
            updated[existingIdx] = { 
                ...updated[existingIdx], ...newStu,
                studyTime: updated[existingIdx].studyTime, attendance: updated[existingIdx].attendance,
                dailyRecords: updated[existingIdx].dailyRecords, scores: updated[existingIdx].scores, startMonth: updated[existingIdx].startMonth 
            };
        } else updated.unshift(newStu);
      }); 
      return updated;
    });
    showAlert(`완료! 총 ${importedCount}명의 정보가 처리되었습니다.`);
  };

  const processDailyRows = (rows) => {
    const { headerRowIdx, headerRow } = findHeaderRow(rows, ['이름']);
    if(headerRowIdx === -1) throw new Error("이름 열을 찾을 수 없습니다.");
    const getColIdxTemp = (headerRow, kws) => headerRow.findIndex(h => h && kws.some(k => String(h).replace(/\s/g, '').includes(k)));
    const idIdx = getColIdxTemp(headerRow, ['학번', '수험번호', '이름']);
    const dateColStart = headerRow.findIndex(h => h && (String(h).includes('2026') || !isNaN(Number(h))));
    
    let matchCount = 0;
    setStudents(prev => {
      const updated = [...prev];
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i]; if (!row || !Array.isArray(row) || !row[idIdx]) continue;
        const key = String(row[idIdx]).trim();
        const studentIdx = updated.findIndex(s => (s.id === key || s.name === key) && (className === '대구캠퍼스 전체' ? true : s.className === className));
        if (studentIdx >= 0) {
          const newDaily = [...updated[studentIdx].dailyRecords[dailyMonth]];
          for(let d=0; d<31; d++) { let val = row[dateColStart + d]; if(val !== undefined && val !== null) newDaily[d].t1 = val; }
          updated[studentIdx].dailyRecords[dailyMonth] = newDaily; matchCount++;
        }
      }
      return updated;
    });
    showAlert(`완료! 총 ${matchCount}건의 Daily 성적이 연동되었습니다.`);
  };

  const processWeeklyRows = (rows) => {
    const currentSettings = weeklySettings[weeklySubject]?.[weeklyMonth]?.[selectedWeek] || { answers: [], types: [], qCount: weeklySubject === 'english' ? 40 : 20, qScore: weeklySubject === 'english' ? 2.5 : 5 };
    const maxQs = currentSettings.qCount || 40;
    
    const executeWeeklyParse = () => {
      let matchCount = 0;
      setStudents(prev => {
        const updated = [...prev];
        for (let i = 0; i < rows.length; i++) {
          const row = Array.isArray(rows[i]) ? rows[i] : Object.values(rows[i] || {});
          if (!row || row.length < 2 || row[0] === undefined) continue;
          const key = String(row[0]).trim(); 
          if (key === '' || key === '수험번호') continue; 
          const studentIdx = updated.findIndex(s => (s.id.toLowerCase() === key.toLowerCase() || s.userId.toLowerCase() === key.toLowerCase()) && (className === '대구캠퍼스 전체' ? true : s.className === className));
          
          if (studentIdx >= 0) {
               let correctCount = 0; let details = []; 
               for(let q = 0; q < maxQs; q++) {
                  const userAns = String(row[1 + q] || '').trim().toLowerCase(); 
                  const correctAns = String(currentSettings.answers[q] || '').trim().toLowerCase();
                  const isCorrect = (userAns !== '' && correctAns !== '' && userAns === correctAns);
                  if(isCorrect) correctCount++;
                  details.push({ qNum: q + 1, userAns, correctAns, isCorrect, type: currentSettings.types[q] || '미지정' });
               }
               const score = correctCount * (currentSettings.qScore || 2.5);
               const weekKey = `${weeklyMonth}_w${selectedWeek}`;
               const scoreField = weeklySubject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
               const detailField = weeklySubject === 'english' ? 'weeklyDetails' : 'weeklyDetailsMath';

               updated[studentIdx] = { 
                   ...updated[studentIdx], 
                   scores: { 
                       ...updated[studentIdx].scores, 
                       [scoreField]: { ...updated[studentIdx].scores[scoreField], [weekKey]: score },
                       [detailField]: { ...updated[studentIdx].scores[detailField], [weekKey]: details }
                   } 
               };
               matchCount++;
          }
        }
        return updated;
      });
      showAlert(`OMR 인식 완료! 총 ${matchCount}명의 점수와 유형별 정답률이 연동되었습니다.`);
    };

    const hasAnyAnswer = currentSettings.answers.some(ans => String(ans).trim() !== '');
    if (!hasAnyAnswer) {
        showConfirm(`현재 ${weeklyMonth} ${selectedWeek}주차의 '정답'이 설정되지 않았습니다.\n모든 학생의 점수가 0점 처리될 수 있습니다.\n그래도 진행하시겠습니까?`, () => {
            executeWeeklyParse();
        });
        return;
    }
    executeWeeklyParse();
  };

  const processMonthlyRows = (rows) => {
    const { headerRowIdx, headerRow } = findHeaderRow(rows, ['아이디', '이름', '실득점']);
    if(headerRowIdx === -1) throw new Error("아이디/이름/실득점 열이 포함된 행을 찾을 수 없습니다.");
    let affectedStudents = new Set();
    let engAvg='', engTop='', mathAvg='', mathTop='', totAvg='', totTop='';

    if (headerRowIdx >= 1 && rows[headerRowIdx - 1]) {
      const summaryRow = rows[headerRowIdx - 1];
      const parseAvg = (val) => val ? String(val).split('/')[0].trim() : '';
      engAvg = parseAvg(summaryRow[1]); engTop = parseAvg(summaryRow[2]); 
      mathAvg = parseAvg(summaryRow[21]); mathTop = parseAvg(summaryRow[22]); 
      totAvg = parseAvg(summaryRow[41]); totTop = parseAvg(summaryRow[42]); 
      setMonthlySummaries(prev => ({ ...prev, [selectedMonth]: { engAvg, engTop30: engTop, mathAvg, mathTop30: mathTop, totAvg, totTop30: totTop } }));
    }

    setStudents(prev => {
      let updated = [...prev];
      updated = updated.map(s => {
        if(className === '대구캠퍼스 전체' || s.className === className) { 
           return { ...s, scores: { ...s.scores, monthly: { ...s.scores.monthly, [selectedMonth]: { english: { ...emptyMonthlyScore }, math: { ...emptyMonthlyScore }, total: { ...emptyMonthlyScore } } } } }; 
        }
        return s;
      });

      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i]; if (!row || !Array.isArray(row)) continue;
        const processBlock = (baseIdx, subject, sAvg, sTop30) => {
          const idVal = row[baseIdx + 1]; 
          if (!idVal) return;
          const key = String(idVal).trim().toLowerCase();
          const studentIdx = updated.findIndex(s => s.userId?.toLowerCase() === key && (className === '대구캠퍼스 전체' ? true : s.className === className));
          if (studentIdx >= 0) {
            const score = row[baseIdx + 8]; if (score === undefined || score === '') return;
            const percent = row[baseIdx + 9] !== undefined ? row[baseIdx + 9] : ''; 
            const totalRank = row[baseIdx + 10] !== undefined ? row[baseIdx + 10] : ''; 
            const trackAvg = (row[baseIdx + 16] !== undefined && row[baseIdx + 16] !== '') ? row[baseIdx + 16] : sAvg;
            const top30Avg = (row[baseIdx + 18] !== undefined && row[baseIdx + 18] !== '') ? row[baseIdx + 18] : sTop30;
            const trackAvgDiff = (score !== '' && trackAvg !== '') ? (Number(score) - Number(trackAvg)).toFixed(1) : '';
            const top30Diff = (score !== '' && top30Avg !== '') ? (Number(score) - Number(top30Avg)).toFixed(1) : '';

            let updatedMonthly = { ...(updated[studentIdx].scores.monthly[selectedMonth] || generateEmptyMonthlyData()[selectedMonth]) };
            updatedMonthly[subject] = { score, percent, classRank: '', totalRank, trackAvg, top30Avg, trackAvgDiff, top30Diff };
            updated[studentIdx].scores.monthly[selectedMonth] = updatedMonthly;
            affectedStudents.add(updated[studentIdx].id);
          }
        };
        processBlock(0, 'english', engAvg, engTop); processBlock(20, 'math', mathAvg, mathTop); processBlock(40, 'total', totAvg, totTop);
      }

      const computeRank = (subject) => {
        let validStudents = updated.filter(s => (className === '대구캠퍼스 전체' ? true : s.className === className) && s.scores.monthly[selectedMonth]?.[subject]?.score !== '');
        validStudents.sort((a, b) => Number(b.scores.monthly[selectedMonth][subject].score) - Number(a.scores.monthly[selectedMonth][subject].score));
        validStudents.forEach((s, idx) => {
          const sIdx = updated.findIndex(u => u.id === s.id);
          if (sIdx >= 0) updated[sIdx].scores.monthly[selectedMonth][subject].classRank = idx + 1;
        });
      };
      computeRank('english'); computeRank('math'); computeRank('total');
      return updated;
    });
    showAlert(`완료! 총 ${affectedStudents.size}명의 성적이 연동되었습니다.`);
  };

  const processStudyTimeDailyRows = (rows, targetDayIdx) => {
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
        if (!rows[i] || !Array.isArray(rows[i])) continue;
        const rowStr = rows[i].map(v => String(v || '').replace(/\s/g, ''));
        if (rowStr.some(c => c === '아이디' || c === '수험번호')) { headerRowIdx = i; break; }
    }
    if (headerRowIdx === -1) { showAlert("엑셀에서 '아이디' 열을 찾을 수 없습니다."); return; }
    const headerRow = rows[headerRowIdx].map(v => String(v || '').replace(/\s/g, ''));
    const idIdx = headerRow.findIndex(h => h === '아이디' || h === '수험번호');
    const inIdx = headerRow.findIndex(h => h === '등원일시');
    const outIdx = headerRow.findIndex(h => h === '하원일시');

    if (idIdx === -1) { showAlert("엑셀에서 '아이디' 열을 찾을 수 없습니다."); return; }
    if (inIdx === -1 && outIdx === -1) { showAlert("엑셀에서 '등원일시' 또는 '하원일시' 열을 찾을 수 없습니다."); return; }

    const matchedKeys = new Set(); 
    setStudents(prev => {
        const updated = [...prev];
        for (let i = headerRowIdx + 1; i < rows.length; i++) { 
            const row = rows[i]; 
            if (!row || !Array.isArray(row) || row[idIdx] === undefined) continue;
            
            const key = String(row[idIdx]).trim().toLowerCase();
            const studentIdx = updated.findIndex(s => {
                const matchId = (s.id && s.id.toLowerCase() === key) || (s.userId && s.userId.toLowerCase() === key);
                const matchName = s.name === key && (className === '대구캠퍼스 전체' || s.className === className);
                return matchId || matchName;
            });
            
            if (studentIdx >= 0) {
                const formatTime = (t) => {
                    if (t === undefined || t === null) return '';
                    let str = String(t).trim();
                    if(str === '0' || str === '' || str.includes('미등원') || str.includes('미하원')) return '';
                    if (!isNaN(str) && Number(str) > 0 && Number(str) < 1) { 
                        const totalMins = Math.round(Number(str) * 24 * 60);
                        return `${String(Math.floor(totalMins / 60)).padStart(2,'0')}:${String(totalMins % 60).padStart(2,'0')}`;
                    }
                    if(str.includes(':')) {
                        const p = str.split(':'); 
                        return `${p[0].padStart(2,'0')}:${p[1].padStart(2,'0')}`;
                    }
                    return str;
                };

                const inTime = inIdx !== -1 ? formatTime(row[inIdx]) : '';
                const outTime = outIdx !== -1 ? formatTime(row[outIdx]) : '';

                if (inTime || outTime) {
                    const newDaily = [...updated[studentIdx].studyTime[studyTimeMonth]];
                    newDaily[targetDayIdx] = { in: inTime || newDaily[targetDayIdx].in, out: outTime || newDaily[targetDayIdx].out };
                    updated[studentIdx].studyTime[studyTimeMonth] = newDaily;
                    matchedKeys.add(updated[studentIdx].id);
                }
            }
        }
        return updated;
    });
    setTimeout(() => { showAlert(`${targetDayIdx + 1}일자 학습시간 연동 완료! 총 ${matchedKeys.size}명 적용.`); }, 50);
  };

  const handleMonthlyChange = (studentId, subject, field, value) => {
    setStudents(prev => prev.map(s => {
      if(s.id !== studentId) return s;
      const currentMonthData = s.scores.monthly[detailSelectedMonth] || generateEmptyMonthlyData()[detailSelectedMonth];
      return { ...s, scores: { ...s.scores, monthly: { ...s.scores.monthly, [detailSelectedMonth]: { ...currentMonthData, [subject]: { ...currentMonthData[subject], [field]: value } } } } };
    }));
  };

  const handleAttendanceChange = (studentId, timeOfDay, dayIndex, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      const updatedAm = [...student.attendance[attendanceMonth].am]; 
      const updatedPm = [...student.attendance[attendanceMonth].pm];
      if (timeOfDay === 'am') updatedAm[dayIndex] = value;
      if (timeOfDay === 'pm') updatedPm[dayIndex] = value;
      return { ...student, attendance: { ...student.attendance, [attendanceMonth]: { ...student.attendance[attendanceMonth], am: updatedAm, pm: updatedPm } } };
    }));
  };

  const handleAttendanceMemoChange = (studentId, timeOfDay, dayIndex, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      const memoField = timeOfDay === 'am' ? 'amMemo' : 'pmMemo';
      const updatedMemo = [...(student.attendance[attendanceMonth][memoField] || Array(31).fill(''))];
      updatedMemo[dayIndex] = value;
      return { ...student, attendance: { ...student.attendance, [attendanceMonth]: { ...student.attendance[attendanceMonth], [memoField]: updatedMemo } } };
    }));
  };

  const handleStudyTimeChange = (studentId, dayIndex, field, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      const newDaily = [...student.studyTime[studyTimeMonth]];
      newDaily[dayIndex] = { ...newDaily[dayIndex], [field]: value };
      return { ...student, studyTime: { ...student.studyTime, [studyTimeMonth]: newDaily } };
    }));
  };

  const handleDailyScoreChange = (studentId, dayIndex, testIndex, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      const newDaily = [...student.dailyRecords[dailyMonth]]; 
      newDaily[dayIndex] = { ...newDaily[dayIndex], [testIndex]: value };
      return { ...student, dailyRecords: { ...student.dailyRecords, [dailyMonth]: newDaily } };
    }));
  };

  const studentProfileToView = useMemo(() => students.find(s => s.id === viewingProfileId), [viewingProfileId, students]);
  const studentGradeToView = useMemo(() => students.find(s => s.id === viewingGradeId), [viewingGradeId, students]);
  const editingStudent = useMemo(() => students.find(s => s.id === editingMonthlyStudentId), [editingMonthlyStudentId, students]);
  
  const reportStudent = useMemo(() => {
    if (reportStudentId) {
      const found = students.find(s => s.id === reportStudentId);
      if (found) return found;
    }
    return filteredStudents.length > 0 ? filteredStudents[0] : null;
  }, [reportStudentId, students, filteredStudents]);

  return (
    <div className="min-h-screen flex w-full">
      {/* Toast Notification */}
      {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-5 font-bold">{toast}</div>}
      
      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <p className="text-slate-800 font-bold mb-6 whitespace-pre-wrap">{confirmDialog.msg}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 사이드바 영역 ---------------- */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col print:hidden shadow-2xl z-20 shrink-0 h-screen overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"><ChevronLeft size={20} /></button>
          <div><div className="text-xs text-indigo-400 font-bold mb-0.5">{academicYear} Academic</div><h1 className="text-xl font-extrabold tracking-tight truncate w-40" title={className}>{className} 관리</h1></div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-6">
          <div><SidebarButton icon={LayoutDashboard} label="반별 대시보드" tabName="dashboard" activeTab={activeTab} onClick={() => setActiveTab('dashboard')} /></div>
          
          <div className="border-t border-slate-800 pt-4"><SidebarButton icon={Users} label="학생 명단 및 신상" tabName="students" activeTab={activeTab} onClick={() => setActiveTab('students')} /></div>
          
          <div>
            <button onClick={() => setActiveTab('attendance')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'attendance' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><CalendarCheck size={18} /><span>출결 및 학습시간</span></div>
              <ChevronDown size={16} className={`transition-transform duration-200 ${activeTab === 'attendance' ? 'rotate-180' : ''}`} />
            </button>
            {activeTab === 'attendance' && (
              <div className="flex flex-col gap-1 px-3 pb-2 pt-2 bg-slate-900/50 rounded-b-xl -mt-2 border-x border-b border-slate-800 shadow-inner">
                <SubTabButton label="• 출결 관리" subTab="calendar" activeSubTab={activeAttendanceTab} onClick={() => setActiveAttendanceTab('calendar')} />
                <SubTabButton label="• 학습시간 기입" subTab="studyTime" activeSubTab={activeAttendanceTab} onClick={() => setActiveAttendanceTab('studyTime')} />
              </div>
            )}
          </div>

          <div>
            <button onClick={() => setActiveTab('test')} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'test' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center gap-3"><PenTool size={18} /><span>TEST 관리</span></div>
              <ChevronDown size={16} className={`transition-transform duration-200 ${activeTab === 'test' ? 'rotate-180' : ''}`} />
            </button>
            {activeTab === 'test' && (
              <div className="flex flex-col gap-1 px-3 pb-2 pt-2 bg-slate-900/50 rounded-b-xl -mt-2 border-x border-b border-slate-800 shadow-inner">
                <SubTabButton label="• Daily" subTab="daily" activeSubTab={activeTestTab} onClick={() => {setActiveTestTab('daily'); setActiveDailyTab('input');}} />
                <SubTabButton label="• Weekly" subTab="weekly" activeSubTab={activeTestTab} onClick={() => {setActiveTestTab('weekly'); setActiveWeeklyTab('setup');}} />
                <SubTabButton label="• Monthly" subTab="monthly" activeSubTab={activeTestTab} onClick={() => {setActiveTestTab('monthly'); setTestViewMode('input');}} />
              </div>
            )}
          </div>

          <div><SidebarButton icon={BarChart3} label="성적 현황 요약" tabName="grades" activeTab={activeTab} onClick={() => setActiveTab('grades')} highlight="indigo" /></div>
          <div className="pt-4 border-t border-slate-800"><SidebarButton icon={Printer} label="월간 리포트 생성" tabName="report" activeTab={activeTab} onClick={() => setActiveTab('report')} /></div>
        </nav>
      </aside>

      {/* ---------------- 메인 컨텐츠 영역 ---------------- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative print:bg-white print:overflow-visible">
        <div className="flex-1 overflow-auto p-4 md:p-8 print:p-0">
          
          {/* [0] 대시보드 탭 (Feature 1) */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 border-l-4 border-l-slate-800">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><LayoutDashboard className="text-slate-800" size={24} /> {className} 오늘 요약 (Dashboard)</h1>
                  <p className="text-slate-500 text-sm mt-1">학생들의 핵심 데이터 및 주의 요망 대상을 한눈에 파악하세요.</p>
                </div>
                <div>
                  <select className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none shadow-sm" value={dashboardMonth} onChange={(e) => setDashboardMonth(e.target.value)}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 opacity-5 text-indigo-500"><Users size={100}/></div>
                   <span className="text-sm font-bold text-slate-500 mb-2 z-10">총 재원생</span>
                   <span className="text-4xl font-extrabold text-slate-800 z-10">{classStudents.length} <span className="text-xl text-slate-400 font-medium">명</span></span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 opacity-5 text-emerald-500"><CalendarCheck size={100}/></div>
                   <span className="text-sm font-bold text-slate-500 mb-2 z-10">{dashboardMonth} 평균 출석률</span>
                   <span className="text-4xl font-extrabold text-emerald-600 z-10">{classAvgAttendance}%</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 opacity-5 text-indigo-500"><Clock size={100}/></div>
                   <span className="text-sm font-bold text-slate-500 mb-2 z-10">{dashboardMonth} 평균 학습시간</span>
                   <span className="text-4xl font-extrabold text-indigo-600 z-10">{classAvgStudyTime.split('시간')[0]}<span className="text-xl font-bold">h</span></span>
                </div>
              </div>

              {/* Alerts */}
              {(() => {
                const alerts = getDashboardAlerts();
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-rose-50/50 rounded-2xl border border-rose-100 p-6">
                       <h3 className="font-bold text-rose-800 flex items-center gap-2 mb-4 pb-2 border-b border-rose-100"><AlertTriangle size={18}/> 출결 요주의 (80% 미만)</h3>
                       {alerts.attendance.length > 0 ? (
                         <ul className="space-y-2">
                           {alerts.attendance.map((s, i) => <li key={i} className="flex justify-between text-sm font-bold text-slate-700 bg-white p-2 rounded shadow-sm"><span>{s.name}</span><span className="text-rose-600">{s.val}</span></li>)}
                         </ul>
                       ) : <div className="text-sm text-slate-400 text-center py-4">해당 학생이 없습니다.</div>}
                    </div>
                    <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-6">
                       <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-4 pb-2 border-b border-amber-100"><AlertTriangle size={18}/> Daily 참여 저조 (70% 미만)</h3>
                       {alerts.dailyScore.length > 0 ? (
                         <ul className="space-y-2">
                           {alerts.dailyScore.map((s, i) => <li key={i} className="flex justify-between text-sm font-bold text-slate-700 bg-white p-2 rounded shadow-sm"><span>{s.name}</span><span className="text-amber-600">{s.val}</span></li>)}
                         </ul>
                       ) : <div className="text-sm text-slate-400 text-center py-4">해당 학생이 없습니다.</div>}
                    </div>
                    <div className="bg-slate-100/50 rounded-2xl border border-slate-200 p-6">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-200"><AlertTriangle size={18}/> 누적 학습시간 저조 (하위 3명)</h3>
                       {alerts.studyTime.length > 0 ? (
                         <ul className="space-y-2">
                           {alerts.studyTime.map((s, i) => <li key={i} className="flex justify-between text-sm font-bold text-slate-700 bg-white p-2 rounded shadow-sm"><span>{s.name}</span><span className="text-slate-500">{s.val}</span></li>)}
                         </ul>
                       ) : <div className="text-sm text-slate-400 text-center py-4">데이터가 부족합니다.</div>}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* [1] 학생목록 탭 */}
          {activeTab === 'students' && (
             <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
               <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                 <div><h1 className="text-2xl font-extrabold text-slate-900">수강생 통합 명단</h1></div>
                 <div className="flex gap-2">
                   <button onClick={handleExportStudentsExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex gap-2 transition-colors shadow-sm"><DownloadCloud size={18}/>명단 다운로드</button>
                   <button onClick={() => setShowAddModal(true)} className="bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-5 py-2.5 rounded-xl font-bold flex gap-2 transition-colors"><UserPlus size={18}/>수기 등록</button>
                   <button onClick={() => openImportModal('student')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex gap-2 transition-colors"><FileSpreadsheet size={18}/>신상정보 엑셀 파싱</button>
                 </div>
               </div>
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                 <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input type="text" placeholder="이름, 학번, 연락처 검색..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-500">총 <span className="text-indigo-600">{filteredStudents.length}</span> 명</div>
                </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-center text-sm whitespace-nowrap">
                     <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                       <tr>
                         <th className="px-4 py-3">NO</th>
                         <th className="px-4 py-3 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('name')}>
                            <div className="flex items-center justify-center gap-1">학생명 {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={14}/> : <ArrowUpZA size={14}/>) : <ArrowDownAZ size={14} className="opacity-30"/>}</div>
                         </th>
                         <th className="px-4 py-3">아이디</th>
                         <th className="px-4 py-3">수강반</th>
                         <th className="px-4 py-3">캠퍼스</th>
                         <th className="px-4 py-3">성별</th>
                         <th className="px-4 py-3">편입구분</th>
                         <th className="px-4 py-3">계열</th>
                         <th className="px-4 py-3 text-rose-500">관리</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredStudents.map((student, index) => (
                           <tr key={student.id} className="hover:bg-indigo-50/40 transition-colors group cursor-pointer" onClick={() => setViewingProfileId(student.id)}>
                             <td className="px-4 py-3 text-slate-400 font-medium">{index + 1}</td>
                             <td className="px-4 py-3 font-bold text-slate-900 group-hover:text-indigo-600">{student.name}</td>
                             <td className="px-4 py-3 font-mono text-slate-600">{student.userId || student.id}</td>
                             <td className="px-4 py-3 font-bold text-indigo-600">{student.className}</td>
                             <td className="px-4 py-3 text-slate-600">대구</td>
                             <td className="px-4 py-3 text-slate-600">{student.gender || '-'}</td>
                             <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{student.transferType || '-'}</span></td>
                             <td className="px-4 py-3"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold">{student.targetTrack || '-'}</span></td>
                             <td className="px-4 py-3">
                               <button onClick={(e) => handleDeleteStudent(e, student.id, student.name)} className="p-1.5 bg-rose-50 text-rose-500 rounded hover:bg-rose-500 hover:text-white transition-colors">
                                 <Trash2 size={16} />
                               </button>
                             </td>
                           </tr>
                         ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
          )}

          {/* [2] 31일 출결 캘린더 */}
          {activeTab === 'attendance' && activeAttendanceTab === 'calendar' && (
            <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 border-l-4 border-l-emerald-500">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><CalendarCheck className="text-emerald-500" size={24} />31일 출결 관리</h1>
                  <p className="text-slate-500 text-sm mt-1">오전/오후 출결을 기록하면 개인별/반 평균 출석률과 벌점이 자동 계산됩니다.</p>
                </div>
                <div className="flex items-center gap-6">
                  <select className="border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-700 outline-none bg-emerald-50 shadow-sm mr-4" value={attendanceMonth} onChange={(e) => setAttendanceMonth(e.target.value)}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-bold mb-1">{className} 평균 출석률</div>
                    <div className="text-2xl font-extrabold text-emerald-600">{classAvgAttendance}%</div>
                  </div>
                  <div className="h-10 w-px bg-slate-200"></div>
                  <button onClick={handleExportAttendanceExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"><DownloadCloud size={18} />출결 다운로드</button>
                  <div className="bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-100"><CheckCircle2 size={18} />자동 저장중</div>
                </div>
              </div>

              <div className="mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Calendar size={18} className="text-rose-500"/> 🚫 미등원 일자 (휴원 및 공휴일) 설정</div>
                <div className="flex flex-wrap gap-2">
                    {Array.from({length:31}, (_, i) => {
                        const isExcluded = attendanceSettings[attendanceMonth].excludedDays.includes(i);
                        return (
                            <button key={i} onClick={() => toggleAttendanceExcluded(attendanceMonth, i)}
                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${isExcluded ? 'bg-rose-500 text-white shadow-inner' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {i+1}
                            </button>
                        )
                    })}
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-3">※ 빨간색으로 선택된 일자는 출석부에서 비활성화되며 <span className="text-rose-500">출석률 및 벌점 계산에서 완전히 제외</span>됩니다.</p>
              </div>

              {/* 출결 일괄 처리 영역 */}
              <div className="mb-4 bg-emerald-50/50 p-4 rounded-2xl shadow-sm border border-emerald-100">
                <div className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> 👥 선택 학생 일괄 출결 처리 (현재 {selectedStudents.length}명 선택됨)</div>
                <div className="flex flex-wrap items-center gap-3">
                  <select className="border border-emerald-200 rounded-lg px-3 py-2 outline-none text-sm font-bold text-slate-700 bg-white" value={batchAttendanceDate} onChange={e => setBatchAttendanceDate(e.target.value)}>
                    {Array.from({length: 31}, (_, i) => <option key={i} value={i}>{i+1}일</option>)}
                  </select>
                  <select className="border border-emerald-200 rounded-lg px-3 py-2 outline-none text-sm font-bold text-slate-700 bg-white" value={batchAttendanceTimeOfDay} onChange={e => setBatchAttendanceTimeOfDay(e.target.value)}>
                    <option value="am">오전</option>
                    <option value="pm">오후</option>
                  </select>
                  <select className="border border-emerald-200 rounded-lg px-3 py-2 outline-none text-sm font-bold text-slate-700 bg-white" value={batchAttendanceStatus} onChange={e => setBatchAttendanceStatus(e.target.value)}>
                    <option value="">출결 사유 선택</option>
                    {ATTENDANCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <button onClick={handleBatchAttendanceChange} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50" disabled={selectedStudents.length === 0}>
                    일괄 적용
                  </button>
                  <button onClick={() => handleSelectAllStudents(selectedStudents.length !== filteredStudents.length)} className="ml-auto text-sm font-bold text-emerald-700 hover:text-emerald-800 underline">
                    {selectedStudents.length === filteredStudents.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
              </div>

              <div className="mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> ⚠️ 벌점 기준 설정</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        최대 벌점 기준: <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 outline-none text-center focus:ring-2 focus:ring-indigo-400" value={penaltyRules.maxPenalty} onChange={e => setPenaltyRules(p => ({...p, maxPenalty: Number(e.target.value)}))} /> 점
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {ATTENDANCE_OPTIONS.map(opt => (
                        <div key={opt} className="flex items-center gap-2 text-[11px] bg-slate-50 border border-slate-200 p-2 rounded-lg">
                            <input type="checkbox" checked={penaltyRules.rules[opt]?.apply} onChange={(e) => handlePenaltyRuleChange(opt, 'apply', e.target.checked)} className="cursor-pointer" />
                            <span className="font-bold text-slate-600 w-12 text-center">{opt}</span>
                            <input type="number" disabled={!penaltyRules.rules[opt]?.apply} className="w-10 border border-slate-300 rounded px-1 py-0.5 text-center outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-100 disabled:text-slate-300" value={penaltyRules.rules[opt]?.score} onChange={e => handlePenaltyRuleChange(opt, 'score', Number(e.target.value))} />
                        </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto custom-scrollbar pb-4">
                  <table className="w-max min-w-full text-center text-sm border-collapse">
                    <thead className="bg-slate-800 text-white font-medium sticky top-0 z-20">
                      <tr>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-0 z-30 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-10 text-center">
                           <input type="checkbox" className="cursor-pointer" checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length} onChange={(e) => handleSelectAllStudents(e.target.checked)} />
                        </th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 sticky left-[40px] z-30 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-40 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                          <div className="flex items-center justify-between">이름 (출석률) {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                        </th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-[200px] z-30 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-16">구분</th>
                        <th colSpan={31} className="py-2 border-b border-slate-700 bg-slate-800">{attendanceMonth} 일별 출석 사유 (1일 ~ 31일)</th>
                        <th rowSpan={2} className="px-4 py-3 border-l border-slate-700 bg-slate-900 text-rose-300 w-24">벌점 현황<br/><span className="text-[10px] text-slate-400 font-normal text-rose-200/50">(자동계산)</span></th>
                      </tr>
                      <tr className="bg-slate-700 text-xs">
                        {Array.from({length: 31}, (_, i) => {
                          const isExcluded = attendanceSettings[attendanceMonth].excludedDays.includes(i);
                          return (<th key={i} className={`min-w-[70px] w-[70px] px-1 py-1.5 border-r border-slate-600 font-bold ${isExcluded ? 'bg-rose-900/50 text-rose-300' : ''}`}>{i+1}</th>);
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {filteredStudents.map((student) => {
                        const amData = student.attendance[attendanceMonth]?.am || Array(31).fill('');
                        const pmData = student.attendance[attendanceMonth]?.pm || Array(31).fill('');
                        const isSelected = selectedStudents.includes(student.id);
                        return (
                          <React.Fragment key={student.id}>
                            <tr className={`hover:bg-emerald-50/50 group ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                              <td rowSpan={2} className="border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-emerald-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center px-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleStudentSelection(student.id); }}>
                                 <input type="checkbox" className="cursor-pointer" checked={isSelected} onChange={() => {}} />
                              </td>
                              <td rowSpan={2} className="border-r border-slate-200 sticky left-[40px] z-10 bg-white group-hover:bg-emerald-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-left px-4 cursor-pointer" onClick={() => setViewingAttendanceSummary(student)}>
                                <div className="flex flex-col w-full gap-1">
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-slate-900 text-[13px]">{student.name}</span>
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">{getAttendanceRate(student, attendanceMonth)}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono text-left">{student.id} / {student.userId}</div>
                                </div>
                              </td>
                              <td className="border-r border-b-0 border-slate-200 sticky left-[200px] z-10 bg-slate-50 text-slate-500 font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.05)]">오전</td>
                              {amData.map((val, dayIdx) => {
                                const isExcluded = attendanceSettings[attendanceMonth].excludedDays.includes(dayIdx);
                                const memoVal = student.attendance[attendanceMonth]?.amMemo?.[dayIdx] || '';
                                return (
                                <td key={`am-${dayIdx}`} className={`border-r border-slate-200 p-0 relative group/cell ${isExcluded ? 'bg-slate-100' : ''}`} onContextMenu={(e) => { if(isExcluded) return; e.preventDefault(); e.stopPropagation(); const newMemo = prompt(`${dayIdx+1}일 오전 메모 입력:`, memoVal); if (newMemo !== null) handleAttendanceMemoChange(student.id, 'am', dayIdx, newMemo); }}>
                                  <select disabled={isExcluded} value={isExcluded ? '' : val} onChange={(e) => handleAttendanceChange(student.id, 'am', dayIdx, e.target.value)} className={`w-full h-full py-2.5 px-1 outline-none cursor-pointer appearance-none text-center font-medium tracking-tight ${isExcluded ? 'cursor-not-allowed opacity-0' : val === '출석' ? 'text-emerald-600 bg-emerald-50/30' : val === '결석' ? 'text-rose-600 bg-rose-100/50 font-bold' : val === '지각' ? 'text-amber-600 bg-amber-50/30' : val === '조퇴' ? 'text-orange-600 bg-orange-50/30' : val !== '' ? 'text-slate-600 bg-slate-100/50' : 'bg-transparent text-slate-400 hover:bg-slate-100 transition-colors'}`}>
                                    <option value=""></option>{ATTENDANCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  {!isExcluded && (
                                      <div className={`absolute top-0 right-0 w-3 h-3 z-10 cursor-pointer ${memoVal ? 'bg-red-500 rounded-bl-sm shadow-sm' : 'opacity-0 group-hover/cell:opacity-100 bg-slate-300 hover:bg-red-400 rounded-bl-sm'}`} onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          const newMemo = prompt(`${dayIdx+1}일 오전 메모 입력:`, memoVal);
                                          if (newMemo !== null) handleAttendanceMemoChange(student.id, 'am', dayIdx, newMemo);
                                      }} title={memoVal ? `메모: ${memoVal}` : "메모 추가 (우클릭 가능)"}></div>
                                  )}
                                </td>
                              )})}
                              <td rowSpan={2} className="border-l border-slate-200 align-middle bg-rose-50/40">
                                  <div className={`font-extrabold text-[14px] flex justify-center w-full ${(typeof penaltyRules !== 'undefined' ? getAttendancePenalty(student, attendanceMonth) >= penaltyRules.maxPenalty : false) ? 'text-white bg-red-500 py-1 rounded px-2 animate-pulse' : 'text-rose-500'}`}>
                                      {getAttendancePenalty(student, attendanceMonth)} 점
                                  </div>
                              </td>
                            </tr>
                            <tr className={`border-b-[3px] border-b-slate-200 hover:bg-emerald-50/50 ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                              <td className="border-r border-slate-200 sticky left-[200px] z-10 bg-slate-50 text-slate-500 font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.05)]">오후</td>
                              {pmData.map((val, dayIdx) => {
                                const isExcluded = attendanceSettings[attendanceMonth].excludedDays.includes(dayIdx);
                                const memoVal = student.attendance[attendanceMonth]?.pmMemo?.[dayIdx] || '';
                                return (
                                <td key={`pm-${dayIdx}`} className={`border-r border-slate-200 p-0 relative group/cell ${isExcluded ? 'bg-slate-100' : ''}`} onContextMenu={(e) => { if(isExcluded) return; e.preventDefault(); e.stopPropagation(); const newMemo = prompt(`${dayIdx+1}일 오후 메모 입력:`, memoVal); if (newMemo !== null) handleAttendanceMemoChange(student.id, 'pm', dayIdx, newMemo); }}>
                                  <select disabled={isExcluded} value={isExcluded ? '' : val} onChange={(e) => handleAttendanceChange(student.id, 'pm', dayIdx, e.target.value)} className={`w-full h-full py-2.5 px-1 outline-none cursor-pointer appearance-none text-center font-medium tracking-tight ${isExcluded ? 'cursor-not-allowed opacity-0' : val === '출석' ? 'text-emerald-600 bg-emerald-50/30' : val === '결석' ? 'text-rose-600 bg-rose-100/50 font-bold' : val === '지각' ? 'text-amber-600 bg-amber-50/30' : val === '조퇴' ? 'text-orange-600 bg-orange-50/30' : val !== '' ? 'text-slate-600 bg-slate-100/50' : 'bg-transparent text-slate-400 hover:bg-slate-100 transition-colors'}`}>
                                    <option value=""></option>{ATTENDANCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  {!isExcluded && (
                                      <div className={`absolute top-0 right-0 w-3 h-3 z-10 cursor-pointer ${memoVal ? 'bg-red-500 rounded-bl-sm shadow-sm' : 'opacity-0 group-hover/cell:opacity-100 bg-slate-300 hover:bg-red-400 rounded-bl-sm'}`} onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          const newMemo = prompt(`${dayIdx+1}일 오후 메모 입력:`, memoVal);
                                          if (newMemo !== null) handleAttendanceMemoChange(student.id, 'pm', dayIdx, newMemo);
                                      }} title={memoVal ? `메모: ${memoVal}` : "메모 추가 (우클릭 가능)"}></div>
                                  )}
                                </td>
                              )})}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* [2-2] 학습시간 기입 (날짜별 엑셀 업로드 지원) */}
          {activeTab === 'attendance' && activeAttendanceTab === 'studyTime' && (
             <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 border-l-4 border-l-indigo-500">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Clock className="text-indigo-500" size={24} />31일 학습시간 기입란</h1>
                  <p className="text-slate-500 text-sm mt-1">엑셀을 통해 일별 등원/하원 시간을 기입하면 하루 및 누적 학습시간, <b>누적 등수</b>가 자동 산출됩니다.</p>
                </div>
                <div className="flex items-center gap-4">
                  <select className="border border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-700 outline-none bg-indigo-50 shadow-sm" value={studyTimeMonth} onChange={(e) => setStudyTimeMonth(e.target.value)}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  
                  <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner w-fit">
                      <button onClick={()=>setActiveStudyTimeTab('input')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeStudyTimeTab === 'input' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>✏️ 일별 기입</button>
                      <button onClick={()=>setActiveStudyTimeTab('ranking_monthly')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${activeStudyTimeTab === 'ranking_monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Trophy size={14}/> 월별 랭킹</button>
                      <button onClick={()=>setActiveStudyTimeTab('ranking_total')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${activeStudyTimeTab === 'ranking_total' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Trophy size={14}/> 전체 누적 랭킹</button>
                  </div>
                </div>
              </div>

              {activeStudyTimeTab === 'input' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  {/* 학습시간 일괄 처리 영역 */}
                  <div className="bg-indigo-50/50 p-4 border-b border-indigo-100/50 flex flex-wrap items-center gap-3">
                     <div className="text-sm font-bold text-indigo-800 flex items-center gap-2 mr-2"><CheckCircle2 size={18} className="text-indigo-500"/> 👥 선택 학생 일괄 기입 (현재 {selectedStudents.length}명 선택)</div>
                     <select className="border border-indigo-200 rounded-lg px-3 py-1.5 outline-none text-sm font-bold text-slate-700 bg-white" value={batchStudyTimeDate} onChange={e => setBatchStudyTimeDate(e.target.value)}>
                        {Array.from({length: 31}, (_, i) => <option key={i} value={i}>{i+1}일</option>)}
                     </select>
                     <input type="text" placeholder="등원 (예: 09:00)" className="w-32 px-3 py-1.5 border border-indigo-200 rounded-lg outline-none text-sm font-bold text-slate-700" value={batchStudyTimeIn} onChange={e => setBatchStudyTimeIn(e.target.value)} />
                     <span className="text-slate-400 font-bold">-</span>
                     <input type="text" placeholder="하원 (예: 18:00)" className="w-32 px-3 py-1.5 border border-indigo-200 rounded-lg outline-none text-sm font-bold text-slate-700" value={batchStudyTimeOut} onChange={e => setBatchStudyTimeOut(e.target.value)} />
                     <button onClick={handleBatchStudyTimeChange} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50" disabled={selectedStudents.length === 0}>
                        일괄 적용
                     </button>
                     <button onClick={() => handleSelectAllStudents(selectedStudents.length !== filteredStudents.length)} className="ml-auto text-sm font-bold text-indigo-700 hover:text-indigo-800 underline">
                        {selectedStudents.length === filteredStudents.length ? '전체 해제' : '전체 선택'}
                     </button>
                  </div>
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                     <div className="font-bold text-slate-700 flex items-center gap-2">
                       <Clock size={18} className="text-indigo-500" />
                       현재 반 전체 월간 평균 공부 시간
                     </div>
                     <div className="text-indigo-600 font-extrabold text-xl">{classAvgStudyTime}</div>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar pb-4">
                    <table className="w-max min-w-full text-center text-sm border-collapse">
                      <thead className="bg-slate-800 text-white font-medium sticky top-0 z-20">
                        <tr>
                          <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-0 z-30 bg-slate-900 w-10 text-center">
                             <input type="checkbox" className="cursor-pointer" checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length} onChange={(e) => handleSelectAllStudents(e.target.checked)} />
                          </th>
                          <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 sticky left-[40px] z-30 bg-slate-900 w-44 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                             <div className="flex items-center justify-between">이름 (아이디) {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                          </th>
                          <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-[216px] z-30 bg-slate-900 w-32 text-emerald-300 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('studyTime')}>
                             <div className="flex items-center justify-center gap-1">이번달 누적시간 / 등수 {sortKey === 'studyTime' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                          </th>
                          <th colSpan={31} className="py-2 border-b border-slate-700 bg-slate-800">{studyTimeMonth} 일별 학습시간 기록 (1일 ~ 31일)</th>
                        </tr>
                        <tr className="bg-slate-700 text-xs">
                          {Array.from({length: 31}, (_, i) => (
                            <th key={i} className="min-w-[100px] w-[100px] px-1 py-1.5 border-r border-slate-600 font-bold tracking-widest cursor-pointer hover:bg-slate-600 transition-colors group relative" onClick={() => triggerDirectUpload('studyTimeDaily', i)}>
                              <div className="flex flex-col items-center">
                                {i+1}일
                                <UploadCloud size={14} className="text-slate-400 group-hover:text-white mt-0.5" />
                              </div>
                              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                {i+1}일자 엑셀 업로드
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {filteredStudents.map((student) => {
                          const dailyData = student.studyTime[studyTimeMonth] || Array.from({length: 31}, () => ({in: '', out: ''}));
                          const currentTotalTime = getStudyTimeCurrent(student, studyTimeMonth);
                          const isSelected = selectedStudents.includes(student.id);
                          return (
                            <tr key={student.id} className={`hover:bg-indigo-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-indigo-50/30' : ''}`} onClick={() => setViewingStudyTimeSummary(student)}>
                              <td className="border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-indigo-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center px-3" onClick={(e) => { e.stopPropagation(); toggleStudentSelection(student.id); }}>
                                 <input type="checkbox" className="cursor-pointer" checked={isSelected} onChange={() => {}} />
                              </td>
                              <td className="border-r border-slate-200 sticky left-[40px] z-10 bg-white group-hover:bg-indigo-50 px-4 py-3 align-middle text-left shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                <div className="font-bold text-slate-900 text-[14px]">{student.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter mt-0.5">{student.userId || student.id}</div>
                              </td>
                              <td className="border-r border-slate-200 sticky left-[216px] z-10 bg-slate-50 group-hover:bg-indigo-50/80 py-3 px-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                <div className="flex flex-col gap-2 items-center justify-center h-full">
                                  <div className="text-slate-800 font-extrabold text-[13px] whitespace-nowrap">{currentTotalTime}</div>
                                  <div className="h-px w-8 bg-slate-200"></div>
                                  <div className="text-emerald-600 font-extrabold text-[13px]">{studyTimeRankings[student.id] || '-'} <span className="text-[10px] font-normal text-emerald-400">등</span></div>
                                </div>
                              </td>
                              {dailyData.map((rec, dayIdx) => (
                                <td key={dayIdx} className="border-r border-slate-200 p-1.5 bg-white group-hover:bg-indigo-50/20 align-middle" onClick={e => e.stopPropagation()}>
                                  <div className="flex flex-col gap-1 items-center">
                                    <div className="flex gap-1">
                                      <input type="text" className="w-11 text-center border rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-bold" value={rec.in} placeholder="등원" onChange={(e)=>handleStudyTimeChange(student.id, dayIdx, 'in', e.target.value)}/>
                                      <input type="text" className="w-11 text-center border rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-bold" value={rec.out} placeholder="하원" onChange={(e)=>handleStudyTimeChange(student.id, dayIdx, 'out', e.target.value)}/>
                                    </div>
                                    <div className="text-[10px] font-bold text-indigo-500 mt-0.5 bg-indigo-50/50 w-full py-0.5 rounded">{calculateTimeDiff(rec.in, rec.out)}</div>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
              )}

              {activeStudyTimeTab === 'ranking_monthly' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-8">
                     <h3 className="font-bold text-slate-800 mb-8 flex items-center gap-2 text-xl"><Trophy size={24} className="text-amber-500"/> {studyTimeMonth} 학생별 학습시간 랭킹</h3>
                     <div className="max-w-4xl w-full mx-auto space-y-4">
                        {(() => {
                           const rankedMonthly = classStudents
                               .map(s => {
                                   let monthMins = 0;
                                   let days = 0;
                                   (s.studyTime[studyTimeMonth] || []).forEach(d => {
                                       const diff = parseTimeDiffToMins(d.in, d.out);
                                       if(diff > 0) { monthMins += diff; days++; }
                                   });
                                   const avgMins = days > 0 ? Math.floor(monthMins / days) : 0;
                                   return { student: s, monthMins, monthStr: formatMinsToTime(monthMins), avgStr: formatMinsToTime(avgMins) };
                               })
                               .sort((a,b) => b.monthMins - a.monthMins);
                           
                           const topMonthlyScore = rankedMonthly[0]?.monthMins || 1;

                           return rankedMonthly.map((item, idx) => {
                               if(item.monthMins === 0) return null; 
                               const percent = (item.monthMins / topMonthlyScore) * 100;
                               return (
                                   <div key={item.student.id} className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-3 rounded-xl transition-colors border border-transparent hover:border-slate-200" onClick={() => setViewingStudyTimeSummary(item.student)}>
                                       <div className={`w-10 text-center font-extrabold text-lg ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-500'}`}>{idx + 1}</div>
                                       <div className="w-24 font-bold text-slate-800 text-base truncate">{item.student.name}</div>
                                       <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative shadow-inner">
                                           <div className={`h-full rounded-full transition-all duration-1000 ${idx < 3 ? 'bg-indigo-500' : 'bg-indigo-300'}`} style={{width: `${percent}%`}}></div>
                                       </div>
                                       <div className="w-48 text-right flex flex-col justify-center">
                                           <div className="font-extrabold text-indigo-600 text-lg">{item.monthStr}</div>
                                           <div className="text-xs text-slate-500 font-medium">일 평균 {item.avgStr}</div>
                                       </div>
                                   </div>
                               )
                           })
                        })()}
                     </div>
                 </div>
              )}

              {activeStudyTimeTab === 'ranking_total' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-8">
                     <h3 className="font-bold text-slate-800 mb-8 flex items-center gap-2 text-xl"><Trophy size={24} className="text-emerald-500"/> 학생별 전체 누적 학습시간 랭킹 (1~12월)</h3>
                     <div className="max-w-4xl w-full mx-auto space-y-4">
                        {(() => {
                           const rankedTotal = classStudents
                               .map(s => {
                                   const stats = getStudyTimeStats(s);
                                   let activeMonths = 0;
                                   MONTHS.forEach(m => {
                                       if(s.studyTime[m]?.some(d => parseTimeDiffToMins(d.in, d.out) > 0)) activeMonths++;
                                   });
                                   const monthlyAvgMins = activeMonths > 0 ? Math.floor(stats.totalMins / activeMonths) : 0;
                                   return { student: s, stats, monthlyAvgStr: formatMinsToTime(monthlyAvgMins) };
                               })
                               .sort((a,b) => b.stats.totalMins - a.stats.totalMins);
                           const topScore = rankedTotal[0]?.stats.totalMins || 1;

                           return rankedTotal.map((item, idx) => {
                               if(item.stats.totalMins === 0) return null; 
                               const percent = (item.stats.totalMins / topScore) * 100;
                               return (
                                   <div key={item.student.id} className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-3 rounded-xl transition-colors border border-transparent hover:border-slate-200" onClick={() => setViewingStudyTimeSummary(item.student)}>
                                       <div className={`w-10 text-center font-extrabold text-lg ${idx === 0 ? 'text-emerald-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-emerald-700' : 'text-slate-500'}`}>{idx + 1}</div>
                                       <div className="w-24 font-bold text-slate-800 text-base truncate">{item.student.name}</div>
                                       <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative shadow-inner">
                                           <div className={`h-full rounded-full transition-all duration-1000 ${idx < 3 ? 'bg-emerald-500' : 'bg-emerald-300'}`} style={{width: `${percent}%`}}></div>
                                       </div>
                                       <div className="w-48 text-right flex flex-col justify-center">
                                           <div className="font-extrabold text-emerald-600 text-lg">{item.stats.totalStr}</div>
                                           <div className="text-xs text-slate-500 font-medium">월 평균 {item.monthlyAvgStr}</div>
                                       </div>
                                   </div>
                               )
                           })
                        })()}
                     </div>
                 </div>
              )}
            </div>
          )}

          {/* [3] TEST 관리 (Daily / Weekly / Monthly) */}
          {activeTab === 'test' && (
            <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 border-l-4 border-l-indigo-500">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wide"><PenTool className="text-indigo-500" size={24} /> {activeTestTab} TEST 관리</h1>
                </div>
                <div className="flex items-center gap-4">
                  {/* 월 선택: Daily, Weekly, Monthly 각각 자신의 월 선택 */}
                  {activeTestTab === 'daily' && (
                    <select className="border border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-700 outline-none bg-indigo-50 shadow-sm" value={dailyMonth} onChange={(e) => setDailyMonth(e.target.value)}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                  {activeTestTab === 'weekly' && (
                    <select className="border border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-700 outline-none bg-indigo-50 shadow-sm" value={weeklyMonth} onChange={(e) => setWeeklyMonth(e.target.value)}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                  {activeTestTab === 'monthly' && (
                    <select className="border border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-700 outline-none bg-indigo-50 shadow-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}

                  {activeTestTab === 'daily' && (
                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner w-fit">
                      <button onClick={()=>setActiveDailyTab('input')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeDailyTab === 'input' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>✏️ 일별 기입</button>
                      <button onClick={()=>setActiveDailyTab('summary')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeDailyTab === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📊 월간 종합 리포트</button>
                    </div>
                  )}
                  
                  {activeTestTab === 'weekly' && (
                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner w-fit">
                      <button onClick={()=>setWeeklySubject('english')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${weeklySubject === 'english' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>영어</button>
                      <button onClick={()=>setWeeklySubject('math')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${weeklySubject === 'math' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>수학</button>
                      <div className="w-px h-6 bg-slate-300 mx-2 self-center"></div>
                      <button onClick={()=>setActiveWeeklyTab('setup')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeWeeklyTab === 'setup' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>정답 셋업</button>
                      <button onClick={()=>setActiveWeeklyTab('omr')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeWeeklyTab === 'omr' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>OMR 업로드</button>
                      <button onClick={()=>setActiveWeeklyTab('scores')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeWeeklyTab === 'scores' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>성적 조회</button>
                      <button onClick={()=>setActiveWeeklyTab('monthlyView')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeWeeklyTab === 'monthlyView' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>월별 조회</button>
                    </div>
                  )}

                  {activeTestTab === 'monthly' && (
                    <>
                      <button onClick={() => openImportModal(activeTestTab)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-indigo-200 transition-colors">
                         <UploadCloud size={18} /> {activeTestTab.toUpperCase()} 엑셀 연동
                      </button>
                      <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                        <button onClick={()=>setTestViewMode('input')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${testViewMode === 'input' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-50 hover:text-slate-700'}`}>✏️ 성적 뷰/기입 모드</button>
                        <button onClick={()=>setTestViewMode('report')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${testViewMode === 'report' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📊 종합 리포트 출력</button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* -- DAILY TEST (31일 표) -- */}
              {activeTestTab === 'daily' && activeDailyTab === 'input' && (
                <>
                  <div className="mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Calendar size={18} className="text-rose-500"/> 🚫 시험 미실시 일자 (휴일 및 시작일 이전) 설정</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from({length:31}, (_, i) => {
                            const isExcluded = dailySettings[dailyMonth].excludedDays.includes(i);
                            return (
                                <button key={i} onClick={() => toggleDailyExcluded(dailyMonth, i)}
                                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${isExcluded ? 'bg-rose-500 text-white shadow-inner' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    {i+1}
                                </button>
                            )
                        })}
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-3">※ 빨간색으로 선택된 일자는 데일리 테스트가 없는 날로 지정되어 <span className="text-rose-500">참여율 계산(분모)에서 완벽히 제외</span>됩니다.</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                       <div className="font-bold text-slate-700 flex items-center gap-2">
                         <PenTool size={18} className="text-indigo-500" />
                         {dailyMonth} DAILY 현황 (전체 반 평균 참여율: <span className="text-emerald-600">{dailyClassStats.avgRate}%</span> / 반 평균 점수: <span className="text-indigo-600">{dailyClassStats.avgScore}점</span>)
                       </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar pb-4">
                    <table className="w-max min-w-full text-center text-sm border-collapse">
                      <thead className="bg-slate-800 text-white font-medium sticky top-0 z-20">
                        <tr>
                          <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 sticky left-0 z-30 bg-slate-900 w-44 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                             <div className="flex items-center justify-between">학생 정보 (참여율) {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                          </th>
                          <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-[176px] z-30 bg-slate-900 w-28 text-indigo-200">누적 / 평균</th>
                          <th colSpan={31} className="py-2 border-b border-slate-700 bg-slate-800">{dailyMonth} 일별 DAILY SCORE (1일 ~ 31일)</th>
                        </tr>
                        <tr className="bg-slate-700 text-xs">
                          {Array.from({length: 31}, (_, i) => {
                            const isExcluded = dailySettings[dailyMonth].excludedDays.includes(i);
                            return (<th key={i} className={`min-w-[60px] w-[60px] px-1 py-1.5 border-r border-slate-600 font-bold ${isExcluded ? 'bg-rose-900/50 text-rose-300' : ''}`}>{i+1}</th>)
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {filteredStudents.map((student) => {
                          const dRecords = student.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:''});
                          const dailyStats = getDailyStats(dRecords, dailyMonth);
                          return (
                            <tr key={student.id} className="hover:bg-indigo-50/50 transition-colors group cursor-pointer" onClick={() => setViewingDailySummary(student)}>
                              <td className="border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-indigo-50 px-4 py-3 align-top text-left">
                                <div className="flex justify-between w-full mb-1"><span className="font-bold text-slate-900 text-[14px]">{student.name}</span><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{dailyStats.rate}%</span></div>
                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{student.id}</div>
                              </td>
                              <td className="border-r border-slate-200 sticky left-[176px] z-10 bg-slate-50 group-hover:bg-indigo-50/80 py-3 px-2">
                                <div className="flex flex-col gap-2 items-center justify-center h-full">
                                  <div className="text-slate-800 font-extrabold text-[13px]">{dailyStats.sum} <span className="text-[10px] font-normal text-slate-500">점</span></div>
                                  <div className="h-px w-8 bg-slate-200"></div>
                                  <div className="text-indigo-700 font-extrabold text-[13px]">{dailyStats.avg} <span className="text-[10px] font-normal text-indigo-400">평균</span></div>
                                </div>
                              </td>
                              {dRecords.map((rec, dayIdx) => {
                                const isExcluded = dailySettings[dailyMonth].excludedDays.includes(dayIdx);
                                return (
                                  <td key={dayIdx} className={`border-r border-slate-200 p-1.5 align-middle ${isExcluded ? 'bg-slate-100' : 'bg-white group-hover:bg-indigo-50/20'}`} onClick={e => e.stopPropagation()}>
                                    <div className="flex flex-col gap-1.5 items-center">
                                      <input type="number" disabled={isExcluded} className={`w-10 text-center border rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-bold ${isExcluded ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : ''}`} value={rec.t1} placeholder="-" onChange={(e)=>handleDailyScoreChange(student.id, dayIdx, 't1', e.target.value)}/>
                                      <input type="number" disabled={isExcluded} className={`w-10 text-center border rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-bold ${isExcluded ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : ''}`} value={rec.t2} placeholder="-" onChange={(e)=>handleDailyScoreChange(student.id, dayIdx, 't2', e.target.value)}/>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              )}

              {/* -- DAILY TEST 요약 보고서 -- */}
              {activeTestTab === 'daily' && activeDailyTab === 'summary' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-sm text-slate-700 flex justify-between items-center">
                     <span><BarChart3 className="inline-block w-4 h-4 mr-2 text-indigo-500"/>{dailyMonth} DAILY 요약 보고서</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-sm border-collapse">
                      <thead className="bg-white border-b-2 border-slate-200">
                        <tr>
                          <th className="py-4 px-4 text-slate-600 font-bold cursor-pointer hover:bg-slate-50" onClick={() => handleSort('name')}>
                            학생명 {sortKey === 'name' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                          </th>
                          <th className="py-4 px-4 text-slate-600 font-bold cursor-pointer hover:bg-slate-50" onClick={() => handleSort('dailyRate')}>
                            참여율 {sortKey === 'dailyRate' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                          </th>
                          <th className="py-4 px-4 text-slate-600 font-bold">누적 점수</th>
                          <th className="py-4 px-4 text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" onClick={() => handleSort('dailyAvg')}>
                            평균 점수 {sortKey === 'dailyAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => {
                          const dRecords = student.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:''});
                          const stats = getDailyStats(dRecords, dailyMonth);
                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setViewingDailySummary(student)}>
                              <td className="py-4 px-4 text-left">
                                <div className="font-bold text-slate-800">{student.name}</div>
                                <div className="text-xs text-slate-400 font-mono">{student.userId || student.id}</div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold">{stats.rate}%</span>
                              </td>
                              <td className="py-4 px-4 font-bold text-slate-600">{stats.sum} 점</td>
                              <td className="py-4 px-4 font-extrabold text-indigo-600 text-lg">{stats.avg} 점</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* -- WEEKLY TEST -- */}
              {activeTestTab === 'weekly' && (
                <div className="space-y-6">
                  {/* 주차 탭 */}
                  <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="font-bold text-slate-700 ml-2">{weeklyMonth}</span>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(week => (
                        <button key={week} onClick={() => setSelectedWeek(week)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${selectedWeek === week ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                          {week}주차
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeWeeklyTab === 'setup' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-w-5xl">
                      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                          <LayoutList size={18} className={weeklySubject === 'english' ? 'text-indigo-500' : 'text-teal-500'}/> 
                          {weeklyMonth} {selectedWeek}주차 [{weeklySubject === 'english' ? '영어' : '수학'}] 정답/유형 설정표
                        </h2>
                        {weeklySubject === 'math' ? (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">문항 수</span>
                                    <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm outline-none font-bold" 
                                        value={weeklySettings.math[weeklyMonth]?.[selectedWeek]?.qCount || 20} 
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setWeeklySettings(prev => ({
                                                ...prev, math: { ...prev.math, [weeklyMonth]: { ...prev.math[weeklyMonth], [selectedWeek]: { ...prev.math[weeklyMonth]?.[selectedWeek], qCount: val } } }
                                            }));
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">문항당 점수</span>
                                    <input type="number" step="0.1" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm outline-none font-bold" 
                                        value={weeklySettings.math[weeklyMonth]?.[selectedWeek]?.qScore || 5} 
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setWeeklySettings(prev => ({
                                                ...prev, math: { ...prev.math, [weeklyMonth]: { ...prev.math[weeklyMonth], [selectedWeek]: { ...prev.math[weeklyMonth]?.[selectedWeek], qScore: val } } }
                                            }));
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold">40문항 고정 (2.5점)</span>
                        )}
                      </div>
                      <div className="p-6 overflow-x-auto">
                        <div className="min-w-[800px] flex flex-col gap-6">
                          {(() => {
                            const currentSettings = weeklySettings[weeklySubject]?.[weeklyMonth]?.[selectedWeek] || { answers: Array(40).fill(''), types: Array(40).fill(''), qCount: 40 };
                            const maxQs = weeklySubject === 'english' ? 40 : (currentSettings.qCount || 20);
                            const chunks = [];
                            for(let i=0; i<maxQs; i+=10) chunks.push(i);
                            
                            return chunks.map((offset) => (
                              <div key={offset} className="flex flex-col border border-slate-200 rounded-lg overflow-hidden">
                                <div className="flex bg-slate-100 border-b border-slate-200">
                                  <div className="w-16 flex-shrink-0 flex items-center justify-center font-bold text-xs text-slate-500 border-r border-slate-200">문항</div>
                                  {Array.from({length: Math.min(10, maxQs - offset)}, (_, i) => (<div key={i} className="flex-1 text-center py-1.5 font-bold text-sm text-slate-700 border-r border-slate-200 last:border-0">{offset + i + 1}</div>))}
                                </div>
                                <div className="flex bg-white border-b border-slate-100">
                                  <div className={`w-16 flex-shrink-0 flex items-center justify-center font-bold text-xs border-r border-slate-200 ${weeklySubject==='english' ? 'text-indigo-600 bg-indigo-50' : 'text-teal-600 bg-teal-50'}`}>정답</div>
                                  {Array.from({length: Math.min(10, maxQs - offset)}, (_, i) => (
                                    <div key={i} className="flex-1 border-r border-slate-100 p-1 last:border-0">
                                      <input type="text" className={`w-full text-center border border-slate-200 rounded py-1 text-sm font-bold outline-none focus:ring-2 uppercase ${weeklySubject==='english'?'focus:ring-indigo-400':'focus:ring-teal-400'}`} 
                                        value={currentSettings.answers[offset+i] || ''} 
                                        onChange={(e) => { 
                                            const newArr = [...currentSettings.answers]; 
                                            newArr[offset+i] = e.target.value; 
                                            setWeeklySettings(prev => ({
                                                ...prev,
                                                [weeklySubject]: {
                                                    ...prev[weeklySubject],
                                                    [weeklyMonth]: {
                                                        ...prev[weeklySubject]?.[weeklyMonth],
                                                        [selectedWeek]: {
                                                            ...prev[weeklySubject]?.[weeklyMonth]?.[selectedWeek],
                                                            answers: newArr,
                                                            types: prev[weeklySubject]?.[weeklyMonth]?.[selectedWeek]?.types || Array(40).fill('')
                                                        }
                                                    }
                                                }
                                            }));
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex bg-white">
                                  <div className="w-16 flex-shrink-0 flex items-center justify-center font-bold text-xs text-emerald-600 bg-emerald-50 border-r border-slate-200">유형</div>
                                  {Array.from({length: Math.min(10, maxQs - offset)}, (_, i) => (
                                    <div key={i} className="flex-1 border-r border-slate-100 p-1 last:border-0">
                                      {weeklySubject === 'english' ? (
                                          <select className="w-full text-center border border-slate-200 rounded py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-400 bg-transparent text-slate-700"
                                            value={currentSettings.types[offset+i] || ''} 
                                            onChange={(e) => { 
                                                const newArr = [...currentSettings.types]; 
                                                newArr[offset+i] = e.target.value; 
                                                setWeeklySettings(prev => ({
                                                    ...prev,
                                                    [weeklySubject]: {
                                                        ...prev[weeklySubject],
                                                        [weeklyMonth]: {
                                                            ...prev[weeklySubject]?.[weeklyMonth],
                                                            [selectedWeek]: {
                                                                ...prev[weeklySubject]?.[weeklyMonth]?.[selectedWeek],
                                                                answers: prev[weeklySubject]?.[weeklyMonth]?.[selectedWeek]?.answers || Array(40).fill(''),
                                                                types: newArr
                                                            }
                                                        }
                                                    }
                                                }));
                                            }}
                                          >
                                            <option value=""></option><option value="어휘">어휘</option><option value="문법">문법</option><option value="독해">독해</option><option value="논리">논리</option>
                                          </select>
                                      ) : (
                                          <input type="text" className="w-full text-center border border-slate-200 rounded py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-400 bg-transparent text-slate-700"
                                            placeholder="유형입력"
                                            value={currentSettings.types[offset+i] || ''} 
                                            onChange={(e) => { 
                                                const newArr = [...currentSettings.types]; 
                                                newArr[offset+i] = e.target.value; 
                                                setWeeklySettings(prev => ({
                                                    ...prev,
                                                    [weeklySubject]: {
                                                        ...prev[weeklySubject],
                                                        [weeklyMonth]: {
                                                            ...prev[weeklySubject]?.[weeklyMonth],
                                                            [selectedWeek]: {
                                                                ...prev[weeklySubject]?.[weeklyMonth]?.[selectedWeek],
                                                                answers: prev[weeklySubject]?.[weeklyMonth]?.[selectedWeek]?.answers || Array(40).fill(''),
                                                                types: newArr
                                                            }
                                                        }
                                                    }
                                                }));
                                            }}
                                          />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeWeeklyTab === 'omr' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col justify-center items-center">
                        <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-xl"><UploadCloud className="text-indigo-500" size={28}/> OMR 리딩 엑셀 업로드 [{weeklySubject === 'english' ? '영어' : '수학'}]</h2>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-16 text-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-colors w-full max-w-2xl" onClick={() => triggerDirectUpload('weekly')}>
                          <FileSpreadsheet size={64} className="mx-auto text-indigo-300 mb-6"/>
                          <p className="text-lg font-bold text-indigo-600 mb-2">클릭하여 {weeklyMonth} {selectedWeek}주차 OMR 첨부</p>
                          <p className="text-sm text-slate-500 leading-relaxed">수험번호 자동인식 후 설정된 정답과 대조하여 성적을 산출합니다.<br/>(※ 헤더 없이 A열 수험번호, B열부터 답안이 나열된 양식을 자동 지원합니다.)</p>
                        </div>
                    </div>
                  )}

                  {activeWeeklyTab === 'scores' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-sm text-slate-700 flex justify-between items-center">
                           <span><FileText className="inline-block w-4 h-4 mr-2 text-indigo-500"/>{weeklyMonth} 위클리 학생별 종합 성적 조회 [{weeklySubject === 'english' ? '영어' : '수학'}]</span>
                           <span className="text-xs font-normal text-slate-400">행을 클릭하면 해당 학생의 주차별 상세 분석 및 유형별 정답률을 볼 수 있습니다.</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                            <thead className="bg-white border-b-2 border-slate-200 shadow-sm z-10">
                              <tr>
                                <th className="py-4 text-slate-600 font-bold cursor-pointer hover:bg-slate-50" onClick={() => handleSort('name')}>이름 {sortKey === 'name' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</th>
                                <th className="py-4 text-slate-500 text-xs font-medium">수험번호</th>
                                <th className="py-4 text-slate-600 font-bold">1주차</th>
                                <th className="py-4 text-slate-600 font-bold">2주차</th>
                                <th className="py-4 text-slate-600 font-bold">3주차</th>
                                <th className="py-4 text-slate-600 font-bold">4주차</th>
                                <th className="py-4 text-slate-600 font-bold">5주차</th>
                                <th className="py-4 text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" onClick={() => handleSort('weeklyAvg')}>월간 평균 {sortKey === 'weeklyAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</th>
                                <th className="py-4 text-emerald-600 font-bold">월간 정답률</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredStudents.map(student => {
                                const stats = getMonthlyWeeklyStats(student, weeklyMonth, weeklySubject);
                                const scoreField = weeklySubject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
                                return (
                                <tr key={student.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setViewingWeeklySummary(student)}>
                                  <td className="py-4 font-bold text-slate-800">{student.name}</td>
                                  <td className="py-4 text-xs font-mono text-slate-400">{student.id}</td>
                                  {[1, 2, 3, 4, 5].map(w => {
                                      const score = student.scores[scoreField]?.[`${weeklyMonth}_w${w}`];
                                      return <td key={w} className="py-4 text-slate-600 font-medium">{score !== undefined && score !== null ? `${score} 점` : '-'}</td>;
                                  })}
                                  <td className="py-4 font-extrabold text-indigo-600 text-base">{stats.avgScore !== '-' ? `${stats.avgScore} 점` : '-'}</td>
                                  <td className="py-4 font-bold text-emerald-600">{stats.overallRate !== '-' ? `${stats.overallRate}%` : '-'}</td>
                                </tr>
                              )})}
                            </tbody>
                          </table>
                        </div>
                    </div>
                  )}

                  {activeWeeklyTab === 'monthlyView' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-sm text-slate-700 flex justify-between items-center">
                           <span><FileText className="inline-block w-4 h-4 mr-2 text-indigo-500"/>전체 월별 위클리 평균 성적 조회 [{weeklySubject === 'english' ? '영어' : '수학'}]</span>
                           <span className="text-xs font-normal text-slate-400">행을 클릭하면 해당 학생의 전체 월간 추이 그래프를 볼 수 있습니다.</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-center text-sm border-collapse min-w-[1200px]">
                            <thead className="bg-white border-b-2 border-slate-200 shadow-sm z-10">
                              <tr>
                                <th className="py-4 text-slate-600 font-bold cursor-pointer hover:bg-slate-50" onClick={() => handleSort('name')}>이름 {sortKey === 'name' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</th>
                                {MONTHS.map(m => <th key={m} className="py-4 text-slate-500 font-bold text-xs">{m}</th>)}
                                <th className="py-4 text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" onClick={() => handleSort('weeklyOverallAvg')}>총 평균 {sortKey === 'weeklyOverallAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredStudents.map(student => {
                                const stats = getOverallWeeklyStats(student, weeklySubject);
                                return (
                                <tr key={student.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setViewingWeeklyMonthlySummary(student)}>
                                  <td className="py-4 font-bold text-slate-800">{student.name}</td>
                                  {MONTHS.map(m => (
                                      <td key={m} className="py-4 text-slate-600 font-medium">{stats.monthlyScores[m] !== '-' ? `${stats.monthlyScores[m]} 점` : '-'}</td>
                                  ))}
                                  <td className="py-4 font-extrabold text-indigo-600 text-base">{stats.avgScore !== '-' ? `${stats.avgScore} 점` : '-'}</td>
                                </tr>
                              )})}
                            </tbody>
                          </table>
                        </div>
                    </div>
                  )}

                </div>
              )}

              {/* -- MONTHLY TEST (간소화된 리스트 뷰 + 전체 평균 / 상위30% 평균) -- */}
              {activeTestTab === 'monthly' && testViewMode === 'input' && (
                <div className="flex flex-col gap-6">
                  {/* 상단 월별 종합 요약 바 */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 text-sm shadow-sm">
                    <div className="flex items-center justify-center font-extrabold text-slate-800 border-r border-slate-200 pr-4 whitespace-nowrap"><BarChart3 size={18} className="text-indigo-500 mr-2"/> {selectedMonth} 전체 평균 요약</div>
                    <div className="flex-1 flex gap-4">
                       <div className="flex-1 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50 flex flex-col justify-center items-center">
                          <span className="font-extrabold text-indigo-800 mb-1">영어</span>
                          <span className="font-bold text-indigo-600 text-sm">전체 평균: {monthlySummaries[selectedMonth]?.engAvg || '-'}점</span>
                          <span className="text-xs text-slate-500 font-medium">상위 30% 평균: {monthlySummaries[selectedMonth]?.engTop30 || '-'}점</span>
                       </div>
                       <div className="flex-1 bg-teal-50/50 p-3 rounded-lg border border-teal-100/50 flex flex-col justify-center items-center">
                          <span className="font-extrabold text-teal-800 mb-1">수학</span>
                          <span className="font-bold text-teal-600 text-sm">전체 평균: {monthlySummaries[selectedMonth]?.mathAvg || '-'}점</span>
                          <span className="text-xs text-slate-500 font-medium">상위 30% 평균: {monthlySummaries[selectedMonth]?.mathTop30 || '-'}점</span>
                       </div>
                    </div>
                  </div>

                  {/* 간소화된 학생 리스트 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-center text-sm">
                      <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                            <div className="flex items-center gap-1">학생명 (아이디) {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                          </th>
                          <th className="px-6 py-4 bg-indigo-50/30 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => handleSort('monthly_english')}>
                            <div className="flex items-center justify-center gap-1">영어 성적 (원점수 / 백분위) {sortKey === 'monthly_english' ? (sortOrder === 'asc' ? <ArrowDownAZ size={14}/> : <ArrowUpZA size={14}/>) : <ArrowDownAZ size={14} className="opacity-30"/>}</div>
                          </th>
                          <th className="px-6 py-4 bg-teal-50/30 cursor-pointer hover:bg-teal-100 transition-colors" onClick={() => handleSort('monthly_math')}>
                            <div className="flex items-center justify-center gap-1">수학 성적 (원점수 / 백분위) {sortKey === 'monthly_math' ? (sortOrder === 'asc' ? <ArrowDownAZ size={14}/> : <ArrowUpZA size={14}/>) : <ArrowDownAZ size={14} className="opacity-30"/>}</div>
                          </th>
                          <th className="px-6 py-4 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('monthly_total')}>
                            <div className="flex items-center justify-center gap-1">영+수 합산 (원점수 / 백분위) {sortKey === 'monthly_total' ? (sortOrder === 'asc' ? <ArrowDownAZ size={14}/> : <ArrowUpZA size={14}/>) : <ArrowDownAZ size={14} className="opacity-30"/>}</div>
                          </th>
                          <th className="px-6 py-4 text-right">상세 조회</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => {
                          const mData = student.scores.monthly[selectedMonth] || { english:{}, math:{}, total:{} };
                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-left">
                                <div className="font-bold text-slate-900 text-base">{student.name} <span className="text-xs font-medium text-slate-400">({student.targetTrack.charAt(0)})</span></div>
                                <div className="text-xs font-mono text-slate-500 mt-0.5">{student.userId || student.id}</div>
                              </td>
                              <td className="px-6 py-4 bg-indigo-50/10">
                                <div className="font-bold text-indigo-600">{mData.english?.score || '-'} <span className="text-xs text-slate-400 font-normal ml-1">/ {mData.english?.percent ? `${mData.english.percent}%` : '-'}</span></div>
                                <div className="text-[10px] text-slate-500 mt-1">반 {mData.english?.classRank || '-'}등 / 전국 {mData.english?.totalRank || '-'}등</div>
                              </td>
                              <td className="px-6 py-4 bg-teal-50/10">
                                {student.targetTrack !== '인문계' ? (
                                  <>
                                    <div className="font-bold text-teal-600">{mData.math?.score || '-'} <span className="text-xs text-slate-400 font-normal ml-1">/ {mData.math?.percent ? `${mData.math.percent}%` : '-'}</span></div>
                                    <div className="text-[10px] text-slate-500 mt-1">반 {mData.math?.classRank || '-'}등 / 전국 {mData.math?.totalRank || '-'}등</div>
                                  </>
                                ) : <span className="text-slate-300">-</span>}
                              </td>
                              <td className="px-6 py-4 bg-slate-50/50">
                                {student.targetTrack !== '인문계' ? (
                                  <>
                                    <div className="font-bold text-slate-700">{mData.total?.score || '-'} <span className="text-xs text-slate-400 font-normal ml-1">/ {mData.total?.percent ? `${mData.total.percent}%` : '-'}</span></div>
                                    <div className="text-[10px] text-slate-500 mt-1">반 {mData.total?.classRank || '-'}등 / 전국 {mData.total?.totalRank || '-'}등</div>
                                  </>
                                ) : <span className="text-slate-300">-</span>}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => setEditingMonthlyStudentId(student.id)} className="px-4 py-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 rounded-lg text-xs font-bold transition-colors">
                                  성적 상세보기
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 리포트 뷰 모드 */}
              {testViewMode === 'report' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[500px]">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-inner"><BarChart3 size={40} /></div>
                  <h2 className="text-3xl font-extrabold text-slate-800 mb-3">{activeTestTab.toUpperCase()} TEST 단위 리포트</h2>
                  <p className="text-slate-500 text-center max-w-xl leading-relaxed text-sm">해당 테스트 전용 연간/월간 리포트가 렌더링될 영역입니다.</p>
                  <button onClick={() => window.print()} className="mt-8 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Printer size={18}/>리포트 인쇄</button>
                </div>
              )}
            </div>
          )}

          {/* [4] 성적 현황 요약표 탭 */}
          {activeTab === 'grades' && (
            <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 border-l-4 border-l-indigo-500">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">전체 성적 현황 요약표</h1>
                  <p className="text-slate-500 text-sm mt-1">학생들의 출석률, Daily 참여율, 최근 성적을 한눈에 파악하고 상세 리포트를 조회합니다.</p>
                </div>
                <div className="flex items-center gap-4">
                  <select className="border border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-700 outline-none bg-indigo-50 shadow-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-sm whitespace-nowrap">
                    <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                           <div className="flex items-center gap-1">학생 이름 {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('attendanceRate')}>
                           <div className="flex items-center justify-center gap-1">출석률 (누적) {sortKey === 'attendanceRate' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('dailyRate')}>
                           <div className="flex items-center justify-center gap-1">Daily 참석률 {sortKey === 'dailyRate' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('weeklyOverallAvg')}>
                           <div className="flex items-center justify-center gap-1">Weekly 평균 {sortKey === 'weeklyOverallAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</div>
                        </th>
                        <th className="px-6 py-4 bg-indigo-50/50 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => handleSort('monthly_english')}>
                           <div className="flex items-center justify-center gap-1">영어 최근 성적 {sortKey === 'monthly_english' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</div>
                        </th>
                        <th className="px-6 py-4 bg-teal-50/50 cursor-pointer hover:bg-teal-100 transition-colors" onClick={() => handleSort('monthly_math')}>
                           <div className="flex items-center justify-center gap-1">수학 최근 성적 {sortKey === 'monthly_math' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</div>
                        </th>
                        <th className="px-6 py-4 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('monthly_total')}>
                           <div className="flex items-center justify-center gap-1">합산 최근 성적 {sortKey === 'monthly_total' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}</div>
                        </th>
                        <th className="px-6 py-4 text-right">상세 조회</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => {
                        const mData = student.scores.monthly[selectedMonth] || { english:{}, math:{}, total:{} };
                        const engMock = mData.english?.score ? mData.english : (student.scores.mockEnglish || {});
                        const mathMock = mData.math?.score ? mData.math : (student.scores.mockMath || {});
                        const totMock = mData.total?.score ? mData.total : { score: '', percent: '' };
                        const dailyStats = getDailyStats(student.dailyRecords[selectedMonth], selectedMonth);
                        const weeklyStats = getMonthlyWeeklyStats(student, selectedMonth, weeklySubject);
                        
                        return (
                          <tr key={student.id} className="hover:bg-indigo-50/40 transition-colors group">
                            <td className="px-6 py-4 text-left cursor-pointer" onClick={() => setViewingGradeId(student.id)}>
                              <div className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{student.name} <span className="text-xs font-medium text-slate-400">({student.targetTrack.charAt(0)})</span></div>
                              <div className="text-xs text-slate-400 mt-0.5 font-mono">{student.id}</div>
                            </td>
                            <td className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setViewingAttendanceSummary(student)}>
                               <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{getAttendanceRate(student, selectedMonth)}</span>
                            </td>
                            <td className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setViewingDailySummary(student)}>
                               <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{dailyStats.rate}%</span>
                            </td>
                            <td className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setViewingWeeklyMonthlySummary(student)}>
                               <span className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">{weeklyStats.avgScore !== '-' ? `${weeklyStats.avgScore}점` : '-'}</span>
                            </td>
                            <td className="px-6 py-4 bg-indigo-50/10 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => setViewingGradeId(student.id)}>
                               <div className="font-extrabold text-indigo-600 text-lg">
                                  {engMock?.score || engMock?.m4 || '-'} <span className="text-sm font-semibold text-slate-400 ml-1">/ {engMock?.percent || '-'}%</span>
                               </div>
                               <div className="text-[10px] text-slate-400">{selectedMonth} 기준</div>
                            </td>
                            <td className="px-6 py-4 bg-teal-50/10 cursor-pointer hover:bg-teal-100 transition-colors" onClick={() => setViewingGradeId(student.id)}>
                               {student.targetTrack !== '인문계' ? (
                                  <div className="font-extrabold text-teal-600 text-lg">
                                    {mathMock?.score || mathMock?.m4 || '-'} <span className="text-sm font-semibold text-slate-400 ml-1">/ {mathMock?.percent || '-'}%</span>
                                    <div className="text-[10px] text-slate-400">{selectedMonth} 기준</div>
                                  </div>
                               ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4 bg-slate-50/50 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => setViewingGradeId(student.id)}>
                               {student.targetTrack !== '인문계' ? (
                                  <div className="font-extrabold text-slate-700 text-lg">
                                    {totMock?.score || '-'} <span className="text-sm font-semibold text-slate-400 ml-1">/ {totMock?.percent || '-'}%</span>
                                    <div className="text-[10px] text-slate-400">{selectedMonth} 기준</div>
                                  </div>
                               ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button onClick={() => setViewingGradeId(student.id)} className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">
                                성적 상세보기
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* [5] 월간 리포트 (A4 출력) 탭 */}
          {activeTab === 'report' && (
            <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300 flex gap-6 h-[calc(100vh-8rem)]">
              {/* 학생 리스트 (프린트 시 숨김) */}
              <div className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shrink-0 print:hidden">
                 <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={18}/> 리포트 생성 대상</h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type="text" placeholder="학생 검색..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                 </div>
                 <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {filteredStudents.map(student => (
                       <div key={student.id} onClick={() => setReportStudentId(student.id)} className={`p-3 rounded-xl cursor-pointer transition-colors border ${reportStudentId === student.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
                          <div className="font-bold text-slate-800 text-sm">{student.name} <span className="text-xs text-slate-400 font-medium ml-1">({student.targetTrack.charAt(0)})</span></div>
                          <div className="text-xs text-slate-400 mt-1">{student.userId || student.id}</div>
                       </div>
                    ))}
                 </div>
              </div>
              
              {/* A4 미리보기 영역 */}
              <div className="flex-1 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-8 print:p-0 print:bg-white print:border-none flex justify-center custom-scrollbar">
                 {reportStudent ? (
                    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-12 relative print:w-full print:h-auto overflow-hidden">
                       
                       {/* 인쇄 버튼 (화면에만 보임) */}
                       <div className="absolute top-8 right-8 print:hidden">
                          <button onClick={handlePrint} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all transform hover:scale-105">
                             <Printer size={18}/> A4 PDF 저장
                          </button>
                       </div>

                       {/* 1. 리포트 헤더 & 학생 정보 바 */}
                       <div className="border-b-4 border-slate-800 pb-4 mb-6 mt-2">
                          <div className="flex justify-between items-end">
                             <div>
                                <div className="text-indigo-600 font-extrabold tracking-widest mb-1 flex items-center gap-2 text-sm"><School size={16}/> {academicYear} ACADEMIC REPORT</div>
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{selectedMonth} 월간 학습 리포트</h1>
                             </div>
                             <div className="text-right">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">DATE OF ISSUE</div>
                                <div className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('ko-KR')}</div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex justify-between items-center mb-8">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-extrabold text-xl">{reportStudent.name.charAt(0)}</div>
                             <div>
                                <div className="text-lg font-extrabold text-slate-900">{reportStudent.name} <span className="text-sm font-medium text-slate-500 ml-1">학생</span></div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{reportStudent.userId}</div>
                             </div>
                          </div>
                          <div className="h-10 w-px bg-slate-200"></div>
                          <div className="flex gap-8 text-sm">
                             <div><div className="text-xs text-slate-400 font-bold mb-1">수강반</div><div className="font-extrabold text-slate-700">{reportStudent.className}</div></div>
                             <div><div className="text-xs text-slate-400 font-bold mb-1">목표계열</div><div className="font-extrabold text-slate-700">{reportStudent.targetTrack}</div></div>
                             <div><div className="text-xs text-slate-400 font-bold mb-1">기준월</div><div className="font-extrabold text-indigo-600">{selectedMonth}</div></div>
                          </div>
                       </div>

                       {/* 2. 상단 KPI 카드 3개 */}
                       {(() => {
                           const attRate = getAttendanceRateNum(reportStudent, selectedMonth);
                           const attDiff = attRate - classAvgAttendance;
                           const attStatus = attDiff < 0 ? '나쁨' : (attDiff > 2 ? '우수' : '양호');
                           const attColor = attStatus === '나쁨' ? 'text-rose-600 bg-rose-100' : (attStatus === '우수' ? 'text-indigo-600 bg-indigo-100' : 'text-emerald-600 bg-emerald-100');
                           
                           let absent=0, late=0, early=0;
                           [...(reportStudent.attendance[selectedMonth]?.am || []), ...(reportStudent.attendance[selectedMonth]?.pm || [])].forEach(v => {
                               if(v==='결석' || v==='병결' || v==='무단결석' || v==='개인사정') absent++;
                               if(v==='지각') late++;
                               if(v==='조퇴') early++;
                           });
                           const penalty = getAttendancePenalty(reportStudent, selectedMonth);

                           const monthIdx = MONTHS.indexOf(selectedMonth);
                           const prevMonth = monthIdx > 0 ? MONTHS[monthIdx - 1] : null;
                           const dailyStats = getDailyStats(reportStudent.dailyRecords[selectedMonth], selectedMonth);
                           const prevDailyStats = prevMonth ? getDailyStats(reportStudent.dailyRecords[prevMonth], prevMonth) : null;
                           const dailyDiff = prevDailyStats ? dailyStats.rate - prevDailyStats.rate : 0;
                           const dailyDiffStr = dailyDiff > 0 ? `+${dailyDiff}% ↑` : (dailyDiff < 0 ? `${Math.abs(dailyDiff)}% ↓` : '-');
                           const dailyDiffColor = dailyDiff > 0 ? 'text-blue-500' : (dailyDiff < 0 ? 'text-rose-500' : 'text-slate-400');

                           const studyStats = getStudyTimeStats(reportStudent);
                           const studentMins = studyStats.totalMins;
                           const classTotalMins = classStudents.reduce((acc, s) => acc + getStudyTimeStats(s).totalMins, 0);
                           const classAvgMins = classStudents.length > 0 ? Math.floor(classTotalMins / classStudents.length) : 0;
                           const studyMinsDiff = studentMins - classAvgMins;
                           const studyDiffStr = studyMinsDiff >= 0 ? `+${formatMinsToTime(studyMinsDiff)} ↑` : `${formatMinsToTime(Math.abs(studyMinsDiff))} ↓`;
                           const studyDiffColor = studyMinsDiff >= 0 ? 'text-blue-500' : 'text-rose-500';
                           const myStudyRank = studyTimeRankings[reportStudent.id] || '-';

                           return (
                               <div className="grid grid-cols-3 gap-4 mb-8">
                                  <div className="border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                                     <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><CalendarCheck size={14} className="text-emerald-500"/> 월간 출석률</div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${attColor}`}>{attStatus}</span>
                                     </div>
                                     <div className="text-3xl font-extrabold text-slate-800 mb-2">{attRate}%</div>
                                     <div className="flex justify-between text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1.5 rounded">
                                        <span>결석 {absent}</span><span>지각 {late}</span><span>조퇴 {early}</span><span className="font-bold text-rose-500">벌점 {penalty}</span>
                                     </div>
                                  </div>
                                  <div className="border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                                     <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><PenTool size={14} className="text-blue-500"/> Daily 참여율</div>
                                     </div>
                                     <div className="text-3xl font-extrabold text-slate-800 mb-2">{dailyStats.rate}%</div>
                                     <div className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1.5 rounded flex justify-between">
                                        <span>전월 대비 증감</span><span className={`font-bold ${dailyDiffColor}`}>{dailyDiffStr}</span>
                                     </div>
                                  </div>
                                  <div className="border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                                     <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Clock size={14} className="text-indigo-500"/> 누적 학습시간</div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">반 {myStudyRank}등 / {classStudents.length}명</span>
                                     </div>
                                     <div className="text-2xl font-extrabold text-slate-800 mb-2 truncate">{studyStats.totalStr} <span className="text-xs font-medium text-slate-400 font-normal ml-1">(일 {studyStats.avgStr})</span></div>
                                     <div className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1.5 rounded flex justify-between">
                                        <span>반 평균 대비</span><span className={`font-bold ${studyDiffColor}`}>{studyDiffStr}</span>
                                     </div>
                                  </div>
                               </div>
                           )
                       })()}

                       {/* 3. 4월 월례고사 성적 요약 */}
                       <h3 className="font-extrabold text-sm text-slate-800 mb-3 flex items-center gap-1.5"><FileText size={16} className="text-indigo-500"/> {selectedMonth} 월례고사 성적 요약</h3>
                       <table className="w-full text-center text-sm border-collapse mb-2 print:border border border-slate-200 rounded-lg overflow-hidden">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs">
                             <tr>
                                <th className="py-2.5 font-bold text-slate-600 border-r border-slate-200">과목</th>
                                <th className="py-2.5 font-bold text-slate-600 border-r border-slate-200">원점수</th>
                                <th className="py-2.5 font-bold text-slate-600 border-r border-slate-200">백분위</th>
                                <th className="py-2.5 font-bold text-slate-600 border-r border-slate-200">반 석차</th>
                                <th className="py-2.5 font-bold text-slate-600 border-r border-slate-200">전국 석차</th>
                                <th className="py-2.5 font-bold text-slate-600 border-r border-slate-200">계열평균 대비</th>
                                <th className="py-2.5 font-bold text-slate-600">상위30% 대비</th>
                             </tr>
                          </thead>
                          <tbody className="text-sm">
                             {/* 영어 */}
                             {(() => {
                                const eng = reportStudent.scores.monthly[selectedMonth]?.english || {};
                                const renderDiff = (diff) => {
                                   const num = Number(diff);
                                   if (isNaN(num) || diff === '') return '-';
                                   if (num > 0) return <span className="text-blue-600 font-bold">+{num}</span>;
                                   if (num < 0) return <span className="text-rose-600 font-bold">{num}</span>;
                                   return <span className="font-bold text-slate-600">0</span>;
                                };
                                return (
                                 <tr className="border-b border-slate-200">
                                    <td className="py-3 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">영어</td>
                                    <td className="py-3 font-bold text-slate-800 border-r border-slate-200">{eng.score || '-'}</td>
                                    <td className="py-3 font-bold text-indigo-600 border-r border-slate-200">{eng.percent ? `${eng.percent}%` : '-'}</td>
                                    <td className="py-3 text-slate-600 border-r border-slate-200">{eng.classRank ? `${eng.classRank}등` : '-'}</td>
                                    <td className="py-3 text-slate-600 border-r border-slate-200">{eng.totalRank ? `${eng.totalRank}등` : '-'}</td>
                                    <td className="py-3 border-r border-slate-200">{renderDiff(eng.trackAvgDiff)}</td>
                                    <td className="py-3">{renderDiff(eng.top30Diff)}</td>
                                 </tr>
                                )
                             })()}
                             {/* 수학 */}
                             {reportStudent.targetTrack !== '인문계' && (() => {
                                const math = reportStudent.scores.monthly[selectedMonth]?.math || {};
                                const renderDiff = (diff) => {
                                   const num = Number(diff);
                                   if (isNaN(num) || diff === '') return '-';
                                   if (num > 0) return <span className="text-blue-600 font-bold">+{num}</span>;
                                   if (num < 0) return <span className="text-rose-600 font-bold">{num}</span>;
                                   return <span className="font-bold text-slate-600">0</span>;
                                };
                                return (
                                 <tr className="border-b border-slate-200">
                                    <td className="py-3 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">수학</td>
                                    <td className="py-3 font-bold text-slate-800 border-r border-slate-200">{math.score || '-'}</td>
                                    <td className="py-3 font-bold text-teal-600 border-r border-slate-200">{math.percent ? `${math.percent}%` : '-'}</td>
                                    <td className="py-3 text-slate-600 border-r border-slate-200">{math.classRank ? `${math.classRank}등` : '-'}</td>
                                    <td className="py-3 text-slate-600 border-r border-slate-200">{math.totalRank ? `${math.totalRank}등` : '-'}</td>
                                    <td className="py-3 border-r border-slate-200">{renderDiff(math.trackAvgDiff)}</td>
                                    <td className="py-3">{renderDiff(math.top30Diff)}</td>
                                 </tr>
                                )
                             })()}
                             {/* 영어+수학 */}
                             {reportStudent.targetTrack !== '인문계' && (() => {
                                const tot = reportStudent.scores.monthly[selectedMonth]?.total || {};
                                const renderDiff = (diff) => {
                                   const num = Number(diff);
                                   if (isNaN(num) || diff === '') return '-';
                                   if (num > 0) return <span className="text-blue-600 font-bold">+{num}</span>;
                                   if (num < 0) return <span className="text-rose-600 font-bold">{num}</span>;
                                   return <span className="font-bold text-slate-600">0</span>;
                                };
                                return (
                                 <tr>
                                    <td className="py-3 font-bold text-slate-700 bg-slate-100/50 border-r border-slate-200">영어+수학</td>
                                    <td className="py-3 font-bold text-slate-800 border-r border-slate-200">{tot.score || '-'}</td>
                                    <td className="py-3 font-bold text-indigo-600 border-r border-slate-200">{tot.percent ? `${tot.percent}%` : '-'}</td>
                                    <td className="py-3 text-slate-600 border-r border-slate-200">{tot.classRank ? `${tot.classRank}등` : '-'}</td>
                                    <td className="py-3 text-slate-600 border-r border-slate-200">{tot.totalRank ? `${tot.totalRank}등` : '-'}</td>
                                    <td className="py-3 border-r border-slate-200">{renderDiff(tot.trackAvgDiff)}</td>
                                    <td className="py-3">{renderDiff(tot.top30Diff)}</td>
                                 </tr>
                                )
                             })()}
                          </tbody>
                       </table>
                       <div className="text-[10px] text-slate-400 text-right mb-8">※ 비교 수치는 목표 계열 평균 및 계열 상위 30% 평균 대비</div>

                       {/* 4. 월별 월례고사 성적 추이 그래프 */}
                       <h3 className="font-extrabold text-sm text-slate-800 mb-4 flex items-center gap-1.5"><BarChart3 size={16} className="text-indigo-500"/> 월별 월례고사 성적 추이 (백분위)</h3>
                       <div className="border border-slate-200 rounded-xl pt-6 pb-2 mb-8 relative">
                           <div className="h-32 flex items-end justify-between border-b border-slate-200 pb-0 relative px-8 mb-6">
                              <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none pb-0 text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-2">
                                 <div className="leading-none -mt-1">100</div><div className="leading-none">75</div><div className="leading-none">50</div><div className="leading-none">25</div><div className="leading-none mb-1">0</div>
                              </div>
                              {(() => {
                                  const chartMonths = MONTHS.slice(0, 11); // 1~11월
                                  let engSum = 0, engCnt = 0, mathSum = 0, mathCnt = 0;
                                  chartMonths.forEach(m => {
                                     const e = Number(reportStudent.scores.monthly[m]?.english?.percent);
                                     if(e > 0) { engSum += e; engCnt++; }
                                     const mt = Number(reportStudent.scores.monthly[m]?.math?.percent);
                                     if(mt > 0) { mathSum += mt; mathCnt++; }
                                  });
                                  const engAvgYear = engCnt > 0 ? Math.round(engSum/engCnt) : 0;
                                  const mathAvgYear = mathCnt > 0 ? Math.round(mathSum/mathCnt) : 0;

                                  return [...chartMonths, '연평균'].map((m) => {
                                      const isAvg = m === '연평균';
                                      const engP = isAvg ? engAvgYear : (Number(reportStudent.scores.monthly[m]?.english?.percent) || 0);
                                      const mathP = isAvg ? mathAvgYear : (Number(reportStudent.scores.monthly[m]?.math?.percent) || 0);
                                      const dispEngP = engP > 100 ? 100 : engP;
                                      const dispMathP = mathP > 100 ? 100 : mathP;

                                      return (
                                          <div key={m} className="flex flex-col items-center justify-end h-full z-10 relative">
                                              <div className="flex items-end gap-[2px] w-full justify-center h-full">
                                                  <div className="w-3 bg-blue-500 rounded-t-[2px] relative" style={{ height: `${dispEngP}%`, minHeight: engP>0?'2px':'0' }}>
                                                      {engP > 0 && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-700">{engP}</span>}
                                                  </div>
                                                  {reportStudent.targetTrack !== '인문계' && (
                                                      <div className="w-3 bg-rose-500 rounded-t-[2px] relative" style={{ height: `${dispMathP}%`, minHeight: mathP>0?'2px':'0' }}>
                                                          {mathP > 0 && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-rose-700">{mathP}</span>}
                                                      </div>
                                                  )}
                                              </div>
                                              <span className={`text-[9px] font-bold mt-2 absolute -bottom-5 whitespace-nowrap ${isAvg ? 'text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded' : 'text-slate-500'}`}>{m}</span>
                                          </div>
                                      )
                                  });
                              })()}
                           </div>
                           <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500 mt-2">
                             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>영어 백분위</div>
                             {reportStudent.targetTrack !== '인문계' && <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></div>수학 백분위</div>}
                           </div>
                       </div>

                       {/* 5, 6. Weekly 영역 */}
                       <div className="grid grid-cols-2 gap-6 mb-8">
                           {/* 5. Weekly 점수 추이 */}
                           <div className="border border-slate-200 p-5 rounded-xl">
                              <h3 className="font-extrabold text-sm text-slate-800 mb-5 text-center flex items-center justify-center gap-1.5"><PenTool size={14} className="text-indigo-500"/> {selectedMonth} Weekly 점수 추이</h3>
                              {(() => {
                                  const stats = getMonthlyWeeklyStats(reportStudent, selectedMonth, 'english'); // 영어 기준, 수학은 제외됨 (보통 Weekly는 주과목)
                                  return (
                                      <>
                                          <div className="flex items-end justify-between h-24 border-b border-slate-200 pb-0 relative px-4 mb-6 mt-4">
                                              <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[9px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                                                <div>100</div><div>75</div><div>50</div><div>25</div><div className="-mb-1">0</div>
                                              </div>
                                              {[1,2,3,4,5].map(w => {
                                                  const sc = Number(reportStudent.scores.weeklyEnglish?.[`${selectedMonth}_w${w}`]) || 0;
                                                  const dispSc = sc > 100 ? 100 : sc;
                                                  return (
                                                      <div key={w} className="flex flex-col items-center justify-end h-full z-10 relative">
                                                          <div className="w-6 bg-indigo-400 rounded-t-sm relative" style={{height: `${dispSc}%`, minHeight: sc>0?'2px':'0'}}>
                                                              {sc > 0 && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-indigo-700">{sc}</span>}
                                                          </div>
                                                          <span className="text-[9px] font-bold text-slate-500 absolute -bottom-5">{w}주차</span>
                                                      </div>
                                                  )
                                              })}
                                          </div>
                                          <div className="text-center bg-slate-50 py-2 rounded-lg text-xs font-bold text-slate-600">
                                              월간 평균 점수 <span className="text-indigo-600 text-sm ml-1">{stats.avgScore !== '-' ? `${stats.avgScore}점` : '-'}</span>
                                          </div>
                                      </>
                                  )
                              })()}
                           </div>

                           {/* 6. Weekly 유형별 취약점 분석 */}
                           <div className="border border-slate-200 p-5 rounded-xl">
                              <h3 className="font-extrabold text-sm text-slate-800 mb-5 text-center flex items-center justify-center gap-1.5"><ListChecks size={14} className="text-emerald-500"/> {selectedMonth} 유형별 취약점 분석</h3>
                              {(() => {
                                  const stats = getMonthlyWeeklyStats(reportStudent, selectedMonth, 'english');
                                  const types = Object.entries(stats.typeStats).map(([k, v]) => ({ name: k, rate: v.total>0 ? Math.round(v.correct/v.total*100):0, total: v.total }));
                                  
                                  if(types.length === 0) return <div className="text-xs text-slate-400 text-center py-6">유형 데이터가 없습니다.</div>;

                                  const validTypes = types.filter(t => t.total > 0);
                                  const minRate = validTypes.length > 0 ? Math.min(...validTypes.map(t=>t.rate)) : -1;

                                  return (
                                      <div className="flex flex-col justify-center h-full pb-4">
                                          {types.map(t => (
                                              <div key={t.name} className="flex items-center gap-3 mb-3 text-xs">
                                                  <span className="w-10 font-bold text-slate-600">{t.name}</span>
                                                  <div className="flex-1 bg-slate-100 h-3.5 rounded-full overflow-hidden relative">
                                                      <div className={`h-full rounded-full ${t.rate === minRate && t.rate > 0 ? 'bg-rose-400' : 'bg-emerald-500'}`} style={{width: `${t.rate}%`}}></div>
                                                  </div>
                                                  <span className="w-8 text-right font-bold text-slate-700">{t.rate}%</span>
                                                  <div className="w-12 text-right">
                                                    {t.rate === minRate && t.total > 0 && <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">보완필요</span>}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )
                              })()}
                           </div>
                       </div>

                       {/* 7. 담당 선생님 코멘트 */}
                       <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl print:bg-transparent print:border-2">
                          <h3 className="font-extrabold text-sm text-slate-800 mb-3 flex items-center gap-1.5"><MessageSquare size={16} className="text-purple-500"/> 담당 선생님 종합 코멘트</h3>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                             {reportStudent.notes || '이번 달도 성실하게 잘 따라와 주었습니다. 위클리 및 월례고사 취약점을 보완하여 다음 달에도 화이팅 합시다!'}
                          </p>
                       </div>

                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                       <Printer size={64} className="mb-4 opacity-50" />
                       <p className="font-bold text-lg">리포트를 생성할 학생을 선택해주세요.</p>
                       <p className="text-sm mt-2">좌측 명단에서 학생을 클릭하면 A4 규격의 리포트가 미리보기로 나타납니다.</p>
                    </div>
                 )}
              </div>
            </div>
          )}
          
        </div>
      </main>

      {/* --- 숨겨진 단일 파일 업로드 인풋 --- */}
      <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleGenericFileUpload} />
      <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={omrFileInputRef} onChange={handleGenericFileUpload} />

      {/* --- 모달 영역 1. 공통 엑셀 업로드 모달 --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 relative">
            <button onClick={() => setShowImportModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full"><X size={20}/></button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileSpreadsheet size={32} /></div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-2 uppercase">
                {importType === 'studyTimeDaily' ? `${uploadTargetDay !== null ? uploadTargetDay + 1 : ''}일자 학습시간 연동` : `${importType} 엑셀 업로드`}
              </h2>
              <p className="text-sm text-slate-500">파일을 올리시면 {importType === 'monthly' || importType === 'studyTimeDaily' ? '아이디' : '학번/이름'}을(를) 매칭하여 데이터를 추출합니다.</p>
            </div>
            {/* 업로드 박스 */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer transition-colors hover:bg-indigo-50 hover:border-indigo-400 group" onClick={() => triggerDirectUpload(importType)}>
              <Upload className="w-10 h-10 mx-auto mb-3 transition-colors text-indigo-300 group-hover:text-indigo-500" />
              <span className="text-sm font-extrabold text-indigo-600">여기를 클릭하여 엑셀 파일 첨부</span>
            </div>
          </div>
        </div>
      )}

      {/* --- 모달 영역 2. 성적 상세보기 (그래프 최상단 + 월별 탭 + 요약카드 + 전체표) --- */}
      {viewingGradeId && studentGradeToView && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
           <div className="bg-slate-50 rounded-3xl w-full max-w-[1200px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="bg-white p-6 border-b flex justify-between items-center relative z-10">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">{studentGradeToView.name.charAt(0)}</div>
                 <div><h2 className="text-2xl font-extrabold text-slate-900">{studentGradeToView.name} <span className="text-sm font-medium text-slate-500">학생 성적 상세보기</span></h2></div>
               </div>
               <div className="flex items-center gap-6">
                 {/* 월 선택 탭 (1월 ~ 12월) */}
                 <div className="flex flex-wrap gap-1">
                   {MONTHS.map(m => (
                     <button key={m} onClick={() => setDetailSelectedMonth(m)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${detailSelectedMonth === m ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                       {m}
                     </button>
                   ))}
                 </div>
                 <button onClick={() => setViewingGradeId(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={24} /></button>
               </div>
             </div>
             
             <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
               
                {/* 1. 최상단: 전체 월 모의고사 백분위 추이 그래프 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 월별 모의고사 백분위 추이 (전체)</h3>
                  <div className="h-48 flex items-end gap-2 border-b border-slate-200 pb-0 relative px-4 min-w-[800px] mb-8">
                     <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                        <div className="leading-none -mt-1">100</div><div className="leading-none">75</div><div className="leading-none">50</div><div className="leading-none">25</div><div className="leading-none mb-1">0</div>
                     </div>
                     {/* 1월~11월 표시 */}
                     {DISPLAY_MONTHS.map(m => {
                        const mData = studentGradeToView.scores.monthly[m] || { english:{}, math:{} };
                        const engP = Number(mData.english?.percent) || 0;
                        const mathP = Number(mData.math?.percent) || 0;
                        const displayEngP = engP > 100 ? 100 : engP;
                        const displayMathP = mathP > 100 ? 100 : mathP;
                        return (
                          <div key={m} onClick={() => setDetailSelectedMonth(m)} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group cursor-pointer">
                            <div className="flex items-end gap-1 w-full justify-center h-full">
                               <div className="w-1/3 bg-indigo-400 rounded-t-sm relative transition-all group-hover:bg-indigo-500" style={{ height: `${displayEngP}%`, minHeight: engP>0?'4px':'0' }}>
                                  {engP>0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-indigo-700">{engP}</span>}
                               </div>
                               {studentGradeToView.targetTrack !== '인문계' && (
                                 <div className="w-1/3 bg-teal-400 rounded-t-sm relative transition-all group-hover:bg-teal-500" style={{ height: `${displayMathP}%`, minHeight: mathP>0?'4px':'0' }}>
                                    {mathP>0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-teal-700">{mathP}</span>}
                                 </div>
                               )}
                            </div>
                            <span className={`text-xs font-bold mt-3 absolute -bottom-6 ${m === detailSelectedMonth ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>{m}</span>
                          </div>
                        )
                     })}
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-400 rounded-sm"></div>영어 백분위</div>
                    {studentGradeToView.targetTrack !== '인문계' && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-400 rounded-sm"></div>수학 백분위</div>}
                  </div>
                </div>

                {/* 2. 중단: 선택된 월 요약 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} className="text-indigo-500"/> {detailSelectedMonth} 상세 요약</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                     <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col items-center">
                        <span className="text-xs text-slate-500 font-bold mb-1">출석률</span>
                        <span className="text-xl font-extrabold text-emerald-600">{getAttendanceRate(studentGradeToView, detailSelectedMonth)}</span>
                     </div>
                     <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col items-center">
                        <span className="text-xs text-slate-500 font-bold mb-1">Daily 참여율</span>
                        <span className="text-xl font-extrabold text-blue-600">{getDailyStats(studentGradeToView.dailyRecords[detailSelectedMonth], detailSelectedMonth).rate}%</span>
                     </div>
                     <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col items-center">
                        <span className="text-xs text-indigo-500 font-bold mb-1">영어 백분위</span>
                        <span className="text-xl font-extrabold text-indigo-700">{studentGradeToView.scores.monthly[detailSelectedMonth]?.english?.percent || '-'}%</span>
                     </div>
                     <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl flex flex-col items-center">
                        <span className="text-xs text-teal-500 font-bold mb-1">수학 백분위</span>
                        <span className="text-xl font-extrabold text-teal-700">{studentGradeToView.targetTrack !== '인문계' ? (studentGradeToView.scores.monthly[detailSelectedMonth]?.math?.percent || '-') : '-'}%</span>
                     </div>
                  </div>
                  {/* 추가된 부분: Weekly 성적 추이 그래프 */}
                  <div className="mt-8 flex gap-8">
                    <div className="flex-1 border border-slate-200 p-6 rounded-2xl bg-slate-50/50">
                      <h3 className="font-extrabold text-sm text-slate-800 mb-6 text-center">{detailSelectedMonth} 영어 Weekly 추이</h3>
                      <div className="flex items-end justify-between h-32 border-b border-slate-200 pb-0 relative px-4 mt-4 mb-6">
                        <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-200 pl-1">
                          <div className="leading-none -mt-1">100</div><div className="leading-none">75</div><div className="leading-none">50</div><div className="leading-none">25</div><div className="leading-none mb-1">0</div>
                        </div>
                        {[1,2,3,4,5].map(w => {
                          const sc = Number(studentGradeToView.scores.weeklyEnglish?.[`${detailSelectedMonth}_w${w}`]) || 0;
                          const displaySc = sc > 100 ? 100 : sc;
                          return (
                            <div key={w} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                              <div className="w-4/5 bg-indigo-400 rounded-t-sm relative transition-all group-hover:bg-indigo-500 flex justify-center" style={{height: `${displaySc}%`, minHeight: sc>0?'4px':'0'}}>
                                {sc > 0 && <span className="absolute -top-6 text-[10px] font-bold text-indigo-700">{sc}</span>}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 absolute -bottom-6">{w}주</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {studentGradeToView.targetTrack !== '인문계' && (
                      <div className="flex-1 border border-slate-200 p-6 rounded-2xl bg-slate-50/50">
                        <h3 className="font-extrabold text-sm text-slate-800 mb-6 text-center">{detailSelectedMonth} 수학 Weekly 추이</h3>
                        <div className="flex items-end justify-between h-32 border-b border-slate-200 pb-0 relative px-4 mt-4 mb-6">
                          <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-200 pl-1">
                            <div className="leading-none -mt-1">100</div><div className="leading-none">75</div><div className="leading-none">50</div><div className="leading-none">25</div><div className="leading-none mb-1">0</div>
                          </div>
                          {[1,2,3,4,5].map(w => {
                            const sc = Number(studentGradeToView.scores.weeklyMath?.[`${detailSelectedMonth}_w${w}`]) || 0;
                            const displaySc = sc > 100 ? 100 : sc;
                            return (
                              <div key={w} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                <div className="w-4/5 bg-teal-400 rounded-t-sm relative transition-all group-hover:bg-teal-500 flex justify-center" style={{height: `${displaySc}%`, minHeight: sc>0?'4px':'0'}}>
                                  {sc > 0 && <span className="absolute -top-6 text-[10px] font-bold text-teal-700">{sc}</span>}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 absolute -bottom-6">{w}주</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. 하단: 전체 성적표 */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                  <div className="bg-slate-50 p-4 border-b border-slate-200"><h3 className="font-bold text-slate-800 flex items-center gap-2"><LayoutList size={18} className="text-indigo-500"/> 월별 모의고사 상세 성적표</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-sm border-collapse min-w-[1000px]">
                      <thead className="bg-white border-b-2 border-slate-300">
                        <tr><th className="py-3 px-2 border-r text-slate-500 w-20">과목</th><th className="py-3 px-2 border-r text-slate-500 w-24">지표</th>{DISPLAY_MONTHS.map(m => <th key={m} className={`py-3 px-2 ${m === detailSelectedMonth ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}>{m}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {renderScoreBlock('영어', 'english', 'indigo', true, studentGradeToView, detailSelectedMonth)}
                        {renderScoreBlock('수학', 'math', 'teal', studentGradeToView.targetTrack !== '인문계', studentGradeToView, detailSelectedMonth)}
                        {renderScoreBlock('영+수', 'total', 'slate', studentGradeToView.targetTrack !== '인문계', studentGradeToView, detailSelectedMonth)}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. 이동된 Monthly 성적 카드 */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
                  <MonthlyScoreCard title="영어 성적" data={studentGradeToView.scores.monthly[detailSelectedMonth]?.english || emptyMonthlyScore} onChange={()=>{}} disabled />
                  <MonthlyScoreCard title="수학 성적" data={studentGradeToView.scores.monthly[detailSelectedMonth]?.math || emptyMonthlyScore} onChange={()=>{}} disabled={studentGradeToView.targetTrack === '인문계'} />
                  <MonthlyScoreCard title="영어+수학 합산" data={studentGradeToView.scores.monthly[detailSelectedMonth]?.total || emptyMonthlyScore} onChange={()=>{}} disabled={studentGradeToView.targetTrack === '인문계'} highlight />
                </div>

             </div>
           </div>
         </div>
      )}

      {/* --- 모달 영역 3. 먼슬리 세부입력 모달 (카드 3장 편집) --- */}
      {editingMonthlyStudentId && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-50 rounded-3xl w-full max-w-[1200px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="bg-white p-6 border-b flex justify-between items-center relative z-10">
               <div><h2 className="text-2xl font-extrabold text-slate-900">{editingStudent.name} <span className="text-sm font-medium text-slate-500 ml-2">학생 성적 상세보기 ({selectedMonth} 편집)</span></h2></div>
               <button onClick={() => setEditingMonthlyStudentId(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={24} /></button>
             </div>
             <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
               
                {/* 1. 최상단: 전체 월 모의고사 백분위 추이 그래프 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto mb-8">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 월별 모의고사 백분위 추이 (자동 업데이트)</h3>
                  <div className="h-48 flex items-end gap-2 border-b border-slate-200 pb-0 relative px-4 min-w-[800px] mb-8">
                     <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                        <div className="leading-none -mt-1">100</div><div className="leading-none">75</div><div className="leading-none">50</div><div className="leading-none">25</div><div className="leading-none mb-1">0</div>
                     </div>
                     {DISPLAY_MONTHS.map(m => {
                        const mData = editingStudent.scores.monthly[m] || { english:{}, math:{} };
                        const engP = Number(mData.english?.percent) || 0;
                        const mathP = Number(mData.math?.percent) || 0;
                        const displayEngP = engP > 100 ? 100 : engP;
                        const displayMathP = mathP > 100 ? 100 : mathP;
                        return (
                          <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                            <div className="flex items-end gap-1 w-full justify-center h-full">
                               <div className="w-1/3 bg-indigo-400 rounded-t-sm relative transition-all group-hover:bg-indigo-500" style={{ height: `${displayEngP}%`, minHeight: engP>0?'4px':'0' }}>
                                  {engP>0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-indigo-700">{engP}</span>}
                               </div>
                               {editingStudent.targetTrack !== '인문계' && (
                                 <div className="w-1/3 bg-teal-400 rounded-t-sm relative transition-all group-hover:bg-teal-500" style={{ height: `${displayMathP}%`, minHeight: mathP>0?'4px':'0' }}>
                                    {mathP>0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-teal-700">{mathP}</span>}
                                 </div>
                               )}
                            </div>
                            <span className={`text-xs font-bold mt-3 absolute -bottom-6 ${m === selectedMonth ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>{m}</span>
                          </div>
                        )
                     })}
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-400 rounded-sm"></div>영어 백분위</div>
                    {editingStudent.targetTrack !== '인문계' && <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-400 rounded-sm"></div>수학 백분위</div>}
                  </div>
                </div>

                <div className="h-px bg-slate-300 w-full my-4"></div>

                {/* 2. 하단: 수정 가능한 카드 뷰 (해당 월) */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <MonthlyScoreCard title={`${selectedMonth} 영어 성적 편집`} data={editingStudent.scores.monthly[selectedMonth]?.english || emptyMonthlyScore} onChange={(f,v)=>handleMonthlyChange(editingStudent.id, 'english', f, v)} />
                  <MonthlyScoreCard title={`${selectedMonth} 수학 성적 편집`} data={editingStudent.scores.monthly[selectedMonth]?.math || emptyMonthlyScore} onChange={(f,v)=>handleMonthlyChange(editingStudent.id, 'math', f, v)} disabled={editingStudent.targetTrack === '인문계'} />
                  <MonthlyScoreCard title={`${selectedMonth} 영어+수학 편집`} data={editingStudent.scores.monthly[selectedMonth]?.total || emptyMonthlyScore} onChange={(f,v)=>handleMonthlyChange(editingStudent.id, 'total', f, v)} disabled={editingStudent.targetTrack === '인문계'} highlight />
                </div>

             </div>
          </div>
        </div>
      )}

      {/* --- 모달 영역 4. 학생 수기 등록 모달 --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full"><X size={20}/></button>
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2"><UserPlus size={24} className="text-indigo-500"/> 학생 수기 등록</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">이름</label>
                <input type="text" value={newStudentForm.name} onChange={e=>setNewStudentForm({...newStudentForm, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 placeholder:font-normal" placeholder="예: 홍길동" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">아이디 (또는 학번)</label>
                <input type="text" value={newStudentForm.userId} onChange={e=>setNewStudentForm({...newStudentForm, userId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 placeholder:font-normal" placeholder="예: hong123" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">목표 계열</label>
                  <select value={newStudentForm.targetTrack} onChange={e=>setNewStudentForm({...newStudentForm, targetTrack: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-slate-800">
                    <option value="인문계">인문계</option>
                    <option value="자연계">자연계</option>
                    <option value="사범계">사범계</option>
                    <option value="예체능">예체능</option>
                    <option value="경찰대">경찰대</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">등록월 (시작월)</label>
                  <select value={newStudentForm.startMonth} onChange={e=>setNewStudentForm({...newStudentForm, startMonth: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-slate-800">
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleAddStudentSubmit} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors mt-4 shadow-sm">
                명단에 추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 모달 영역 5. 학생 신상정보 상세 모달 --- */}
      {viewingProfileId && studentProfileToView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-6 md:p-8 border-b flex justify-between items-center relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4"><School size={150}/></div>
              <div className="flex items-center gap-5 relative z-10 w-full pr-12">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-inner border border-white/20 shrink-0">{studentProfileToView.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <input className="text-3xl font-extrabold bg-transparent border-b border-transparent hover:border-white/30 focus:border-white outline-none w-40 transition-colors px-1 -ml-1" value={studentProfileToView.name} onChange={e => handleProfileChange(studentProfileToView.id, 'name', e.target.value)} />
                    <select className="bg-transparent border-b border-transparent hover:border-white/30 focus:border-white outline-none text-slate-300 font-medium cursor-pointer transition-colors" value={studentProfileToView.gender} onChange={e => handleProfileChange(studentProfileToView.id, 'gender', e.target.value)}>
                      <option className="text-black" value="남">남</option>
                      <option className="text-black" value="여">여</option>
                    </select>
                    <select className="bg-indigo-500 hover:bg-indigo-400 text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm outline-none border border-indigo-400 ml-2 cursor-pointer transition-colors" value={studentProfileToView.className} onChange={e => {
                        const targetClass = e.target.value;
                        showConfirm(`정말로 해당 학생을 [${targetClass}] 반으로 이동하시겠습니까?\n모든 누적 데이터는 그대로 안전하게 유지됩니다.`, () => {
                          handleProfileChange(studentProfileToView.id, 'className', targetClass);
                          setViewingProfileId(null); 
                          showAlert('반 변경이 완료되었습니다.');
                        });
                      }}>
                      {classes.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                    </select>
                  </div>
                  <div className="text-indigo-200 font-mono text-sm tracking-wider flex items-center gap-2">
                    학번: <input className="bg-transparent border-b border-transparent hover:border-indigo-300/50 focus:border-indigo-300 outline-none w-28 px-1 transition-colors" value={studentProfileToView.id} readOnly title="학번(고유키)은 수정할 수 কাশী 없습니다."/> 
                    <span className="opacity-50">|</span> 
                    ID: <input className="bg-transparent border-b border-transparent hover:border-indigo-300/50 focus:border-indigo-300 outline-none w-32 px-1 transition-colors" value={studentProfileToView.userId} onChange={e => handleProfileChange(studentProfileToView.id, 'userId', e.target.value)} />
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingProfileId(null)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors z-20"><X size={28} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Phone size={18} className="text-emerald-500"/> 연락처 및 기본정보</h3>
                  <div className="space-y-3 text-sm">
                    <ProfileRow label="학생 연락처" value={studentProfileToView.contact} onChange={e => handleProfileChange(studentProfileToView.id, 'contact', e.target.value)} bold />
                    <ProfileRow label="부모님 연락처" value={studentProfileToView.parentContact} onChange={e => handleProfileChange(studentProfileToView.id, 'parentContact', e.target.value)} bold />
                    <ProfileRow label="거주지역" value={studentProfileToView.address} onChange={e => handleProfileChange(studentProfileToView.id, 'address', e.target.value)} />
                    <ProfileRow label="등록월(시작월) 변경" value={studentProfileToView.startMonth || '1월'} onChange={e => handleProfileChange(studentProfileToView.id, 'startMonth', e.target.value)} options={MONTHS} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Bookmark size={18} className="text-amber-500"/> 편입 목표</h3>
                  <div className="space-y-3 text-sm">
                    <ProfileRow label="편입구분" value={studentProfileToView.transferType} onChange={e => handleProfileChange(studentProfileToView.id, 'transferType', e.target.value)} options={['일반', '학사', '기타']} />
                    <ProfileRow label="희망계열" value={studentProfileToView.targetTrack} onChange={e => handleProfileChange(studentProfileToView.id, 'targetTrack', e.target.value)} options={['인문계', '자연계', '사범계', '예체능', '경찰대', '기타']} />
                    <ProfileRow label="편입준비계기" value={studentProfileToView.motivation} onChange={e => handleProfileChange(studentProfileToView.id, 'motivation', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building size={18} className="text-blue-500"/> 출신 대학 및 스펙</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <ProfileRow label="출신대학" value={studentProfileToView.university} onChange={e => handleProfileChange(studentProfileToView.id, 'university', e.target.value)} bold />
                  <ProfileRow label="출신학과" value={studentProfileToView.major} onChange={e => handleProfileChange(studentProfileToView.id, 'major', e.target.value)} bold />
                  <ProfileRow label="졸업여부" value={studentProfileToView.gradStatus} onChange={e => handleProfileChange(studentProfileToView.id, 'gradStatus', e.target.value)} options={['재학', '휴학', '수료', '졸업', '자퇴', '기타']} />
                  <ProfileRow label="이수학점" value={studentProfileToView.credits} onChange={e => handleProfileChange(studentProfileToView.id, 'credits', e.target.value)} type="number" suffix="학점" />
                  <ProfileRow label="학점(백분위)" value={studentProfileToView.gpa} onChange={e => handleProfileChange(studentProfileToView.id, 'gpa', e.target.value)} bold />
                  <ProfileRow label="공인영어 보유" value={studentProfileToView.englishScore} onChange={e => handleProfileChange(studentProfileToView.id, 'englishScore', e.target.value)} bold inputClassName="text-blue-600 bg-blue-50 px-2 rounded" />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-64">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageSquare size={18} className="text-purple-500"/> 상담 및 특이사항</h3>
                <textarea 
                    className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-full flex-1 resize-none transition-all"
                    value={studentProfileToView.notes || ''}
                    onChange={(e) => handleProfileChange(studentProfileToView.id, 'notes', e.target.value)}
                    placeholder="기재된 특이사항이 없습니다. 이곳을 클릭하여 학생의 상담 내용 및 특이사항을 자유롭게 입력하세요."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 모달 영역 6. 위클리 주차별 상세 조회 모달 --- */}
      {viewingWeeklySummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 text-white p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <FileText size={24} /> {viewingWeeklySummary.name} 학생 주차별 상세 분석 [{weeklySubject === 'english' ? '영어' : '수학'}]
                </h2>
                <p className="text-indigo-100 text-sm mt-1">{weeklyMonth} 전체 주차별 성적 추이 및 유형별 정답률 종합 보고서입니다.</p>
              </div>
              <button onClick={() => setViewingWeeklySummary(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              {(() => {
                const stats = getMonthlyWeeklyStats(viewingWeeklySummary, weeklyMonth, weeklySubject);
                const scoreField = weeklySubject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
                
                if (stats.testCount === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500">
                      <FileSpreadsheet size={48} className="mx-auto mb-4 text-slate-300" />
                      <p>해당 월에 응시한 위클리 기록이 없습니다.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* 상단 요약 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex flex-col items-center justify-center">
                         <span className="text-sm font-bold text-indigo-500 mb-1">월간 위클리 평균 점수</span>
                         <span className="text-3xl font-extrabold text-indigo-700">{stats.avgScore} 점</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex flex-col items-center justify-center">
                         <span className="text-sm font-bold text-emerald-500 mb-1">월간 종합 정답률</span>
                         <span className="text-3xl font-extrabold text-emerald-700">{stats.overallRate}%</span>
                      </div>
                    </div>

                    {/* 주차별 점수 뷰 + 그래프 추가 */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> {weeklyMonth} 주차별 성적 추이</h3>
                      
                      {/* 차트 영역 */}
                      <div className="h-48 flex items-end justify-around border-b border-slate-200 pb-2 relative px-4 mb-6">
                         <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none pb-2 text-[10px] text-slate-400 font-mono">
                            <div>100</div><div>75</div><div>50</div><div>25</div><div>0</div>
                         </div>
                         {[1, 2, 3, 4, 5].map(w => {
                             const score = viewingWeeklySummary.scores[scoreField]?.[`${weeklyMonth}_w${w}`];
                             const scoreVal = score !== undefined && score !== null ? Number(score) : 0;
                             const displaySc = scoreVal > 100 ? 100 : scoreVal;
                             return (
                                 <div key={w} className="w-16 flex flex-col items-center justify-end h-full z-10 relative group">
                                     <div className="w-full bg-indigo-400 rounded-t-sm transition-all group-hover:bg-indigo-500 relative flex justify-center" style={{ height: `${displaySc}%`, minHeight: scoreVal>0?'4px':'0' }}>
                                         {scoreVal > 0 && <span className="absolute -top-6 text-xs font-bold text-indigo-700">{scoreVal}</span>}
                                     </div>
                                     <span className="text-xs font-bold text-slate-500 absolute -bottom-8">{w}주차</span>
                                 </div>
                             )
                         })}
                      </div>

                      {/* 표 영역 */}
                      <table className="w-full text-center text-sm border-collapse border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {[1, 2, 3, 4, 5].map(w => <th key={w} className="py-3 text-slate-500 font-bold border-r border-slate-200">{w}주차</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {[1, 2, 3, 4, 5].map(w => {
                               const score = viewingWeeklySummary.scores[scoreField]?.[`${weeklyMonth}_w${w}`];
                               return <td key={w} className="py-4 font-bold text-indigo-600 border-r border-slate-200 last:border-0">{score !== undefined && score !== null ? `${score} 점` : '-'}</td>;
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 유형별 정답률 요약 카드 */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ListChecks size={18} className="text-emerald-500"/> 월간 유형별 정답률 종합</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(stats.typeStats).map(([type, typeStat]) => (
                          <div key={type} className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl flex flex-col items-center">
                            <span className="text-xs text-emerald-600 font-bold mb-1">{type}</span>
                            <span className="text-xl font-extrabold text-emerald-700">
                              {typeStat.total > 0 ? Math.round((typeStat.correct / typeStat.total) * 100) : 0}%
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">({typeStat.correct} / {typeStat.total}문항)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* --- 모달 영역 7. 데일리 상세 조회 모달 --- */}
      {viewingDailySummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 text-white p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <PenTool size={24} /> {viewingDailySummary.name} 학생 종합 분석 ({dailyMonth} DAILY)
                </h2>
                <p className="text-indigo-100 text-sm mt-1">[{viewingDailySummary.startMonth} 등록생] 설정된 등록월에 맞춘 누적 통계치 및 전체 참여율입니다.</p>
              </div>
              <button onClick={() => setViewingDailySummary(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              {(() => {
                const dRecords = viewingDailySummary.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:''});
                const stats = getDailyStats(dRecords, dailyMonth);
                const overallStats = getOverallDailyStats(viewingDailySummary);
                
                return (
                  <>
                    {/* 상단 요약 (전체 월간 평균 - 등록월 기준) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute -right-4 -top-4 opacity-5 text-indigo-500"><BarChart3 size={100}/></div>
                         <span className="text-xs font-bold text-slate-500 mb-1 z-10">연간 누적 평균 점수</span>
                         <span className="text-3xl font-extrabold text-indigo-600 z-10">{overallStats.avgScore} 점</span>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute -right-4 -top-4 opacity-5 text-emerald-500"><CalendarCheck size={100}/></div>
                         <span className="text-xs font-bold text-slate-500 mb-1 z-10">연간 누적 참여율</span>
                         <span className="text-3xl font-extrabold text-emerald-600 z-10">{overallStats.rate}%</span>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute -right-4 -top-4 opacity-5 text-rose-500"><X size={100}/></div>
                         <span className="text-xs font-bold text-slate-500 mb-1 z-10">연간 누적 미응시율</span>
                         <span className="text-3xl font-extrabold text-rose-500 z-10">{overallStats.missedRate}%</span>
                      </div>
                    </div>

                    {/* 월별 참여율 추이 그래프 (1~12월) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500"/> 월별 DAILY 참여율 추이 (1월 ~ 12월)</h3>
                      <div className="h-40 flex items-end gap-2 border-b border-slate-200 pb-0 relative px-4 min-w-[800px] mt-4 mb-4">
                         <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                            <div className="leading-none -mt-1">100%</div><div className="leading-none">75%</div><div className="leading-none">50%</div><div className="leading-none">25%</div><div className="leading-none mb-1">0%</div>
                         </div>
                         {MONTHS.map((m, idx) => {
                            const startIdx = MONTHS.indexOf(viewingDailySummary.startMonth || '1월');
                            if (idx < startIdx) {
                                return (
                                  <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                    <div className="w-2/3 bg-slate-100 rounded-t-sm" style={{ height: '4px' }}></div>
                                    <span className="text-[10px] font-bold mt-2 text-slate-300 absolute -bottom-6">{m}</span>
                                  </div>
                                )
                            }
                            const monthStats = getDailyStats(viewingDailySummary.dailyRecords[m] || Array(31).fill({t1:'', t2:''}), m);
                            const rateNum = monthStats.rate;
                            const displayHeight = rateNum > 100 ? 100 : rateNum;
                            return (
                              <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                <div className="w-2/3 bg-emerald-400 rounded-t-sm transition-all group-hover:bg-emerald-500 relative flex justify-center" style={{ height: `${displayHeight}%`, minHeight: rateNum>0?'4px':'0' }}>
                                    {rateNum > 0 && <span className="absolute -top-6 text-[10px] font-bold text-emerald-700">{rateNum}%</span>}
                                </div>
                                <span className={`text-[10px] font-bold mt-2 absolute -bottom-6 ${m === dailyMonth ? 'text-emerald-600' : 'text-slate-400'}`}>{m}</span>
                              </div>
                            )
                         })}
                      </div>
                    </div>

                    {/* 현재 선택된 월(dailyMonth)의 일별 점수 추이 그래프 (t1+t2 총점 100점 만점 기준) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto mt-4">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> {dailyMonth} 일별 득점 현황 (총 100점 만점 기준)</h3>
                      <div className="h-40 flex items-end gap-1 border-b border-slate-200 pb-0 relative px-4 min-w-[800px] mt-4 mb-4">
                         <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                            <div className="leading-none -mt-1">100</div><div className="leading-none">75</div><div className="leading-none">50</div><div className="leading-none">25</div><div className="leading-none mb-1">0</div>
                         </div>
                         {dRecords.map((rec, i) => {
                            const isExcluded = dailySettings[dailyMonth]?.excludedDays.includes(i);
                            let dailyTotal = 0;
                            if (rec.t1 !== '') dailyTotal += Number(rec.t1);
                            if (rec.t2 !== '') dailyTotal += Number(rec.t2);
                            
                            const displayHeight = dailyTotal > 100 ? 100 : dailyTotal;

                            if (isExcluded) {
                                return (
                                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative">
                                    <div className="w-full bg-slate-100 rounded-t-sm" style={{ height: '4px' }}></div>
                                    <span className="text-[10px] font-bold mt-2 text-rose-300 absolute -bottom-6">휴일</span>
                                  </div>
                                )
                            }
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group cursor-pointer">
                                <div className="w-4/5 bg-indigo-400 rounded-t-sm transition-all group-hover:bg-indigo-500 relative flex justify-center" style={{ height: `${displayHeight}%`, minHeight: dailyTotal>0?'4px':'0' }}>
                                    {dailyTotal > 0 && <span className="absolute -top-6 text-[10px] font-bold text-indigo-700">{dailyTotal}</span>}
                                </div>
                                <span className="text-[10px] font-bold mt-2 text-slate-500 absolute -bottom-6">{i+1}일</span>
                              </div>
                            )
                         })}
                      </div>
                    </div>

                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* --- 모달 영역 8. 위클리 월별 성적조회 상세 그래프 모달 (월간 통합) --- */}
      {viewingWeeklyMonthlySummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 text-white p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <FileText size={24} /> {viewingWeeklyMonthlySummary.name} 학생 전체 월간 성적 분석 [{weeklySubject === 'english' ? '영어' : '수학'}]
                </h2>
                <p className="text-indigo-100 text-sm mt-1">[{viewingWeeklyMonthlySummary.startMonth} 등록생] 설정된 등록월에 맞춘 누적 통계치 및 정답률입니다.</p>
              </div>
              <button onClick={() => setViewingWeeklyMonthlySummary(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              {(() => {
                const stats = getOverallWeeklyStats(viewingWeeklyMonthlySummary, weeklySubject);
                
                if (stats.testCount === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500">
                      <FileSpreadsheet size={48} className="mx-auto mb-4 text-slate-300" />
                      <p>응시한 위클리 기록이 없습니다.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* 상단 요약 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex flex-col items-center justify-center">
                         <span className="text-sm font-bold text-indigo-500 mb-1">연간 위클리 평균 점수</span>
                         <span className="text-3xl font-extrabold text-indigo-700">{stats.avgScore} 점</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex flex-col items-center justify-center">
                         <span className="text-sm font-bold text-emerald-500 mb-1">연간 종합 정답률</span>
                         <span className="text-3xl font-extrabold text-emerald-700">{stats.overallRate}%</span>
                      </div>
                    </div>

                    {/* 월간 평균 점수 추이 그래프 */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 전체 월별 평균 점수 추이</h3>
                      
                      <div className="h-48 flex items-end justify-around border-b border-slate-200 pb-0 relative px-4 mt-4 mb-8">
                         <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                            <div className="leading-none -mt-1">100</div><div className="leading-none">75</div><div className="leading-none">50</div><div className="leading-none">25</div><div className="leading-none mb-1">0</div>
                         </div>
                         {MONTHS.map((m, idx) => {
                             const startIdx = MONTHS.indexOf(viewingWeeklyMonthlySummary.startMonth || '1월');
                             if (idx < startIdx) {
                                 return (
                                     <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                         <div className="w-2/3 bg-slate-100 rounded-t-sm" style={{ height: '4px' }}></div>
                                         <span className="text-[10px] font-bold mt-2 text-slate-300 absolute -bottom-6">{m}</span>
                                     </div>
                                 )
                             }

                             const scoreVal = stats.monthlyScores[m] !== '-' ? Number(stats.monthlyScores[m]) : 0;
                             const displayHeight = scoreVal > 100 ? 100 : scoreVal;
                             return (
                                 <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                     <div className="w-2/3 bg-indigo-400 rounded-t-sm transition-all group-hover:bg-indigo-500 relative flex justify-center" style={{ height: `${displayHeight}%`, minHeight: scoreVal>0?'4px':'0' }}>
                                         {scoreVal > 0 && <span className="absolute -top-6 text-[10px] font-bold text-indigo-700">{scoreVal}</span>}
                                     </div>
                                     <span className="text-[10px] font-bold mt-2 text-slate-500 absolute -bottom-6">{m}</span>
                                 </div>
                             )
                         })}
                      </div>

                      {/* 표 영역 */}
                      <table className="w-full text-center text-sm border-collapse border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {MONTHS.map(m => <th key={m} className="py-2 text-slate-500 font-bold border-r border-slate-200 text-[11px]">{m}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {MONTHS.map((m, idx) => {
                               const startIdx = MONTHS.indexOf(viewingWeeklyMonthlySummary.startMonth || '1월');
                               if (idx < startIdx) return <td key={m} className="py-3 font-bold text-slate-300 border-r border-slate-200 last:border-0 text-xs">-</td>;
                               return <td key={m} className="py-3 font-bold text-indigo-600 border-r border-slate-200 last:border-0 text-xs">{stats.monthlyScores[m] !== '-' ? `${stats.monthlyScores[m]}` : '-'}</td>;
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 유형별 정답률 요약 카드 */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ListChecks size={18} className="text-emerald-500"/> 연간 전체 유형별 정답률 종합</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(stats.typeStats).map(([type, typeStat]) => (
                          <div key={type} className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl flex flex-col items-center">
                            <span className="text-xs text-emerald-600 font-bold mb-1">{type}</span>
                            <span className="text-xl font-extrabold text-emerald-700">
                              {typeStat.total > 0 ? Math.round((typeStat.correct / typeStat.total) * 100) : 0}%
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">({typeStat.correct} / {typeStat.total}문항)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* --- 모달 영역 9. 학습시간 개인별 상세 모달 --- */}
      {viewingStudyTimeSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 text-white p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <Clock size={24} /> {viewingStudyTimeSummary.name} 학생 학습시간 상세 분석
                </h2>
                <p className="text-indigo-100 text-sm mt-1">전체 월별 학습시간 추이 및 누적 학습 통계입니다.</p>
              </div>
              <button onClick={() => setViewingStudyTimeSummary(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              {(() => {
                const stats = getStudyTimeStats(viewingStudyTimeSummary);
                
                return (
                  <>
                    {/* 상단 요약 (전체 누적 평균) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute -right-4 -top-4 opacity-5 text-indigo-500"><Clock size={100}/></div>
                         <span className="text-xs font-bold text-slate-500 mb-1 z-10">전체 누적 학습시간</span>
                         <span className="text-3xl font-extrabold text-indigo-600 z-10">{stats.totalStr}</span>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute -right-4 -top-4 opacity-5 text-emerald-500"><BarChart3 size={100}/></div>
                         <span className="text-xs font-bold text-slate-500 mb-1 z-10">월 평균 학습시간</span>
                         <span className="text-3xl font-extrabold text-emerald-600 z-10">
                            {(() => {
                                let activeMonths = 0;
                                MONTHS.forEach(m => {
                                    if(viewingStudyTimeSummary.studyTime[m]?.some(d => parseTimeDiffToMins(d.in, d.out) > 0)) activeMonths++;
                                });
                                const monthlyAvgMins = activeMonths > 0 ? Math.floor(stats.totalMins / activeMonths) : 0;
                                return formatMinsToTime(monthlyAvgMins);
                            })()}
                         </span>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute -right-4 -top-4 opacity-5 text-amber-500"><CalendarCheck size={100}/></div>
                         <span className="text-xs font-bold text-slate-500 mb-1 z-10">총 순공 기록 일수</span>
                         <span className="text-3xl font-extrabold text-amber-500 z-10">{stats.daysStudied} 일</span>
                      </div>
                    </div>

                    {/* 월별 누적 학습시간 추이 그래프 (1~12월) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 월별 누적 학습시간 추이</h3>
                      <div className="h-48 flex items-end gap-2 border-b border-slate-200 pb-0 relative px-4 min-w-[800px] mt-4 mb-8">
                         <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                            <div className="leading-none -mt-1">300h</div><div className="leading-none">225h</div><div className="leading-none">150h</div><div className="leading-none">75h</div><div className="leading-none mb-1">0h</div>
                         </div>
                         {MONTHS.map((m, idx) => {
                            const startIdx = MONTHS.indexOf(viewingStudyTimeSummary.startMonth || '1월');
                            if (idx < startIdx) {
                                return (
                                  <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative">
                                    <div className="w-4/5 bg-slate-100 rounded-t-sm" style={{ height: '4px' }}></div>
                                    <span className="text-[10px] font-bold mt-2 text-slate-300 absolute -bottom-6">{m}</span>
                                  </div>
                                )
                            }
                            const monthData = viewingStudyTimeSummary.studyTime[m] || [];
                            let diffMins = 0;
                            monthData.forEach(d => { diffMins += parseTimeDiffToMins(d.in, d.out); });
                            const hours = diffMins / 60;
                            const maxHours = 300; 
                            const heightPct = Math.min((hours / maxHours) * 100, 100);
                            
                            if (diffMins === 0) {
                                return (
                                  <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative">
                                    <div className="w-4/5 bg-slate-100 rounded-t-sm" style={{ height: '4px' }}></div>
                                    <span className="text-[10px] font-bold mt-2 text-slate-400 absolute -bottom-6">{m}</span>
                                  </div>
                                )
                            }
                            return (
                              <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                <div className="w-4/5 bg-indigo-400 rounded-t-sm transition-all group-hover:bg-indigo-500 relative flex justify-center" style={{ height: `${heightPct}%`, minHeight: '4px' }}>
                                    <span className="absolute -top-6 text-[10px] font-bold text-indigo-700 whitespace-nowrap bg-white px-1 rounded shadow-sm border border-slate-100">{formatMinsToTime(diffMins)}</span>
                                </div>
                                <span className="text-[10px] font-bold mt-2 text-slate-500 absolute -bottom-6">{m}</span>
                              </div>
                            )
                         })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* --- 모달 영역 10. 출결 상세 요약 모달 --- */}
      {viewingAttendanceSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 text-white p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <CalendarCheck size={24} /> {viewingAttendanceSummary.name} 학생 출결 상세 분석
                </h2>
                <p className="text-emerald-100 text-sm mt-1">월별 출결 상태 현황 및 벌점 누적 리포트입니다.</p>
              </div>
              <button onClick={() => setViewingAttendanceSummary(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              {(() => {
                const getMonthlyStats = (month) => {
                  const am = viewingAttendanceSummary.attendance[month]?.am || [];
                  const pm = viewingAttendanceSummary.attendance[month]?.pm || [];
                  const entries = [...am, ...pm].filter(v => v !== '');
                  const stats = { 출석:0, 지각:0, 사전통보:0, 개인사정:0, 학교:0, 병결:0, 진료:0, 기타:0, penalty:0 };
                  
                  entries.forEach(v => {
                    if (stats[v] !== undefined) stats[v]++;
                    else stats.기타++;
                    
                    if (v === '지각') stats.penalty += 1;
                    else if (v === '개인사정') stats.penalty += 2;
                    else if (v !== '출석' && v !== '학교' && v !== '사전통보' && v !== '진료' && v !== '병결') stats.penalty += 3;
                  });
                  return stats;
                };

                const currentStats = getMonthlyStats(attendanceMonth);
                
                return (
                  <>
                    {/* 상단 요약 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center">
                         <span className="text-xs font-bold text-slate-500 mb-1">{attendanceMonth} 출석률</span>
                         <span className="text-3xl font-extrabold text-emerald-600">{getAttendanceRate(viewingAttendanceSummary, attendanceMonth)}</span>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center">
                         <span className="text-xs font-bold text-slate-500 mb-1">{attendanceMonth} 출석/지각</span>
                         <span className="text-3xl font-extrabold text-blue-600">{currentStats.출석} / {currentStats.지각}</span>
                      </div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center">
                         <span className="text-xs font-bold text-slate-500 mb-1">{attendanceMonth} 결석(사전/개인/병결)</span>
                         <span className="text-3xl font-extrabold text-amber-600">{currentStats['사전통보']} / {currentStats['개인사정']} / {currentStats['병결']}</span>
                      </div>
                      <div className="bg-white border border-rose-200 shadow-sm rounded-xl p-5 flex flex-col items-center justify-center bg-rose-50/30">
                         <span className="text-xs font-bold text-rose-500 mb-1">{attendanceMonth} 누적 벌점</span>
                         <span className="text-3xl font-extrabold text-rose-600">{currentStats.penalty} 점</span>
                      </div>
                    </div>

                    {/* 월별 출석률 추이 그래프 */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500"/> 전체 월별 출석률 추이</h3>
                      <div className="h-48 flex items-end gap-1 border-b border-slate-200 pb-0 relative px-4 min-w-[800px] mt-4 mb-4">
                         <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono border-l border-slate-100 pl-1">
                            <div className="leading-none -mt-1">100%</div><div className="leading-none">75%</div><div className="leading-none">50%</div><div className="leading-none">25%</div><div className="leading-none mb-1">0%</div>
                         </div>
                         {MONTHS.map((m, idx) => {
                            const startIdx = MONTHS.indexOf(viewingAttendanceSummary.startMonth || '1월');
                            if (idx < startIdx) {
                                return (
                                  <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                    <div className="w-4/5 bg-slate-100 rounded-t-sm" style={{ height: '4px' }}></div>
                                    <span className="text-[10px] font-bold mt-2 text-slate-300 absolute -bottom-6">{m}</span>
                                  </div>
                                )
                            }
                            const rateNum = getAttendanceRateNum(viewingAttendanceSummary, m);
                            const displayHeight = rateNum > 100 ? 100 : rateNum;
                            return (
                              <div key={m} className="flex-1 flex flex-col items-center justify-end h-full z-10 relative group">
                                <div className="w-4/5 bg-emerald-400 rounded-t-sm transition-all group-hover:bg-emerald-500 relative flex justify-center" style={{ height: `${displayHeight}%`, minHeight: rateNum>0?'4px':'0' }}>
                                    {rateNum > 0 && <span className="absolute -top-6 text-[10px] font-bold text-emerald-700">{rateNum}%</span>}
                                </div>
                                <span className={`text-[10px] font-bold mt-2 absolute -bottom-6 ${m === attendanceMonth ? 'text-emerald-600' : 'text-slate-500'}`}>{m}</span>
                              </div>
                            )
                         })}
                      </div>
                    </div>

                    {/* 날짜별 결석/특이사항 사유 */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ListChecks size={18} className="text-rose-500"/> {attendanceMonth} 상세 출결 기록 (특이 사유)</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {(() => {
                                const am = viewingAttendanceSummary.attendance[attendanceMonth]?.am || [];
                                const pm = viewingAttendanceSummary.attendance[attendanceMonth]?.pm || [];
                                const amMemo = viewingAttendanceSummary.attendance[attendanceMonth]?.amMemo || [];
                                const pmMemo = viewingAttendanceSummary.attendance[attendanceMonth]?.pmMemo || [];
                                const records = [];
                                for(let i=0; i<31; i++) {
                                    if(am[i] && am[i] !== '출석') records.push({day: i+1, dayIdx: i, time: '오전', reason: am[i], memo: amMemo[i]});
                                    if(pm[i] && pm[i] !== '출석') records.push({day: i+1, dayIdx: i, time: '오후', reason: pm[i], memo: pmMemo[i]});
                                }
                                if(records.length === 0) return <div className="text-sm text-slate-400 text-center py-8">해당 월에 특이 출결 기록이 없습니다.</div>;
                                return records.map((rec, idx) => (
                                    <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-colors group ${rec.memo ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-3 shrink-0 mb-2 sm:mb-0">
                                            {rec.memo ? <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div> : <div className="w-2 h-2 rounded-full bg-transparent"></div>}
                                            <span className="font-extrabold text-slate-600 bg-white px-2 py-1 rounded shadow-sm text-xs w-10 text-center">{rec.day}일</span>
                                            <span className={`font-bold text-xs px-2 py-1 rounded w-12 text-center ${rec.time === '오전' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{rec.time}</span>
                                            <span className={`font-bold text-sm w-16 text-center ${rec.reason === '결석' ? 'text-rose-600' : 'text-slate-800'}`}>{rec.reason}</span>
                                        </div>
                                        <div className="flex-1 sm:ml-4 flex items-center bg-white rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-rose-200 focus-within:border-rose-400 overflow-hidden shadow-sm transition-all w-full">
                                            <div className="pl-3 text-slate-400 flex-shrink-0">
                                                <MessageSquare size={16} className={rec.memo ? "text-rose-400" : "text-slate-300"} />
                                            </div>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 text-sm text-slate-700 outline-none bg-transparent placeholder:text-slate-300 font-medium"
                                                placeholder="상세 사유 또는 특이사항 메모 입력..."
                                                value={rec.memo || ''}
                                                onChange={(e) => {
                                                    const timeOfDay = rec.time === '오전' ? 'am' : 'pm';
                                                    const newMemo = e.target.value;
                                                    handleAttendanceMemoChange(viewingAttendanceSummary.id, timeOfDay, rec.dayIdx, newMemo);
                                                    setViewingAttendanceSummary(prev => {
                                                        const newStudent = {...prev};
                                                        const memoField = timeOfDay === 'am' ? 'amMemo' : 'pmMemo';
                                                        const newMemoArray = [...(newStudent.attendance[attendanceMonth][memoField] || Array(31).fill(''))];
                                                        newMemoArray[rec.dayIdx] = newMemo;
                                                        newStudent.attendance[attendanceMonth] = { ...newStudent.attendance[attendanceMonth], [memoField]: newMemoArray };
                                                        return newStudent;
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- 공통 렌더링 헬퍼 ---
const renderScoreBlock = (subjectName, subjectKey, colorTheme, showTotal, target, detailMonth) => {
  if (!showTotal || !target) return null;
  return (
    <React.Fragment>
      <tr><td rowSpan={4} className={`border-r font-extrabold text-${colorTheme}-700 bg-${colorTheme}-50/30`}>{subjectName}</td><td className="border-r py-2 font-bold text-slate-700 bg-slate-50">원점수</td>{DISPLAY_MONTHS.map(m => <td key={m} className={`font-bold text-${colorTheme}-600 ${m === detailMonth ? `bg-${colorTheme}-50/30` : ''}`}>{target.scores.monthly[m]?.[subjectKey]?.score || '-'}</td>)}</tr>
      <tr><td className="border-r py-2 font-bold text-slate-700 bg-slate-50">백분위</td>{DISPLAY_MONTHS.map(m => <td key={m} className={`font-semibold text-slate-600 ${m === detailMonth ? `bg-${colorTheme}-50/30` : ''}`}>{target.scores.monthly[m]?.[subjectKey]?.percent || '-'}</td>)}</tr>
      <tr><td className="border-r py-2 text-xs text-slate-500 bg-slate-50">전체평균</td>{DISPLAY_MONTHS.map(m => <td key={m} className={`text-xs text-slate-400 ${m === detailMonth ? `bg-${colorTheme}-50/30` : ''}`}>{target.scores.monthly[m]?.[subjectKey]?.trackAvg || '-'}</td>)}</tr>
      <tr className="border-b-2 border-slate-300"><td className="border-r py-2 text-xs text-slate-500 bg-slate-50">상위 30%평균</td>{DISPLAY_MONTHS.map(m => <td key={m} className={`text-xs text-slate-400 ${m === detailMonth ? `bg-${colorTheme}-50/30` : ''}`}>{target.scores.monthly[m]?.[subjectKey]?.top30Avg || '-'}</td>)}</tr>
    </React.Fragment>
  );
};

const ProfileRow = ({ label, value, onChange, placeholder = "-", type = "text", options, suffix, bold, inputClassName }) => (
  <div className="flex justify-between border-b border-slate-100 pb-1.5 items-center">
    <span className="text-slate-500 shrink-0">{label}</span>
    {options ? (
      <select className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded outline-none cursor-pointer border border-indigo-100 hover:border-indigo-300 transition-colors text-right" value={value || ''} onChange={onChange}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <div className="flex items-center w-full justify-end ml-4">
        <input type={type} className={`${inputClassName || ''} ${bold ? 'font-bold' : 'font-medium'} text-right outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent transition-colors py-0.5 ${type==='number'?'w-16':'w-full'}`} value={value || ''} onChange={onChange} placeholder={placeholder} />
        {suffix && <span className="ml-1 text-slate-500">{suffix}</span>}
      </div>
    )}
  </div>
);

function MonthlyScoreCard({ title, data, onChange, disabled, highlight }) {
  return (
    <div className={`border ${highlight ? 'border-indigo-300 bg-indigo-50/20 shadow-md' : 'border-slate-200 bg-white'} rounded-xl p-5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <h4 className={`font-extrabold mb-4 pb-2 border-b ${highlight ? 'text-indigo-800 border-indigo-100' : 'text-slate-700 border-slate-100'}`}>{title}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <InputRow label="원점수" val={data.score} onChange={(v)=>onChange('score', v)} bold />
        <InputRow label="백분위" val={data.percent} onChange={(v)=>onChange('percent', v)} suffix="%" />
        <InputRow label="반 석차" val={data.classRank} onChange={(v)=>onChange('classRank', v)} suffix="등" />
        <InputRow label="전체 석차" val={data.totalRank} onChange={(v)=>onChange('totalRank', v)} suffix="등" />
        <InputRow label="전체 평균 대비" val={data.trackAvgDiff} onChange={(v)=>onChange('trackAvgDiff', v)} colored />
        <InputRow label="상위 30% 대비" val={data.top30Diff} onChange={(v)=>onChange('top30Diff', v)} colored />
      </div>
    </div>
  );
}

function InputRow({ label, val, onChange, suffix, bold, colored }) {
  const isPositive = colored && Number(val) > 0;
  const isNegative = colored && Number(val) < 0;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <div className="relative">
        <input 
          type="text" 
          className={`w-full border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50/50 
            ${bold ? 'font-extrabold text-indigo-700' : 'font-semibold text-slate-700'}
            ${isPositive ? 'text-rose-500' : ''} ${isNegative ? 'text-blue-500' : ''}
          `}
          value={val || ''} onChange={(e)=>onChange(e.target.value)} placeholder="-"
        />
        {suffix && val !== '' && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{suffix}</span>}
      </div>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, tabName, activeTab, onClick, highlight }) {
  const isActive = activeTab === tabName;
  const activeColor = highlight === 'emerald' ? 'bg-emerald-600 shadow-emerald-900/50' : highlight === 'indigo' ? 'bg-indigo-600 shadow-indigo-900/50' : 'bg-indigo-600 shadow-indigo-900/50';
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${isActive ? `${activeColor} text-white shadow-md` : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} /><span>{label}</span>
    </button>
  );
}

function SubTabButton({ label, subTab, activeSubTab, onClick }) {
  const isActive = activeSubTab === subTab;
  return (
    <button onClick={onClick} className={`w-full text-left pl-10 py-2.5 rounded-lg text-sm font-bold transition-colors ${isActive ? 'text-indigo-400 bg-slate-800/80 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}>
      {label}
    </button>
  );
}