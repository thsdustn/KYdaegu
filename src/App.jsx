import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, FileText, BarChart3, Calendar, Clock, Printer, Search, ChevronRight, School, 
  MessageSquare, CalendarCheck, X, FileSpreadsheet, PenTool, CheckCircle2,
  Plus, Upload, ChevronLeft, Phone, Building, Bookmark, ChevronDown, LayoutList, UploadCloud, DownloadCloud,
  ArrowDownAZ, ArrowUpZA, Settings, Trash2, UserPlus, ListChecks, Trophy, LayoutDashboard, AlertTriangle
} from 'lucide-react';

// === 🔥 Firebase 연동 준비 (1단계: 설정 및 초기화) ===
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB6X9GIAOFBl8H5A9rE1iNEmBJhLpQ4LlI",
  authDomain: "kydaegu-8de35.firebaseapp.com",
  projectId: "kydaegu-8de35",
  storageBucket: "kydaegu-8de35.firebasestorage.app",
  messagingSenderId: "690405998115",
  appId: "1:690405998115:web:b301b8c4e08403716a7b96"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = 'kydaegu-academy-remodel-test';
// ====================================================

const ATTENDANCE_OPTIONS = ['출석', 'Live', '결석', '조퇴', '지각', '사전통보', '병결', '알바', '가족사정', '개인사정', '컨디션 난조', '학교', '시험', '과제', '실습', '타학원', '독서실', '기타'];
const ATTENDANCE_SESSION_KEY = 'am';
const ATTENDANCE_SESSION_LABEL = '출석확인';
const ATTENDANCE_PRESENT_STATUSES = ['출석', 'Live'];
const ATTENDANCE_ABSENT_STATUSES = ['결석'];
const ATTENDANCE_NEUTRAL_STATUSES = [
  '조퇴', '지각', '사전통보', '병결', '알바', '가족사정', '개인사정',
  '컨디션 난조', '학교', '시험', '과제', '실습', '타학원', '독서실', '기타'
];
const getAttendanceValueType = (value) => {
  const status = String(value ?? '').trim();
  if (ATTENDANCE_PRESENT_STATUSES.includes(status)) return 'present';
  if (ATTENDANCE_ABSENT_STATUSES.includes(status)) return 'absent';
  if (ATTENDANCE_NEUTRAL_STATUSES.includes(status)) return 'neutral';
  return 'empty';
};
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
    MONTHS.forEach(m => {
        data[m] = {
            am: Array(31).fill(''),
            pm: Array(31).fill(''),
            amMemo: Array(31).fill(''),
            pmMemo: Array(31).fill('')
        };
    });
    return data;
};

const generateEmptyMonthlyStudyTime = () => {
    const data = {};
    MONTHS.forEach(m => { data[m] = Array.from({length: 31}, () => ({in: '', out: ''})); });
    return data;
}

const generateEmptyMonthlyDaily = () => {
    const data = {};
    MONTHS.forEach(m => {
        data[m] = Array.from({ length: 31 }, () => ({ t1: '', t2: '', math: '' }));
    });
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
      id, userId, name, startMonth: startMonth || '1월', className: "GB1A", classNames: ["GB1A"], gender: id.includes("586") ? "여" : "남",
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

  // --- ☁️ Firebase 실시간 연동 상태 ---
  const [user, setUser] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- ✅ 수동 저장 안정화 상태 ---
  const [dirtyStudentIds, setDirtyStudentIds] = useState(new Set());
  const [dirtyFieldsByStudent, setDirtyFieldsByStudent] = useState({});
  const [manualSaveStatus, setManualSaveStatus] = useState('idle'); // idle | dirty | saving | saved | error
  const [manualSaveMessage, setManualSaveMessage] = useState('');
  const [lastManualSavedAt, setLastManualSavedAt] = useState(null);

  // ✅ 저장 최적화: 반 목록/classes 변경 추적
  const [isClassesDirty, setIsClassesDirty] = useState(false);

  // ✅ 저장 최적화: 반별 설정 변경 추적
  const [dirtyClassSettings, setDirtyClassSettings] = useState({});

  // ✅ 저장 최적화: 마지막으로 Firebase에서 불러왔거나 저장 완료된 학생 데이터 스냅샷
  const savedStudentsSnapshotRef = useRef({});

  // --- [인증] 앱 시작 시 익명 로그인 처리 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("인증 에러:", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // --- [불러오기] Firestore에서 데이터 가져오기 ---
  useEffect(() => {
    if (!user) return;

    const loadCloudData = async () => {
      setIsDataLoaded(false);
      try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'years', `year_${academicYear}`);
        const docSnap = await getDoc(docRef);

        let loadedClasses = [];
        let loadedStudents = [];
        let useFallback = true;

        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          
          if (cloudData.classes && Array.isArray(cloudData.classes)) {
             loadedClasses = cloudData.classes;
          }

          // students 하위 컬렉션에서 개별 학생 문서들을 긁어옴
          const studentsColRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'years', `year_${academicYear}`, 'students');
          const studentsSnap = await getDocs(studentsColRef);
          
          if (!studentsSnap.empty) {
             studentsSnap.forEach(doc => {
                 const data = doc.data();
                 if (!data.classNames) data.classNames = [data.className || '미배정'];
                 loadedStudents.push(data);
             });
          }

          // ✅ 반별 설정 classSettings 컬렉션 불러오기
          try {
            const classSettingsColRef = collection(
              db,
              'artifacts',
              APP_ID,
              'public',
              'data',
              'years',
              `year_${academicYear}`,
              'classSettings'
            );

            const classSettingsSnap = await getDocs(classSettingsColRef);

            classSettingsSnap.forEach(settingDoc => {
              const settingData = settingDoc.data();

              localStorage.setItem(
                `academyClassSettings_${academicYear}_${settingDoc.id}`,
                JSON.stringify(settingData)
              );
            });
          } catch (settingsError) {
            console.error('반별 설정 로드 에러:', settingsError);
          }

          // 컬렉션 방식 데이터가 존재하거나, 메인 문서에 클래스 정보라도 있으면 반영
          if (loadedStudents.length > 0) {
            const nextClasses = loadedClasses.length > 0 ? loadedClasses : ['GB1A', 'GB1B', 'GB2A', 'S-CLASS'];

            setClasses(nextClasses);
            setStudents(loadedStudents);

            savedStudentsSnapshotRef.current = loadedStudents.reduce((acc, student) => {
              acc[student.id] = JSON.parse(JSON.stringify(student));
              return acc;
            }, {});

            setDirtyStudentIds(new Set());
            setDirtyFieldsByStudent({});
            setDirtyClassSettings({});
            setIsClassesDirty(false);

            useFallback = false;
          } else if (loadedClasses.length > 0) {
            loadedClasses = loadedClasses;
            useFallback = true;
          }
        }

        // 클라우드 데이터가 아예 없거나 빈 문서 상태일 경우 로컬 백업 확인
        if (useFallback) {
          const savedLocal = localStorage.getItem(`studentManagement_${academicYear}`);
          if (savedLocal) {
            try {
              const parsed = JSON.parse(savedLocal);
              if (parsed.students && Array.isArray(parsed.students) && parsed.classes && Array.isArray(parsed.classes)) {
                const normalized = parsed.students.map(s => ({...s, classNames: s.classNames || [s.className || '미배정']}));
                setStudents(normalized);
                setClasses(parsed.classes);
              } else {
                throw new Error("Invalid localStorage data");
              }
            } catch (err) {
              setStudents(academicYear === '2026' ? initialMockData : []);
              setClasses(['GB1A', 'GB1B', 'GB2A', 'S-CLASS']);
            }
          } else {
            setStudents(academicYear === '2026' ? initialMockData : []);
            setClasses(['GB1A', 'GB1B', 'GB2A', 'S-CLASS']);
          }
        }
      } catch (e) {
        console.error("데이터 로드 에러:", e);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadCloudData();
  }, [user, academicYear]);

  // --- [자동 백업] 데이터 변경 시 localStorage에만 자동 백업 ---
  // ✅ Firebase 자동 전체 저장은 Firestore 사용량 초과 방지를 위해 중단
  // ✅ Firebase 공유 저장은 우측 상단 "변경사항 저장" 버튼을 눌렀을 때만 실행
  useEffect(() => {
    if (!isDataLoaded) return;

    const saveToLocalBackup = () => {
      setSaveStatus('saving');

      try {
        localStorage.setItem(
          `studentManagement_${academicYear}`,
          JSON.stringify({ classes, students })
        );

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1200);
      } catch (localErr) {
        console.error("로컬스토리지 백업 에러:", localErr);
        setSaveStatus('error');
      }
    };

    // 화면 수정 후 브라우저 임시 백업만 수행
    const timer = setTimeout(saveToLocalBackup, 1000);
    return () => clearTimeout(timer);
  }, [classes, students, isDataLoaded, academicYear]);

  // --- ✅ 수동 저장 안정화: 변경 학생/필드 기록 ---
  const markStudentDirty = (studentId, fieldName) => {
    if (!studentId) return;

    setDirtyStudentIds(prev => {
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });

    setDirtyFieldsByStudent(prev => {
      const currentFields = new Set(prev[studentId] || []);
      if (fieldName) currentFields.add(fieldName);

      return {
        ...prev,
        [studentId]: Array.from(currentFields)
      };
    });

    setManualSaveStatus('dirty');
    setManualSaveMessage('변경사항 있음');
  };

  // ✅ 실제 값 비교용 helper
  const isSameValueForDirtyCheck = (currentValue, nextValue) => {
    return String(currentValue ?? '').trim() === String(nextValue ?? '').trim();
  };

  // ✅ 엑셀 업로드 함수명 오타 방어용 alias
  // 이전 수정/배포 과정에서 잘못 입력된 함수명이 남아 있어도 업로드가 중단되지 않도록 처리
  const issamevaluefordirthcheck = isSameValueForDirtyCheck;
  const issamevaluefordirtycheck = isSameValueForDirtyCheck;
  const isSameValueForDirtCheck = isSameValueForDirtyCheck;
  const isSameValueForDirthCheck = isSameValueForDirtyCheck;

  const isSameObjectForDirtyCheck = (currentValue, nextValue) => {
    return JSON.stringify(currentValue ?? null) === JSON.stringify(nextValue ?? null);
  };

  // ✅ 반 목록/classes 변경 추적
  const markClassesDirty = () => {
    setIsClassesDirty(true);
    setManualSaveStatus('dirty');
    setManualSaveMessage('변경사항 있음');
  };

  // ✅ 반별 설정 변경 추적
  const markClassSettingsDirty = (targetClassName, settingType) => {
    if (!targetClassName || targetClassName === '대구캠퍼스 전체') return;

    setDirtyClassSettings(prev => ({
      ...prev,
      [targetClassName]: {
        ...(prev[targetClassName] || {}),
        [settingType]: true
      }
    }));

    setManualSaveStatus('dirty');
    setManualSaveMessage('변경사항 있음');
  };

  const getSavedStudentSnapshot = (studentId) => {
    return savedStudentsSnapshotRef.current?.[studentId] || null;
  };

  const hasDirtyPayloadChanged = (student, payload) => {
    const savedStudent = getSavedStudentSnapshot(student.id);

    if (!savedStudent) return true;

    return Object.keys(payload || {}).some(fieldName => {
      return !isSameObjectForDirtyCheck(savedStudent[fieldName], payload[fieldName]);
    });
  };

  const buildDirtyStudentPayload = (student) => {
    const fields = dirtyFieldsByStudent[student.id] || [];

    if (!fields.length) return student;

    const payload = {};

    if (fields.includes('attendance')) payload.attendance = student.attendance;
    if (fields.includes('studyTime')) payload.studyTime = student.studyTime;
    if (fields.includes('dailyRecords')) payload.dailyRecords = student.dailyRecords;
    if (fields.includes('scores')) payload.scores = student.scores;
    if (fields.includes('notes')) payload.notes = student.notes;
    if (fields.includes('consulting')) payload.consulting = student.consulting;

    if (fields.includes('studentInfo')) {
      Object.assign(payload, {
        id: student.id,
        userId: student.userId,
        name: student.name,
        startMonth: student.startMonth,
        className: student.className,
        classNames: student.classNames,
        gender: student.gender,
        contact: student.contact,
        parentContact: student.parentContact,
        address: student.address,
        university: student.university,
        major: student.major,
        gradStatus: student.gradStatus,
        transferType: student.transferType,
        targetTrack: student.targetTrack,
        credits: student.credits,
        gpa: student.gpa,
        motivation: student.motivation,
        englishScore: student.englishScore
      });
    }

    return Object.keys(payload).length ? payload : student;
  };

  const getDirtyClassSettingsNamesForScope = (scope = 'all') => {
    const names = Object.keys(dirtyClassSettings || {});

    if (scope === 'class' && selectedClass) {
      return names.filter(name => name === selectedClass);
    }

    return names;
  };

  const getClassSettingsPayloadFromLocalStorage = (targetClassName) => {
    const defaults = {
      dailySettings: createDefaultDailySettings(),
      attendanceSettings: createDefaultAttendanceSettings(),
      penaltyRules: createDefaultPenaltyRules()
    };

    try {
      const saved = localStorage.getItem(`academyClassSettings_${academicYear}_${targetClassName}`);
      const parsed = saved ? JSON.parse(saved) : {};

      return {
        className: targetClassName,
        dailySettings: {
          ...defaults.dailySettings,
          ...(parsed.dailySettings || {})
        },
        attendanceSettings: {
          ...defaults.attendanceSettings,
          ...(parsed.attendanceSettings || {})
        },
        penaltyRules: {
          ...defaults.penaltyRules,
          ...(parsed.penaltyRules || {}),
          rules: {
            ...defaults.penaltyRules.rules,
            ...(parsed.penaltyRules?.rules || {})
          }
        },
        updatedAt: Date.now(),
        updatedBy: user?.uid || ''
      };
    } catch (error) {
      return {
        className: targetClassName,
        ...defaults,
        updatedAt: Date.now(),
        updatedBy: user?.uid || ''
      };
    }
  };

  const getDirtyCountForScope = (scope = 'all') => {
    const dirtyIds = Array.from(dirtyStudentIds);

    const studentDirtyCount = scope === 'class' && selectedClass
      ? students.filter(student => {
          if (!dirtyIds.includes(student.id)) return false;

          const classList = Array.isArray(student.classNames)
            ? student.classNames
            : [student.className].filter(Boolean);

          return classList.includes(selectedClass);
        }).length
      : dirtyIds.length;

    const classSettingsCount = getDirtyClassSettingsNamesForScope(scope).length;
    const classesCount = isClassesDirty ? 1 : 0;

    return studentDirtyCount + classSettingsCount + classesCount;
  };

  const saveDirtyStudentsToFirebase = async (scope = 'all') => {
    if (!user || !isDataLoaded) {
      setManualSaveStatus('error');
      setManualSaveMessage('저장 준비가 완료되지 않았습니다.');
      return;
    }

    const dirtyIds = Array.from(dirtyStudentIds);

    const targetStudents = students.filter(student => {
      if (!dirtyIds.includes(student.id)) return false;

      if (scope === 'class' && selectedClass) {
        const classList = Array.isArray(student.classNames)
          ? student.classNames
          : [student.className].filter(Boolean);

        return classList.includes(selectedClass);
      }

      return true;
    });

    const targetClassSettingNames = getDirtyClassSettingsNamesForScope(scope);
    const shouldSaveClasses = isClassesDirty;

    if (targetStudents.length === 0 && targetClassSettingNames.length === 0 && !shouldSaveClasses) {
      setManualSaveStatus('saved');
      setManualSaveMessage('저장할 변경사항이 없습니다.');
      return;
    }

    setManualSaveStatus('saving');
    setManualSaveMessage('저장중...');

    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'years', `year_${academicYear}`);
      const studentsColRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'years', `year_${academicYear}`, 'students');
      const classSettingsColRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'years', `year_${academicYear}`, 'classSettings');

      const batch = writeBatch(db);
      let writeCount = 0;
      const actuallySavedStudents = [];
      const skippedUnchangedStudents = [];

      // ✅ classes가 실제로 변경된 경우에만 메인 문서 저장
      if (shouldSaveClasses) {
        batch.set(docRef, {
          classes,
          lastManualSavedAt: Date.now(),
          updatedBy: user.uid,
          storageMode: 'subcollection',
          manualSaveMode: 'dirty-students'
        }, { merge: true });

        writeCount += 1;
      }

      // ✅ 학생 데이터는 dirty라도 실제 저장 스냅샷과 값이 다를 때만 저장
      targetStudents.forEach(student => {
        const payload = buildDirtyStudentPayload(student);

        if (!payload || Object.keys(payload).length === 0 || !hasDirtyPayloadChanged(student, payload)) {
          skippedUnchangedStudents.push(student);
          return;
        }

        const studentRef = doc(studentsColRef, student.id);
        batch.set(studentRef, payload, { merge: true });

        actuallySavedStudents.push(student);
        writeCount += 1;
      });

      // ✅ 반별 설정 저장
      targetClassSettingNames.forEach(targetClassName => {
        const classSettingRef = doc(classSettingsColRef, targetClassName);
        const classSettingsPayload = getClassSettingsPayloadFromLocalStorage(targetClassName);

        batch.set(classSettingRef, classSettingsPayload, { merge: true });
        writeCount += 1;
      });

      if (writeCount === 0) {
        // dirty는 있었지만 실제 값 변경이 없는 경우 정리
        setDirtyStudentIds(prev => {
          const next = new Set(prev);
          targetStudents.forEach(student => next.delete(student.id));
          return next;
        });

        setDirtyFieldsByStudent(prev => {
          const next = { ...prev };
          targetStudents.forEach(student => {
            delete next[student.id];
          });
          return next;
        });

        setManualSaveStatus('saved');
        setManualSaveMessage('실제 변경된 저장 항목이 없습니다.');
        return;
      }

      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('저장 요청 시간이 초과되었습니다. 네트워크 또는 Firebase 응답을 확인해주세요.'));
          }, 15000);
        })
      ]);

      setDirtyStudentIds(prev => {
        const next = new Set(prev);
        [...actuallySavedStudents, ...skippedUnchangedStudents].forEach(student => next.delete(student.id));
        return next;
      });

      setDirtyFieldsByStudent(prev => {
        const next = { ...prev };
        [...actuallySavedStudents, ...skippedUnchangedStudents].forEach(student => {
          delete next[student.id];
        });
        return next;
      });

      actuallySavedStudents.forEach(student => {
        savedStudentsSnapshotRef.current[student.id] = JSON.parse(JSON.stringify(student));
      });

      if (shouldSaveClasses) {
        setIsClassesDirty(false);
      }

      if (targetClassSettingNames.length > 0) {
        setDirtyClassSettings(prev => {
          const next = { ...prev };
          targetClassSettingNames.forEach(className => {
            delete next[className];
          });
          return next;
        });
      }

      const savedAt = new Date();
      setLastManualSavedAt(savedAt);
      setManualSaveStatus('saved');
      setManualSaveMessage(`저장완료 ${savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      console.error('변경사항 수동 저장 실패:', error);

      setManualSaveStatus('error');

      if (error?.code === 'resource-exhausted' || String(error?.message || '').includes('Quota exceeded')) {
        setManualSaveMessage('저장실패: Firebase 사용량 초과');
      } else if (String(error?.message || '').includes('초과')) {
        setManualSaveMessage('저장실패: 응답 지연, 다시 시도');
      } else {
        setManualSaveMessage('저장실패, 다시 시도');
      }
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const hasDirtyClassSettings = Object.keys(dirtyClassSettings || {}).length > 0;

      if (dirtyStudentIds.size === 0 && !isClassesDirty && !hasDirtyClassSettings) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyStudentIds, isClassesDirty, dirtyClassSettings]);

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
        if (parsed.students) {
          const normalized = parsed.students.map(s => ({...s, classNames: s.classNames || [s.className || '미배정']}));
          setStudents(normalized);
        }
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
      setClasses([...classes, newClassName.trim().toUpperCase()]);
      setNewClassName('');
      markClassesDirty();
    }
  };

  const handleEditClass = (e, oldName) => {
    e.stopPropagation();

    const newName = prompt('새로운 반 이름을 입력하세요:', oldName);

    if(newName && newName.trim() && newName.trim() !== oldName) {
      const nextClassName = newName.trim().toUpperCase();

      if(classes.includes(nextClassName)) {
        alert('이미 존재하는 반 이름입니다.');
        return;
      }

      setClasses(prev => prev.map(c => c === oldName ? nextClassName : c));

      setStudents(prev => prev.map(s => {
        const cNames = s.classNames || [s.className];

        if (cNames.includes(oldName)) {
          const newClassNames = cNames.map(c => c === oldName ? nextClassName : c);

          markStudentDirty(s.id, 'studentInfo');

          return {
            ...s,
            className: newClassNames[0],
            classNames: newClassNames
          };
        }

        return s;
      }));

      markClassesDirty();
    }
  };

  const handleDeleteClass = (e, clsName) => {
    e.stopPropagation();

    const studentsInClass = students.filter(s => (s.classNames || [s.className]).includes(clsName));

    if (studentsInClass.length > 0) {
      if (
        !window.confirm(
          `[${clsName}] 반에 ${studentsInClass.length}명의 학생이 있습니다.

반을 삭제하면 해당 학생들의 소속에서 이 반만 제거됩니다.
모든 반에서 제외된 학생은 '미배정' 처리됩니다.

계속하시겠습니까?`
        )
      ) return;

      setStudents(prev => prev.map(s => {
        let cNames = s.classNames || [s.className];

        if (cNames.includes(clsName)) {
          cNames = cNames.filter(c => c !== clsName);
          if (cNames.length === 0) cNames = ['미배정'];

          markStudentDirty(s.id, 'studentInfo');

          return {
            ...s,
            className: cNames[0],
            classNames: cNames
          };
        }

        return s;
      }));
    } else {
      if (!window.confirm(`[${clsName}] 반을 삭제하시겠습니까?`)) return;
    }

    setClasses(prev => prev.filter(c => c !== clsName));
    markClassesDirty();

    if (selectedClass === clsName) {
      setSelectedClass(null);
    }
  };

  const handleMoveClass = (e, index, direction) => {
    e.stopPropagation();

    if((direction === -1 && index === 0) || (direction === 1 && index === classes.length - 1)) return;

    const newClasses = [...classes];
    const temp = newClasses[index];

    newClasses[index] = newClasses[index + direction];
    newClasses[index + direction] = temp;

    setClasses(newClasses);
    markClassesDirty();
  };

  const homeMonth = `${new Date().getMonth() + 1}월`;
  const [homeSelectedMonth, setHomeSelectedMonth] = useState(homeMonth);
  const [homeActiveTab, setHomeActiveTab] = useState('home');
  const [homeListModal, setHomeListModal] = useState({
    open: false,
    title: '',
    items: []
  });

  const getHomeClassSavedSettings = (clsName) => {
    if (!clsName || clsName === '대구캠퍼스 전체') return null;

    try {
      const saved = localStorage.getItem(`academyClassSettings_${academicYear}_${clsName}`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  };

  const getHomeAttendanceExcludedDays = (clsName, month = homeSelectedMonth) => {
    return getHomeClassSavedSettings(clsName)?.attendanceSettings?.[month]?.excludedDays || [];
  };

  const getHomeDailyExcludedDays = (clsName, month = homeSelectedMonth) => {
    return getHomeClassSavedSettings(clsName)?.dailySettings?.[month]?.excludedDays || [];
  };

  const getHomeMonthDayLimit = (month = homeSelectedMonth) => {
    const currentMonth = `${new Date().getMonth() + 1}월`;

    if (month === currentMonth) {
      return Math.max(1, Math.min(31, new Date().getDate()));
    }

    return 31;
  };

  const homeTodayIndex = Math.max(0, Math.min(30, getHomeMonthDayLimit(homeSelectedMonth) - 1));
  const homeCurrentWeek = Math.max(1, Math.min(5, Math.ceil(getHomeMonthDayLimit(homeSelectedMonth) / 7)));

  const classStats = useMemo(() => {
    const stats = { '대구캠퍼스 전체': students.length };
    classes.forEach(cls => stats[cls] = 0);
    students.forEach(s => {
      const cNames = Array.isArray(s.classNames) ? s.classNames : [s.className].filter(Boolean);
      cNames.forEach(cName => {
        if (stats[cName] !== undefined) stats[cName]++;
      });
    });
    return stats;
  }, [students, classes]);

  const getHomeClassStudents = (clsName) => {
    if (clsName === '대구캠퍼스 전체') return students;

    return students.filter(s => {
      const classList = Array.isArray(s.classNames)
        ? s.classNames
        : [s.className].filter(Boolean);

      return classList.includes(clsName);
    });
  };

  const getHomeStudentPrimaryClassName = (student) => {
    const classList = Array.isArray(student.classNames)
      ? student.classNames
      : [student.className].filter(Boolean);

    return classList.find(clsName => classes.includes(clsName)) || classList[0] || '';
  };

  const getHomeStudentClassNames = (student) => {
    return Array.isArray(student.classNames)
      ? student.classNames.filter(Boolean)
      : [student.className].filter(Boolean);
  };

  const getHomeAttendanceExcludedDaysForStudent = (student, month = homeSelectedMonth) => {
    const clsName = getHomeStudentPrimaryClassName(student);
    return clsName ? getHomeAttendanceExcludedDays(clsName, month) : [];
  };

  const getHomeDailyExcludedDaysForStudent = (student, month = homeSelectedMonth) => {
    const clsName = getHomeStudentPrimaryClassName(student);
    return clsName ? getHomeDailyExcludedDays(clsName, month) : [];
  };

  const getHomeUnifiedAttendanceArray = (monthData = {}) => {
    const am = monthData.am || Array(31).fill('');
    const pm = monthData.pm || Array(31).fill('');

    return Array.from({ length: 31 }, (_, i) => am[i] || pm[i] || '');
  };

  const getHomeAttendanceRateForStudent = (student, month = homeSelectedMonth) => {
    const monthData = student.attendance?.[month] || {};
    const attendanceArray = getHomeUnifiedAttendanceArray(monthData);
    const dayLimit = getHomeMonthDayLimit(month);
    const excluded = getHomeAttendanceExcludedDaysForStudent(student, month);

    let denominator = 0;
    let presentCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;

      const value = attendanceArray?.[dayIndex];
      const type = getAttendanceValueType(value);

      if (type === 'neutral') continue;

      denominator += 1;
      if (type === 'present') presentCount += 1;
    }

    return denominator === 0 ? 0 : Math.round((presentCount / denominator) * 100);
  };

  const getHomeDailyRateForStudent = (student, month = homeSelectedMonth) => {
    const dailyArray = student.dailyRecords?.[month] || [];
    const dayLimit = getHomeMonthDayLimit(month);
    const excluded = getHomeDailyExcludedDaysForStudent(student, month);

    let denominator = 0;
    let participatedCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;

      denominator += 1;
      const day = dailyArray[dayIndex] || {};
      const t1 = String(day?.t1 ?? '').trim();
      const t2 = String(day?.t2 ?? '').trim();
      const math = String(day?.math ?? '').trim();
      if (t1 !== '' || t2 !== '' || math !== '') participatedCount += 1;
    }

    return denominator === 0 ? 0 : Math.round((participatedCount / denominator) * 100);
  };

  const hasHomeDailyMissingUntilToday = (student, month = homeSelectedMonth) => {
    const dailyArray = student.dailyRecords?.[month] || [];
    const dayLimit = getHomeMonthDayLimit(month);
    const excluded = getHomeDailyExcludedDaysForStudent(student, month);

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;

      const day = dailyArray[dayIndex] || {};
      const t1 = String(day?.t1 ?? '').trim();
      const t2 = String(day?.t2 ?? '').trim();
      const math = String(day?.math ?? '').trim();

      if (t1 === '' && t2 === '' && math === '') {
        return true;
      }
    }

    return false;
  };

  const getHomeWeeklyScoreValuesForStudent = (student, month = homeSelectedMonth) => {
    const englishEntries = Object.entries(student.scores?.weeklyEnglish || {});
    const mathEntries = Object.entries(student.scores?.weeklyMath || {});
    const monthPrefix = `${month}_w`;

    const values = [...englishEntries, ...mathEntries]
      .filter(([key]) => String(key).startsWith(monthPrefix) || String(key) === `w${homeCurrentWeek}`)
      .map(([, value]) => Number(value))
      .filter(value => Number.isFinite(value));

    return values;
  };

  const getHomeWeeklyAverageForStudent = (student, month = homeSelectedMonth) => {
    const values = getHomeWeeklyScoreValuesForStudent(student, month);
    if (!values.length) return null;

    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  };

  const getHomeWeeklyMissingForStudent = (student, month = homeSelectedMonth) => {
    const weeklyKey = `${month}_w${homeCurrentWeek}`;
    const eng = student.scores?.weeklyEnglish?.[weeklyKey] ?? student.scores?.weeklyEnglish?.[`w${homeCurrentWeek}`];
    const math = student.scores?.weeklyMath?.[weeklyKey] ?? student.scores?.weeklyMath?.[`w${homeCurrentWeek}`];

    return String(eng ?? '').trim() === '' && String(math ?? '').trim() === '';
  };

  const getHomeWeeklyParticipationRate = (week = homeCurrentWeek, month = homeSelectedMonth) => {
    if (!students.length) return 0;

    const weeklyKey = `${month}_w${week}`;
    const participated = students.filter(student => {
      const eng = student.scores?.weeklyEnglish?.[weeklyKey] ?? student.scores?.weeklyEnglish?.[`w${week}`];
      const math = student.scores?.weeklyMath?.[weeklyKey] ?? student.scores?.weeklyMath?.[`w${week}`];
      return String(eng ?? '').trim() !== '' || String(math ?? '').trim() !== '';
    }).length;

    return Math.round((participated / students.length) * 100);
  };

  const getHomeMonthlyScoreForStudent = (student, month = homeSelectedMonth) => {
    const monthly = student.scores?.monthly?.[month] || {};
    const english = Number(monthly.english?.score);
    const math = Number(monthly.math?.score);
    const total = Number(monthly.total?.score);
    const track = String(student.targetTrack || '');

    if (Number.isFinite(total)) return total;

    if (track.includes('자연')) {
      if (Number.isFinite(english) && Number.isFinite(math)) return Math.round(((english + math) / 2) * 10) / 10;
      if (Number.isFinite(math)) return math;
      if (Number.isFinite(english)) return english;
      return null;
    }

    if (Number.isFinite(english)) return english;
    if (Number.isFinite(total)) return total;
    if (Number.isFinite(math)) return math;

    return null;
  };

  const getHomeMonthlyParticipationRate = (month = homeSelectedMonth) => {
    if (!students.length) return 0;

    const participated = students.filter(student => getHomeMonthlyScoreForStudent(student, month) !== null).length;
    return Math.round((participated / students.length) * 100);
  };

  const getHomeMonthlyMissingStudents = (month = homeSelectedMonth) => {
    return students.filter(student => getHomeMonthlyScoreForStudent(student, month) === null);
  };

  const getHomeMonthlyScoreOverview = (month = homeSelectedMonth) => {
    const scoredStudents = students
      .map(student => ({ student, score: getHomeMonthlyScoreForStudent(student, month) }))
      .filter(item => item.score !== null);

    const average = scoredStudents.length
      ? Math.round((scoredStudents.reduce((sum, item) => sum + item.score, 0) / scoredStudents.length) * 10) / 10
      : 0;

    const belowAverageStudents = scoredStudents
      .filter(item => item.score < average)
      .map(item => item.student);

    const classAverages = classes.map(clsName => {
      const classScored = getHomeClassStudents(clsName)
        .map(student => getHomeMonthlyScoreForStudent(student, month))
        .filter(score => score !== null);

      const avg = classScored.length
        ? Math.round((classScored.reduce((sum, score) => sum + score, 0) / classScored.length) * 10) / 10
        : null;

      return { clsName, avg };
    }).filter(item => item.avg !== null);

    const bestClass = [...classAverages].sort((a, b) => b.avg - a.avg)[0] || null;
    const worstClassByScore = [...classAverages].sort((a, b) => a.avg - b.avg)[0] || null;

    return { average, belowAverageStudents, bestClass, worstClassByScore };
  };

  const getHomeStudyWeekMins = (student, month = homeSelectedMonth) => {
    const daily = student.studyTime?.[month] || [];
    const start = (homeCurrentWeek - 1) * 7;
    const end = Math.min(start + 7, daily.length);

    return daily.slice(start, end).reduce((sum, d) => {
      return sum + parseTimeDiffToMins(d?.in, d?.out);
    }, 0);
  };

  const getAverageRate = (values) => {
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, v) => sum + Number(v || 0), 0) / values.length);
  };

  const getHomeClassAttendanceRate = (clsName) => {
    const targetStudents = getHomeClassStudents(clsName);
    if (targetStudents.length === 0) return 0;

    const dayLimit = getHomeMonthDayLimit(homeSelectedMonth);
    let denominator = 0;
    let presentTotal = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      targetStudents.forEach(student => {
        const excluded = clsName === '대구캠퍼스 전체'
          ? getHomeAttendanceExcludedDaysForStudent(student, homeSelectedMonth)
          : getHomeAttendanceExcludedDays(clsName, homeSelectedMonth);

        if (excluded.includes(dayIndex)) return;

        const monthData = student.attendance?.[homeSelectedMonth] || {};
        const attendanceArray = getHomeUnifiedAttendanceArray(monthData);
        const value = attendanceArray?.[dayIndex];
        const type = getAttendanceValueType(value);

        if (type === 'neutral') return;

        denominator += 1;
        if (type === 'present') presentTotal += 1;
      });
    }

    return denominator === 0 ? 0 : Math.round((presentTotal / denominator) * 100);
  };

  const getHomeClassAttendanceRateUntilDay = (clsName, month = homeSelectedMonth, dayLimitOverride = getHomeMonthDayLimit(month)) => {
    const targetStudents = getHomeClassStudents(clsName);
    if (!targetStudents.length) return 0;

    const dayLimit = Math.max(1, Math.min(31, dayLimitOverride));
    let denominator = 0;
    let presentTotal = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      targetStudents.forEach(student => {
        const excluded = clsName === '대구캠퍼스 전체'
          ? getHomeAttendanceExcludedDaysForStudent(student, month)
          : getHomeAttendanceExcludedDays(clsName, month);

        if (excluded.includes(dayIndex)) return;

        const monthData = student.attendance?.[month] || {};
        const attendanceArray = getHomeUnifiedAttendanceArray(monthData);
        const value = attendanceArray?.[dayIndex];
        const type = getAttendanceValueType(value);

        if (type === 'neutral') return;

        denominator += 1;
        if (type === 'present') presentTotal += 1;
      });
    }

    return denominator === 0 ? 0 : Math.round((presentTotal / denominator) * 100);
  };

  const getHomeClassDailyRate = (clsName) => {
    const targetStudents = getHomeClassStudents(clsName);
    if (targetStudents.length === 0) return 0;

    const dayLimit = getHomeMonthDayLimit(homeSelectedMonth);
    let denominator = 0;
    let participatedCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      targetStudents.forEach(student => {
        const excluded = clsName === '대구캠퍼스 전체'
          ? getHomeDailyExcludedDaysForStudent(student, homeSelectedMonth)
          : getHomeDailyExcludedDays(clsName, homeSelectedMonth);

        if (excluded.includes(dayIndex)) return;

        denominator += 1;
        const dailyArray = student.dailyRecords?.[homeSelectedMonth] || [];
        const day = dailyArray[dayIndex] || {};
        const t1 = String(day?.t1 ?? '').trim();
        const t2 = String(day?.t2 ?? '').trim();
        const math = String(day?.math ?? '').trim();
        if (t1 !== '' || t2 !== '' || math !== '') participatedCount += 1;
      });
    }

    return denominator === 0 ? 0 : Math.round((participatedCount / denominator) * 100);
  };

  const getHomeClassDailyRateUntilDay = (clsName, month = homeSelectedMonth, dayLimitOverride = getHomeMonthDayLimit(month)) => {
    const targetStudents = getHomeClassStudents(clsName);
    if (!targetStudents.length) return 0;

    const dayLimit = Math.max(1, Math.min(31, dayLimitOverride));
    let denominator = 0;
    let participatedCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      targetStudents.forEach(student => {
        const excluded = clsName === '대구캠퍼스 전체'
          ? getHomeDailyExcludedDaysForStudent(student, month)
          : getHomeDailyExcludedDays(clsName, month);

        if (excluded.includes(dayIndex)) return;

        denominator += 1;
        const dailyArray = student.dailyRecords?.[month] || [];
        const day = dailyArray[dayIndex] || {};
        const t1 = String(day?.t1 ?? '').trim();
        const t2 = String(day?.t2 ?? '').trim();
        const math = String(day?.math ?? '').trim();
        if (t1 !== '' || t2 !== '' || math !== '') participatedCount += 1;
      });
    }

    return denominator === 0 ? 0 : Math.round((participatedCount / denominator) * 100);
  };

  const getHomeClassNeedCount = (clsName) => {
    const targetStudents = getHomeClassStudents(clsName);

    return targetStudents.filter(student => {
      const attendanceRate = getHomeAttendanceRateForStudent(student, homeSelectedMonth);
      const dailyRate = getHomeDailyRateForStudent(student, homeSelectedMonth);
      const weeklyAverage = getHomeWeeklyAverageForStudent(student, homeSelectedMonth);
      return attendanceRate <= 70 || dailyRate <= 70 || (weeklyAverage !== null && weeklyAverage <= 50);
    }).length;
  };

  const getRateTextClass = (rate) => {
    const value = Number(rate || 0);
    if (value >= 90) return 'text-emerald-600';
    if (value <= 70) return 'text-rose-600';
    return 'text-blue-600';
  };

  const getNeedTextClass = (count) => {
    const value = Number(count || 0);
    if (value >= 5) return 'text-rose-600';
    return 'text-slate-900';
  };

  const getHomeStudentLabel = (student) => {
    const classNames = Array.isArray(student.classNames) ? student.classNames : [student.className].filter(Boolean);
    return `${student.name}${classNames?.[0] ? `(${classNames[0]})` : ''}`;
  };

  const showHomeStudentList = (title, list) => {
    const items = list.length
      ? list.map((s, i) => `${i + 1}. ${getHomeStudentLabel(s)}`)
      : ['해당 학생이 없습니다.'];

    setHomeListModal({
      open: true,
      title,
      items
    });
  };

  const showHomeRecordList = (title, list) => {
    const items = list.length
      ? list.map((item, i) => `${i + 1}. ${item.text}`)
      : ['해당 내역이 없습니다.'];

    setHomeListModal({
      open: true,
      title,
      items
    });
  };

  const showHomeTextList = (title, items = []) => {
    setHomeListModal({
      open: true,
      title,
      items: items.length ? items : ['표시할 내용이 없습니다.']
    });
  };

  const homeDailyMissingStudents = students.filter(s => hasHomeDailyMissingUntilToday(s, homeSelectedMonth));

  const homeWeeklyMissingStudents = students.filter(s => getHomeWeeklyMissingForStudent(s, homeSelectedMonth));

  const homeMonthlyMissingStudents = getHomeMonthlyMissingStudents(homeSelectedMonth);

  const homeLowAttendanceStudents = students.filter(s => {
    return getHomeAttendanceRateForStudent(s, homeSelectedMonth) < 80;
  });

  const homeLowStudyTimeStudents = students.filter(s => {
    const weekMins = getHomeStudyWeekMins(s, homeSelectedMonth);
    return weekMins > 0 && weekMins < 600;
  });

  const homeCounselingNeededStudents = students.filter(student => {
    const attendanceRate = getHomeAttendanceRateForStudent(student, homeSelectedMonth);
    const dailyRate = getHomeDailyRateForStudent(student, homeSelectedMonth);
    const weeklyAverage = getHomeWeeklyAverageForStudent(student, homeSelectedMonth);

    return attendanceRate <= 50 || dailyRate <= 50 || (weeklyAverage !== null && weeklyAverage <= 30);
  });

  const homeNeedStudents = students.filter(student => {
    const attendanceRate = getHomeAttendanceRateForStudent(student, homeSelectedMonth);
    const dailyRate = getHomeDailyRateForStudent(student, homeSelectedMonth);
    const weeklyAverage = getHomeWeeklyAverageForStudent(student, homeSelectedMonth);

    return attendanceRate <= 70 || dailyRate <= 70 || (weeklyAverage !== null && weeklyAverage <= 50);
  });

  const homeRecentNewStudents = students.filter(student => {
    const registeredAt = student.createdAt || student.registeredAt || student.enrolledAt;
    if (registeredAt) {
      const createdDate = new Date(registeredAt);
      if (!Number.isNaN(createdDate.getTime())) {
        const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }
    }

    return student.startMonth === homeSelectedMonth;
  });

  const getHomeAttendanceRecordsByStatuses = (statuses = [], month = homeSelectedMonth) => {
    const statusSet = new Set(statuses);
    const dayLimit = getHomeMonthDayLimit(month);
    const records = [];

    students.forEach(student => {
      const excluded = getHomeAttendanceExcludedDaysForStudent(student, month);
      const monthData = student.attendance?.[month] || {};
      const attendanceArray = getHomeUnifiedAttendanceArray(monthData);

      for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
        if (excluded.includes(dayIndex)) continue;

        const status = String(attendanceArray?.[dayIndex] ?? '').trim();
        if (!statusSet.has(status)) continue;

        records.push({
          student,
          status,
          dayIndex,
          text: `${student.name} (${getHomeStudentPrimaryClassName(student) || '미배정'}) - ${month} ${dayIndex + 1}일 ${status}`
        });
      }
    });

    return records;
  };

  const getHomeConsecutiveAbsenceStudents = (minDays = 3, month = homeSelectedMonth) => {
    const dayLimit = getHomeMonthDayLimit(month);

    return students.filter(student => {
      const excluded = getHomeAttendanceExcludedDaysForStudent(student, month);
      const monthData = student.attendance?.[month] || {};
      const attendanceArray = getHomeUnifiedAttendanceArray(monthData);
      let streak = 0;

      for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
        if (excluded.includes(dayIndex)) continue;

        const status = String(attendanceArray?.[dayIndex] ?? '').trim();

        if (status === '결석') {
          streak += 1;
          if (streak >= minDays) return true;
        } else if (status === '출석' || status === 'Live') {
          streak = 0;
        }
      }

      return false;
    });
  };

  const getHomeLongNoShowStudents = (minDays = 7, month = homeSelectedMonth) => {
    const dayLimit = getHomeMonthDayLimit(month);

    return students.filter(student => {
      const excluded = getHomeAttendanceExcludedDaysForStudent(student, month);
      const monthData = student.attendance?.[month] || {};
      const attendanceArray = getHomeUnifiedAttendanceArray(monthData);
      let validDays = 0;
      let daysSinceLastPresent = 0;
      let hasPresent = false;

      for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
        if (excluded.includes(dayIndex)) continue;

        validDays += 1;
        const type = getAttendanceValueType(attendanceArray?.[dayIndex]);

        if (type === 'present') {
          hasPresent = true;
          daysSinceLastPresent = 0;
        } else if (type !== 'neutral') {
          daysSinceLastPresent += 1;
        }
      }

      return validDays >= minDays && (!hasPresent || daysSinceLastPresent >= minDays);
    });
  };

  const homeLateRecords = getHomeAttendanceRecordsByStatuses(['지각'], homeSelectedMonth);
  const homeAbsentRecords = getHomeAttendanceRecordsByStatuses(['결석'], homeSelectedMonth);
  const homeEarlyLeaveRecords = getHomeAttendanceRecordsByStatuses(['조퇴'], homeSelectedMonth);
  const homeConsecutiveAbsenceStudents = getHomeConsecutiveAbsenceStudents(3, homeSelectedMonth);
  const homeLongNoShowStudents = getHomeLongNoShowStudents(7, homeSelectedMonth);

  const homeGraphColors = ['#16a34a', '#2563eb', '#06b6d4', '#7c3aed', '#22c55e', '#f43f5e', '#f97316', '#0ea5e9'];
  const getHomeGraphColor = (index) => homeGraphColors[index % homeGraphColors.length];

  const getHomeClassDailyAttendanceTrend = (clsName, month = homeSelectedMonth) => {
    const targetStudents = getHomeClassStudents(clsName);
    const dayLimit = getHomeMonthDayLimit(month);
    const trend = [];

    if (targetStudents.length === 0) return [0];

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      let denominator = 0;
      let presentCount = 0;

      targetStudents.forEach(student => {
        const excluded = clsName === '대구캠퍼스 전체'
          ? getHomeAttendanceExcludedDaysForStudent(student, month)
          : getHomeAttendanceExcludedDays(clsName, month);

        if (excluded.includes(dayIndex)) return;

        const monthData = student.attendance?.[month] || {};
        const attendanceArray = getHomeUnifiedAttendanceArray(monthData);
        const value = attendanceArray?.[dayIndex];
        const type = getAttendanceValueType(value);

        if (type === 'neutral') return;

        denominator += 1;
        if (type === 'present') presentCount += 1;
      });

      if (denominator > 0) trend.push(Math.round((presentCount / denominator) * 100));
    }

    return trend.length ? trend : [0];
  };
  const getHomeSparkPointsFromTrend = (trend = []) => {
    const values = trend.length ? trend : [0];

    if (values.every(v => Number(v || 0) <= 0)) {
      return Array.from({ length: 12 }, (_, i) => {
        const x = 6 + i * 12;
        const y = 40;
        return `${x},${y}`;
      }).join(' ');
    }

    const maxPoints = 12;
    const sampled = Array.from({ length: maxPoints }, (_, i) => {
      const sourceIndex = Math.round((i / (maxPoints - 1)) * (values.length - 1));
      return Number(values[sourceIndex] || 0);
    });

    return sampled.map((v, i) => {
      const x = 6 + i * 12;
      const y = 44 - (Math.max(0, Math.min(100, v)) / 100) * 34;
      return `${x},${y}`;
    }).join(' ');
  };

  const getWorstAttendanceClass = () => {
    if (!classes.length) return null;

    return classes
      .map(clsName => ({
        clsName,
        rate: getHomeClassAttendanceRate(clsName),
        need: getHomeClassNeedCount(clsName)
      }))
      .sort((a, b) => a.rate - b.rate)[0];
  };

  const worstClass = getWorstAttendanceClass();

  const getHomeStartOfWeek = (baseDate = new Date()) => {
    const date = new Date(baseDate);
    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    return monday;
  };

  const getHomeWeekPeriods = (baseDate = new Date()) => {
    const thisWeekMonday = getHomeStartOfWeek(baseDate);

    const lastWeekStart = new Date(thisWeekMonday);
    lastWeekStart.setDate(thisWeekMonday.getDate() - 7);

    const lastWeekEnd = new Date(thisWeekMonday);
    lastWeekEnd.setDate(thisWeekMonday.getDate() - 1);

    const twoWeeksAgoStart = new Date(thisWeekMonday);
    twoWeeksAgoStart.setDate(thisWeekMonday.getDate() - 14);

    const twoWeeksAgoEnd = new Date(thisWeekMonday);
    twoWeeksAgoEnd.setDate(thisWeekMonday.getDate() - 8);

    return {
      lastWeek: { start: lastWeekStart, end: lastWeekEnd },
      twoWeeksAgo: { start: twoWeeksAgoStart, end: twoWeeksAgoEnd }
    };
  };

  const formatHomeShortDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

  const formatHomePeriodText = (period) => {
    if (!period?.start || !period?.end) return '-';
    return `${formatHomeShortDate(period.start)} ~ ${formatHomeShortDate(period.end)}`;
  };

  const getHomeMonthLabelFromDate = (date) => `${date.getMonth() + 1}월`;

  const getHomeDatesInPeriod = (period) => {
    if (!period?.start || !period?.end) return [];

    const dates = [];
    const cursor = new Date(period.start);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(period.end);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  };

  const roundHomeValue = (value, digit = 1) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
    const multiplier = Math.pow(10, digit);
    return Math.round(Number(value) * multiplier) / multiplier;
  };

  const formatHomeMetricValue = (value, unit = '') => {
    const rounded = roundHomeValue(value, 1);
    if (rounded === null) return '-';

    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${text}${unit}`;
  };

  const getAverageNullable = (values = []) => {
    const validValues = values
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));

    if (!validValues.length) return null;

    return roundHomeValue(
      validValues.reduce((sum, value) => sum + value, 0) / validValues.length,
      1
    );
  };

  const getHomeAttendanceRateForStudentPeriod = (student, period) => {
    let denominator = 0;
    let presentCount = 0;

    getHomeDatesInPeriod(period).forEach(date => {
      const month = getHomeMonthLabelFromDate(date);
      const dayIndex = date.getDate() - 1;
      const excluded = getHomeAttendanceExcludedDaysForStudent(student, month);

      if (excluded.includes(dayIndex)) return;

      const monthData = student.attendance?.[month] || {};
      const attendanceArray = getHomeUnifiedAttendanceArray(monthData);
      const type = getAttendanceValueType(attendanceArray?.[dayIndex]);

      if (type === 'neutral') return;

      denominator += 1;
      if (type === 'present') presentCount += 1;
    });

    return denominator === 0 ? null : roundHomeValue((presentCount / denominator) * 100, 1);
  };

  const getHomeDailyRateForStudentPeriod = (student, period) => {
    let denominator = 0;
    let participatedCount = 0;

    getHomeDatesInPeriod(period).forEach(date => {
      const month = getHomeMonthLabelFromDate(date);
      const dayIndex = date.getDate() - 1;
      const excluded = getHomeDailyExcludedDaysForStudent(student, month);

      if (excluded.includes(dayIndex)) return;

      denominator += 1;

      const dailyArray = student.dailyRecords?.[month] || [];
      const day = dailyArray[dayIndex] || {};
      const t1 = String(day?.t1 ?? '').trim();
      const t2 = String(day?.t2 ?? '').trim();
      const math = String(day?.math ?? '').trim();

      if (t1 !== '' || t2 !== '' || math !== '') participatedCount += 1;
    });

    return denominator === 0 ? null : roundHomeValue((participatedCount / denominator) * 100, 1);
  };

  const getHomeStudyHoursForStudentPeriod = (student, period) => {
    let totalMins = 0;
    let hasStudyRecord = false;

    getHomeDatesInPeriod(period).forEach(date => {
      const month = getHomeMonthLabelFromDate(date);
      const dayIndex = date.getDate() - 1;
      const studyArray = student.studyTime?.[month] || [];
      const day = studyArray[dayIndex] || {};
      const diff = parseTimeDiffToMins(day?.in, day?.out);

      if (diff > 0) {
        hasStudyRecord = true;
        totalMins += diff;
      }
    });

    if (!hasStudyRecord) return null;

    return roundHomeValue(totalMins / 60, 1);
  };

  const getHomeWeeklyAverageForStudentPeriod = (student, period) => {
    if (!period?.start || !period?.end) return null;

    const start = new Date(period.start);
    start.setHours(0, 0, 0, 0);

    const end = new Date(period.end);
    end.setHours(23, 59, 59, 999);

    const values = Object.values(student.scores?.weeklyMeta || {})
      .filter(meta => {
        if (!meta?.testDate) return false;

        const testDate = new Date(`${meta.testDate}T00:00:00`);
        if (Number.isNaN(testDate.getTime())) return false;

        return testDate >= start && testDate <= end;
      })
      .map(meta => Number(meta.score))
      .filter(value => Number.isFinite(value));

    if (!values.length) return null;

    return roundHomeValue(values.reduce((sum, value) => sum + value, 0) / values.length, 1);
  };

  const getHomeCampusPeriodStats = (period) => {
    return {
      attendanceRate: getAverageNullable(students.map(student => getHomeAttendanceRateForStudentPeriod(student, period))),
      dailyRate: getAverageNullable(students.map(student => getHomeDailyRateForStudentPeriod(student, period))),
      weeklyAverage: getAverageNullable(students.map(student => getHomeWeeklyAverageForStudentPeriod(student, period))),
      studyHoursAverage: getAverageNullable(students.map(student => getHomeStudyHoursForStudentPeriod(student, period)))
    };
  };

  const buildHomeChange = (current, previous, unit = '') => {
    if (current === null || previous === null || current === undefined || previous === undefined) {
      return {
        hasData: false,
        mark: '',
        text: '-',
        color: 'text-slate-400'
      };
    }

    const diff = roundHomeValue(Number(current) - Number(previous), 1);

    if (diff === 0) {
      return {
        hasData: true,
        mark: '-',
        text: `0${unit}`,
        color: 'text-slate-400'
      };
    }

    return {
      hasData: true,
      mark: diff > 0 ? '▲' : '▼',
      text: `${formatHomeMetricValue(Math.abs(diff), unit)}`,
      color: diff > 0 ? 'text-emerald-600' : 'text-red-500'
    };
  };

  const getHomePriorityDrop = ({ label, unit, currentGetter, previousGetter }) => {
    const candidates = students
      .map(student => {
        const currentValue = currentGetter(student);
        const previousValue = previousGetter(student);

        if (
          currentValue === null ||
          previousValue === null ||
          currentValue === undefined ||
          previousValue === undefined
        ) {
          return null;
        }

        const drop = roundHomeValue(Number(previousValue) - Number(currentValue), 1);

        if (!Number.isFinite(drop) || drop <= 0) return null;

        return {
          student,
          drop,
          className: getHomeStudentPrimaryClassName(student) || '미배정'
        };
      })
      .filter(Boolean);

    if (!candidates.length) {
      return {
        label,
        displayName: '-',
        dropText: '비교 데이터 없음',
        tooltipItems: ['비교 데이터 없음']
      };
    }

    const maxDrop = Math.max(...candidates.map(item => item.drop));

    const tiedItems = candidates
      .filter(item => item.drop === maxDrop)
      .sort((a, b) => {
        const nameCompare = String(a.student.name || '').localeCompare(String(b.student.name || ''), 'ko-KR');
        if (nameCompare !== 0) return nameCompare;
        return String(a.className || '').localeCompare(String(b.className || ''), 'ko-KR');
      });

    const representative = tiedItems[0];
    const displayName = tiedItems.length > 1
      ? `${representative.student.name}(${representative.className}) 외 ${tiedItems.length - 1}명`
      : `${representative.student.name}(${representative.className})`;

    return {
      label,
      displayName,
      dropText: `${formatHomeMetricValue(maxDrop, unit)} ↓`,
      tooltipItems: tiedItems.map(item => `${item.student.name}(${item.className})`)
    };
  };

  const homeWeekPeriods = getHomeWeekPeriods();
  const homeLastWeekPeriodText = formatHomePeriodText(homeWeekPeriods.lastWeek);
  const homeTwoWeeksAgoPeriodText = formatHomePeriodText(homeWeekPeriods.twoWeeksAgo);

  const homeLastWeekStats = getHomeCampusPeriodStats(homeWeekPeriods.lastWeek);
  const homeTwoWeeksAgoStats = getHomeCampusPeriodStats(homeWeekPeriods.twoWeeksAgo);

  const homeAnalysisMetricRows = [
    {
      key: 'attendance',
      label: '출석률',
      icon: CalendarCheck,
      value: formatHomeMetricValue(homeLastWeekStats.attendanceRate, '%'),
      previous: formatHomeMetricValue(homeTwoWeeksAgoStats.attendanceRate, '%'),
      change: buildHomeChange(homeLastWeekStats.attendanceRate, homeTwoWeeksAgoStats.attendanceRate, '%p')
    },
    {
      key: 'daily',
      label: 'Daily 참여율',
      icon: BarChart3,
      value: formatHomeMetricValue(homeLastWeekStats.dailyRate, '%'),
      previous: formatHomeMetricValue(homeTwoWeeksAgoStats.dailyRate, '%'),
      change: buildHomeChange(homeLastWeekStats.dailyRate, homeTwoWeeksAgoStats.dailyRate, '%p')
    },
    {
      key: 'weekly',
      label: 'Weekly 평균',
      icon: Trophy,
      value: formatHomeMetricValue(homeLastWeekStats.weeklyAverage, '점'),
      previous: formatHomeMetricValue(homeTwoWeeksAgoStats.weeklyAverage, '점'),
      change: buildHomeChange(homeLastWeekStats.weeklyAverage, homeTwoWeeksAgoStats.weeklyAverage, '점')
    },
    {
      key: 'study',
      label: '학습시간 평균',
      icon: Clock,
      value: formatHomeMetricValue(homeLastWeekStats.studyHoursAverage, 'h'),
      previous: formatHomeMetricValue(homeTwoWeeksAgoStats.studyHoursAverage, 'h'),
      change: buildHomeChange(homeLastWeekStats.studyHoursAverage, homeTwoWeeksAgoStats.studyHoursAverage, 'h')
    }
  ];

  const homePriorityDrops = [
    getHomePriorityDrop({
      label: '출석률',
      unit: '%',
      currentGetter: student => getHomeAttendanceRateForStudentPeriod(student, homeWeekPeriods.lastWeek),
      previousGetter: student => getHomeAttendanceRateForStudentPeriod(student, homeWeekPeriods.twoWeeksAgo)
    }),
    getHomePriorityDrop({
      label: 'Daily',
      unit: '%',
      currentGetter: student => getHomeDailyRateForStudentPeriod(student, homeWeekPeriods.lastWeek),
      previousGetter: student => getHomeDailyRateForStudentPeriod(student, homeWeekPeriods.twoWeeksAgo)
    }),
    getHomePriorityDrop({
      label: 'Weekly',
      unit: '점',
      currentGetter: student => getHomeWeeklyAverageForStudentPeriod(student, homeWeekPeriods.lastWeek),
      previousGetter: student => getHomeWeeklyAverageForStudentPeriod(student, homeWeekPeriods.twoWeeksAgo)
    }),
    getHomePriorityDrop({
      label: '학습시간',
      unit: 'h',
      currentGetter: student => getHomeStudyHoursForStudentPeriod(student, homeWeekPeriods.lastWeek),
      previousGetter: student => getHomeStudyHoursForStudentPeriod(student, homeWeekPeriods.twoWeeksAgo)
    })
  ];

  const homeDashboardStats = {
    totalStudents: classStats['대구캠퍼스 전체'],
    classCount: classes.length,
    attendanceRate: getHomeClassAttendanceRate('대구캠퍼스 전체'),
    dailyRate: getHomeClassDailyRate('대구캠퍼스 전체'),
    needCount: homeNeedStudents.length
  };

  const homeTodayText = new Date().toISOString().slice(0, 10).replaceAll('-', '.');

  const homeNotices = [
    {
      type: '공지',
      color: 'blue',
      text: `${homeSelectedMonth} 기준 전체 학생 ${homeDashboardStats.totalStudents}명 운영 중입니다.`,
      date: homeTodayText
    },
    {
      type: '일정',
      color: 'green',
      text: `${homeSelectedMonth} Daily 참여율은 ${homeDashboardStats.dailyRate}%입니다.`,
      date: homeTodayText
    },
    {
      type: worstClass && worstClass.rate < 80 ? '경고' : '공지',
      color: worstClass && worstClass.rate < 80 ? 'red' : 'blue',
      text: worstClass ? `${worstClass.clsName} 반 출석률 ${worstClass.rate}%입니다.` : '반별 출석률 데이터가 없습니다.',
      date: homeTodayText
    },
    {
      type: homeNeedStudents.length >= 5 ? '경고' : '알림',
      color: homeNeedStudents.length >= 5 ? 'red' : 'green',
      text: `관리 필요 학생이 ${homeNeedStudents.length}명입니다.`,
      date: homeTodayText
    }
  ];

  const homeManagementAlerts = [
    {
      title: 'Daily 미응시',
      desc: `${homeSelectedMonth} 1일~${homeTodayIndex + 1}일 Daily 누적 미응시 학생`,
      count: homeDailyMissingStudents.length,
      color: 'red',
      icon: AlertTriangle,
      students: homeDailyMissingStudents
    },
    {
      title: 'Weekly 미응시',
      desc: `${homeSelectedMonth} ${homeCurrentWeek}주차 Weekly를 응시하지 않은 학생`,
      count: homeWeeklyMissingStudents.length,
      color: 'orange',
      icon: Calendar,
      students: homeWeeklyMissingStudents
    },
    {
      title: '출석률 저조',
      desc: `${homeSelectedMonth} 1일~${homeTodayIndex + 1}일 기준 출석률 80% 미만 학생`,
      count: homeLowAttendanceStudents.length,
      color: 'orange',
      icon: AlertTriangle,
      students: homeLowAttendanceStudents
    },
    {
      title: '학습시간 저조',
      desc: `${homeSelectedMonth} ${homeCurrentWeek}주차 학습시간이 기준 이하인 학생`,
      count: homeLowStudyTimeStudents.length,
      color: 'purple',
      icon: Clock,
      students: homeLowStudyTimeStudents
    }
  ];

  const HOME_IMAGES = {
    top: "/image/home/top.png",
    bottom: "/image/home/bottom.png",
    middle: "/image/home/middle.png",
    tab: "/image/home/tab.png",
  };

  const homeSideMenus = [
    { key: 'home', label: '홈', icon: School },
    { key: 'students', label: '학생', icon: Users },
    { key: 'attendance', label: '출결', icon: CalendarCheck },
    { key: 'test', label: '시험', icon: FileText },
    { key: 'analysis', label: '분석', icon: BarChart3 },
    { key: 'settings', label: '설정', icon: Settings },
  ];

  if (!selectedClass) {
    return (
      <div className="min-h-screen bg-[#f4f8ff] font-sans relative overflow-hidden text-slate-900">
        {homeListModal.open && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
            <div className="w-[430px] max-w-[92vw] max-h-[74vh] rounded-2xl bg-white shadow-2xl border border-blue-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">{homeListModal.title}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">총 {homeListModal.items.length}개 항목</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHomeListModal({ open: false, title: '', items: [] })}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-black"
                >
                  ×
                </button>
              </div>

              <div className="px-5 py-4 max-h-[56vh] overflow-y-auto">
                <div className="space-y-2">
                  {homeListModal.items.map((item, index) => (
                    <div key={index} className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHomeListModal({ open: false, title: '', items: [] })}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.20),transparent_32%),linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98)_45%,rgba(219,234,254,0.42))]"></div>

        <img
          src={HOME_IMAGES.top}
          alt=""
          className="absolute top-0 left-[104px] w-[calc(100%-104px)] h-[150px] object-cover object-center opacity-90 pointer-events-none select-none"
        />
        <div className="absolute top-0 left-[104px] w-[calc(100%-104px)] h-[180px] bg-gradient-to-b from-white/0 via-white/10 to-[#f4f8ff] pointer-events-none"></div>

        <img
          src={HOME_IMAGES.bottom}
          alt=""
          className="absolute left-[104px] bottom-0 w-[calc(100%-104px)] h-[170px] object-cover object-bottom opacity-[0.18] pointer-events-none select-none z-0"
        />
        <div className="absolute left-[104px] bottom-0 w-[calc(100%-104px)] h-[190px] bg-gradient-to-t from-white/70 via-white/45 to-transparent pointer-events-none z-0"></div>

        <aside className="fixed left-0 top-0 z-30 h-screen w-[104px] bg-gradient-to-b from-blue-900 via-blue-600 to-blue-200 shadow-2xl flex flex-col items-center py-5 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%)] pointer-events-none"></div>

          <button className="relative z-10 w-14 h-14 rounded-2xl bg-blue-900/30 border border-white/10 shadow-inner flex items-center justify-center text-white mb-7">
            <School size={27} />
          </button>

          <nav className="relative z-10 flex flex-col items-center gap-4 w-full px-3 text-white/90">
            {homeSideMenus.map((menu) => {
              const Icon = menu.icon;

              return (
                <button
                  key={menu.key}
                  onClick={() => setHomeActiveTab(menu.key)}
                  className={`w-full h-[62px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors ${
                    homeActiveTab === menu.key
                      ? 'bg-white text-blue-600 shadow-xl'
                      : 'text-white/92 hover:bg-white/15'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-[12px] font-black leading-none">{menu.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto mb-4" />
        </aside>

        <main className="relative z-10 ml-[104px] px-8 py-5">
          <div className="flex items-start justify-between mb-14">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 mb-1">종합반 학생 관리 시스템</h1>
              <p className="text-sm text-slate-600 font-semibold">신상정보 연동 및 성적/출결 데이터를 통합 관리합니다.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={manualSaveStatus === 'saving' || getDirtyCountForScope('all') === 0}
                  onClick={() => saveDirtyStudentsToFirebase('all')}
                  title="공유 저장은 Firebase에 저장됩니다. 저장완료 표시 후 다른 사용자에게 반영됩니다."
                  className={`h-11 flex items-center gap-2 px-4 rounded-xl text-sm font-extrabold transition-colors shadow-[0_8px_28px_rgba(37,99,235,0.10)] ${
                    getDirtyCountForScope('all') === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : manualSaveStatus === 'error'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <CheckCircle2 size={17} />
                  전체 변경사항 저장{getDirtyCountForScope('all') > 0 ? ` (${getDirtyCountForScope('all')}건)` : ''}
                </button>

                <span
                  className={`h-9 px-3 rounded-full flex items-center text-xs font-black ${
                    manualSaveStatus === 'saving'
                      ? 'bg-blue-50 text-blue-600'
                      : manualSaveStatus === 'saved'
                        ? 'bg-emerald-50 text-emerald-600'
                        : manualSaveStatus === 'error'
                          ? 'bg-red-50 text-red-600'
                          : getDirtyCountForScope('all') > 0
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {manualSaveMessage || (getDirtyCountForScope('all') > 0 ? '변경사항 있음' : '저장 대기')}
                </span>
              </div>

              <select
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="h-11 px-5 rounded-xl bg-white/85 border border-blue-100 shadow-[0_8px_28px_rgba(37,99,235,0.10)] outline-none font-extrabold text-slate-800 cursor-pointer"
              >
                <option value="2026">2026학년도</option>
                <option value="2027">2027학년도</option>
                <option value="2028">2028학년도</option>
              </select>

              <label className="h-11 flex items-center gap-2 px-4 bg-white/85 border border-blue-100 shadow-[0_8px_28px_rgba(37,99,235,0.10)] rounded-xl text-sm font-extrabold text-slate-700 hover:bg-white cursor-pointer transition-colors">
                <UploadCloud size={17} className="text-blue-600" />
                JSON 복원
                <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </label>

              <button
                onClick={handleExportJSON}
                className="h-11 flex items-center gap-2 px-4 bg-white/85 border border-blue-100 shadow-[0_8px_28px_rgba(37,99,235,0.10)] rounded-xl text-sm font-extrabold text-slate-700 hover:bg-white transition-colors"
              >
                <DownloadCloud size={17} className="text-blue-600" />
                JSON 백업
              </button>

              <button
                onClick={() => showHomeStudentList('관리 필요 학생 명단', homeNeedStudents)}
                className="relative w-11 h-11 rounded-full bg-white shadow-[0_8px_28px_rgba(37,99,235,0.10)] flex items-center justify-center text-blue-700"
              >
                <AlertTriangle size={19} />
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center">
                  {homeNeedStudents.length}
                </span>
              </button>

              <button className="w-11 h-11 rounded-full bg-white shadow-[0_8px_28px_rgba(37,99,235,0.10)] flex items-center justify-center text-blue-700">
                <Users size={19} />
              </button>
            </div>
          </div>

          {homeActiveTab !== 'home' && (
            <section className="bg-white/82 backdrop-blur-xl rounded-2xl border border-blue-100 shadow-[0_12px_35px_rgba(37,99,235,0.08)] p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {homeSideMenus.find(menu => menu.key === homeActiveTab)?.label} 요약
                  </h2>
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    {homeSelectedMonth} 기준 전체 홈 화면 요약입니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setHomeActiveTab('home')}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
                >
                  홈으로 돌아가기
                </button>
              </div>

              {homeActiveTab === 'students' && (() => {
                const humanitiesCount = students.filter(s => String(s.targetTrack || '').includes('인문')).length;
                const naturalCount = students.filter(s => String(s.targetTrack || '').includes('자연')).length;
                const maleCount = students.filter(s => s.gender === '남').length;
                const femaleCount = students.filter(s => s.gender === '여').length;
                const totalCount = homeDashboardStats.totalStudents || 0;

                // 계열 그래프/비율은 전체 학생 수가 아니라 인문+자연 계열 합계를 기준으로 계산
                const trackTotal = humanitiesCount + naturalCount;
                const humanitiesRate = trackTotal ? Math.round((humanitiesCount / trackTotal) * 100) : 0;
                const naturalRate = trackTotal ? 100 - humanitiesRate : 0;

                const maxClassCount = Math.max(1, ...classes.map(clsName => classStats[clsName] || 0));

                const currentMonthIndex = MONTHS.indexOf(homeSelectedMonth);
                const prevMonth = MONTHS[Math.max(0, currentMonthIndex - 1)] || homeSelectedMonth;
                const currentMonthNewCount = students.filter(s => s.startMonth === homeSelectedMonth).length;
                const prevMonthNewCount = students.filter(s => s.startMonth === prevMonth).length;
                const monthDiff = currentMonthNewCount - prevMonthNewCount;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr_1fr] gap-3">
                    <div className="rounded-2xl bg-white border border-blue-100 p-5 shadow-sm h-full flex items-center">
                      <div className="w-full flex items-center gap-7">
                        <div className="min-w-[128px]">
                          <p className="text-[15px] font-black text-slate-700 mb-2">전체 학생 수</p>

                          <div className="flex items-end gap-1.5 mb-2">
                            <strong className="text-4xl font-black text-blue-600 leading-none">{totalCount}</strong>
                            <span className="text-lg font-black text-slate-700 mb-0.5">명</span>
                          </div>

                          <div className={`text-xs font-black ${monthDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            전월 대비 {monthDiff > 0 ? '▲' : monthDiff < 0 ? '▼' : ''} {Math.abs(monthDiff)}명
                          </div>
                        </div>

                        <div
                          className="relative w-[108px] h-[108px] rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: trackTotal > 0
                              ? `conic-gradient(#3b82f6 0% ${humanitiesRate}%, #ec4899 ${humanitiesRate}% 100%)`
                              : '#e2e8f0'
                          }}
                        >
                          <div className="w-[66px] h-[66px] rounded-full bg-white shadow-inner"></div>
                        </div>

                        <div className="flex-1 min-w-[230px] max-w-[300px] space-y-3 text-sm font-black">
                          <div className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            <span className="text-slate-600">인문계열</span>
                            <span className="text-slate-900">{humanitiesCount}명 ({humanitiesRate}%)</span>
                          </div>

                          <div className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                            <span className="text-slate-600">자연계열</span>
                            <span className="text-slate-900">{naturalCount}명 ({naturalRate}%)</span>
                          </div>

                          <div className="flex items-center gap-2.5 pt-3 mt-1 border-t border-slate-100 text-slate-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                            <span>남 {maleCount}명 / 여 {femaleCount}명</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-slate-700">반별 학생 수</p>
                        <button
                          type="button"
                          onClick={() => showHomeTextList('반별 학생 수', classes.map(clsName => `${clsName}: ${classStats[clsName] || 0}명`))}
                          className="text-[11px] font-black text-blue-600"
                        >
                          전체 보기
                        </button>
                      </div>

                      <div className="space-y-3">
                        {classes.map(clsName => {
                          const count = classStats[clsName] || 0;
                          const width = Math.max(6, Math.round((count / maxClassCount) * 100));

                          return (
                            <button
                              key={clsName}
                              type="button"
                              onClick={() => setSelectedClass(clsName)}
                              className="w-full grid grid-cols-[52px_1fr_42px] items-center gap-3 text-xs font-black text-left"
                            >
                              <span className="text-slate-700">{clsName}</span>
                              <span className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <span className="block h-full rounded-full bg-blue-500" style={{ width: `${width}%` }}></span>
                              </span>
                              <span className="text-right text-slate-700">{count}명</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-slate-700">학생 관리 포인트</p>
                        <button
                          type="button"
                          onClick={() => showHomeStudentList('관리 필요 학생', homeNeedStudents)}
                          className="text-[11px] font-black text-blue-600"
                        >
                          전체 보기
                        </button>
                      </div>

                      <div className="space-y-3">
                        {[
                          { label: '상담 필요 학생', count: homeCounselingNeededStudents.length, color: 'text-red-500', bg: 'bg-red-50', list: homeCounselingNeededStudents },
                          { label: '장기 미응시 학생', count: homeDailyMissingStudents.length, color: 'text-orange-500', bg: 'bg-orange-50', list: homeDailyMissingStudents },
                          { label: '관리 필요 학생', count: homeNeedStudents.length, color: 'text-orange-500', bg: 'bg-orange-50', list: homeNeedStudents },
                          { label: '최근 신규 등록', count: homeRecentNewStudents.length, color: 'text-violet-600', bg: 'bg-violet-50', list: homeRecentNewStudents }
                        ].map(item => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => showHomeStudentList(item.label, item.list)}
                            className="w-full flex items-center justify-between text-left"
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-8 h-8 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                                <AlertTriangle size={15} />
                              </span>
                              <span className="text-sm font-black text-slate-700">{item.label}</span>
                            </span>
                            <strong className={`text-lg font-black ${item.color}`}>{item.count}명</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {homeActiveTab === 'attendance' && (() => {
                const yesterdayLimit = Math.max(1, homeTodayIndex);
                const yesterdayRate = getHomeClassAttendanceRateUntilDay('대구캠퍼스 전체', homeSelectedMonth, yesterdayLimit);
                const todayRate = homeDashboardStats.attendanceRate;
                const diff = todayRate - yesterdayRate;
                const maxRate = 100;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.9fr_1fr] gap-3">
                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <p className="text-sm font-black text-slate-700 mb-3">이번 달 출결 현황</p>

                      <div className="grid grid-cols-[130px_1fr] gap-4 items-center">
                        <div className="relative w-[124px] h-[124px] rounded-full bg-[conic-gradient(#2563eb_0%,#2563eb_var(--rate),#e5edff_var(--rate),#e5edff_100%)] flex items-center justify-center" style={{ '--rate': `${todayRate}%` }}>
                          <div className="w-[86px] h-[86px] rounded-full bg-white flex flex-col items-center justify-center">
                            <strong className="text-3xl font-black text-slate-900">{todayRate}%</strong>
                            <span className="text-xs font-black text-slate-500">평균 출석률</span>
                          </div>
                        </div>

                        <div>
                          <div className={`text-sm font-black mb-3 ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}%p 전날 대비
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => showHomeRecordList('지각 학생', homeLateRecords)} className="rounded-xl bg-slate-50 p-3 text-center">
                              <p className="text-xs font-black text-slate-500 mb-1">지각</p>
                              <strong className="text-lg font-black text-orange-500">{homeLateRecords.length}건</strong>
                            </button>
                            <button type="button" onClick={() => showHomeRecordList('결석 학생', homeAbsentRecords)} className="rounded-xl bg-slate-50 p-3 text-center">
                              <p className="text-xs font-black text-slate-500 mb-1">결석</p>
                              <strong className="text-lg font-black text-red-500">{homeAbsentRecords.length}건</strong>
                            </button>
                            <button type="button" onClick={() => showHomeRecordList('조퇴 학생', homeEarlyLeaveRecords)} className="rounded-xl bg-slate-50 p-3 text-center">
                              <p className="text-xs font-black text-slate-500 mb-1">조퇴</p>
                              <strong className="text-lg font-black text-blue-500">{homeEarlyLeaveRecords.length}건</strong>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <p className="text-sm font-black text-slate-700 mb-3">출결 위험 학생</p>

                      <div className="space-y-3">
                        {[
                          { label: '출석률 70% 미만', count: students.filter(s => getHomeAttendanceRateForStudent(s, homeSelectedMonth) < 70).length, list: students.filter(s => getHomeAttendanceRateForStudent(s, homeSelectedMonth) < 70), color: 'text-red-500', bg: 'bg-red-50' },
                          { label: '연속 결석 3일 이상', count: homeConsecutiveAbsenceStudents.length, list: homeConsecutiveAbsenceStudents, color: 'text-orange-500', bg: 'bg-orange-50' },
                          { label: '장기 미등원 7일 이상', count: homeLongNoShowStudents.length, list: homeLongNoShowStudents, color: 'text-orange-500', bg: 'bg-orange-50' }
                        ].map(item => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => showHomeStudentList(item.label, item.list)}
                            className="w-full flex items-center justify-between text-left"
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-8 h-8 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                                <AlertTriangle size={15} />
                              </span>
                              <span className="text-sm font-black text-slate-700">{item.label}</span>
                            </span>
                            <strong className={`text-lg font-black ${item.color}`}>{item.count}명</strong>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-slate-700">반별 출석률</p>
                        <button
                          type="button"
                          onClick={() => showHomeTextList('반별 출석률', classes.map(clsName => `${clsName}: ${getHomeClassAttendanceRate(clsName)}%`))}
                          className="text-[11px] font-black text-blue-600"
                        >
                          전체 보기
                        </button>
                      </div>

                      <div className="space-y-3">
                        {classes.map(clsName => {
                          const rate = getHomeClassAttendanceRate(clsName);
                          return (
                            <button key={clsName} type="button" onClick={() => setSelectedClass(clsName)} className="w-full grid grid-cols-[52px_1fr_42px] items-center gap-3 text-xs font-black text-left">
                              <span className="text-slate-700">{clsName}</span>
                              <span className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <span className={`block h-full rounded-full ${rate < 80 ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(maxRate, Math.max(0, rate))}%` }}></span>
                              </span>
                              <span className={getRateTextClass(rate)}>{rate}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {homeActiveTab === 'test' && (() => {
                const dailyRate = homeDashboardStats.dailyRate;
                const yesterdayDailyRate = getHomeClassDailyRateUntilDay('대구캠퍼스 전체', homeSelectedMonth, Math.max(1, homeTodayIndex));
                const weeklyRate = getHomeWeeklyParticipationRate(homeCurrentWeek, homeSelectedMonth);
                const previousWeeklyRate = getHomeWeeklyParticipationRate(Math.max(1, homeCurrentWeek - 1), homeSelectedMonth);
                const monthlyRate = getHomeMonthlyParticipationRate(homeSelectedMonth);
                const scoreOverview = getHomeMonthlyScoreOverview(homeSelectedMonth);
                const previousMonthIndex = Math.max(0, MONTHS.indexOf(homeSelectedMonth) - 1);
                const previousMonth = MONTHS[previousMonthIndex] || homeSelectedMonth;
                const previousScoreOverview = getHomeMonthlyScoreOverview(previousMonth);
                const scoreDiff = Math.round((scoreOverview.average - previousScoreOverview.average) * 10) / 10;

                const circleStyle = (rate, color) => ({
                  background: `conic-gradient(${color} 0% ${Math.max(0, Math.min(100, rate))}%, #e5edff ${Math.max(0, Math.min(100, rate))}% 100%)`
                });

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.9fr_1fr] gap-3">
                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <p className="text-sm font-black text-slate-700 mb-3">시험 참여 현황</p>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Daily 참여율', rate: dailyRate, diff: dailyRate - yesterdayDailyRate, color: '#3b82f6' },
                          { label: 'Weekly 참여율', rate: weeklyRate, diff: weeklyRate - previousWeeklyRate, color: '#8b5cf6' },
                          { label: 'Monthly 응시율', rate: monthlyRate, diff: 0, color: '#f59e0b' }
                        ].map(item => (
                          <div key={item.label} className="text-center">
                            <div className="mx-auto w-[92px] h-[92px] rounded-full flex items-center justify-center" style={circleStyle(item.rate, item.color)}>
                              <div className="w-[62px] h-[62px] rounded-full bg-white flex flex-col items-center justify-center">
                                <strong className="text-xl font-black text-slate-900">{item.rate}%</strong>
                              </div>
                            </div>
                            <p className="text-xs font-black text-slate-600 mt-2">{item.label}</p>
                            <p className={`text-[11px] font-black mt-1 ${item.diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {item.diff >= 0 ? '▲' : '▼'} {Math.abs(item.diff)}%p
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <p className="text-sm font-black text-slate-700 mb-3">미응시 현황</p>

                      <div className="space-y-3">
                        {[
                          { label: 'Daily 미응시', count: homeDailyMissingStudents.length, list: homeDailyMissingStudents, color: 'text-red-500', bg: 'bg-red-50' },
                          { label: 'Weekly 미응시', count: homeWeeklyMissingStudents.length, list: homeWeeklyMissingStudents, color: 'text-orange-500', bg: 'bg-orange-50' },
                          { label: 'Monthly 미응시', count: homeMonthlyMissingStudents.length, list: homeMonthlyMissingStudents, color: 'text-amber-500', bg: 'bg-amber-50' }
                        ].map(item => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => showHomeStudentList(item.label, item.list)}
                            className="w-full flex items-center justify-between text-left"
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-8 h-8 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                                <Calendar size={15} />
                              </span>
                              <span className="text-sm font-black text-slate-700">{item.label}</span>
                            </span>
                            <strong className={`text-lg font-black ${item.color}`}>{item.count}명</strong>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
                      <p className="text-sm font-black text-slate-700 mb-3">성적 개요</p>

                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-black text-slate-500 mb-1">전체 평균 점수</p>
                          <strong className="text-3xl font-black text-slate-900">{scoreOverview.average}점</strong>
                        </div>
                        <span className={`text-xs font-black ${scoreDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {scoreDiff >= 0 ? '▲' : '▼'} {Math.abs(scoreDiff)}점
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs font-black">
                        <div>
                          <p className="text-slate-400 mb-1">최고 반</p>
                          <p className="text-slate-900">{scoreOverview.bestClass?.clsName || '-'}</p>
                          <p className="text-slate-500">{scoreOverview.bestClass ? `${scoreOverview.bestClass.avg}점` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">최저 반</p>
                          <p className="text-slate-900">{scoreOverview.worstClassByScore?.clsName || '-'}</p>
                          <p className="text-slate-500">{scoreOverview.worstClassByScore ? `${scoreOverview.worstClassByScore.avg}점` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">평균 이하 학생</p>
                          <p className="text-red-500 text-lg">{scoreOverview.belowAverageStudents.length}명</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {homeActiveTab === 'analysis' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/95 border border-blue-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-base font-black text-slate-900 flex items-center gap-1">
                          지난주 학습 상태
                          <span className="text-[11px] text-slate-400">ⓘ</span>
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-1">{homeLastWeekPeriodText} 기준</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {homeAnalysisMetricRows.map(row => {
                        const Icon = row.icon;

                        return (
                          <div key={row.key} className="rounded-2xl bg-white border border-blue-100 px-4 py-3 min-h-[92px] flex items-center gap-3 shadow-[0_8px_20px_rgba(37,99,235,0.05)]">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                              row.key === 'attendance'
                                ? 'bg-blue-50 text-blue-600'
                                : row.key === 'daily'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : row.key === 'weekly'
                                    ? 'bg-orange-50 text-orange-500'
                                    : 'bg-violet-50 text-violet-600'
                            }`}>
                              <Icon size={22} />
                            </div>

                            <div>
                              <p className="text-xs font-black text-slate-500">{row.label}</p>
                              <p className="text-2xl font-black text-slate-950 mt-0.5">{row.value}</p>
                              <p className="text-[11px] font-bold text-slate-400 mt-0.5">지난주</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/95 border border-blue-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-base font-black text-slate-900 flex items-center gap-1">
                          주요 지표 변화
                          <span className="text-[11px] text-slate-400">ⓘ</span>
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-1">지난주 vs 2주 전</p>
                      </div>

                      <div className="hidden xl:flex items-center gap-3 text-[11px] font-black text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500"></span>지난주</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300"></span>2주 전</span>
                        <span>× 변화</span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-blue-100 overflow-hidden">
                      {homeAnalysisMetricRows.map(row => (
                        <div key={row.key} className="grid grid-cols-[1fr_82px_82px_82px] items-center px-4 py-3 border-b border-slate-100 last:border-b-0 text-sm font-black">
                          <span className="text-slate-700">{row.label}</span>
                          <span className="text-blue-600 text-right">{row.value}</span>
                          <span className="text-slate-500 text-right">{row.previous}</span>
                          <span className={`text-right ${row.change.color}`}>
                            {row.change.hasData ? `${row.change.mark} ${row.change.text}` : '-'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] font-bold text-slate-400 mt-3">
                      {homeLastWeekPeriodText} · {homeTwoWeeksAgoPeriodText} 비교
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-50/50 border border-red-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-200">
                          <AlertTriangle size={22} />
                        </div>

                        <div>
                          <p className="text-base font-black text-red-600">우선 관리 포인트</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">지난주 vs 2주 전 하락폭 기준</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/90 border border-red-100 overflow-hidden">
                      {homePriorityDrops.map(item => (
                        <button
                          key={item.label}
                          type="button"
                          title={item.tooltipItems.join('\n')}
                          onClick={() => showHomeTextList(`${item.label} 하락폭 동일 학생`, item.tooltipItems)}
                          className="w-full grid grid-cols-[86px_1fr_84px] items-center gap-2 px-4 py-3 border-b border-red-50 last:border-b-0 text-left hover:bg-red-50/60 transition-colors"
                        >
                          <span className="text-sm font-black text-slate-700">{item.label}</span>
                          <span className="text-sm font-bold text-slate-600 truncate">{item.displayName}</span>
                          <span className="text-right text-lg font-black text-red-500">{item.dropText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {homeActiveTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-white border border-blue-100 p-4">
                    <p className="text-sm font-black text-slate-700 mb-2">학년도</p>
                    <select
                      value={academicYear}
                      onChange={e => setAcademicYear(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-white border border-blue-100 outline-none font-extrabold text-slate-800 cursor-pointer"
                    >
                      <option value="2026">2026학년도</option>
                      <option value="2027">2027학년도</option>
                      <option value="2028">2028학년도</option>
                    </select>
                  </div>

                  <label className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4 cursor-pointer hover:bg-blue-100/60">
                    <p className="text-sm font-black text-slate-700 mb-1">JSON 복원</p>
                    <p className="text-xs font-bold text-slate-500">백업 파일을 불러옵니다.</p>
                    <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                  </label>

                  <button
                    onClick={handleExportJSON}
                    className="rounded-2xl bg-blue-600 text-white p-4 text-left hover:bg-blue-700"
                  >
                    <p className="text-sm font-black mb-1">JSON 백업</p>
                    <p className="text-xs font-bold text-white/80">현재 데이터를 저장합니다.</p>
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="grid grid-cols-5 gap-3 mb-3">
            {[
              { title: '총 등록 인원', value: homeDashboardStats.totalStudents, unit: '명', sub: '전체 학생 수', icon: Users, color: 'text-slate-950' },
              { title: '운영 반 수', value: homeDashboardStats.classCount, unit: '개', sub: '현재 운영 중인 반', icon: FileText, color: 'text-slate-950' },
              { title: '이번 달 출석률', value: homeDashboardStats.attendanceRate, unit: '%', sub: '현재 데이터 기준', icon: CalendarCheck, color: getRateTextClass(homeDashboardStats.attendanceRate) },
              { title: 'Daily 참여율', value: homeDashboardStats.dailyRate, unit: '%', sub: '현재 데이터 기준', icon: BarChart3, color: getRateTextClass(homeDashboardStats.dailyRate) },
              { title: '관리 필요 학생', value: homeDashboardStats.needCount, unit: '명', sub: '즉시 확인 필요', icon: AlertTriangle, color: getNeedTextClass(homeDashboardStats.needCount) }
            ].map((card, idx) => {
              const Icon = card.icon;

              return (
                <button
                  key={idx}
                  onClick={() => card.title === '관리 필요 학생' ? showHomeStudentList('관리 필요 학생 명단', homeNeedStudents) : null}
                  className="text-left bg-white/82 backdrop-blur-xl rounded-2xl border border-blue-100 shadow-[0_10px_28px_rgba(37,99,235,0.08)] p-3.5 flex items-center gap-3 min-h-[96px]"
                >
                  <div className="w-14 h-14 min-w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                    <Icon size={29} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-500 mb-1">{card.title}</p>
                    <div className="flex items-end gap-1">
                      <strong className={`text-3xl font-black ${card.color}`}>{card.value}</strong>
                      <span className="font-extrabold text-slate-700 mb-1">{card.unit}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-1">{card.sub}</p>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="grid grid-cols-[1.25fr_0.8fr_0.85fr] gap-3 mb-3">
            <div
              onClick={() => setSelectedClass('대구캠퍼스 전체')}
              className="bg-white/78 backdrop-blur-xl rounded-2xl border border-blue-100 shadow-[0_12px_35px_rgba(37,99,235,0.08)] p-5 cursor-pointer group overflow-hidden relative min-h-[250px]"
            >
              <div className="absolute right-6 top-8 w-72 h-48 bg-blue-200/30 rounded-full blur-3xl"></div>

              <div className="relative z-10">
                <p className="text-sm font-black text-slate-700 mb-4">캠퍼스 개요</p>

                <img
                  src={HOME_IMAGES.middle}
                  alt=""
                  className="absolute right-0 top-0 bottom-0 h-full w-[64%] object-contain object-right opacity-[0.48] pointer-events-none select-none z-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/62 to-white/10 pointer-events-none z-0"></div>

                <div className="relative z-10">
                  <h2 className="text-2xl font-black text-slate-950 mb-4">대구캠퍼스 전체</h2>
                  <p className="text-sm font-bold text-slate-500 leading-7 mb-4">
                    학생, 성적, 출결 데이터를 통합 관리하여<br />
                    효율적인 교육 환경을 지원합니다.
                  </p>

                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
                  >
                    캠퍼스 상세 보기
                  </button>
                </div>

                <div className="relative z-10 bg-white/85 border border-blue-100 rounded-2xl px-4 py-3 grid grid-cols-4 gap-3 mt-2">
                  <div className="border-r border-slate-200">
                    <p className="text-[11px] font-black text-slate-400 mb-1">등록 학생</p>
                    <strong className="text-base font-black text-slate-950">{homeDashboardStats.totalStudents}명</strong>
                  </div>
                  <div className="border-r border-slate-200">
                    <p className="text-[11px] font-black text-slate-400 mb-1">운영 반 수</p>
                    <strong className="text-base font-black text-slate-950">{homeDashboardStats.classCount}개</strong>
                  </div>
                  <div className="border-r border-slate-200">
                    <p className="text-[11px] font-black text-slate-400 mb-1">전담 교사</p>
                    <strong className="text-base font-black text-slate-950">8명</strong>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-400 mb-1">최근 업데이트</p>
                    <strong className="text-sm font-black text-slate-950">{new Date().toISOString().slice(0, 10).replaceAll('-', '.')}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/78 backdrop-blur-xl rounded-2xl border border-blue-100 shadow-[0_10px_28px_rgba(37,99,235,0.08)] p-4 min-h-[220px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-950">알림 및 공지</h3>
                <button
                  onClick={() => showHomeTextList('알림 및 공지 전체 보기', homeNotices.map((n, i) => `${i + 1}. [${n.type}] ${n.text}`))}
                  className="text-xs font-black text-slate-500 hover:text-blue-600 flex items-center gap-1"
                >
                  전체 보기 <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {homeNotices.map((notice, idx) => (
                  <button
                    key={idx}
                    onClick={() => showHomeTextList('알림 및 공지', [`[${notice.type}] ${notice.text}`])}
                    className="w-full flex items-center gap-3 bg-white/75 rounded-xl border border-blue-50 px-3 py-3 text-left hover:bg-blue-50/40 transition-colors"
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      notice.color === 'red' ? 'bg-red-50 text-red-500' :
                      notice.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {notice.color === 'red' ? <AlertTriangle size={17} /> : <FileText size={17} />}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-[11px] font-black ${
                      notice.color === 'red' ? 'bg-red-50 text-red-500' :
                      notice.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {notice.type}
                    </span>
                    <p className="flex-1 text-xs font-extrabold text-slate-700 truncate">{notice.text}</p>
                    <span className="text-[11px] font-bold text-slate-400">{notice.date}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/78 backdrop-blur-xl rounded-2xl border border-blue-100 shadow-[0_10px_28px_rgba(37,99,235,0.08)] p-4 min-h-[220px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-950">오늘의 관리 알림</h3>
                <button
                  onClick={() => showHomeStudentList('관리 필요 학생 명단', homeNeedStudents)}
                  className="text-xs font-black text-slate-500 hover:text-blue-600 flex items-center gap-1"
                >
                  자세히 보기 <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {homeManagementAlerts.map((item, idx) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={idx}
                      onClick={() => showHomeStudentList(`${item.title} 명단`, item.students)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-transform hover:-translate-y-0.5 ${
                        item.color === 'red' ? 'bg-red-50/70 border-red-100' :
                        item.color === 'orange' ? 'bg-orange-50/70 border-orange-100' :
                        'bg-violet-50/70 border-violet-100'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        item.color === 'red' ? 'text-red-500 bg-white/70' :
                        item.color === 'orange' ? 'text-orange-500 bg-white/70' :
                        'text-violet-600 bg-white/70'
                      }`}>
                        <Icon size={18} />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800">{item.title}</p>
                        <p className="text-[11px] font-bold text-slate-500">{item.desc}</p>
                      </div>
                      <strong className={`text-lg font-black ${
                        item.color === 'red' ? 'text-red-500' :
                        item.color === 'orange' ? 'text-orange-500' :
                        'text-violet-600'
                      }`}>
                        {item.count}명
                      </strong>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-900">개별 반 현황</h2>
                <span className="text-xs font-bold text-slate-400">
                  선택 월 기준 출석률 · Daily 참여율
                </span>
              </div>

              <select
                value={homeSelectedMonth}
                onChange={(e) => setHomeSelectedMonth(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white/85 border border-blue-100 shadow-sm outline-none text-xs font-black text-slate-700"
              >
                {MONTHS.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {classes.map((clsName, index) => {
                const attendanceRate = getHomeClassAttendanceRate(clsName);
                const dailyRate = getHomeClassDailyRate(clsName);
                const needCount = getHomeClassNeedCount(clsName);
                const graphColor = getHomeGraphColor(index);
                const attendanceTrend = getHomeClassDailyAttendanceTrend(clsName, homeSelectedMonth);
                const sparkPoints = getHomeSparkPointsFromTrend(attendanceTrend);
                const lastPoint = sparkPoints.split(' ').at(-1)?.split(',')[1] || 40;

                return (
                  <div
                    key={clsName}
                    onClick={() => setSelectedClass(clsName)}
                    className="bg-white/82 backdrop-blur-xl rounded-2xl border border-blue-100 shadow-[0_10px_28px_rgba(37,99,235,0.08)] p-4 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(37,99,235,0.14)] transition-all relative overflow-hidden min-h-[205px]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-black text-slate-950">{clsName}</h3>
                      <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-black">{classStats[clsName]}명</span>
                    </div>

                    <div className="grid grid-cols-[58px_1fr] gap-2 items-end mb-2">
                      <div>
                        <p className="text-[11px] font-black text-slate-500 mb-1">출석률</p>
                        <strong className={`text-xl font-black ${getRateTextClass(attendanceRate)}`}>{attendanceRate}%</strong>
                      </div>

                      <svg viewBox="0 0 150 50" className="w-full h-[50px]">
                        <defs>
                          <linearGradient id={`homeFill${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={graphColor} stopOpacity="0.22" />
                            <stop offset="100%" stopColor={graphColor} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polyline points={`6,48 ${sparkPoints} 140,48`} fill={`url(#homeFill${index})`} stroke="none" />
                        <polyline points={sparkPoints} fill="none" stroke={graphColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="138" cy={lastPoint} r="3.5" fill={graphColor} />
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 border-t border-slate-100 pt-3 mb-2">
                      <div className="border-r border-slate-100">
                        <p className="text-[11px] font-black text-slate-500 mb-1">Daily 참여율</p>
                        <strong className={`text-lg font-black ${getRateTextClass(dailyRate)}`}>{dailyRate}%</strong>
                      </div>
                      <div className="pl-3">
                        <p className="text-[11px] font-black text-slate-500 mb-1">관리 필요</p>
                        <strong className={`text-lg font-black ${getNeedTextClass(needCount)}`}>{needCount}명</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-black text-blue-600">명단 · 성적 · 출결</span>
                      <ChevronRight size={16} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>

                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleMoveClass(e, index, -1)} className="p-1 text-slate-400 hover:text-blue-600 bg-white/80 rounded" title="위로 이동"><ChevronLeft size={12} className="rotate-90" /></button>
                      <button onClick={(e) => handleMoveClass(e, index, 1)} className="p-1 text-slate-400 hover:text-blue-600 bg-white/80 rounded" title="아래로 이동"><ChevronRight size={12} className="rotate-90" /></button>
                      <button onClick={(e) => handleEditClass(e, clsName)} className="p-1 text-slate-400 hover:text-blue-600 bg-white/80 rounded" title="이름 수정"><PenTool size={12} /></button>
                      <button onClick={(e) => handleDeleteClass(e, clsName)} className="p-1 text-slate-400 hover:text-rose-600 bg-white/80 rounded" title="반 삭제"><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}

              <form
                onSubmit={handleAddClass}
                className="bg-white/55 backdrop-blur-xl rounded-2xl border-2 border-dashed border-blue-200 shadow-[0_10px_28px_rgba(37,99,235,0.06)] p-4 flex flex-col items-center justify-center text-center min-h-[205px]"
              >
                <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-blue-600 mb-3"><Plus size={28} /></div>
                <h3 className="text-lg font-black text-blue-700 mb-2">새 반 추가</h3>
                <p className="text-xs font-bold text-slate-500 mb-4">반 정보를 입력하고 등록하세요.</p>

                <div className="w-full flex gap-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="반 이름"
                    className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold"
                  />
                  <button type="submit" className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors">
                    추가
                  </button>
                </div>
              </form>
            </div>
          </section>
        </main>
      </div>
    );
  }


  return (
    <ClassDashboard
      academicYear={academicYear}
      className={selectedClass}
      classes={classes}
      onBack={() => setSelectedClass(null)}
      students={students}
      setStudents={setStudents}
      isXlsxReady={isXlsxReady}
      markStudentDirty={markStudentDirty}
      saveDirtyStudentsToFirebase={saveDirtyStudentsToFirebase}
      manualSaveStatus={manualSaveStatus}
      manualSaveMessage={manualSaveMessage}
      dirtyStudentIds={dirtyStudentIds}
      getDirtyCountForScope={getDirtyCountForScope}
    />
  );
}

function ClassDashboard({
  academicYear,
  className,
  classes,
  onBack,
  students,
  setStudents,
  isXlsxReady,
  markStudentDirty = () => {},
  saveDirtyStudentsToFirebase = async () => {},
  manualSaveStatus = 'idle',
  manualSaveMessage = '',
  dirtyStudentIds = new Set(),
  getDirtyCountForScope = () => 0
}) {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [activeTestTab, setActiveTestTab] = useState('monthly'); 
  const [activeDailyTab, setActiveDailyTab] = useState('input'); 
  const [dailySubject, setDailySubject] = useState('english'); 
  const [activeWeeklyTab, setActiveWeeklyTab] = useState('setup'); 
  const [testViewMode, setTestViewMode] = useState('input'); 
  const [activeAttendanceTab, setActiveAttendanceTab] = useState('studyTime'); 
  const [activeStudyTimeTab, setActiveStudyTimeTab] = useState('input'); 
  const [weeklySubject, setWeeklySubject] = useState('english'); 
  const [activeNeedTab, setActiveNeedTab] = useState('all');
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);
  
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

  // ✅ ClassDashboard 내부 엑셀 업로드 값 비교 helper
  // App 컴포넌트 내부 helper는 이 컴포넌트 스코프에서 직접 접근할 수 없으므로 여기에도 별도로 정의
  const isSameValueForDirtyCheck = (currentValue, nextValue) => {
    return String(currentValue ?? '').trim() === String(nextValue ?? '').trim();
  };

  // ✅ 이전 수정 과정에서 남을 수 있는 함수명 오타 방어용 alias
  const issamevaluefordirthcheck = isSameValueForDirtyCheck;
  const issamevaluefordirtycheck = isSameValueForDirtyCheck;
  const isSameValueForDirtCheck = isSameValueForDirtyCheck;
  const isSameValueForDirthCheck = isSameValueForDirtyCheck;
  
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
  const [selectedReportIds, setSelectedReportIds] = useState([]);

  const [reportListSortOrder, setReportListSortOrder] = useState('asc');
  const [weeklySearchTerm, setWeeklySearchTerm] = useState('');
  const [weeklyScoreSort, setWeeklyScoreSort] = useState({
    week: null,
    order: 'desc'
  });

  const weeklyWeekNumbers = useMemo(() => [1, 2, 3, 4, 5], []);

  // 6단계: 선택 학생 state 및 일괄 처리 로직 추가
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [batchAttendanceDate, setBatchAttendanceDate] = useState(0);
  const [batchAttendanceTimeOfDay, setBatchAttendanceTimeOfDay] = useState(ATTENDANCE_SESSION_KEY);
  const [batchAttendanceStatus, setBatchAttendanceStatus] = useState('');
  
  const [batchStudyTimeDate, setBatchStudyTimeDate] = useState(0);
  const [batchStudyTimeIn, setBatchStudyTimeIn] = useState('');
  const [batchStudyTimeOut, setBatchStudyTimeOut] = useState('');
  const [batchDailyDate, setBatchDailyDate] = useState(0);
  const [batchDailyT1, setBatchDailyT1] = useState('');
  const [batchDailyT2, setBatchDailyT2] = useState('');
  const [batchDailyMath, setBatchDailyMath] = useState('');

  // 출석 + Daily 통합 엑셀 업로드 input ref
  const attendanceDailyExcelInputRef = useRef(null);
  const testDailyExcelInputRef = useRef(null);

  // ✅ 출석/학습시간/Daily 공통 학생 선택 기능
  const toggleStudentSelection = (studentId) => {
    if (!studentId) return;

    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      }

      return [...prev, studentId];
    });
  };

  const handleSelectAllStudents = (shouldSelect, targetStudentIds) => {
    const ids = Array.isArray(targetStudentIds)
      ? targetStudentIds.filter(Boolean)
      : filteredStudents.map(student => student.id).filter(Boolean);

    if (!ids.length) return;

    setSelectedStudents(prev => {
      if (shouldSelect) {
        return Array.from(new Set([...prev, ...ids]));
      }

      return prev.filter(id => !ids.includes(id));
    });
  };

  const handleBatchDailyChange = () => {
    if (selectedStudents.length === 0) { showAlert('일괄 적용할 학생을 선택해주세요.'); return; }
    const subjectLabel = dailySubject === 'math' ? '수학 Daily' : '영어 Daily';

    showConfirm(`선택한 ${selectedStudents.length}명의 ${dailyMonth} ${Number(batchDailyDate) + 1}일 ${subjectLabel} 성적을 일괄 변경하시겠습니까?`, () => {
      setStudents(prev => prev.map(student => {
        if (!selectedStudents.includes(student.id)) return student;

        const baseDaily = student.dailyRecords?.[dailyMonth] || generateEmptyMonthlyDaily()[dailyMonth];
        const newDaily = baseDaily.map(d => ({ t1: '', t2: '', math: '', ...(d || {}) }));
        const currentDay = { t1: '', t2: '', math: '', ...(newDaily[batchDailyDate] || {}) };

        if (dailySubject === 'math') {
          newDaily[batchDailyDate] = {
            ...currentDay,
            math: batchDailyMath !== '' ? batchDailyMath : currentDay.math
          };
        } else {
          newDaily[batchDailyDate] = {
            ...currentDay,
            t1: batchDailyT1 !== '' ? batchDailyT1 : currentDay.t1,
            t2: batchDailyT2 !== '' ? batchDailyT2 : currentDay.t2
          };
        }

        return { ...student, dailyRecords: { ...student.dailyRecords, [dailyMonth]: newDaily } };
      }));

      selectedStudents.forEach(studentId => markStudentDirty(studentId, 'dailyRecords'));

      showAlert(`${subjectLabel} 성적 일괄 적용이 완료되었습니다.`);
      setSelectedStudents([]);
      setBatchDailyT1('');
      setBatchDailyT2('');
      setBatchDailyMath('');
    });
  };

  const normalizeExcelHeader = (header = '') => {
    const key = String(header || '')
      .replace(/\s+/g, '')
      .replace(/_/g, '')
      .toLowerCase();

    const headerMap = {
      '반': 'className',
      'class': 'className',
      'classname': 'className',
      '수강반': 'className',

      '이름': 'name',
      '성명': 'name',
      'name': 'name',
      '학생명': 'name',

      '학번': 'studentId',
      '학생번호': 'studentId',
      'id': 'studentId',
      'studentid': 'studentId',
      '수험번호': 'studentId',

      '아이디': 'userId',
      'userid': 'userId',
      '로그인id': 'userId',
      '로그인아이디': 'userId',

      '날짜': 'date',
      '일자': 'date',
      'day': 'date',
      'date': 'date',

      '출석유형': 'attendanceStatus',
      '출석': 'attendanceStatus',
      '출결': 'attendanceStatus',
      'attendance': 'attendanceStatus',

      'daily1차': 'dailyT1',
      '데일리1차': 'dailyT1',
      '1차': 'dailyT1',
      't1': 'dailyT1',

      'daily2차': 'dailyT2',
      '데일리2차': 'dailyT2',
      '2차': 'dailyT2',
      't2': 'dailyT2',

      '수학daily': 'dailyMath',
      '수학데일리': 'dailyMath',
      'math': 'dailyMath',
      '수학': 'dailyMath'
    };

    return headerMap[key] || key;
  };

  const normalizeAttendanceStatus = (value) => {
    const status = String(value ?? '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!status) return '';

    return ATTENDANCE_OPTIONS.includes(status) ? status : null;
  };

  const getStudentClassNamesForExcel = (student) => {
    return Array.isArray(student.classNames)
      ? student.classNames.filter(Boolean)
      : [student.className].filter(Boolean);
  };

  const getRowValueByNormalizedKey = (row, targetKey) => {
    const foundKey = Object.keys(row).find(key => normalizeExcelHeader(key) === targetKey);
    return foundKey ? row[foundKey] : '';
  };

  const normalizeExcelIdValue = (value) => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(Math.trunc(value)).trim();
    }

    return String(value).trim();
  };

  const parseExcelSerialDate = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < 30000) return null;

    if (window.XLSX?.SSF?.parse_date_code) {
      const parsed = window.XLSX.SSF.parse_date_code(value);

      if (parsed?.m && parsed?.d) {
        return {
          month: `${Number(parsed.m)}월`,
          dayIndex: Number(parsed.d) - 1
        };
      }
    }

    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsedDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

    if (!Number.isNaN(parsedDate.getTime())) {
      return {
        month: `${parsedDate.getUTCMonth() + 1}월`,
        dayIndex: parsedDate.getUTCDate() - 1
      };
    }

    return null;
  };

  const parseExcelDateToDayIndex = (value, fallbackMonth, fallbackDayIndex = 0) => {
    const safeFallbackDayIndex = Math.max(0, Math.min(30, Number(fallbackDayIndex || 0)));

    if (value === null || value === undefined || value === '') {
      return { month: fallbackMonth, dayIndex: safeFallbackDayIndex };
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return {
        month: `${value.getMonth() + 1}월`,
        dayIndex: value.getDate() - 1
      };
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const serialParsed = parseExcelSerialDate(value);
      if (serialParsed && serialParsed.dayIndex >= 0 && serialParsed.dayIndex <= 30) {
        return serialParsed;
      }

      const day = Math.round(value);
      if (day >= 1 && day <= 31) {
        return { month: fallbackMonth, dayIndex: day - 1 };
      }
    }

    const raw = String(value ?? '').trim();

    if (!raw) {
      return { month: fallbackMonth, dayIndex: safeFallbackDayIndex };
    }

    const isoMatch = raw.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (isoMatch) {
      const monthNumber = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);

      if (monthNumber >= 1 && monthNumber <= 12 && day >= 1 && day <= 31) {
        return { month: `${monthNumber}월`, dayIndex: day - 1 };
      }
    }

    const koreanMatch = raw.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
    if (koreanMatch) {
      const monthNumber = Number(koreanMatch[1]);
      const day = Number(koreanMatch[2]);

      if (monthNumber >= 1 && monthNumber <= 12 && day >= 1 && day <= 31) {
        return { month: `${monthNumber}월`, dayIndex: day - 1 };
      }
    }

    const slashMatch = raw.match(/^(\d{1,2})[/.](\d{1,2})$/);
    if (slashMatch) {
      const monthNumber = Number(slashMatch[1]);
      const day = Number(slashMatch[2]);

      if (monthNumber >= 1 && monthNumber <= 12 && day >= 1 && day <= 31) {
        return { month: `${monthNumber}월`, dayIndex: day - 1 };
      }
    }

    const dayOnly = Number(raw);
    if (Number.isFinite(dayOnly) && dayOnly >= 1 && dayOnly <= 31) {
      return { month: fallbackMonth, dayIndex: Math.round(dayOnly) - 1 };
    }

    return null;
  };

  const findStudentByAttendanceDailyExcelRow = (row, studentList = students) => {
    const rowClassName = String(getRowValueByNormalizedKey(row, 'className') || '').trim();
    const rowName = String(getRowValueByNormalizedKey(row, 'name') || '').trim();
    const rowStudentId = normalizeExcelIdValue(getRowValueByNormalizedKey(row, 'studentId'));
    const rowUserId = normalizeExcelIdValue(getRowValueByNormalizedKey(row, 'userId'));

    if (rowStudentId) {
      const matchedByStudentId = studentList.find(student => {
        return String(student.id || '').trim() === rowStudentId;
      });

      if (matchedByStudentId) return { student: matchedByStudentId, error: null };
    }

    if (rowUserId) {
      const matchedByUserId = studentList.find(student => {
        return String(student.userId || '').trim() === rowUserId;
      });

      if (matchedByUserId) return { student: matchedByUserId, error: null };
    }

    if (!rowName) {
      return { student: null, error: '학생 매칭 실패' };
    }

    const currentClassNameMatches = studentList.filter(student => {
      const classList = getStudentClassNamesForExcel(student);
      return classList.includes(className) && String(student.name || '').trim() === rowName;
    });

    if (currentClassNameMatches.length === 1) {
      return { student: currentClassNameMatches[0], error: null };
    }

    if (currentClassNameMatches.length > 1) {
      return { student: null, error: '중복 이름 확인 필요' };
    }

    if (rowClassName) {
      const rowClassNameMatches = studentList.filter(student => {
        const classList = getStudentClassNamesForExcel(student);
        return classList.includes(rowClassName) && String(student.name || '').trim() === rowName;
      });

      if (rowClassNameMatches.length === 1) {
        return { student: rowClassNameMatches[0], error: null };
      }

      if (rowClassNameMatches.length > 1) {
        return { student: null, error: '중복 이름 확인 필요' };
      }
    }

    const allNameMatches = studentList.filter(student => {
      return String(student.name || '').trim() === rowName;
    });

    if (allNameMatches.length > 1) {
      return { student: null, error: '중복 이름 확인 필요' };
    }

    return { student: null, error: '학생 매칭 실패' };
  };

  const downloadAttendanceDailyTemplate = async (source = 'attendance') => {
    const loadExcelJS = () => {
      return new Promise((resolve, reject) => {
        if (window.ExcelJS) {
          resolve(window.ExcelJS);
          return;
        }

        const existingScript = document.querySelector('script[data-exceljs="true"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(window.ExcelJS));
          existingScript.addEventListener('error', reject);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
        script.async = true;
        script.dataset.exceljs = 'true';
        script.onload = () => resolve(window.ExcelJS);
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    try {
      const ExcelJS = await loadExcelJS();

      if (!ExcelJS) {
        showAlert('엑셀 양식 생성 모듈을 불러오지 못했습니다.');
        return;
      }

      const targetMonth = source === 'daily' ? dailyMonth : attendanceMonth;
      const targetDayIndex = source === 'daily' ? Number(batchDailyDate || 0) : Number(batchAttendanceDate || 0);
      const targetDateLabel = `${targetMonth} ${targetDayIndex + 1}일`;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'KY Daegu Academy';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('출석_Daily_업로드');
      const guideWorksheet = workbook.addWorksheet('출석유형_목록');

      worksheet.columns = [
        { header: '반', key: 'className', width: 12 },
        { header: '이름', key: 'name', width: 12 },
        { header: '학번', key: 'studentId', width: 16 },
        { header: '아이디', key: 'userId', width: 18 },
        { header: '날짜', key: 'date', width: 14 },
        { header: '출석유형', key: 'attendanceStatus', width: 16 },
        { header: 'Daily 1차', key: 'dailyT1', width: 12 },
        { header: 'Daily 2차', key: 'dailyT2', width: 12 },
        { header: '수학 Daily', key: 'dailyMath', width: 12 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 22;

      classStudents.forEach(student => {
        worksheet.addRow({
          className: className === '대구캠퍼스 전체'
            ? (getStudentClassNamesForExcel(student)[0] || '')
            : className,
          name: student.name || '',
          studentId: student.id || '',
          userId: student.userId || '',
          date: targetDateLabel,
          attendanceStatus: '',
          dailyT1: '',
          dailyT2: '',
          dailyMath: ''
        });
      });

      guideWorksheet.columns = [
        { header: '출석유형 목록', key: 'attendanceStatus', width: 18 }
      ];
      guideWorksheet.getRow(1).font = { bold: true };

      ATTENDANCE_OPTIONS.forEach(status => {
        guideWorksheet.addRow({ attendanceStatus: status });
      });

      const guideStartRow = 2;
      const guideEndRow = ATTENDANCE_OPTIONS.length + 1;
      const validationFormula = `'출석유형_목록'!$A$${guideStartRow}:$A$${guideEndRow}`;

      for (let rowNumber = 2; rowNumber <= 500; rowNumber++) {
        const cell = worksheet.getCell(`F${rowNumber}`);

        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [validationFormula],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: '출석유형 선택 오류',
          error: '출석유형_목록에 있는 값만 선택해주세요.',
          promptTitle: '출석유형 선택',
          prompt: '드롭다운에서 출석유형을 선택해주세요.'
        };
      }

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: 'A1',
        to: 'I1'
      };

      guideWorksheet.state = 'veryHidden';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${className}_${targetMonth}_${targetDayIndex + 1}일_출석_Daily_업로드양식.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('출석/Daily 엑셀 양식 생성 오류:', error);
      showAlert('엑셀 양식 생성 중 오류가 발생했습니다.');
    }
  };

  const handleAttendanceDailyExcelUpload = (event, source = 'attendance') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (typeof window.XLSX === 'undefined') {
      showAlert('엑셀 모듈 로딩중입니다.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      try {
        const data = new Uint8Array(loadEvent.target.result);
        const workbook = window.XLSX.read(data, {
          type: 'array',
          cellDates: true
        });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          showAlert('엑셀 첫 번째 시트를 찾을 수 없습니다.');
          return;
        }

        const rows = window.XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: true
        });

        if (!rows.length) {
          showAlert('업로드할 데이터가 없습니다.');
          return;
        }

        const baseMonth = source === 'daily' ? dailyMonth : attendanceMonth;
        const fallbackDayIndex = source === 'daily'
          ? Number(batchDailyDate || 0)
          : Number(batchAttendanceDate || 0);

        const result = {
          total: rows.length,
          matchedStudents: new Set(),
          attendanceCount: 0,
          dailyCount: 0,
          matchFailCount: 0,
          statusErrorCount: 0,
          dateErrorCount: 0,
          duplicateNameCount: 0,
          noChangeCount: 0,
          errors: []
        };

        const dirtyMap = {};
        const nextStudents = students.map(student => ({
          ...student,
          attendance: student.attendance ? { ...student.attendance } : generateEmptyMonthlyAttendance(),
          dailyRecords: student.dailyRecords ? { ...student.dailyRecords } : generateEmptyMonthlyDaily()
        }));

        const studentIndexMap = {};

        nextStudents.forEach((student, index) => {
          studentIndexMap[student.id] = index;
        });

        rows.forEach((row, rowIndex) => {
          const excelRowNumber = rowIndex + 2;
          const { student, error } = findStudentByAttendanceDailyExcelRow(row, nextStudents);

          if (!student) {
            if (error === '중복 이름 확인 필요') {
              result.duplicateNameCount += 1;
            } else {
              result.matchFailCount += 1;
            }

            result.errors.push(`${excelRowNumber}행: ${error}`);
            return;
          }

          const targetIndex = studentIndexMap[student.id];

          if (targetIndex === undefined) {
            result.matchFailCount += 1;
            result.errors.push(`${excelRowNumber}행: 학생 매칭 실패`);
            return;
          }

          const dateValue = getRowValueByNormalizedKey(row, 'date');
          const parsedDate = parseExcelDateToDayIndex(dateValue, baseMonth, fallbackDayIndex);

          if (!parsedDate || parsedDate.dayIndex < 0 || parsedDate.dayIndex > 30) {
            result.dateErrorCount += 1;
            result.errors.push(`${excelRowNumber}행: 날짜 형식 오류`);
            return;
          }

          const targetMonth = parsedDate.month || baseMonth;
          const dayIndex = parsedDate.dayIndex;

          const rawAttendanceStatus = getRowValueByNormalizedKey(row, 'attendanceStatus');
          const attendanceStatus = normalizeAttendanceStatus(rawAttendanceStatus);

          const dailyT1 = String(getRowValueByNormalizedKey(row, 'dailyT1') ?? '').trim();
          const dailyT2 = String(getRowValueByNormalizedKey(row, 'dailyT2') ?? '').trim();
          const dailyMath = String(getRowValueByNormalizedKey(row, 'dailyMath') ?? '').trim();

          let changedAttendance = false;
          let changedDaily = false;

          const currentStudent = nextStudents[targetIndex];

          if (attendanceStatus === null) {
            result.statusErrorCount += 1;
            result.errors.push(`${excelRowNumber}행: 출석유형 값 오류 - "${rawAttendanceStatus}"`);
          } else if (attendanceStatus !== '') {
            const currentMonth = currentStudent.attendance?.[targetMonth] || generateEmptyMonthlyAttendance()[targetMonth];
            const currentAttendanceValue = currentMonth.am?.[dayIndex] || currentMonth.pm?.[dayIndex] || '';

            if (!isSameValueForDirtyCheck(currentAttendanceValue, attendanceStatus)) {
              const updatedAm = [...(currentMonth.am || Array(31).fill(''))];
              const updatedPm = [...(currentMonth.pm || Array(31).fill(''))];

              updatedAm[dayIndex] = attendanceStatus;
              updatedPm[dayIndex] = '';

              nextStudents[targetIndex] = {
                ...currentStudent,
                attendance: {
                  ...currentStudent.attendance,
                  [targetMonth]: {
                    ...currentMonth,
                    am: updatedAm,
                    pm: updatedPm
                  }
                }
              };

              changedAttendance = true;
              result.attendanceCount += 1;
            }
          }

          if (dailyT1 !== '' || dailyT2 !== '' || dailyMath !== '') {
            const studentAfterAttendance = nextStudents[targetIndex];
            const baseDaily = studentAfterAttendance.dailyRecords?.[targetMonth] || generateEmptyMonthlyDaily()[targetMonth];
            const currentDaily = { t1: '', t2: '', math: '', ...(baseDaily[dayIndex] || {}) };

            const shouldChangeDaily =
              (dailyT1 !== '' && !isSameValueForDirtyCheck(currentDaily.t1, dailyT1)) ||
              (dailyT2 !== '' && !isSameValueForDirtyCheck(currentDaily.t2, dailyT2)) ||
              (dailyMath !== '' && !isSameValueForDirtyCheck(currentDaily.math, dailyMath));

            if (shouldChangeDaily) {
              const newDaily = baseDaily.map(day => ({ t1: '', t2: '', math: '', ...(day || {}) }));

              newDaily[dayIndex] = {
                ...newDaily[dayIndex],
                ...(dailyT1 !== '' ? { t1: dailyT1 } : {}),
                ...(dailyT2 !== '' ? { t2: dailyT2 } : {}),
                ...(dailyMath !== '' ? { math: dailyMath } : {})
              };

              nextStudents[targetIndex] = {
                ...studentAfterAttendance,
                dailyRecords: {
                  ...studentAfterAttendance.dailyRecords,
                  [targetMonth]: newDaily
                }
              };

              changedDaily = true;
              result.dailyCount += 1;
            }
          }

          if (changedAttendance || changedDaily) {
            result.matchedStudents.add(student.id);

            if (!dirtyMap[student.id]) dirtyMap[student.id] = new Set();
            if (changedAttendance) dirtyMap[student.id].add('attendance');
            if (changedDaily) dirtyMap[student.id].add('dailyRecords');
          } else {
            result.noChangeCount += 1;
          }
        });

        setStudents(nextStudents);

        Object.entries(dirtyMap).forEach(([studentId, fields]) => {
          fields.forEach(field => markStudentDirty(studentId, field));
        });

        if (result.errors.length) {
          console.warn('출석/Daily 엑셀 업로드 오류 목록:', result.errors);
        }

        showAlert(
          `엑셀 업로드 완료\n총 ${result.total}행 중 ${result.matchedStudents.size}명 반영\n출석 ${result.attendanceCount}건, Daily ${result.dailyCount}건 반영\n매칭 실패 ${result.matchFailCount}건, 출석유형 오류 ${result.statusErrorCount}건, 날짜 오류 ${result.dateErrorCount}건, 중복 이름 ${result.duplicateNameCount}건\n변경 없음 ${result.noChangeCount}건`
        );
      } catch (error) {
        console.error('출석/Daily 엑셀 업로드 오류:', error);
        showAlert(`엑셀 업로드 중 오류가 발생했습니다.\n${error?.message || error}`);
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
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

    showConfirm(`선택한 ${selectedStudents.length}명의 ${attendanceMonth} ${Number(batchAttendanceDate) + 1}일 ${ATTENDANCE_SESSION_LABEL}을 '${batchAttendanceStatus}'(으)로 변경하시겠습니까?`, () => {
      setStudents(prev => prev.map(student => {
        if (!selectedStudents.includes(student.id)) return student;

        const currentMonth = student.attendance?.[attendanceMonth] || generateEmptyMonthlyAttendance()[attendanceMonth];
        const updatedAm = [...(currentMonth.am || Array(31).fill(''))];
        const updatedPm = [...(currentMonth.pm || Array(31).fill(''))];

        updatedAm[batchAttendanceDate] = batchAttendanceStatus;
        updatedPm[batchAttendanceDate] = '';

        return {
          ...student,
          attendance: {
            ...student.attendance,
            [attendanceMonth]: {
              ...currentMonth,
              am: updatedAm,
              pm: updatedPm
            }
          }
        };
      }));

      selectedStudents.forEach(studentId => markStudentDirty(studentId, 'attendance'));

      showAlert(`출결 일괄 적용이 완료되었습니다.`);
      setSelectedStudents([]);
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

        const newDaily = [...(student.studyTime?.[studyTimeMonth] || Array.from({length: 31}, () => ({in: '', out: ''})))];
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

      selectedStudents.forEach(studentId => markStudentDirty(studentId, 'studyTime'));

      showAlert(`학습시간 일괄 적용이 완료되었습니다.`);
      setSelectedStudents([]);
      setBatchStudyTimeIn('');
      setBatchStudyTimeOut('');
    });
  };

  const handleResetAttendance = (isAllMonth) => {
    if (selectedStudents.length === 0) { showAlert('초기화할 학생을 선택해주세요.'); return; }
    const targetMsg = isAllMonth ? `${attendanceMonth} 전체 출결` : `${attendanceMonth} ${Number(batchAttendanceDate) + 1}일 ${ATTENDANCE_SESSION_LABEL}`;
    showConfirm(`선택한 ${selectedStudents.length}명의 [${targetMsg}] 데이터를 초기화(삭제)하시겠습니까?`, () => {
      setStudents(prev => prev.map(student => {
        if (!selectedStudents.includes(student.id)) return student;

        const currentMonth = student.attendance?.[attendanceMonth] || generateEmptyMonthlyAttendance()[attendanceMonth];
        const updatedAm = [...(currentMonth.am || Array(31).fill(''))];
        const updatedPm = [...(currentMonth.pm || Array(31).fill(''))];

        if (isAllMonth) {
          return {
            ...student,
            attendance: {
              ...student.attendance,
              [attendanceMonth]: {
                ...currentMonth,
                am: Array(31).fill(''),
                pm: Array(31).fill(''),
                amMemo: Array(31).fill(''),
                pmMemo: Array(31).fill('')
              }
            }
          };
        } else {
          updatedAm[batchAttendanceDate] = '';
          updatedPm[batchAttendanceDate] = '';
          return {
            ...student,
            attendance: {
              ...student.attendance,
              [attendanceMonth]: {
                ...currentMonth,
                am: updatedAm,
                pm: updatedPm
              }
            }
          };
        }
      }));
      showAlert(`출결 초기화가 완료되었습니다.`);
      setSelectedStudents([]);
    });
  };

  const handleResetStudyTime = (isAllMonth) => {
    if (selectedStudents.length === 0) { showAlert('초기화할 학생을 선택해주세요.'); return; }
    const targetMsg = isAllMonth ? `${studyTimeMonth} 전체 학습시간` : `${studyTimeMonth} ${Number(batchStudyTimeDate) + 1}일 학습시간`;
    showConfirm(`선택한 ${selectedStudents.length}명의 [${targetMsg}] 데이터를 초기화(삭제)하시겠습니까?`, () => {
      setStudents(prev => prev.map(student => {
        if (!selectedStudents.includes(student.id)) return student;
        const newDaily = [...(student.studyTime[studyTimeMonth] || Array.from({length: 31}, () => ({in: '', out: ''})))];
        if (isAllMonth) {
          return { ...student, studyTime: { ...student.studyTime, [studyTimeMonth]: Array.from({length: 31}, () => ({in: '', out: ''})) } };
        } else {
          newDaily[batchStudyTimeDate] = { in: '', out: '' };
          return { ...student, studyTime: { ...student.studyTime, [studyTimeMonth]: newDaily } };
        }
      }));
      showAlert(`학습시간 초기화가 완료되었습니다.`);
      setSelectedStudents([]);
    });
  };

  // PDF 인쇄용 함수 + 월간 리포트 일괄 출력
  const getStudentClassList = (student) => {
    const list = [];

    if (Array.isArray(student.classNames)) list.push(...student.classNames);
    if (Array.isArray(student.classes)) list.push(...student.classes);
    if (student.className) list.push(student.className);

    return [...new Set(list.filter(Boolean))];
  };

  const getStudentClassNames = (student) => {
    const list = getStudentClassList(student);
    return list.length > 0 ? list.join(' / ') : '-';
  };

  const escapeHtml = (value) => {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const buildMonthlyReportPrintHtml = (targetStudents) => {
    const renderDiff = (value) => {
      const num = Number(value);
      if (value === '' || value === undefined || value === null || isNaN(num)) return '-';
      if (num > 0) return `<span class="up">+${num}</span>`;
      if (num < 0) return `<span class="down">${num}</span>`;
      return `<span>0</span>`;
    };

    const getMonthlyPercentTrend = (student) => {
      return DISPLAY_MONTHS.map((m) => {
        const monthScore = student.scores?.monthly?.[m] || {};
        const engPercent = Number(monthScore.english?.percent || 0);
        const mathPercent = Number(monthScore.math?.percent || 0);
        const totalPercent = Number(monthScore.total?.percent || 0);

        let value = totalPercent || engPercent || mathPercent || 0;

        return {
          month: m,
          value: isNaN(value) ? 0 : value
        };
      });
    };

    const getWeeklyScoreTrend = (student) => {
      const scoreKey = 'weeklyEnglish';

      return [1, 2, 3, 4, 5].map((week) => {
        const weekKey = `${selectedMonth}_w${week}`;
        const value = Number(student.scores?.[scoreKey]?.[weekKey] || 0);

        return {
          label: `${week}주`,
          value: isNaN(value) ? 0 : value
        };
      });
    };

    const getWeaknessTypes = (student) => {
      const stats = getMonthlyWeeklyStats(student, selectedMonth, 'english');
      const types = Object.entries(stats.typeStats || {}).map(([name, v]) => ({
        name,
        rate: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        total: v.total
      }));

      return types.slice(0, 5);
    };

    const renderMiniBarChart = (items, emptyText = '데이터가 없습니다.') => {
      if (!items || items.every(item => Number(item.value || 0) === 0)) {
        return `<div class="empty-chart">${emptyText}</div>`;
      }

      return `
        <div class="mini-chart">
          ${items.map(item => {
            const value = Math.max(0, Math.min(100, Number(item.value || 0)));
            return `
              <div class="mini-bar-item">
                <div class="mini-bar-value">${value ? value : '-'}</div>
                <div class="mini-bar-track">
                  <div class="mini-bar-fill" style="height:${value}%"></div>
                </div>
                <div class="mini-bar-label">${escapeHtml(item.month || item.label)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    const renderWeaknessBars = (types) => {
      if (!types || types.length === 0) {
        return `<div class="empty-chart">유형 데이터가 없습니다.</div>`;
      }

      const validTypes = types.filter(t => t.total > 0);
      const minRate = validTypes.length > 0 ? Math.min(...validTypes.map(t => t.rate)) : -1;

      return `
        <div class="weak-list">
          ${types.map(t => `
            <div class="weak-row">
              <span class="weak-name">${escapeHtml(t.name)}</span>
              <div class="weak-track">
                <div class="${t.rate === minRate && t.total > 0 ? 'weak-fill danger' : 'weak-fill'}" style="width:${Math.max(0, Math.min(100, t.rate))}%"></div>
              </div>
              <strong>${t.rate}%</strong>
            </div>
          `).join('')}
        </div>
      `;
    };

    const pages = targetStudents.map((student) => {
      const classNames = getStudentClassNames(student);
      const attRate = getAttendanceRateNum(student, selectedMonth);
      const dailyStats = getDailyStats(student.dailyRecords?.[selectedMonth], selectedMonth);
      const studyStats = getStudyTimeStats(student);
      const weeklyStats = getMonthlyWeeklyStats(student, selectedMonth, 'english');

      const monthScore = student.scores?.monthly?.[selectedMonth] || {};
      const eng = monthScore.english || {};
      const math = monthScore.math || {};
      const total = monthScore.total || {};
      const isHuman = student.targetTrack === '인문계';

      const monthlyTrend = getMonthlyPercentTrend(student);
      const weeklyTrend = getWeeklyScoreTrend(student);
      const weaknessTypes = getWeaknessTypes(student);

      return `
        <section class="report-page">
          <header class="report-header">
            <div>
              <div class="eyebrow">${escapeHtml(academicYear)} ACADEMIC REPORT</div>
              <h1>${escapeHtml(selectedMonth)} 월간 학습 리포트</h1>
            </div>

            <div class="issue-date">
              <span>DATE OF ISSUE</span>
              <strong>${new Date().toLocaleDateString('ko-KR')}</strong>
            </div>
          </header>

          <section class="student-box">
            <div class="student-main">
              <div class="avatar">${escapeHtml(student.name?.charAt(0) || '')}</div>
              <div>
                <h2>${escapeHtml(student.name)} <span>학생</span></h2>
                <p>${escapeHtml(student.userId || student.id || '-')}</p>
              </div>
            </div>

            <div class="student-info">
              <div>
                <span>수강반</span>
                <strong>${escapeHtml(classNames)}</strong>
              </div>
              <div>
                <span>목표계열</span>
                <strong>${escapeHtml(student.targetTrack || '-')}</strong>
              </div>
              <div>
                <span>기준월</span>
                <strong>${escapeHtml(selectedMonth)}</strong>
              </div>
            </div>
          </section>

          <section class="kpi-grid">
            <div class="kpi-card">
              <span>월간 출석률</span>
              <strong class="green">${attRate}%</strong>
              <p>출결 관리 핵심 지표</p>
            </div>

            <div class="kpi-card">
              <span>Daily 참여율</span>
              <strong class="blue">${dailyStats.rate}%</strong>
              <p>평균 ${dailyStats.avg}점 / 총 ${dailyStats.sum}점</p>
            </div>

            <div class="kpi-card">
              <span>누적 학습시간</span>
              <strong class="purple">${escapeHtml(studyStats.totalStr)}</strong>
              <p>기록일 ${studyStats.daysStudied}일</p>
            </div>

            <div class="kpi-card">
              <span>Weekly 평균</span>
              <strong class="dark">${weeklyStats.avgScore !== '-' ? `${weeklyStats.avgScore}점` : '-'}</strong>
              <p>영어 기준</p>
            </div>
          </section>

          <h3 class="section-title">${escapeHtml(selectedMonth)} 월례고사 성적 요약</h3>

          <table class="score-table">
            <thead>
              <tr>
                <th>과목</th>
                <th>원점수</th>
                <th>백분위</th>
                <th>반 석차</th>
                <th>전국 석차</th>
                <th>계열평균 대비</th>
                <th>상위30% 대비</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>영어</td>
                <td>${escapeHtml(eng.score || '-')}</td>
                <td>${eng.percent ? `${escapeHtml(eng.percent)}%` : '-'}</td>
                <td>${eng.classRank ? `${escapeHtml(eng.classRank)}등` : '-'}</td>
                <td>${eng.totalRank ? `${escapeHtml(eng.totalRank)}등` : '-'}</td>
                <td>${renderDiff(eng.trackAvgDiff)}</td>
                <td>${renderDiff(eng.top30Diff)}</td>
              </tr>

              ${
                !isHuman
                  ? `
                    <tr>
                      <td>수학</td>
                      <td>${escapeHtml(math.score || '-')}</td>
                      <td>${math.percent ? `${escapeHtml(math.percent)}%` : '-'}</td>
                      <td>${math.classRank ? `${escapeHtml(math.classRank)}등` : '-'}</td>
                      <td>${math.totalRank ? `${escapeHtml(math.totalRank)}등` : '-'}</td>
                      <td>${renderDiff(math.trackAvgDiff)}</td>
                      <td>${renderDiff(math.top30Diff)}</td>
                    </tr>

                    <tr>
                      <td>영어+수학</td>
                      <td>${escapeHtml(total.score || '-')}</td>
                      <td>${total.percent ? `${escapeHtml(total.percent)}%` : '-'}</td>
                      <td>${total.classRank ? `${escapeHtml(total.classRank)}등` : '-'}</td>
                      <td>${total.totalRank ? `${escapeHtml(total.totalRank)}등` : '-'}</td>
                      <td>${renderDiff(total.trackAvgDiff)}</td>
                      <td>${renderDiff(total.top30Diff)}</td>
                    </tr>
                  `
                  : ''
              }
            </tbody>
          </table>

          <section class="analysis-grid analysis-grid-top">
            <div class="analysis-card wide">
              <h3 class="section-title small-title">월별 월례고사 성적 추이(백분위)</h3>
              ${renderMiniBarChart(monthlyTrend, '월례고사 백분위 데이터가 없습니다.')}
            </div>
          </section>

          <section class="analysis-grid">
            <div class="analysis-card">
              <h3 class="section-title small-title">${escapeHtml(selectedMonth)} Weekly 점수 추이</h3>
              ${renderMiniBarChart(weeklyTrend, 'Weekly 점수 데이터가 없습니다.')}
            </div>

            <div class="analysis-card">
              <h3 class="section-title small-title">${escapeHtml(selectedMonth)} 유형별 취약점 분석</h3>
              ${renderWeaknessBars(weaknessTypes)}
            </div>
          </section>

          <section class="comment-section">
            <h3 class="section-title small-title">담당 선생님 종합 코멘트</h3>
            <div class="comment-box">
              ${escapeHtml(student.notes || '이번 달 학습 현황을 바탕으로 출결, Daily 참여율, Weekly 및 월례고사 성적을 지속적으로 점검해 주세요.')}
            </div>
          </section>
        </section>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(selectedMonth)} 월간 리포트</title>

          <style>
            @page {
              size: A4;
              margin: 6mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #e5e7eb;
              font-family: Arial, "Noto Sans KR", sans-serif;
              color: #0f172a;
            }

            .report-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 9mm;
              background: #ffffff;
              page-break-after: always;
              position: relative;
              overflow: hidden;
            }

            .report-page:last-child {
              page-break-after: auto;
            }

            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 3px solid #0f172a;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }

            .eyebrow {
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 1.2px;
              color: #4f46e5;
              margin-bottom: 3px;
            }

            h1 {
              margin: 0;
              font-size: 22px;
              line-height: 1.15;
            }

            .issue-date {
              text-align: right;
              font-size: 9px;
              color: #64748b;
            }

            .issue-date strong {
              display: block;
              margin-top: 2px;
              color: #334155;
              font-size: 10px;
            }

            .student-box {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 9px 11px;
              margin-bottom: 10px;
              gap: 14px;
            }

            .student-main {
              display: flex;
              align-items: center;
              gap: 10px;
              min-width: 180px;
            }

            .avatar {
              width: 34px;
              height: 34px;
              border-radius: 999px;
              background: #e0e7ff;
              color: #4f46e5;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 17px;
              font-weight: 900;
            }

            .student-main h2 {
              margin: 0;
              font-size: 15px;
            }

            .student-main h2 span {
              font-size: 10px;
              color: #64748b;
            }

            .student-main p {
              margin: 2px 0 0;
              font-size: 9px;
              color: #64748b;
            }

            .student-info {
              display: flex;
              gap: 18px;
              font-size: 10px;
              text-align: left;
            }

            .student-info span {
              display: block;
              color: #94a3b8;
              font-weight: 800;
              margin-bottom: 2px;
            }

            .student-info strong {
              color: #334155;
            }

            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 7px;
              margin-bottom: 10px;
            }

            .kpi-card {
              border: 1px solid #e2e8f0;
              border-radius: 11px;
              padding: 8px;
              background: #ffffff;
            }

            .kpi-card span {
              display: block;
              font-size: 9px;
              color: #64748b;
              font-weight: 800;
              margin-bottom: 4px;
            }

            .kpi-card strong {
              font-size: 18px;
              font-weight: 900;
            }

            .kpi-card p {
              margin: 4px 0 0;
              font-size: 8px;
              color: #94a3b8;
              font-weight: 700;
            }

            .green { color: #059669; }
            .blue { color: #2563eb; }
            .purple { color: #4f46e5; }
            .dark { color: #1e293b; }

            .section-title {
              font-size: 11px;
              font-weight: 900;
              margin: 9px 0 6px;
            }

            .small-title {
              margin-top: 0;
              margin-bottom: 6px;
            }

            .score-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              margin-bottom: 9px;
            }

            .score-table th {
              background: #f1f5f9;
              color: #475569;
              padding: 5px;
              border: 1px solid #e2e8f0;
              font-weight: 900;
            }

            .score-table td {
              padding: 5px;
              border: 1px solid #e2e8f0;
              text-align: center;
              font-weight: 700;
            }

            .score-table td:first-child {
              background: #f8fafc;
              color: #334155;
              font-weight: 900;
            }

            .up {
              color: #2563eb;
              font-weight: 900;
            }

            .down {
              color: #e11d48;
              font-weight: 900;
            }

            .analysis-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 8px;
            }

            .analysis-grid-top {
              grid-template-columns: 1fr;
            }

            .analysis-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 8px;
              min-height: 106px;
              background: #ffffff;
            }

            .analysis-card.wide {
              min-height: 118px;
            }

            .mini-chart {
              height: 76px;
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 5px;
              border-left: 1px solid #e2e8f0;
              border-bottom: 1px solid #e2e8f0;
              padding: 5px 5px 0 5px;
            }

            .mini-bar-item {
              flex: 1;
              height: 100%;
              min-width: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
              gap: 2px;
            }

            .mini-bar-value {
              font-size: 8px;
              color: #2563eb;
              font-weight: 900;
              min-height: 10px;
            }

            .mini-bar-track {
              width: 13px;
              height: 44px;
              background: #eef2ff;
              border-radius: 999px;
              display: flex;
              align-items: flex-end;
              overflow: hidden;
            }

            .mini-bar-fill {
              width: 100%;
              background: #2563eb;
              border-radius: 999px;
            }

            .mini-bar-label {
              font-size: 7.5px;
              color: #64748b;
              font-weight: 800;
              white-space: nowrap;
            }

            .weak-list {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .weak-row {
              display: grid;
              grid-template-columns: 38px 1fr 32px;
              align-items: center;
              gap: 6px;
              font-size: 8.5px;
            }

            .weak-name {
              font-weight: 800;
              color: #475569;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }

            .weak-track {
              height: 8px;
              background: #f1f5f9;
              border-radius: 999px;
              overflow: hidden;
            }

            .weak-fill {
              height: 100%;
              background: #10b981;
              border-radius: 999px;
            }

            .weak-fill.danger {
              background: #fb7185;
            }

            .weak-row strong {
              text-align: right;
              color: #334155;
            }

            .empty-chart {
              height: 72px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #94a3b8;
              font-size: 9px;
              font-weight: 700;
              background: #f8fafc;
              border-radius: 10px;
            }

            .comment-section {
              margin-top: 4px;
            }

            .comment-box {
              min-height: 48px;
              max-height: 66px;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 12px;
              padding: 8px;
              font-size: 9.5px;
              line-height: 1.45;
              color: #334155;
              white-space: pre-wrap;
            }

            @media print {
              body {
                background: #ffffff;
              }

              .report-page {
                margin: 0;
                width: auto;
                min-height: auto;
                box-shadow: none;
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          ${pages}

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const targetStudents =
      selectedReportIds.length > 0
        ? students.filter(s => selectedReportIds.includes(s.id))
        : reportStudent
          ? [reportStudent]
          : [];

    if (targetStudents.length === 0) {
      showAlert('출력할 학생을 선택해주세요.');
      return;
    }

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      showAlert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildMonthlyReportPrintHtml(targetStudents));
    printWindow.document.close();
  };

  // 5단계: 학생 명단 엑셀 다운로드 (Export)
  const handleExportStudentsExcel = () => {
    if (typeof window.XLSX === 'undefined') { showAlert("엑셀 모듈 로딩중입니다."); return; }
    const data = filteredStudents.map((s, i) => ({
      "NO": i + 1,
      "학생명": s.name,
      "아이디/수험번호": `${s.userId || '-'} / ${s.id || '-'}`,
      "수강반": Array.isArray(s.classNames) ? s.classNames.join(' / ') : (s.className || '-'),
      "연락처": s.contact || '-',
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
      const monthData = s.attendance?.[attendanceMonth] || {};
      const attendanceData = getUnifiedAttendanceArray(monthData);

      const row = {
        "이름": s.name,
        "아이디": s.userId || s.id,
        "출석률": getAttendanceRate(s, attendanceMonth),
        "구분": ATTENDANCE_SESSION_LABEL,
        "벌점": getAttendancePenalty(s, attendanceMonth)
      };

      for(let i=0; i<31; i++) {
         row[`${i+1}일`] = attendanceData[i] || '';
      }

      data.push(row);
    });

    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, `${attendanceMonth}_출결`);
    window.XLSX.writeFile(wb, `${attendanceMonth}_출결현황_${academicYear}.xlsx`);
  };
  
  const currentMonthLabel = `${new Date().getMonth() + 1}월`;

  const [attendanceMonth, setAttendanceMonth] = useState(currentMonthLabel);
  const [studyTimeMonth, setStudyTimeMonth] = useState(currentMonthLabel);
  const [dailyMonth, setDailyMonth] = useState(currentMonthLabel);
  const [weeklyMonth, setWeeklyMonth] = useState(currentMonthLabel);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel); 
  const [detailSelectedMonth, setDetailSelectedMonth] = useState(currentMonthLabel);
  const [dashboardMonth, setDashboardMonth] = useState(currentMonthLabel);

  const createDefaultDailySettings = () => {
    const settings = {};
    MONTHS.forEach(m => settings[m] = { excludedDays: [] });
    return settings;
  };

  const createDefaultAttendanceSettings = () => {
    const settings = {};
    MONTHS.forEach(m => settings[m] = { excludedDays: [] });
    return settings;
  };

  const createDefaultPenaltyRules = () => {
      const rules = {};
      ATTENDANCE_OPTIONS.forEach(opt => {
          rules[opt] = {
              apply: opt === '결석' || opt === '지각' || opt === '조퇴',
              score: opt === '결석' ? 2 : opt === '지각' || opt === '조퇴' ? 1 : 0
          };
      });
      return { maxPenalty: 20, rules };
  };

  const getClassSettingsStorageKey = () => `academyClassSettings_${academicYear}_${className}`;

  const loadClassSettings = () => {
      const defaults = {
          dailySettings: createDefaultDailySettings(),
          attendanceSettings: createDefaultAttendanceSettings(),
          penaltyRules: createDefaultPenaltyRules()
      };

      try {
          const saved = localStorage.getItem(getClassSettingsStorageKey());
          if (!saved) return defaults;

          const parsed = JSON.parse(saved);

          return {
              dailySettings: {
                  ...defaults.dailySettings,
                  ...(parsed.dailySettings || {})
              },
              attendanceSettings: {
                  ...defaults.attendanceSettings,
                  ...(parsed.attendanceSettings || {})
              },
              penaltyRules: {
                  ...defaults.penaltyRules,
                  ...(parsed.penaltyRules || {}),
                  rules: {
                      ...defaults.penaltyRules.rules,
                      ...(parsed.penaltyRules?.rules || {})
                  }
              }
          };
      } catch (e) {
          console.error('반별 설정 불러오기 오류:', e);
          return defaults;
      }
  };

  const [dailySettings, setDailySettings] = useState(() => loadClassSettings().dailySettings);
  const [attendanceSettings, setAttendanceSettings] = useState(() => loadClassSettings().attendanceSettings);
  const [penaltyRules, setPenaltyRules] = useState(() => loadClassSettings().penaltyRules);

  useEffect(() => {
      try {
          localStorage.setItem(
              getClassSettingsStorageKey(),
              JSON.stringify({
                  dailySettings,
                  attendanceSettings,
                  penaltyRules
              })
          );
      } catch (e) {
          console.error('반별 설정 저장 오류:', e);
      }
  }, [academicYear, className, dailySettings, attendanceSettings, penaltyRules]);

  const handlePenaltyRuleChange = (opt, field, val) => {
      setPenaltyRules(prev => ({
          ...prev,
          rules: { ...prev.rules, [opt]: { ...prev.rules[opt], [field]: val } }
      }));

      markClassSettingsDirty(className, 'penaltyRules');
  };

  const [monthlySummaries, setMonthlySummaries] = useState({
    '3월': { engAvg: 55, engTop30: 80, mathAvg: 60, mathTop30: 85, totAvg: 115, totTop30: 165 },
    '4월': { engAvg: 57.1, engTop30: 78.2, mathAvg: 74.3, mathTop30: 93.6, totAvg: 131.4, totTop30: 171.8 }
  });

  const [selectedWeek, setSelectedWeek] = useState(1);

  const getWeeklyMonthNumber = (monthLabel) => {
    const parsed = parseInt(String(monthLabel || '').replace('월', ''), 10);
    return Number.isFinite(parsed) ? parsed : new Date().getMonth() + 1;
  };

  const getWeeklyMonthKeyFromDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getWeeklyMonthLabelFromDateValue = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getMonth() + 1}월`;
  };

  const createDefaultWeeklySetting = (subject, month, week) => {
    const isEnglish = subject === 'english';

    return {
      subject,
      testName: `${month} ${week}주차 Weekly`,
      testDate: '',
      testMonth: '',
      weekRound: week,
      targetClasses: className === '대구캠퍼스 전체' ? [] : [className],
      maxScore: 100,
      answers: Array(isEnglish ? 40 : 30).fill(''),
      types: Array(isEnglish ? 40 : 30).fill(''),
      ...(isEnglish ? {} : { qCount: 20, qScore: 5 })
    };
  };

  const createDefaultWeeklySettings = () => {
    const settings = { english: {}, math: {} };

    MONTHS.forEach(month => {
      settings.english[month] = {};
      settings.math[month] = {};

      for (let week = 1; week <= 5; week++) {
        settings.english[month][week] = createDefaultWeeklySetting('english', month, week);
        settings.math[month][week] = createDefaultWeeklySetting('math', month, week);
      }
    });

    return settings;
  };

  const normalizeWeeklySettings = (savedSettings) => {
    const defaults = createDefaultWeeklySettings();
    const saved = savedSettings || {};

    ['english', 'math'].forEach(subject => {
      MONTHS.forEach(month => {
        for (let week = 1; week <= 5; week++) {
          const base = defaults[subject][month][week];
          const savedItem = saved?.[subject]?.[month]?.[week] || {};

          defaults[subject][month][week] = {
            ...base,
            ...savedItem,
            subject,
            testName: savedItem.testName || base.testName,
            testDate: savedItem.testDate || '',
            testMonth: savedItem.testMonth || getWeeklyMonthKeyFromDate(savedItem.testDate) || '',
            weekRound: savedItem.weekRound || week,
            targetClasses: Array.isArray(savedItem.targetClasses)
              ? savedItem.targetClasses
              : base.targetClasses,
            maxScore: Number(savedItem.maxScore || base.maxScore || 100),
            answers: Array.isArray(savedItem.answers) ? savedItem.answers : base.answers,
            types: Array.isArray(savedItem.types) ? savedItem.types : base.types
          };
        }
      });
    });

    return defaults;
  };

  const getWeeklySettingsStorageKey = () => `academyWeeklySettings_${academicYear}_${className}`;

  const [weeklySettings, setWeeklySettings] = useState(() => {
    try {
      const saved = localStorage.getItem(getWeeklySettingsStorageKey());
      return normalizeWeeklySettings(saved ? JSON.parse(saved) : null);
    } catch (error) {
      console.error('Weekly 설정 불러오기 오류:', error);
      return createDefaultWeeklySettings();
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getWeeklySettingsStorageKey());
      setWeeklySettings(normalizeWeeklySettings(saved ? JSON.parse(saved) : null));
    } catch (error) {
      console.error('Weekly 설정 불러오기 오류:', error);
      setWeeklySettings(createDefaultWeeklySettings());
    }
  }, [academicYear, className]);

  useEffect(() => {
    try {
      localStorage.setItem(getWeeklySettingsStorageKey(), JSON.stringify(weeklySettings));
    } catch (error) {
      console.error('Weekly 설정 저장 오류:', error);
    }
  }, [academicYear, className, weeklySettings]);

  const getWeeklySetting = (subject = weeklySubject, month = weeklyMonth, week = selectedWeek) => {
    return weeklySettings?.[subject]?.[month]?.[week] || createDefaultWeeklySetting(subject, month, week);
  };

  const buildWeeklyTestId = (subject = weeklySubject, month = weeklyMonth, week = selectedWeek, setting = getWeeklySetting(subject, month, week)) => {
    const safeClassName = className === '대구캠퍼스 전체' ? 'all' : className;
    const datePart = setting?.testDate || `${academicYear}-${String(getWeeklyMonthNumber(month)).padStart(2, '0')}-w${week}`;
    return `weekly_${datePart}_${subject}_${safeClassName}`.replace(/[^\w가-힣-]/g, '_');
  };

  const updateWeeklySetting = (patch) => {
    setWeeklySettings(prev => {
      const current = prev?.[weeklySubject]?.[weeklyMonth]?.[selectedWeek] || createDefaultWeeklySetting(weeklySubject, weeklyMonth, selectedWeek);
      const nextItem = {
        ...current,
        ...patch
      };

      if (patch.testDate !== undefined) {
        nextItem.testMonth = getWeeklyMonthKeyFromDate(patch.testDate);
      }

      return {
        ...prev,
        [weeklySubject]: {
          ...prev[weeklySubject],
          [weeklyMonth]: {
            ...prev[weeklySubject]?.[weeklyMonth],
            [selectedWeek]: nextItem
          }
        }
      };
    });
  };

  const getWeeklySettingDateText = (subject = weeklySubject, month = weeklyMonth, week = selectedWeek) => {
    const setting = getWeeklySetting(subject, month, week);
    return setting.testDate ? setting.testDate.replaceAll('-', '.') : '시험일 미설정';
  };

  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState('student'); 
  const [uploadMode, setUploadMode] = useState('merge'); // merge | classOverwrite | allOverwrite
  const [uploadTargetDay, setUploadTargetDay] = useState(null); 
  const fileInputRef = useRef(null);
  const omrFileInputRef = useRef(null);

  const studyTimeTopScrollRef = useRef(null);
  const studyTimeBodyScrollRef = useRef(null);
  const isSyncingStudyTimeScroll = useRef(false);

  const syncStudyTimeScroll = (source) => {
    const top = studyTimeTopScrollRef.current;
    const body = studyTimeBodyScrollRef.current;

    if (!top || !body || isSyncingStudyTimeScroll.current) return;

    isSyncingStudyTimeScroll.current = true;

    if (source === 'top') {
      body.scrollLeft = top.scrollLeft;
    } else {
      top.scrollLeft = body.scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingStudyTimeScroll.current = false;
    });
  };

  const attendanceTopScrollRef = useRef(null);
  const attendanceBodyScrollRef = useRef(null);
  const isSyncingAttendanceScroll = useRef(false);

  const syncAttendanceScroll = (source) => {
    const top = attendanceTopScrollRef.current;
    const body = attendanceBodyScrollRef.current;

    if (!top || !body || isSyncingAttendanceScroll.current) return;

    isSyncingAttendanceScroll.current = true;

    if (source === 'top') {
      body.scrollLeft = top.scrollLeft;
    } else {
      top.scrollLeft = body.scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingAttendanceScroll.current = false;
    });
  };

  const dailyTopScrollRef = useRef(null);
  const dailyBodyScrollRef = useRef(null);
  const isSyncingDailyScroll = useRef(false);

  const syncDailyScroll = (source) => {
    const top = dailyTopScrollRef.current;
    const body = dailyBodyScrollRef.current;

    if (!top || !body || isSyncingDailyScroll.current) return;

    isSyncingDailyScroll.current = true;

    if (source === 'top') {
      body.scrollLeft = top.scrollLeft;
    } else {
      top.scrollLeft = body.scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingDailyScroll.current = false;
    });
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({ name: '', userId: '', targetTrack: '인문계', startMonth: '1월' });

  const classStudents = useMemo(() => {
    if (className === '대구캠퍼스 전체') return students;
    return students.filter(s => (s.classNames || [s.className]).includes(className));
  }, [students, className]);

  const getUnifiedAttendanceArray = (monthData = {}) => {
      const am = monthData.am || Array(31).fill('');
      const pm = monthData.pm || Array(31).fill('');
      return Array.from({ length: 31 }, (_, i) => am[i] || pm[i] || '');
  };

  const getUnifiedAttendanceMemoArray = (monthData = {}) => {
      const amMemo = monthData.amMemo || Array(31).fill('');
      const pmMemo = monthData.pmMemo || Array(31).fill('');
      return Array.from({ length: 31 }, (_, i) => amMemo[i] || pmMemo[i] || '');
  };

  const isAttendancePresent = (value) => ATTENDANCE_PRESENT_STATUSES.includes(value);

  const getAttendanceDayLimit = (month) => {
      const currentMonth = `${new Date().getMonth() + 1}월`;

      if (month === currentMonth) {
          return Math.max(1, Math.min(31, new Date().getDate()));
      }

      return 31;
  };

  const getAttendanceRate = (student, month) => {
      const excluded = attendanceSettings[month]?.excludedDays || [];
      const attendanceData = getUnifiedAttendanceArray(student.attendance?.[month] || {});
      const dayLimit = getAttendanceDayLimit(month);
      let totalDays = 0, attendedDays = 0;

      for(let i=0; i<dayLimit; i++) {
          if(excluded.includes(i)) continue;

          const value = attendanceData[i];
          const type = getAttendanceValueType(value);

          if (type === 'neutral') continue;

          totalDays++;
          if (type === 'present') attendedDays++;
      }

      return totalDays === 0 ? "0%" : `${Math.round((attendedDays / totalDays) * 100)}%`;
  }

  const getAttendanceRateNum = (student, month) => {
      const excluded = attendanceSettings[month]?.excludedDays || [];
      const attendanceData = getUnifiedAttendanceArray(student.attendance?.[month] || {});
      const dayLimit = getAttendanceDayLimit(month);
      let totalDays = 0, attendedDays = 0;

      for(let i=0; i<dayLimit; i++) {
          if(excluded.includes(i)) continue;

          const value = attendanceData[i];
          const type = getAttendanceValueType(value);

          if (type === 'neutral') continue;

          totalDays++;
          if (type === 'present') attendedDays++;
      }

      return totalDays === 0 ? 0 : Math.round((attendedDays / totalDays) * 100);
  }

  const getDashboardAlerts = () => {
    const alerts = { attendance: [], dailyScore: [], studyTime: [] };
    classStudents.forEach(s => {
      const attRate = getAttendanceRateNum(s, dashboardMonth);
      if(attRate > 0 && attRate < 80) alerts.attendance.push({name: s.name, val: `${attRate}%`});
      
      const dRecords = s.dailyRecords[dashboardMonth] || Array(31).fill({t1:'', t2:'', math:''});
      const dStats = getDailyStats(dRecords, dashboardMonth);
      if(dStats.count > 0 && Number(dStats.avg) < 60) alerts.dailyScore.push({name: s.name, val: `${dStats.avg}점`});
    });

    const studyRanks = [...classStudents].map(s => ({name: s.name, val: getStudyTimeStats(s).totalMins})).sort((a,b) => a.val - b.val);
    alerts.studyTime = studyRanks.slice(0, 3).filter(s => s.val > 0).map(s => ({name: s.name, val: formatMinsToTime(s.val)}));
    
    return alerts;
  };

  const getAttendancePenalty = (student, month) => {
      const excluded = attendanceSettings[month]?.excludedDays || [];
      const attendanceData = getUnifiedAttendanceArray(student.attendance?.[month] || {});
      let penalty = 0;

      for(let i=0; i<31; i++) {
          if(!excluded.includes(i)) {
              const value = attendanceData[i];
              if (value && penaltyRules.rules[value]?.apply) {
                  penalty += Number(penaltyRules.rules[value].score || 0);
              }
          }
      }

      return penalty;
  }

  const getStudyTimeCurrent = (student, month) => {
      const daily = student.studyTime[month] || [];
      return calculateTotalStudyTime(daily);
  }

  const getDailyStats = (records, month, subject = 'english') => {
    const excluded = dailySettings[month]?.excludedDays || [];
    let sum = 0, count = 0;
    const validDays = 31 - excluded.length;
    const testsPerDay = subject === 'math' ? 1 : 2;
    const MAX_POSSIBLE = validDays * testsPerDay;

    if(!records) return { sum: 0, avg: 0, rate: 0, missedRate: 0, count: 0, MAX_POSSIBLE };

    records.forEach((r, idx) => {
        if(!excluded.includes(idx)) {
            const row = { t1: '', t2: '', math: '', ...(r || {}) };
            if (subject === 'math') {
                if (row.math !== '') { sum += Number(row.math); count++; }
            } else {
                if (row.t1 !== '') { sum += Number(row.t1); count++; }
                if (row.t2 !== '') { sum += Number(row.t2); count++; }
            }
        }
    });

    const avg = count > 0 ? (sum / count).toFixed(1) : 0;
    const rate = MAX_POSSIBLE > 0 ? Math.round((count / MAX_POSSIBLE) * 100) : 0;
    const missedRate = MAX_POSSIBLE > 0 ? Math.round(((MAX_POSSIBLE - count) / MAX_POSSIBLE) * 100) : 0;

    return { sum, avg, rate, missedRate, count, MAX_POSSIBLE };
  };

  const getWeeklyMetaEntriesForStudent = (student, subject) => {
      return Object.values(student.scores?.weeklyMeta || {})
          .filter(meta => {
              if (!meta?.testDate) return false;
              if (meta.subject !== subject) return false;
              if (!Number.isFinite(Number(meta.score))) return false;
              return true;
          })
          .sort((a, b) => String(b.testDate || '').localeCompare(String(a.testDate || '')));
  };

  const getWeeklyMetaMonthLabel = (meta) => {
      return getWeeklyMonthLabelFromDateValue(meta?.testDate);
  };

  const getMonthlyWeeklyStats = (student, month, subject) => {
      let totalScore = 0, testCount = 0, totalCorrect = 0, totalQuestions = 0;
      const typeStats = {};

      const entries = getWeeklyMetaEntriesForStudent(student, subject)
          .filter(meta => getWeeklyMetaMonthLabel(meta) === month);

      entries.forEach(meta => {
          totalScore += Number(meta.score);
          testCount++;

          const details = Array.isArray(meta.details) ? meta.details : [];

          details.forEach(item => {
              if (!typeStats[item.type]) typeStats[item.type] = { correct: 0, total: 0 };
              typeStats[item.type].total++;
              totalQuestions++;

              if (item.isCorrect) {
                  typeStats[item.type].correct++;
                  totalCorrect++;
              }
          });
      });

      const avgScore = testCount > 0 ? (totalScore / testCount).toFixed(1) : '-';
      const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : '-';

      return { avgScore, overallRate, typeStats, testCount };
  };

  const getOverallWeeklyStats = (student, subject) => {
      let totalScore = 0, testCount = 0, totalCorrect = 0, totalQuestions = 0;
      const typeStats = {};
      const monthlyScores = {};
      const startIdx = MONTHS.indexOf(student.startMonth || '1월');
      const entries = getWeeklyMetaEntriesForStudent(student, subject);

      MONTHS.forEach((month, idx) => {
          if (idx < startIdx) {
              monthlyScores[month] = '-';
              return;
          }

          const monthEntries = entries.filter(meta => getWeeklyMetaMonthLabel(meta) === month);
          let monthScore = 0;
          let monthCount = 0;

          monthEntries.forEach(meta => {
              const score = Number(meta.score);

              if (Number.isFinite(score)) {
                  totalScore += score;
                  testCount++;
                  monthScore += score;
                  monthCount++;
              }

              const details = Array.isArray(meta.details) ? meta.details : [];

              details.forEach(item => {
                  if (!typeStats[item.type]) typeStats[item.type] = { correct: 0, total: 0 };
                  typeStats[item.type].total++;
                  totalQuestions++;

                  if (item.isCorrect) {
                      typeStats[item.type].correct++;
                      totalCorrect++;
                  }
              });
          });

          monthlyScores[month] = monthCount > 0 ? (monthScore / monthCount).toFixed(1) : '-';
      });

      const avgScore = testCount > 0 ? (totalScore / testCount).toFixed(1) : '-';
      const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : '-';

      return { avgScore, overallRate, typeStats, testCount, monthlyScores };
  };

  const getOverallDailyStats = (student) => {
      let totalSum = 0, totalCount = 0, totalMax = 0;
      const startIdx = MONTHS.indexOf(student.startMonth || '1월');

      MONTHS.forEach((m, idx) => {
          if (idx < startIdx) return;
          const dRecords = student.dailyRecords[m] || Array(31).fill({t1:'', t2:'', math:''});
          const stats = getDailyStats(dRecords, m);
          totalSum += stats.sum; totalCount += stats.count; totalMax += stats.MAX_POSSIBLE;
      });
      const avgScore = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;
      const rate = totalMax > 0 ? Math.round((totalCount / totalMax) * 100) : 0;
      const missedRate = totalMax > 0 ? Math.round(((totalMax - totalCount) / totalMax) * 100) : 0;
      return { avgScore, rate, missedRate };
  }

  const classAvgAttendance = useMemo(() => {
    if (classStudents.length === 0) return 0;

    const excluded = attendanceSettings[attendanceMonth]?.excludedDays || [];
    const currentMonth = `${new Date().getMonth() + 1}월`;
    const dayLimit = attendanceMonth === currentMonth
      ? Math.max(1, Math.min(31, new Date().getDate()))
      : 31;

    let denominator = 0;
    let presentCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;

      classStudents.forEach(student => {
        const attendanceData = getUnifiedAttendanceArray(student.attendance?.[attendanceMonth] || {});
        const type = getAttendanceValueType(attendanceData?.[dayIndex]);

        if (type === 'neutral') return;

        denominator += 1;
        if (type === 'present') presentCount += 1;
      });
    }

    return denominator === 0 ? 0 : Math.round((presentCount / denominator) * 100);
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
        const dRecords = s.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:'', math:''});
        const stats = getDailyStats(dRecords, dailyMonth, dailySubject);
        totalSum += stats.sum; totalCount += stats.count; totalMax += stats.MAX_POSSIBLE;
    });
    const avgScore = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;
    const avgRate = totalMax > 0 ? Math.round((totalCount / totalMax) * 100) : 0;
    return { avgScore, avgRate };
  }, [classStudents, dailyMonth, dailySettings, dailySubject]);


  const getDashboardPrevMonth = (month) => {
    const index = MONTHS.indexOf(month);
    if (index <= 0) return null;
    return MONTHS[index - 1];
  };

  const formatDashboardDelta = (current, prev, suffix = '') => {
    const currentNum = Number(current);
    const prevNum = Number(prev);

    if (!Number.isFinite(currentNum) || !Number.isFinite(prevNum) || prevNum <= 0) {
      return {
        text: '비교 데이터 없음',
        className: 'text-slate-400'
      };
    }

    const diff = Number((currentNum - prevNum).toFixed(1));
    const isUp = diff >= 0;

    return {
      text: `${isUp ? '▲' : '▼'} ${Math.abs(diff)}${suffix} (전월 대비)`,
      className: isUp ? 'text-emerald-600' : 'text-rose-600'
    };
  };

  const getClassAttendanceRateForMonth = (month = dashboardMonth) => {
    if (classStudents.length === 0) return 0;

    const excluded = attendanceSettings[month]?.excludedDays || [];
    const dayLimit = getClassMonthDayLimit(month);

    let denominator = 0;
    let presentCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;

      classStudents.forEach(student => {
        const attendanceData = getUnifiedAttendanceArray(student.attendance?.[month] || {});
        const type = getAttendanceValueType(attendanceData?.[dayIndex]);

        if (type === 'neutral') return;

        denominator += 1;

        if (type === 'present') {
          presentCount += 1;
        }
      });
    }

    return denominator === 0 ? 0 : Math.round((presentCount / denominator) * 100);
  };

  const getClassDailyRateForMonth = (month = dashboardMonth, subject = 'all') => {
    if (classStudents.length === 0) return 0;
    const excluded = dailySettings[month]?.excludedDays || [];
    const dayLimit = getClassMonthDayLimit ? getClassMonthDayLimit(month) : 31;
    let denominator = 0;
    let participatedCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;
      classStudents.forEach(student => {
        denominator += 1;
        const dRecords = student.dailyRecords?.[month] || [];
        const row = { t1: '', t2: '', math: '', ...(dRecords[dayIndex] || {}) };
        const hasEnglish = String(row.t1 ?? '').trim() !== '' || String(row.t2 ?? '').trim() !== '';
        const hasMath = String(row.math ?? '').trim() !== '';
        if (subject === 'math' ? hasMath : subject === 'english' ? hasEnglish : (hasEnglish || hasMath)) {
          participatedCount += 1;
        }
      });
    }

    return denominator === 0 ? 0 : Math.round((participatedCount / denominator) * 100);
  };

  const getClassDailyAvgScoreForMonth = (month = dashboardMonth, subject = dailySubject) => {
    let totalSum = 0;
    let totalCount = 0;

    classStudents.forEach(student => {
      const dRecords = student.dailyRecords?.[month] || Array(31).fill({ t1: '', t2: '', math: '' });
      const stats = getDailyStats(dRecords, month, subject);
      totalSum += stats.sum;
      totalCount += stats.count;
    });

    return totalCount > 0 ? Number((totalSum / totalCount).toFixed(1)) : 0;
  };

  const getStudentMonthlyScoreValues = (student, month = dashboardMonth) => {
    const monthly = student.scores?.monthly?.[month] || {};
    const totalScore = Number(monthly?.total?.score || 0);
    const englishScore = Number(monthly?.english?.score || 0);
    const mathScore = Number(monthly?.math?.score || 0);

    // total 점수가 있으면 total만 사용
    if (Number.isFinite(totalScore) && totalScore > 0) {
      return [totalScore];
    }

    // 점수 없는 학생은 평균 계산에서 제외
    return [englishScore, mathScore].filter(value => Number.isFinite(value) && value > 0);
  };

  const getClassAvgMonthlyScoreForMonth = (month = dashboardMonth) => {
    const values = classStudents.flatMap(student => getStudentMonthlyScoreValues(student, month));

    if (values.length === 0) return 0;

    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
  };

  
  const getClassMonthDayLimit = (month = dashboardMonth) => {
    const currentMonth = `${new Date().getMonth() + 1}월`;

    // 현재 월은 오늘 날짜까지만 계산
    if (month === currentMonth) {
      return Math.max(1, Math.min(31, new Date().getDate()));
    }

    // 과거 월은 전체 날짜 기준
    return 31;
  };

  const getClassAttendanceRate = (month = dashboardMonth) => {
    return getClassAttendanceRateForMonth(month);
  };

  const getClassDailyRate = (month = dashboardMonth) => {
    if (classStudents.length === 0) return 0;
    const excluded = dailySettings[month]?.excludedDays || [];
    const dayLimit = getClassMonthDayLimit(month);
    let denominator = 0;
    let participatedCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;
      classStudents.forEach(student => {
        denominator += 1;
        const records = student.dailyRecords?.[month] || [];
        const row = { t1: '', t2: '', math: '', ...(records[dayIndex] || {}) };
        if (String(row.t1 ?? '').trim() !== '' || String(row.t2 ?? '').trim() !== '' || String(row.math ?? '').trim() !== '') {
          participatedCount += 1;
        }
      });
    }

    return denominator === 0 ? 0 : Math.round((participatedCount / denominator) * 100);
  };

const getClassStudentAttendanceRate = (student, month = dashboardMonth) => {
    const excluded = attendanceSettings[month]?.excludedDays || [];
    const attendanceData = getUnifiedAttendanceArray(student.attendance?.[month] || {});
    const dayLimit = getClassMonthDayLimit(month);

    let denominator = 0;
    let presentCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;

      const type = getAttendanceValueType(attendanceData?.[dayIndex]);

      // 조퇴/지각/사전통보/병결 등 중립 유형과 빈 값은 출석률 계산 제외
      if (type === 'neutral') continue;

      // 출석/Live는 출석 인정, 결석은 출석률 하락
      denominator += 1;

      if (type === 'present') {
        presentCount += 1;
      }
    }

    return denominator === 0 ? 0 : Math.round((presentCount / denominator) * 100);
  };

  const getClassStudentDailyRate = (student, month = dashboardMonth, subject = 'all') => {
    const records = student.dailyRecords?.[month] || Array(31).fill({ t1: '', t2: '', math: '' });
    const excluded = dailySettings[month]?.excludedDays || [];
    const dayLimit = getClassMonthDayLimit ? getClassMonthDayLimit(month) : 31;
    let denominator = 0;
    let participatedCount = 0;

    for (let dayIndex = 0; dayIndex < dayLimit; dayIndex++) {
      if (excluded.includes(dayIndex)) continue;
      denominator += 1;
      const row = { t1: '', t2: '', math: '', ...(records[dayIndex] || {}) };
      const hasEnglish = String(row.t1 ?? '').trim() !== '' || String(row.t2 ?? '').trim() !== '';
      const hasMath = String(row.math ?? '').trim() !== '';
      if (subject === 'math' ? hasMath : subject === 'english' ? hasEnglish : (hasEnglish || hasMath)) {
        participatedCount += 1;
      }
    }

    return denominator === 0 ? 0 : Math.round((participatedCount / denominator) * 100);
  };

  const getClassStudentAvgScore = (student, month = dashboardMonth) => {
    const monthly = student.scores?.monthly?.[month];
    const totalScore = Number(monthly?.total?.score || 0);
    const englishScore = Number(monthly?.english?.score || 0);
    const mathScore = Number(monthly?.math?.score || 0);

    if (totalScore > 0) return Math.round(totalScore);

    const values = [englishScore, mathScore].filter(value => value > 0);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  };

  const getClassStudentWeekStudyMins = (student, month = dashboardMonth) => {
    const currentMonth = `${new Date().getMonth() + 1}월`;
    const dayLimit = month === currentMonth ? Math.max(1, Math.min(31, new Date().getDate())) : 31;
    const currentWeek = Math.max(1, Math.min(5, Math.ceil(dayLimit / 7)));
    const daily = student.studyTime?.[month] || [];
    const start = (currentWeek - 1) * 7;
    const end = Math.min(start + 7, daily.length);

    return daily.slice(start, end).reduce((sum, day) => {
      return sum + parseTimeDiffToMins(day?.in, day?.out);
    }, 0);
  };

  const getClassAvgStudyHoursForMonth = (month = dashboardMonth) => {
    if (classStudents.length === 0) return '0.0';

    const totalMins = classStudents.reduce((sum, student) => {
      return sum + getClassStudentWeekStudyMins(student, month);
    }, 0);

    return ((totalMins / classStudents.length) / 60).toFixed(1);
  };

  const getNeedSeverityByRate = (rate) => {
    const value = Number(rate || 0);
    if (value <= 50) return { key: 'danger', label: '위험', className: 'bg-red-50 text-red-600 border-red-100' };
    if (value <= 60) return { key: 'warning', label: '경고', className: 'bg-orange-50 text-orange-600 border-orange-100' };
    if (value <= 70) return { key: 'caution', label: '주의', className: 'bg-yellow-50 text-yellow-600 border-yellow-100' };
    return null;
  };

  const getScoreSeverityByGap = (gap) => {
    const value = Number(gap || 0);
    if (value >= 30) return { key: 'danger', label: '위험', className: 'bg-red-50 text-red-600 border-red-100' };
    if (value >= 20) return { key: 'warning', label: '경고', className: 'bg-orange-50 text-orange-600 border-orange-100' };
    if (value >= 10) return { key: 'caution', label: '주의', className: 'bg-yellow-50 text-yellow-600 border-yellow-100' };
    return null;
  };

  const getStudySeverityByRatio = (ratio) => {
    const value = Number(ratio || 0);
    if (value < 60) return { key: 'danger', label: '위험', className: 'bg-red-50 text-red-600 border-red-100' };
    if (value < 80) return { key: 'warning', label: '경고', className: 'bg-orange-50 text-orange-600 border-orange-100' };
    if (value < 100) return { key: 'caution', label: '주의', className: 'bg-yellow-50 text-yellow-600 border-yellow-100' };
    return null;
  };

  const getClassStudentMonthlyScore = (student, month = dashboardMonth) => {
    const values = getStudentMonthlyScoreValues(student, month);

    if (values.length === 0) return 0;

    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
  };

  const getClassMonthlyScoreAverage = (month = dashboardMonth) => {
    return getClassAvgMonthlyScoreForMonth(month);
  };

  const getMonthlySubjectScore = (student, month, subject) => {
    const value = Number(student.scores?.monthly?.[month]?.[subject]?.score || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const getMonthlySubjectGlobalAverage = (month = dashboardMonth, subject = 'english') => {
    const candidates = students
      .map(student => {
        const subjectData = student.scores?.monthly?.[month]?.[subject] || {};
        return Number(
          subjectData.trackAvg ||
          subjectData.totalAvg ||
          subjectData.classAvg ||
          subjectData.avg ||
          0
        );
      })
      .filter(value => Number.isFinite(value) && value > 0);

    if (candidates.length > 0) {
      return Number((candidates.reduce((sum, value) => sum + value, 0) / candidates.length).toFixed(1));
    }

    const fallbackScores = students
      .map(student => getMonthlySubjectScore(student, month, subject))
      .filter(value => value > 0);

    if (fallbackScores.length === 0) return 0;

    return Number((fallbackScores.reduce((sum, value) => sum + value, 0) / fallbackScores.length).toFixed(1));
  };

  const isNaturalTrack = (student) => {
    const track = String(student.targetTrack || student.track || '').trim();
    return track.includes('자연') || track.includes('이공') || track.includes('공학') || track.includes('수학');
  };

  const getStudentSubjectScoreNeeds = (student, month = dashboardMonth) => {
    const needs = [];
    const subjects = isNaturalTrack(student)
      ? [
          { key: 'english', label: '영어' },
          { key: 'math', label: '수학' }
        ]
      : [
          { key: 'english', label: '영어' }
        ];

    subjects.forEach(subject => {
      const studentScore = getMonthlySubjectScore(student, month, subject.key);
      const globalAvg = getMonthlySubjectGlobalAverage(month, subject.key);

      if (studentScore <= 0 || globalAvg <= 0) return;

      const gap = Number((globalAvg - studentScore).toFixed(1));
      const severity = getScoreSeverityByGap(gap);

      if (severity) {
        needs.push({
          type: 'score',
          label: '성적',
          subject: subject.label,
          severity,
          text: `${subject.label}: 전체 평균 ${globalAvg}점 대비 ${gap}점 낮음`
        });
      }
    });

    return needs;
  };

  const getClassStudentMonthlyStudyMins = (student, month = dashboardMonth) => {
    const daily = student.studyTime?.[month] || [];
    return daily.reduce((sum, day) => sum + parseTimeDiffToMins(day?.in, day?.out), 0);
  };

  const getClassMonthlyStudyAverage = (month = dashboardMonth) => {
    const values = classStudents.map(student => getClassStudentMonthlyStudyMins(student, month)).filter(value => value > 0);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  };

  const getNeedStudentsByType = (type = 'all', month = dashboardMonth) => {
    const studyAvg = getClassMonthlyStudyAverage(month);

    return classStudents.map(student => {
      const attendanceRate = getClassStudentAttendanceRate(student, month);
      const dailyRate = getClassStudentDailyRate(student, month, 'all');
      const monthlyScore = getClassStudentMonthlyScore(student, month);
      const studyMins = getClassStudentMonthlyStudyMins(student, month);
      const studyRatio = studyAvg > 0 && studyMins > 0 ? Math.round((studyMins / studyAvg) * 100) : 0;
      const reasons = [];

      const attendanceSeverity = getNeedSeverityByRate(attendanceRate);
      if (attendanceSeverity) {
        reasons.push({
          type: 'attendance',
          label: '출석',
          severity: attendanceSeverity,
          text: `출석률 ${attendanceRate}%`
        });
      }

      const dailySeverity = getNeedSeverityByRate(dailyRate);
      if (dailySeverity) {
        reasons.push({
          type: 'daily',
          label: 'Daily',
          severity: dailySeverity,
          text: `Daily 참여율 ${dailyRate}%`
        });
      }

      // 성적은 반 평균이 아니라 Monthly 전체 평균 기준으로 판단
      const scoreNeeds = getStudentSubjectScoreNeeds(student, month);
      scoreNeeds.forEach(reason => reasons.push(reason));

      if (studyAvg > 0 && studyMins > 0) {
        const studySeverity = getStudySeverityByRatio(studyRatio);

        if (studySeverity) {
          reasons.push({
            type: 'study',
            label: '학습시간',
            severity: studySeverity,
            text: `월 평균의 ${studyRatio}%`
          });
        }
      }

      return {
        student,
        attendanceRate,
        dailyRate,
        monthlyScore,
        avgScore: monthlyScore,
        studyMins,
        studyText: formatMinsToTime(studyMins),
        studyRatio,
        reasons
      };
    }).filter(item => {
      if (type === 'all') return item.reasons.length > 0;
      return item.reasons.some(reason => reason.type === type);
    });
  };

  const allNeedStudents = getNeedStudentsByType('all', dashboardMonth);
  const attendanceNeedStudents = getNeedStudentsByType('attendance', dashboardMonth);
  const dailyNeedStudents = getNeedStudentsByType('daily', dashboardMonth);
  const scoreNeedStudents = getNeedStudentsByType('score', dashboardMonth);
  const studyNeedStudents = getNeedStudentsByType('study', dashboardMonth);
  const managementNeedStudents = allNeedStudents;

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
    let result = classStudents.filter(s =>
      (s.name || '').includes(searchTerm) ||
      (s.id || '').includes(searchTerm) ||
      (s.userId || '').includes(searchTerm) ||
      (s.contact || '').includes(searchTerm)
    );
    
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
      } else if (sortKey === 'weeklyOverallAvg' || sortKey === 'weeklyEnglishOverallAvg') {
        const aAvg = getMonthlyWeeklyStats(a, selectedMonth, 'english').avgScore;
        const bAvg = getMonthlyWeeklyStats(b, selectedMonth, 'english').avgScore;

        valA = aAvg === '-' ? -1 : Number(aAvg);
        valB = bAvg === '-' ? -1 : Number(bAvg);

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortKey === 'weeklyMathOverallAvg') {
        const aAvg = getMonthlyWeeklyStats(a, selectedMonth, 'math').avgScore;
        const bAvg = getMonthlyWeeklyStats(b, selectedMonth, 'math').avgScore;

        valA = aAvg === '-' ? -1 : Number(aAvg);
        valB = bAvg === '-' ? -1 : Number(bAvg);

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

  const reportStudentsForList = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';

      return reportListSortOrder === 'asc'
        ? nameA.localeCompare(nameB, 'ko')
        : nameB.localeCompare(nameA, 'ko');
    });
  }, [filteredStudents, reportListSortOrder]);

  const weeklyFilteredStudents = useMemo(() => {
    const keyword = weeklySearchTerm.trim().toLowerCase();

    let result = keyword
      ? filteredStudents.filter(s =>
          String(s.name || '').toLowerCase().includes(keyword) ||
          String(s.id || '').toLowerCase().includes(keyword) ||
          String(s.userId || '').toLowerCase().includes(keyword)
        )
      : [...filteredStudents];

    if (weeklyScoreSort.week) {
      const scoreField = weeklySubject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
      const weekKey = `${weeklyMonth}_w${weeklyScoreSort.week}`;

      result = [...result].sort((a, b) => {
        const rawA = a.scores?.[scoreField]?.[weekKey];
        const rawB = b.scores?.[scoreField]?.[weekKey];

        const valA =
          rawA === undefined || rawA === null || rawA === ''
            ? -1
            : Number(rawA);

        const valB =
          rawB === undefined || rawB === null || rawB === ''
            ? -1
            : Number(rawB);

        const safeA = Number.isNaN(valA) ? -1 : valA;
        const safeB = Number.isNaN(valB) ? -1 : valB;

        return weeklyScoreSort.order === 'asc'
          ? safeA - safeB
          : safeB - safeA;
      });
    }

    return result;
  }, [filteredStudents, weeklySearchTerm, weeklyScoreSort, weeklySubject, weeklyMonth]);

  const handleSort = (key) => {
    if (sortKey === key) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder(key === 'name' ? 'asc' : 'desc'); }
  };

  const handleDeleteStudent = (e, id, name) => {
    e.stopPropagation();

    showConfirm(
      `${name} 학생을 완전히 삭제하시겠습니까?\n\n화면 명단에서 삭제되며, 자동 저장 후 Firebase 세션에서도 삭제됩니다.\n삭제된 데이터는 복구할 수 없습니다.`,
      () => {
        setStudents(prev => prev.filter(s => s.id !== id));
        showAlert(`${name} 학생이 삭제되었습니다. Firebase에도 자동 반영됩니다.`);
      }
    );
  };

  const handleAddStudentSubmit = () => {
    if(!newStudentForm.name.trim() || !newStudentForm.userId.trim()) { showAlert("이름과 아이디를 모두 입력해주세요."); return; }
    const newId = `S-${Date.now()}`;
    const newStu = createStudent(newId, newStudentForm.userId, newStudentForm.name, newStudentForm.startMonth, newStudentForm.targetTrack, {}, {}, {}, {}, {});
    newStu.className = className === '대구캠퍼스 전체' ? 'S-CLASS' : className; 
    newStu.classNames = [newStu.className];
    setStudents(prev => [newStu, ...prev]);
    markStudentDirty(newStu.id, 'studentInfo');
    setShowAddModal(false);
    setNewStudentForm({ name: '', userId: '', targetTrack: '인문계', startMonth: '1월' });
    showAlert(`${newStudentForm.name} 학생이 수기 등록되었습니다.`);
  };

  const handleProfileChange = (studentId, field, value) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;

      if (field === 'className') {
        return {
          ...s,
          className: value,
          classNames: [value]
        };
      }

      return {
        ...s,
        [field]: value
      };
    }));

    markStudentDirty(studentId, 'studentInfo');
  };

  const toggleDailyExcluded = (month, dayIndex) => {
    setDailySettings(prev => {
        const currentArr = prev[month]?.excludedDays || [];
        const isExcluded = currentArr.includes(dayIndex);
        const newArr = isExcluded ? currentArr.filter(i => i !== dayIndex) : [...currentArr, dayIndex];

        return {
          ...prev,
          [month]: {
            ...prev[month],
            excludedDays: newArr
          }
        };
    });

    markClassSettingsDirty(className, 'dailySettings');
  };

  const toggleAttendanceExcluded = (month, dayIndex) => {
    setAttendanceSettings(prev => {
        const currentArr = prev[month]?.excludedDays || [];
        const isExcluded = currentArr.includes(dayIndex);
        const newArr = isExcluded ? currentArr.filter(i => i !== dayIndex) : [...currentArr, dayIndex];

        return {
          ...prev,
          [month]: {
            ...prev[month],
            excludedDays: newArr
          }
        };
    });

    markClassSettingsDirty(className, 'attendanceSettings');
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
    const cleanCell = (v) => String(v ?? '').replace(/\u00A0/g, '').trim();

    const targetClass = className === '대구캠퍼스 전체' ? 'S-CLASS' : className;

    const makeSafeId = (name, userId, contact, rowIndex) => {
      const raw = userId || contact || `${name}_${rowIndex}`;
      return `AUTO_${raw}`.replace(/[^\w가-힣-]/g, '_');
    };

    const normalizeClassNames = (student) => {
      const raw = Array.isArray(student.classNames)
        ? student.classNames
        : [student.className || '미배정'];

      return Array.from(
        new Set(
          raw
            .filter(Boolean)
            .map(c => String(c).trim())
            .filter(Boolean)
        )
      );
    };

    let targetSheetName =
      workbook.SheetNames.find(n => n.includes('신상정보') || n.includes('목록')) ||
      workbook.SheetNames[0];

    const targetRows = window.XLSX.utils.sheet_to_json(
      workbook.Sheets[targetSheetName],
      { header: 1 }
    );

    let headerRowIdx = -1;

    for (let i = 0; i < Math.min(30, targetRows.length); i++) {
      if (!targetRows[i] || !Array.isArray(targetRows[i])) continue;

      const rowStr = targetRows[i].map(v =>
        cleanCell(v).replace(/\s/g, '')
      );

      if (rowStr.some(c => c.includes('이름') || c.includes('성명'))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      showAlert('엑셀에서 이름/성명 열을 찾을 수 없습니다.');
      return;
    }

    const headerRow = targetRows[headerRowIdx].map(v =>
      cleanCell(v).replace(/\s/g, '')
    );

    const getIdx = (keywords) =>
      headerRow.findIndex(h => h && keywords.some(k => h.includes(k)));

    const idxs = {
      id: getIdx(['학번', '수험번호']),
      userId: getIdx(['아이디', 'ID']),
      name: getIdx(['이름', '성명']),
      contact: getIdx(['연락처', '휴대폰', '전화번호']),
      track: getIdx(['희망계열', '계열']),
      gender: getIdx(['성별']),
      address: getIdx(['거주지역', '거주지', '주소']),
      univ: getIdx(['출신대학', '대학교']),
      major: getIdx(['출신학과', '전공']),
      grad: getIdx(['졸업여부', '학적']),
      type: getIdx(['편입구분', '편입유형']),
      credits: getIdx(['이수학점', '학점']),
      gpa: getIdx(['평점', 'GPA', '백분위']),
      motiv: getIdx(['편입준비계기', '계기']),
      eng: getIdx(['공인영어', '토익', '토플', '텝스']),
      parent: getIdx(['부모님연락처', '보호자연락처', '부모연락처', '보호자']),
      notes: getIdx(['특이사항', '상담', '메모'])
    };

    if (idxs.name === -1) {
      showAlert('엑셀에서 이름/성명 열을 찾을 수 없습니다.');
      return;
    }

    const newStudents = [];
    const importedKeys = new Set();

    for (let i = headerRowIdx + 1; i < targetRows.length; i++) {
      const row = targetRows[i];

      if (!row || !Array.isArray(row)) continue;

      const sName = cleanCell(row[idxs.name]);
      if (!sName) continue;

      const sId = idxs.id >= 0 ? cleanCell(row[idxs.id]) : '';
      const sUserId = idxs.userId >= 0 ? cleanCell(row[idxs.userId]) : '';
      const sContact = idxs.contact >= 0 ? cleanCell(row[idxs.contact]) : '';

      const finalId = sId || sUserId || makeSafeId(sName, sUserId, sContact, i);

      if (importedKeys.has(finalId)) continue;
      importedKeys.add(finalId);

      newStudents.push({
        id: finalId,
        userId: sUserId,
        name: sName,
        startMonth: '1월',

        // 핵심: 엑셀을 업로드한 현재 반을 무조건 저장
        className: targetClass,
        classNames: [targetClass],

        contact: sContact,
        gender: idxs.gender >= 0 ? cleanCell(row[idxs.gender]) : '',
        address: idxs.address >= 0 ? cleanCell(row[idxs.address]) : '',
        university: idxs.univ >= 0 ? cleanCell(row[idxs.univ]) : '',
        major: idxs.major >= 0 ? cleanCell(row[idxs.major]) : '',
        gradStatus: idxs.grad >= 0 ? cleanCell(row[idxs.grad]) : '',
        transferType: idxs.type >= 0 ? cleanCell(row[idxs.type]) : '일반',
        targetTrack: idxs.track >= 0 ? cleanCell(row[idxs.track]) : '미정',
        credits: idxs.credits >= 0 ? cleanCell(row[idxs.credits]) : '',
        gpa: idxs.gpa >= 0 ? cleanCell(row[idxs.gpa]) : '',
        motivation: idxs.motiv >= 0 ? cleanCell(row[idxs.motiv]) : '',
        englishScore: idxs.eng >= 0 ? cleanCell(row[idxs.eng]) : '',
        parentContact: idxs.parent >= 0 ? cleanCell(row[idxs.parent]) : '',
        notes: idxs.notes >= 0 ? cleanCell(row[idxs.notes]) : '',

        consulting: {},
        studyTime: generateEmptyMonthlyStudyTime(),
        attendance: generateEmptyMonthlyAttendance(),
        dailyRecords: generateEmptyMonthlyDaily(),
        scores: {
          mockEnglish: {},
          mockMath: {},
          weeklyEnglish: {},
          weeklyMath: {},
          monthly: generateEmptyMonthlyData(),
          weeklyDetails: {},
          weeklyDetailsMath: {}
        }
      });
    }

    if (newStudents.length === 0) {
      showAlert('업로드할 학생 데이터를 찾지 못했습니다.');
      return;
    }

    const findExistingIndex = (arr, newStu) => {
      return arr.findIndex(s => {
        const idMatch =
          newStu.id &&
          s.id &&
          String(s.id).trim().toLowerCase() === String(newStu.id).trim().toLowerCase();

        const userIdMatch =
          newStu.userId &&
          s.userId &&
          String(s.userId).trim().toLowerCase() === String(newStu.userId).trim().toLowerCase();

        const nameContactMatch =
          newStu.name &&
          s.name &&
          s.name === newStu.name &&
          newStu.contact &&
          s.contact &&
          s.contact === newStu.contact;

        return idMatch || userIdMatch || nameContactMatch;
      });
    };

    let addCount = 0;
    let updateCount = 0;
    let addClassCount = 0;
    let excludeCount = 0;

    newStudents.forEach(newStu => {
      const idx = findExistingIndex(students, newStu);

      if (idx >= 0) {
        updateCount++;

        const oldClassNames = normalizeClassNames(students[idx]);

        if (!oldClassNames.includes(targetClass)) {
          addClassCount++;
        }
      } else {
        addCount++;
      }
    });

    if (uploadMode === 'classOverwrite' && className !== '대구캠퍼스 전체') {
      students
        .filter(s => normalizeClassNames(s).includes(targetClass))
        .forEach(s => {
          const stillExists = newStudents.some(newStu => findExistingIndex([s], newStu) >= 0);
          if (!stillExists) excludeCount++;
        });
    }

    if (uploadMode === 'allOverwrite') {
      excludeCount = Math.max(students.length - updateCount, 0);
    }

    const modeText =
      uploadMode === 'merge'
        ? '① 추가/수정만 하기'
        : uploadMode === 'classOverwrite'
          ? '② 해당 반 명단 덮어쓰기'
          : '③ 전체 명단 덮어쓰기';

    showConfirm(
      `[${targetClass}] 명단 업로드 미리보기\n\n업로드 방식: ${modeText}\n\n추가될 학생: ${addCount}명\n수정될 학생: ${updateCount}명\n해당 반 소속 추가: ${addClassCount}명\n명단에서 제외될 학생: ${excludeCount}명\n\n적용하시겠습니까?`,
      () => {
        setStudents(prev => {
          if (uploadMode === 'allOverwrite') {
            return newStudents.map(s => ({
              ...s,
              className: targetClass,
              classNames: [targetClass]
            }));
          }

          let updated = [...prev];
          const touchedIds = new Set();

          newStudents.forEach(newStu => {
            const existingIdx = findExistingIndex(updated, newStu);

            if (existingIdx >= 0) {
              const existing = updated[existingIdx];

              const oldClassNames = normalizeClassNames(existing).filter(c => c !== '미배정');
              const mergedClassNames = Array.from(new Set([...oldClassNames, targetClass]));

              const mergedStudent = {
                ...existing,

                id: existing.id || newStu.id,
                userId: newStu.userId || existing.userId,
                name: newStu.name || existing.name,

                contact: newStu.contact || existing.contact,
                parentContact: newStu.parentContact || existing.parentContact,
                gender: newStu.gender || existing.gender,
                address: newStu.address || existing.address,
                university: newStu.university || existing.university,
                major: newStu.major || existing.major,
                gradStatus: newStu.gradStatus || existing.gradStatus,
                transferType: newStu.transferType || existing.transferType,
                targetTrack: newStu.targetTrack || existing.targetTrack,
                credits: newStu.credits || existing.credits,
                gpa: newStu.gpa || existing.gpa,
                motivation: newStu.motivation || existing.motivation,
                englishScore: newStu.englishScore || existing.englishScore,
                notes: newStu.notes || existing.notes,

                // 핵심: 현재 업로드한 반을 반드시 포함
                className: targetClass,
                classNames: mergedClassNames,

                studyTime: existing.studyTime || generateEmptyMonthlyStudyTime(),
                attendance: existing.attendance || generateEmptyMonthlyAttendance(),
                dailyRecords: existing.dailyRecords || generateEmptyMonthlyDaily(),
                scores: existing.scores || {
                  mockEnglish: {},
                  mockMath: {},
                  weeklyEnglish: {},
                  weeklyMath: {},
                  monthly: generateEmptyMonthlyData(),
                  weeklyDetails: {},
                  weeklyDetailsMath: {}
                },
                consulting: existing.consulting || {},
                startMonth: existing.startMonth || newStu.startMonth || '1월'
              };

              updated[existingIdx] = mergedStudent;
              touchedIds.add(mergedStudent.id);
            } else {
              updated.unshift({
                ...newStu,
                className: targetClass,
                classNames: [targetClass]
              });
              touchedIds.add(newStu.id);
            }
          });

          // 해당 반 덮어쓰기:
          // 엑셀에 없는 기존 학생은 삭제하지 않고 해당 반 소속만 제거
          if (uploadMode === 'classOverwrite' && className !== '대구캠퍼스 전체') {
            updated = updated.map(s => {
              const cNames = normalizeClassNames(s);

              if (!cNames.includes(targetClass)) return s;
              if (touchedIds.has(s.id)) return s;

              const nextClassNames = cNames.filter(c => c !== targetClass);
              const finalClassNames = nextClassNames.length > 0 ? nextClassNames : ['미배정'];

              return {
                ...s,
                className: finalClassNames[0],
                classNames: finalClassNames
              };
            });
          }

          console.log('[학생 엑셀 업로드 적용 완료]', {
            targetClass,
            uploadMode,
            count: newStudents.length
          });

          return updated;
        });

        showAlert(`완료! 총 ${newStudents.length}명의 정보가 처리되었습니다. 자동 저장까지 3~10초 정도 기다려주세요.`);
      }
    );
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
        const studentIdx = updated.findIndex(s => (s.id === key || s.name === key) && (className === '대구캠퍼스 전체' ? true : (s.classNames || [s.className]).includes(className)));
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
    const currentSettings = getWeeklySetting(weeklySubject, weeklyMonth, selectedWeek);
    const maxQs = weeklySubject === 'english' ? 40 : (currentSettings.qCount || 20);
    const testDate = currentSettings.testDate || '';

    if (!testDate) {
      showAlert('정답 셋업에서 Weekly 시험일을 먼저 설정해주세요.');
      return;
    }

    const executeWeeklyParse = () => {
      let matchCount = 0;
      const testId = buildWeeklyTestId(weeklySubject, weeklyMonth, selectedWeek, currentSettings);
      const testMonth = getWeeklyMonthKeyFromDate(testDate);
      const weekKey = `${weeklyMonth}_w${selectedWeek}`;
      const scoreField = weeklySubject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
      const detailField = weeklySubject === 'english' ? 'weeklyDetails' : 'weeklyDetailsMath';
      const subjectLabel = weeklySubject === 'english' ? '영어' : '수학';

      setStudents(prev => {
        const updated = [...prev];

        for (let i = 0; i < rows.length; i++) {
          const row = Array.isArray(rows[i]) ? rows[i] : Object.values(rows[i] || {});
          if (!row || row.length < 2 || row[0] === undefined) continue;

          const key = String(row[0]).trim();
          if (key === '' || key === '수험번호') continue;

          const studentIdx = updated.findIndex(s =>
            (s.id.toLowerCase() === key.toLowerCase() || s.userId.toLowerCase() === key.toLowerCase()) &&
            (className === '대구캠퍼스 전체' ? true : (s.classNames || [s.className]).includes(className))
          );

          if (studentIdx >= 0) {
               let correctCount = 0;
               let details = [];

               const normalizeOmrAnswer = (value) => {
                 const raw = String(value ?? '').trim().toLowerCase();

                 if (!raw) return '';

                 const clean = raw
                   .replace(/\s/g, '')
                   .replace(/[.)]/g, '')
                   .replace(/번/g, '');

                 const answerMap = {
                   a: '1',
                   b: '2',
                   c: '3',
                   d: '4',
                   '①': '1',
                   '②': '2',
                   '③': '3',
                   '④': '4'
                 };

                 return answerMap[clean] || clean;
               };

               for(let q = 0; q < maxQs; q++) {
                 const userAns = normalizeOmrAnswer(row[1 + q]);
                 const correctAns = normalizeOmrAnswer(currentSettings.answers[q]);

                 const isCorrect = (
                   userAns !== '' &&
                   correctAns !== '' &&
                   userAns === correctAns
                 );

                 if(isCorrect) correctCount++;

                 details.push({
                   qNum: q + 1,
                   userAns,
                   correctAns,
                   isCorrect,
                   type: currentSettings.types[q] || '미지정'
                 });
               }

               const score = correctCount * (currentSettings.qScore || 2.5);
               const currentScores = updated[studentIdx].scores || {};

               updated[studentIdx] = {
                   ...updated[studentIdx],
                   scores: {
                       ...currentScores,
                       [scoreField]: {
                         ...(currentScores[scoreField] || {}),
                         [weekKey]: score
                       },
                       [detailField]: {
                         ...(currentScores[detailField] || {}),
                         [weekKey]: details
                       },
                       weeklyMeta: {
                         ...(currentScores.weeklyMeta || {}),
                         [testId]: {
                           testId,
                           subject: weeklySubject,
                           subjectLabel,
                           testName: currentSettings.testName || `${weeklyMonth} ${selectedWeek}주차 Weekly`,
                           testDate,
                           testMonth,
                           weekRound: selectedWeek,
                           weekKey,
                           targetClasses: currentSettings.targetClasses || [],
                           maxScore: currentSettings.maxScore || 100,
                           score,
                           details,
                           submittedAt: new Date().toISOString()
                         }
                       }
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
        if(className === '대구캠퍼스 전체' || (s.classNames || [s.className]).includes(className)) { 
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
          const studentIdx = updated.findIndex(s => s.userId?.toLowerCase() === key && (className === '대구캠퍼스 전체' ? true : (s.classNames || [s.className]).includes(className)));
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
        let validStudents = updated.filter(s => (className === '대구캠퍼스 전체' ? true : (s.classNames || [s.className]).includes(className)) && s.scores.monthly[selectedMonth]?.[subject]?.score !== '');
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

  const handleResetWeeklyOmrScores = () => {
    const currentSettings = getWeeklySetting(weeklySubject, weeklyMonth, selectedWeek);
    const testId = buildWeeklyTestId(weeklySubject, weeklyMonth, selectedWeek, currentSettings);
    const weekKey = `${weeklyMonth}_w${selectedWeek}`;
    const scoreField = weeklySubject === 'english' ? 'weeklyEnglish' : 'weeklyMath';
    const detailField = weeklySubject === 'english' ? 'weeklyDetails' : 'weeklyDetailsMath';
    const subjectLabel = weeklySubject === 'english' ? '영어' : '수학';

    showConfirm(
      `${weeklyMonth} ${selectedWeek}주차 ${subjectLabel} Weekly OMR 점수와 상세 분석 데이터를 초기화하시겠습니까?\n\n초기화 후 다시 OMR을 업로드할 수 있습니다.`,
      () => {
        setStudents(prev => prev.map(student => {
          const studentClassNames = Array.isArray(student.classNames)
            ? student.classNames
            : [student.className].filter(Boolean);

          const isTarget =
            className === '대구캠퍼스 전체' ||
            studentClassNames.includes(className);

          if (!isTarget) return student;

          const currentScores = student.scores || {};
          const currentScoreObj = currentScores[scoreField] || {};
          const currentDetailObj = currentScores[detailField] || {};
          const currentMetaObj = currentScores.weeklyMeta || {};

          const { [weekKey]: removedScore, ...nextScoreObj } = currentScoreObj;
          const { [weekKey]: removedDetail, ...nextDetailObj } = currentDetailObj;
          const { [testId]: removedMeta, ...nextMetaObj } = currentMetaObj;

          return {
            ...student,
            scores: {
              ...currentScores,
              [scoreField]: nextScoreObj,
              [detailField]: nextDetailObj,
              weeklyMeta: nextMetaObj
            }
          };
        }));

        showAlert(`${weeklyMonth} ${selectedWeek}주차 ${subjectLabel} Weekly OMR 데이터가 초기화되었습니다.`);
      }
    );
  };

  const handleResetMonthlyOmrScores = (targetSubject = 'all') => {
    const subjectLabelMap = {
      english: '영어',
      math: '수학',
      total: '영어+수학 합산',
      all: '전체'
    };

    const subjectLabel = subjectLabelMap[targetSubject] || '전체';

    showConfirm(
      `${selectedMonth} Monthly ${subjectLabel} 성적 데이터를 초기화하시겠습니까?\n\n초기화 후 다시 Monthly OMR/엑셀을 업로드할 수 있습니다.`,
      () => {
        setStudents(prev => prev.map(student => {
          const studentClassNames = Array.isArray(student.classNames)
            ? student.classNames
            : [student.className].filter(Boolean);

          const isTarget =
            className === '대구캠퍼스 전체' ||
            studentClassNames.includes(className);

          if (!isTarget) return student;

          const currentScores = student.scores || {};
          const currentMonthly = currentScores.monthly || {};
          const currentMonthData = currentMonthly[selectedMonth] || {
            english: { ...emptyMonthlyScore },
            math: { ...emptyMonthlyScore },
            total: { ...emptyMonthlyScore }
          };

          const nextMonthData =
            targetSubject === 'all'
              ? {
                  english: { ...emptyMonthlyScore },
                  math: { ...emptyMonthlyScore },
                  total: { ...emptyMonthlyScore }
                }
              : {
                  ...currentMonthData,
                  [targetSubject]: { ...emptyMonthlyScore }
                };

          return {
            ...student,
            scores: {
              ...currentScores,
              monthly: {
                ...currentMonthly,
                [selectedMonth]: nextMonthData
              }
            }
          };
        }));

        setMonthlySummaries(prev => {
          const currentSummary = prev[selectedMonth] || {
            engAvg: '',
            engTop30: '',
            mathAvg: '',
            mathTop30: '',
            totAvg: '',
            totTop30: ''
          };

          let nextSummary = { ...currentSummary };

          if (targetSubject === 'all') {
            nextSummary = {
              engAvg: '',
              engTop30: '',
              mathAvg: '',
              mathTop30: '',
              totAvg: '',
              totTop30: ''
            };
          }

          if (targetSubject === 'english') {
            nextSummary.engAvg = '';
            nextSummary.engTop30 = '';
          }

          if (targetSubject === 'math') {
            nextSummary.mathAvg = '';
            nextSummary.mathTop30 = '';
          }

          if (targetSubject === 'total') {
            nextSummary.totAvg = '';
            nextSummary.totTop30 = '';
          }

          return {
            ...prev,
            [selectedMonth]: nextSummary
          };
        });

        showAlert(`${selectedMonth} Monthly ${subjectLabel} 성적 데이터가 초기화되었습니다.`);
      }
    );
  };

  const processStudyTimeDailyRows = (rows, targetDayIdx) => {
    let headerRowIdx = -1;
  
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      if (!rows[i] || !Array.isArray(rows[i])) continue;
  
      const rowStr = rows[i].map(v => String(v || '').replace(/\s/g, ''));
  
      const hasIdentifier = rowStr.some(c =>
        c === '아이디' ||
        c === 'ID' ||
        c === '수험번호' ||
        c === '학번' ||
        c === '이름' ||
        c === '성명' ||
        c === '학생명'
      );
  
      const hasTime = rowStr.some(c =>
        c === '등원일시' ||
        c === '하원일시' ||
        c === '등원시간' ||
        c === '하원시간'
      );
  
      if (hasIdentifier && hasTime) {
        headerRowIdx = i;
        break;
      }
    }
  
    if (headerRowIdx === -1) {
      showAlert("엑셀에서 이름/아이디 및 등원일시/하원일시 열을 찾을 수 없습니다.");
      return;
    }
  
    const headerRow = rows[headerRowIdx].map(v => String(v || '').replace(/\s/g, ''));
  
    const findCol = (keywords) => {
      return headerRow.findIndex(h =>
        keywords.some(k => h === k || h.includes(k))
      );
    };
  
    const userIdIdx = findCol(['아이디', 'ID', '수험번호', '학번']);
    const nameIdx = findCol(['이름', '성명', '학생명']);
    const inIdx = findCol(['등원일시', '등원시간']);
    const outIdx = findCol(['하원일시', '하원시간']);
  
    if (userIdIdx === -1 && nameIdx === -1) {
      showAlert("엑셀에서 아이디/수험번호/이름 열을 찾을 수 없습니다.");
      return;
    }
  
    if (inIdx === -1 && outIdx === -1) {
      showAlert("엑셀에서 등원일시 또는 하원일시 열을 찾을 수 없습니다.");
      return;
    }
  
    const normalizeKey = (value) => {
      return String(value ?? '').trim().toLowerCase();
    };
  
    const extractTimeOnly = (value) => {
      if (value === undefined || value === null) return '';
  
      if (value instanceof Date && !isNaN(value)) {
        return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
      }
  
      const str = String(value).trim();
  
      if (
        str === '' ||
        str === '0' ||
        str.includes('미등원') ||
        str.includes('미하원')
      ) {
        return '';
      }
  
      // 엑셀 시간이 숫자 소수로 들어오는 경우 처리
      // 예: 0.56875 → 13:39
      if (!isNaN(str) && Number(str) > 0) {
        const num = Number(str);
        const fraction = num % 1;
  
        if (fraction > 0) {
          const totalMins = Math.round(fraction * 24 * 60);
          const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
          const mm = String(totalMins % 60).padStart(2, '0');
          return `${hh}:${mm}`;
        }
  
        return '';
      }
  
      // 날짜 + 시간 문자열에서 시간만 추출
      // 예: 2026-05-12 13:39 → 13:39
      // 예: 2026.05.12 15:00:00 → 15:00
      const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  
      if (timeMatch) {
        const hh = String(timeMatch[1]).padStart(2, '0');
        const mm = String(timeMatch[2]).padStart(2, '0');
        return `${hh}:${mm}`;
      }
  
      return '';
    };
  
    const matchedKeys = new Set();
    let duplicateWarnings = 0;
  
    setStudents(prev => {
      const updated = [...prev];
  
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
  
        if (!row || !Array.isArray(row)) continue;
  
        const idKey = userIdIdx !== -1 ? normalizeKey(row[userIdIdx]) : '';
        const nameKey = nameIdx !== -1 ? normalizeKey(row[nameIdx]) : '';
  
        if (!idKey && !nameKey) continue;
  
        const candidates = updated.filter(s => {
          if (className === '대구캠퍼스 전체') return true;
  
          const classList = [
            ...(Array.isArray(s.classNames) ? s.classNames : []),
            ...(Array.isArray(s.classes) ? s.classes : []),
            s.className
          ].filter(Boolean);
  
          return classList.includes(className);
        });
  
        let targetStudent = null;
  
        // 1순위: 아이디 / 수험번호 매칭
        if (idKey) {
          targetStudent = candidates.find(s =>
            normalizeKey(s.id) === idKey ||
            normalizeKey(s.userId) === idKey
          );
        }
  
        // 2순위: 이름 매칭
        if (!targetStudent && nameKey) {
          const nameMatches = candidates.filter(s =>
            normalizeKey(s.name) === nameKey
          );
  
          if (nameMatches.length === 1) {
            targetStudent = nameMatches[0];
          } else if (nameMatches.length > 1 && idKey) {
            targetStudent = nameMatches.find(s =>
              normalizeKey(s.id) === idKey ||
              normalizeKey(s.userId) === idKey
            );
          } else if (nameMatches.length > 1) {
            duplicateWarnings++;
            continue;
          }
        }
  
        if (!targetStudent) continue;
  
        const studentIdx = updated.findIndex(s => s.id === targetStudent.id);
        if (studentIdx === -1) continue;
  
        const inTime = inIdx !== -1 ? extractTimeOnly(row[inIdx]) : '';
        const outTime = outIdx !== -1 ? extractTimeOnly(row[outIdx]) : '';
  
        if (!inTime && !outTime) continue;
  
        const currentMonthData =
          updated[studentIdx].studyTime?.[studyTimeMonth] ||
          Array.from({ length: 31 }, () => ({ in: '', out: '' }));
  
        const newDaily = [...currentMonthData];
  
        newDaily[targetDayIdx] = {
          in: inTime || newDaily[targetDayIdx]?.in || '',
          out: outTime || newDaily[targetDayIdx]?.out || ''
        };
  
        updated[studentIdx] = {
          ...updated[studentIdx],
          studyTime: {
            ...updated[studentIdx].studyTime,
            [studyTimeMonth]: newDaily
          }
        };
  
        matchedKeys.add(updated[studentIdx].id);
      }
  
      return updated;
    });
  
    setTimeout(() => {
      const duplicateMsg = duplicateWarnings > 0
        ? ` 동명이인으로 제외된 항목 ${duplicateWarnings}건이 있습니다.`
        : '';
  
      showAlert(`${targetDayIdx + 1}일자 학습시간 연동 완료! 총 ${matchedKeys.size}명 적용.${duplicateMsg}`);
    }, 50);
  };

  const handleMonthlyChange = (studentId, subject, field, value) => {
    setStudents(prev => prev.map(s => {
      if(s.id !== studentId) return s;
      const currentMonthData = s.scores.monthly[detailSelectedMonth] || generateEmptyMonthlyData()[detailSelectedMonth];
      return { ...s, scores: { ...s.scores, monthly: { ...s.scores.monthly, [detailSelectedMonth]: { ...currentMonthData, [subject]: { ...currentMonthData[subject], [field]: value } } } } };
    }));

    markStudentDirty(studentId, 'scores');
  };

  const handleAttendanceChange = (studentId, timeOfDay, dayIndex, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;

      const currentMonth = student.attendance?.[attendanceMonth] || generateEmptyMonthlyAttendance()[attendanceMonth];
      const updatedAm = [...(currentMonth.am || Array(31).fill(''))];
      const updatedPm = [...(currentMonth.pm || Array(31).fill(''))];

      updatedAm[dayIndex] = value;
      updatedPm[dayIndex] = '';

      return {
        ...student,
        attendance: {
          ...student.attendance,
          [attendanceMonth]: {
            ...currentMonth,
            am: updatedAm,
            pm: updatedPm
          }
        }
      };
    }));

    markStudentDirty(studentId, 'attendance');
  };

  const handleAttendanceMemoChange = (studentId, timeOfDay, dayIndex, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;

      const currentMonth = student.attendance?.[attendanceMonth] || generateEmptyMonthlyAttendance()[attendanceMonth];
      const updatedAmMemo = [...(currentMonth.amMemo || Array(31).fill(''))];
      const updatedPmMemo = [...(currentMonth.pmMemo || Array(31).fill(''))];

      updatedAmMemo[dayIndex] = value;
      updatedPmMemo[dayIndex] = '';

      return {
        ...student,
        attendance: {
          ...student.attendance,
          [attendanceMonth]: {
            ...currentMonth,
            amMemo: updatedAmMemo,
            pmMemo: updatedPmMemo
          }
        }
      };
    }));

    markStudentDirty(studentId, 'attendance');
  };

  const handleStudyTimeChange = (studentId, dayIndex, field, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      const newDaily = [...(student.studyTime?.[studyTimeMonth] || Array.from({ length: 31 }, () => ({ in: '', out: '' })))];
      newDaily[dayIndex] = { ...newDaily[dayIndex], [field]: value };
      return { ...student, studyTime: { ...student.studyTime, [studyTimeMonth]: newDaily } };
    }));

    markStudentDirty(studentId, 'studyTime');
  };

  const handleDailyScoreChange = (studentId, dayIndex, testIndex, value) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      const baseDaily = student.dailyRecords?.[dailyMonth] || generateEmptyMonthlyDaily()[dailyMonth];
      const newDaily = baseDaily.map(d => ({ t1: '', t2: '', math: '', ...(d || {}) }));
      newDaily[dayIndex] = { ...newDaily[dayIndex], [testIndex]: value };
      return { ...student, dailyRecords: { ...student.dailyRecords, [dailyMonth]: newDaily } };
    }));

    markStudentDirty(studentId, 'dailyRecords');
  };

  const studentProfileToView = useMemo(() => students.find(s => s.id === viewingProfileId), [viewingProfileId, students]);
  const studentGradeToView = useMemo(() => students.find(s => s.id === viewingGradeId), [viewingGradeId, students]);
  const editingStudent = useMemo(() => students.find(s => s.id === editingMonthlyStudentId), [editingMonthlyStudentId, students]);
  
  const reportStudent = useMemo(() => {
    if (reportStudentId) {
      const found = students.find(s => s.id === reportStudentId);
      if (found) return found;
    }

    return reportStudentsForList.length > 0 ? reportStudentsForList[0] : null;
  }, [reportStudentId, students, reportStudentsForList]);

  return (
    <div className="min-h-screen flex w-full">
      {/* Toast Notification */}
      {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-5 font-bold">{toast}</div>}
      
      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <p className="text-slate-800 font-bold mb-4 whitespace-pre-wrap">{confirmDialog.msg}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 사이드바 영역 ---------------- */}
      <aside className="w-[210px] shrink-0 min-h-screen bg-gradient-to-b from-[#0054d8] via-[#0b7cf4] to-[#61c5ff] text-white rounded-r-[34px] shadow-[12px_0_35px_rgba(37,99,235,0.22)] relative overflow-hidden p-5 flex flex-col print:hidden z-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.20),transparent_34%)] pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full border border-white/25"></div>
        <div className="absolute -bottom-6 -right-14 w-44 h-44 rounded-full border border-white/20"></div>

        <div className="relative z-10 mb-8">
          <button
            type="button"
            onClick={onBack}
            className="mb-7 w-11 h-11 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            title="홈으로"
          >
            <School size={24} />
          </button>

          <h2 className="text-4xl font-black tracking-tight">{className}</h2>
        </div>

        <nav className="relative z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full h-[52px] px-4 rounded-2xl flex items-center gap-3 text-sm font-black transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-blue-600 shadow-xl'
                : 'text-white/90 hover:bg-white/14'
            }`}
          >
            <LayoutDashboard size={22} />
            <span>대시보드</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`w-full h-[52px] px-4 rounded-2xl flex items-center gap-3 text-sm font-black transition-all ${
              activeTab === 'students'
                ? 'bg-white text-blue-600 shadow-xl'
                : 'text-white/90 hover:bg-white/14'
            }`}
          >
            <Users size={22} />
            <span>학생 관리</span>
          </button>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`w-full h-[52px] px-4 rounded-2xl flex items-center justify-between text-sm font-black transition-all ${
                activeTab === 'attendance'
                  ? 'bg-white text-blue-600 shadow-xl'
                  : 'text-white/90 hover:bg-white/14'
              }`}
            >
              <span className="flex items-center gap-3">
                <CalendarCheck size={22} />
                출석 관리
              </span>
              <ChevronDown size={16} className={activeTab === 'attendance' ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {activeTab === 'attendance' && (
              <div className="ml-4 pl-4 border-l border-white/30 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('attendance');
                    setActiveAttendanceTab('calendar');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${
                    activeAttendanceTab === 'calendar'
                      ? 'bg-white/28 text-white shadow-inner'
                      : 'text-white/78 hover:bg-white/18 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  출석
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('attendance');
                    setActiveAttendanceTab('studyTime');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${
                    activeAttendanceTab === 'studyTime'
                      ? 'bg-white/28 text-white shadow-inner'
                      : 'text-white/78 hover:bg-white/18 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  학습시간
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`w-full h-[52px] px-4 rounded-2xl flex items-center justify-between text-sm font-black transition-all ${
                activeTab === 'test'
                  ? 'bg-white text-blue-600 shadow-xl'
                  : 'text-white/90 hover:bg-white/14'
              }`}
            >
              <span className="flex items-center gap-3">
                <PenTool size={22} />
                시험 관리
              </span>
              <ChevronDown size={16} className={activeTab === 'test' ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {activeTab === 'test' && (
              <div className="ml-4 pl-4 border-l border-white/30 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('test');
                    setActiveTestTab('daily');
                    setActiveDailyTab('input');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTestTab === 'daily'
                      ? 'bg-white/28 text-white shadow-inner'
                      : 'text-white/78 hover:bg-white/18 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('test');
                    setActiveTestTab('weekly');
                    setActiveWeeklyTab('setup');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTestTab === 'weekly'
                      ? 'bg-white/28 text-white shadow-inner'
                      : 'text-white/78 hover:bg-white/18 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('test');
                    setActiveTestTab('monthly');
                    setTestViewMode('input');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTestTab === 'monthly'
                      ? 'bg-white/28 text-white shadow-inner'
                      : 'text-white/78 hover:bg-white/18 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  Monthly
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab('grades')}
            className={`w-full h-[52px] px-4 rounded-2xl flex items-center gap-3 text-sm font-black transition-all ${
              activeTab === 'grades'
                ? 'bg-white text-blue-600 shadow-xl'
                : 'text-white/90 hover:bg-white/14'
            }`}
          >
            <BarChart3 size={22} />
            <span>학습 데이터</span>
          </button>

          <button
            onClick={() => setActiveTab('needs')}
            className={`w-full h-[52px] px-4 rounded-2xl flex items-center gap-3 text-sm font-black transition-all ${
              activeTab === 'needs'
                ? 'bg-white text-blue-600 shadow-xl'
                : 'text-white/90 hover:bg-white/14'
            }`}
          >
            <AlertTriangle size={22} />
            <span>관리 필요 학생</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`w-full h-[52px] px-4 rounded-2xl flex items-center gap-3 text-sm font-black transition-all ${
              activeTab === 'report'
                ? 'bg-white text-blue-600 shadow-xl'
                : 'text-white/90 hover:bg-white/14'
            }`}
          >
            <Printer size={22} />
            <span>월간 리포트 생성</span>
          </button>
        </nav>


      </aside>

      {/* ---------------- 메인 컨텐츠 영역 ---------------- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative print:bg-white print:overflow-visible">
        <div className="flex-1 overflow-auto p-4 md:p-8 print:p-0">
          <div className="print:hidden sticky top-0 z-30 mb-4 flex items-center justify-end gap-3">
            <span
              className={`px-3 py-2 rounded-full text-xs font-black shadow-sm ${
                manualSaveStatus === 'saving'
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : manualSaveStatus === 'saved'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : manualSaveStatus === 'error'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : getDirtyCountForScope('class') > 0
                        ? 'bg-orange-50 text-orange-600 border border-orange-100'
                        : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {manualSaveMessage || (getDirtyCountForScope('class') > 0 ? '변경사항 있음' : '저장 대기')}
            </span>

            <button
              type="button"
              disabled={manualSaveStatus === 'saving' || getDirtyCountForScope('class') === 0}
              onClick={() => saveDirtyStudentsToFirebase('class')}
              title="현재 반의 변경사항을 Firebase에 저장합니다. 저장완료 표시 후 다른 사용자에게 반영됩니다."
              className={`h-10 px-4 rounded-xl text-sm font-black flex items-center gap-2 shadow-sm transition-colors ${
                getDirtyCountForScope('class') === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : manualSaveStatus === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <CheckCircle2 size={16} />
              현재 반 변경사항 저장{getDirtyCountForScope('class') > 0 ? ` (${getDirtyCountForScope('class')}건)` : ''}
            </button>
          </div>
          
          {/* [0] 대시보드 탭 (Feature 1) */}
          {activeTab === 'dashboard' && (() => {
            const alerts = getDashboardAlerts();

            const getStudentInitial = (name = '') => {
              const value = String(name || '').trim();
              return value ? value.slice(-2) : '학생';
            };

            const getDashboardDailyRate = () => {
              return getClassDailyRateForMonth(dashboardMonth, 'all');
            };

            const getDashboardAvgScore = () => {
              return getClassAvgMonthlyScoreForMonth(dashboardMonth).toFixed(1);
            };

            const getDashboardAvgStudyHours = () => {
              return getClassAvgStudyHoursForMonth(dashboardMonth);
            };

            const getManagementCount = () => {
              return managementNeedStudents.length;
            };

            const getScoreAlertStudents = () => {
              return classStudents
                .map(student => {
                  const monthly = student.scores?.monthly?.[dashboardMonth];
                  const totalScore = Number(monthly?.total?.score || 0);
                  const englishScore = Number(monthly?.english?.score || 0);
                  const mathScore = Number(monthly?.math?.score || 0);
                  const values = [totalScore, englishScore, mathScore].filter(v => v > 0);
                  const avg = values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
                  return { name: student.name, val: avg ? `평균 ${avg}점` : '점수 미입력', score: avg };
                })
                .filter(item => item.score === 0 || item.score < 70)
                .slice(0, 4);
            };

            const normalizeAlertList = (list = [], fallbackText = '데이터 없음') => {
              if (list.length > 0) return list.slice(0, 4);
              return classStudents.slice(0, 4).map(student => ({ name: student.name, val: fallbackText }));
            };

            const attendanceList = normalizeAlertList(alerts.attendance, '출석 데이터 부족');
            const dailyList = normalizeAlertList(alerts.dailyScore, 'Daily 데이터 부족');
            const scoreList = normalizeAlertList(getScoreAlertStudents(), '성적 데이터 부족');
            const studyList = normalizeAlertList(alerts.studyTime, '학습시간 데이터 부족');

            const dashboardAttendanceRate = getClassAttendanceRateForMonth(dashboardMonth);
            const dailyRate = getDashboardDailyRate();
            const avgScore = getDashboardAvgScore();
            const avgStudyHours = getDashboardAvgStudyHours();
            const managementCount = getManagementCount();

            const prevDashboardMonth = getDashboardPrevMonth(dashboardMonth);
            const attendanceDelta = formatDashboardDelta(
              dashboardAttendanceRate,
              prevDashboardMonth ? getClassAttendanceRateForMonth(prevDashboardMonth) : null,
              '%p'
            );
            const dailyDelta = formatDashboardDelta(
              dailyRate,
              prevDashboardMonth ? getClassDailyRateForMonth(prevDashboardMonth, 'all') : null,
              '%p'
            );
            const scoreDelta = formatDashboardDelta(
              avgScore,
              prevDashboardMonth ? getClassAvgMonthlyScoreForMonth(prevDashboardMonth) : null,
              '점'
            );
            const studyDelta = formatDashboardDelta(
              avgStudyHours,
              prevDashboardMonth ? getClassAvgStudyHoursForMonth(prevDashboardMonth) : null,
              '시간'
            );

            const getStudentWeeklyScoreForIndex = (student, weekIndex) => {
              const weekNumber = weekIndex + 1;

              const englishValue = Number(
                student.scores?.weeklyEnglish?.[`${dashboardMonth}_w${weekNumber}`] ??
                student.scores?.weeklyEnglish?.[`w${weekNumber}`] ??
                0
              );

              const mathValue = Number(
                student.scores?.weeklyMath?.[`${dashboardMonth}_w${weekNumber}`] ??
                student.scores?.weeklyMath?.[`w${weekNumber}`] ??
                0
              );

              const values = [];

              if (englishValue > 0) values.push(englishValue);

              if (isNaturalTrack(student) && mathValue > 0) {
                values.push(mathValue);
              }

              if (values.length === 0) return null;

              return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
            };

            const getWeeklyAverageScoreForIndex = (weekIndex) => {
              const values = classStudents
                .map(student => getStudentWeeklyScoreForIndex(student, weekIndex))
                .filter(value => value !== null && Number.isFinite(value) && value > 0);

              if (values.length === 0) return null;

              return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
            };

            const getMondayOfWeek = (date) => {
              const target = new Date(date);
              const day = target.getDay();
              const diff = day === 0 ? -6 : 1 - day;

              target.setDate(target.getDate() + diff);
              target.setHours(0, 0, 0, 0);

              return target;
            };

            const formatMonthDayWithWeekday = (date) => {
              const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
              return `${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]})`;
            };

            const formatMonthDayShort = (date) => {
              return `${date.getMonth() + 1}/${date.getDate()}`;
            };

            const getWeekRangesForTrend = () => {
              const now = new Date();
              const selectedMonthNumber = parseInt(String(dashboardMonth).replace('월', ''), 10);
              const safeMonthNumber = Number.isFinite(selectedMonthNumber) && selectedMonthNumber >= 1 && selectedMonthNumber <= 12
                ? selectedMonthNumber
                : now.getMonth() + 1;

              const baseDate = new Date(
                now.getFullYear(),
                safeMonthNumber - 1,
                now.getMonth() + 1 === safeMonthNumber ? now.getDate() : 1
              );

              const thisWeekMonday = getMondayOfWeek(baseDate);

              return Array.from({ length: 8 }, (_, index) => {
                const start = new Date(thisWeekMonday);
                start.setDate(thisWeekMonday.getDate() - 7 * (7 - index));

                const end = new Date(start);
                end.setDate(start.getDate() + 6);

                return {
                  start,
                  end,
                  label: `${formatMonthDayWithWeekday(start)}~${formatMonthDayWithWeekday(end)}`,
                  shortLabel: `${formatMonthDayShort(start)}~${formatMonthDayShort(end)}`
                };
              });
            };

            const isFutureDateForTrend = (date) => {
              const today = new Date();
              const checkDate = new Date(date);

              today.setHours(0, 0, 0, 0);
              checkDate.setHours(0, 0, 0, 0);

              return checkDate > today;
            };

            const getDashboardAttendanceRateByDateRange = (startDate, endDate) => {
              if (!classStudents.length) return 0;

              let denominator = 0;
              let presentCount = 0;
              const cursor = new Date(startDate);

              while (cursor <= endDate) {
                if (!isFutureDateForTrend(cursor)) {
                  const month = `${cursor.getMonth() + 1}월`;
                  const dayIndex = cursor.getDate() - 1;
                  const excluded = attendanceSettings?.[month]?.excludedDays || [];

                  if (!excluded.includes(dayIndex)) {
                    classStudents.forEach(student => {
                      const monthData = student.attendance?.[month] || {};
                      const attendanceArray = getUnifiedAttendanceArray(monthData);
                      const value = attendanceArray?.[dayIndex];
                      const type = getAttendanceValueType(value);

                      if (type === 'neutral') return;

                      denominator += 1;
                      if (type === 'present') presentCount += 1;
                    });
                  }
                }

                cursor.setDate(cursor.getDate() + 1);
              }

              return denominator === 0 ? 0 : Math.round((presentCount / denominator) * 100);
            };

            const getDashboardDailyRateByDateRange = (startDate, endDate) => {
              if (!classStudents.length) return 0;

              let denominator = 0;
              let participatedCount = 0;
              const cursor = new Date(startDate);

              while (cursor <= endDate) {
                if (!isFutureDateForTrend(cursor)) {
                  const month = `${cursor.getMonth() + 1}월`;
                  const dayIndex = cursor.getDate() - 1;
                  const excluded = dailySettings?.[month]?.excludedDays || [];

                  if (!excluded.includes(dayIndex)) {
                    classStudents.forEach(student => {
                      denominator += 1;

                      const dailyArray = student.dailyRecords?.[month] || [];
                      const day = dailyArray[dayIndex] || {};
                      const t1 = String(day?.t1 ?? '').trim();
                      const t2 = String(day?.t2 ?? '').trim();
                      const math = String(day?.math ?? '').trim();

                      if (t1 !== '' || t2 !== '' || math !== '') participatedCount += 1;
                    });
                  }
                }

                cursor.setDate(cursor.getDate() + 1);
              }

              return denominator === 0 ? 0 : Math.round((participatedCount / denominator) * 100);
            };

            const weekRanges = getWeekRangesForTrend();

            const trendData = weekRanges.map((range, index) => {
              const weeklyScore = getWeeklyAverageScoreForIndex(index);

              return {
                label: range.label,
                shortLabel: range.shortLabel,
                attendance: getDashboardAttendanceRateByDateRange(range.start, range.end),
                daily: getDashboardDailyRateByDateRange(range.start, range.end),
                score: weeklyScore,
                scoreText: weeklyScore === null ? '데이터 없음' : `${weeklyScore}점`,
                study: Math.max(0, Math.min(100, Number(avgStudyHours || 0) * 8))
              };
            });

            const makeLinePoints = (key) => {
              return trendData
                .map((item, index) => {
                  const rawValue = item[key];

                  if (rawValue === null || rawValue === undefined || rawValue === '') {
                    return null;
                  }

                  const x = 52 + index * 92;
                  const value = Math.max(0, Math.min(100, Number(rawValue || 0)));
                  const y = 178 - (value / 100) * 145;

                  return `${x},${y}`;
                })
                .filter(Boolean)
                .join(' ');
            };

            const managementCards = [
              {
                key: 'attendance',
                title: '출석 관리 필요',
                count: attendanceNeedStudents.length,
                icon: CalendarCheck,
                iconClass: 'text-emerald-600',
                badgeClass: 'bg-emerald-500 text-white',
                list: attendanceNeedStudents.slice(0, 4),
                empty: '출석 관리 대상이 없습니다.',
                onViewAll: () => { setActiveTab('needs'); setActiveNeedTab('attendance'); }
              },
              {
                key: 'daily',
                title: 'Daily 관리 필요',
                count: dailyNeedStudents.length,
                icon: AlertTriangle,
                iconClass: 'text-orange-500',
                badgeClass: 'bg-orange-500 text-white',
                list: dailyNeedStudents.slice(0, 4),
                empty: 'Daily 관리 대상이 없습니다.',
                onViewAll: () => { setActiveTab('needs'); setActiveNeedTab('daily'); }
              },
              {
                key: 'score',
                title: '성적 관리 필요',
                count: scoreNeedStudents.length,
                icon: Trophy,
                iconClass: 'text-violet-600',
                badgeClass: 'bg-violet-600 text-white',
                list: scoreNeedStudents.slice(0, 4),
                empty: '성적 관리 대상이 없습니다.',
                onViewAll: () => { setActiveTab('needs'); setActiveNeedTab('score'); }
              },
              {
                key: 'study',
                title: '학습시간 관리 필요',
                count: studyNeedStudents.length,
                icon: Clock,
                iconClass: 'text-blue-600',
                badgeClass: 'bg-blue-600 text-white',
                list: studyNeedStudents.slice(0, 4),
                empty: '학습시간 관리 대상이 없습니다.',
                onViewAll: () => { setActiveTab('needs'); setActiveNeedTab('study'); }
              }
            ];

            const quickLinks = [
              {
                title: '학생 관리',
                desc: '학생 정보 및 이력',
                icon: Users,
                onClick: () => setActiveTab('students')
              },
              {
                title: '출석 관리',
                desc: '출석 현황 및 통계',
                icon: CalendarCheck,
                onClick: () => {
                  setActiveTab('attendance');
                  setActiveAttendanceTab('calendar');
                }
              },
              {
                title: 'Daily 관리',
                desc: 'Daily 참여 및 통계',
                icon: PenTool,
                onClick: () => {
                  setActiveTab('test');
                  setActiveTestTab('daily');
                  setActiveDailyTab('input');
                }
              },
              {
                title: '성적 관리',
                desc: '성적 입력 및 분석',
                icon: Trophy,
                onClick: () => setActiveTab('grades')
              },
              {
                title: '학습시간 관리',
                desc: '학습시간 확인 및 분석',
                icon: Clock,
                onClick: () => {
                  setActiveTab('attendance');
                  setActiveAttendanceTab('studyTime');
                }
              },
              {
                title: '보고서',
                desc: '클래스 리포트 생성',
                icon: FileText,
                onClick: () => setActiveTab('report')
              }
            ];

            const kpiCards = [
              {
                title: '등록 학생 수',
                value: classStudents.length,
                unit: '명',
                sub: '현재 선택 반 기준',
                link: '학생 목록',
                icon: Users,
                iconBox: 'bg-blue-50 text-blue-600',
                valueClass: 'text-slate-950',
                onClick: () => setActiveTab('students')
              },
              {
                title: '이번 달 출석률',
                value: dashboardAttendanceRate,
                unit: '%',
                sub: attendanceDelta.text,
                link: '상세 보기',
                icon: CalendarCheck,
                iconBox: 'bg-blue-50 text-blue-600',
                valueClass: 'text-slate-950',
                subClass: attendanceDelta.className,
                onClick: () => {
                  setActiveTab('attendance');
                  setActiveAttendanceTab('calendar');
                }
              },
              {
                title: 'Daily 참여율',
                value: dailyRate,
                unit: '%',
                sub: dailyDelta.text,
                link: '상세 보기',
                icon: PenTool,
                iconBox: 'bg-blue-50 text-blue-600',
                valueClass: 'text-slate-950',
                subClass: dailyDelta.className,
                onClick: () => {
                  setActiveTab('test');
                  setActiveTestTab('daily');
                  setActiveDailyTab('input');
                }
              },
              {
                title: '이번 달 평균 점수',
                value: avgScore,
                unit: '점',
                sub: scoreDelta.text,
                link: '성적 분석',
                icon: Trophy,
                iconBox: 'bg-violet-50 text-violet-600',
                valueClass: 'text-slate-950',
                subClass: scoreDelta.className,
                onClick: () => setActiveTab('grades')
              },
              {
                title: '이번 달 평균 학습시간',
                value: avgStudyHours,
                unit: '시간',
                sub: studyDelta.text,
                link: '상세 보기',
                icon: Clock,
                iconBox: 'bg-blue-50 text-blue-600',
                valueClass: 'text-slate-950',
                subClass: studyDelta.className,
                onClick: () => {
                  setActiveTab('attendance');
                  setActiveAttendanceTab('studyTime');
                }
              },
              {
                title: '관리 필요 학생',
                value: managementCount,
                unit: '명',
                sub: '즉시 확인 필요',
                link: '학생 목록',
                icon: AlertTriangle,
                iconBox: 'bg-red-50 text-red-500',
                valueClass: 'text-slate-950',
                subClass: 'text-slate-500',
                onClick: () => setActiveTab('needs')
              }
            ];

            return (
              <div className="relative min-h-full overflow-hidden rounded-[28px] bg-[#f7fbff] px-5 py-4 animate-in fade-in duration-300">
                <div className="absolute inset-x-0 top-0 h-[210px] bg-[radial-gradient(circle_at_55%_-20%,rgba(56,189,248,0.30),transparent_34%),linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.70)_45%,rgba(239,246,255,0.95))] pointer-events-none"></div>
                <div className="absolute -top-8 right-0 w-[760px] h-[180px] rounded-bl-[80px] bg-[linear-gradient(160deg,rgba(125,211,252,0.45),rgba(255,255,255,0.05))] blur-[1px] pointer-events-none"></div>
                <div className="absolute top-3 right-24 w-[520px] h-[90px] border-t border-white/80 rounded-[100%] rotate-[-6deg] pointer-events-none"></div>
                <div className="absolute top-8 right-44 w-[600px] h-[100px] border-t border-white/70 rounded-[100%] rotate-[-9deg] pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-6 mb-4">
                    <div>
                      <h1 className="text-[34px] leading-tight font-black tracking-tight text-slate-950 mb-2">
                        {className} 클래스 대시보드
                      </h1>
                    </div>

                    <select
                      className="h-14 min-w-[190px] rounded-2xl bg-white/90 border border-blue-100 shadow-[0_12px_30px_rgba(37,99,235,0.12)] px-5 text-base font-black text-slate-800 outline-none cursor-pointer"
                      value={dashboardMonth}
                      onChange={(e) => setDashboardMonth(e.target.value)}
                    >
                      {MONTHS.map(m => <option key={m} value={m}>{academicYear}년 {m}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-6 gap-4 mb-4">
                    {kpiCards.map((card, index) => {
                      const Icon = card.icon;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={card.onClick}
                          className="text-left min-h-[150px] rounded-[24px] bg-white/88 backdrop-blur-xl border border-blue-100 shadow-[0_12px_30px_rgba(37,99,235,0.08)] p-5 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(37,99,235,0.13)] transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${card.iconBox}`}>
                              <Icon size={28} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-slate-600 mb-2">{card.title}</p>
                              <div className="flex items-end gap-1 mb-2">
                                <strong className={`text-3xl font-black ${card.valueClass}`}>{card.value}</strong>
                                <span className="text-base font-black text-slate-700 mb-1">{card.unit}</span>
                              </div>
                              <p className={`text-xs font-black ${card.subClass || 'text-slate-500'}`}>{card.sub}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-end gap-1 text-xs font-black text-blue-600">
                            {card.link} <ChevronRight size={14} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
                    {managementCards.map((card, index) => {
                      const Icon = card.icon;

                      return (
                        <div
                          key={index}
                          className="rounded-[24px] bg-white/90 backdrop-blur-xl border border-blue-100 shadow-[0_12px_30px_rgba(37,99,235,0.08)] p-5 min-h-[185px]"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className={`flex items-center gap-2 text-lg font-black ${index === 0 ? 'text-emerald-700' : index === 1 ? 'text-slate-900' : index === 2 ? 'text-violet-700' : 'text-blue-700'}`}>
                              <Icon size={20} className={card.iconClass} />
                              {card.title}
                            </h3>
                            <span className={`px-3 py-1 rounded-lg text-xs font-black ${card.badgeClass}`}>
                              {card.count}명
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {card.list.length > 0 ? card.list.map((item) => {
                              const mainReason = item.reasons.find(reason => reason.type === card.key) || item.reasons[0];
                              const severity = mainReason?.severity;

                              return (
                                <div key={`${card.title}-${item.student.id}`} className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-sky-50 border border-white shadow-sm flex items-center justify-center text-[11px] font-black text-blue-700">
                                    {getStudentInitial(item.student.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">{item.student.name}</p>
                                    <p className="text-[11px] font-bold text-slate-400 truncate">{mainReason?.text}</p>
                                  </div>
                                  {severity && (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${severity.className}`}>
                                      {severity.label}
                                    </span>
                                  )}
                                </div>
                              );
                            }) : (
                              <div className="py-8 text-center text-sm font-bold text-slate-400">{card.empty}</div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={card.onViewAll}
                            className="mt-4 w-full border-t border-slate-100 pt-3 text-sm font-black text-blue-600 flex items-center justify-center gap-1"
                          >
                            전체 보기 <ChevronRight size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-4">
                    <div className="relative rounded-[24px] bg-white/90 backdrop-blur-xl border border-blue-100 shadow-[0_12px_30px_rgba(37,99,235,0.08)] p-4 min-h-[230px]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-slate-900">
                          주요 지표 추이 <span className="text-sm font-bold text-slate-400">(최근 8주)</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowTrendAnalysis(prev => !prev)}
                          className="text-sm font-black text-blue-600 flex items-center gap-1"
                        >
                          상세 분석 <ChevronRight size={15} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-6 mb-3 text-xs font-black text-slate-600">
                        <span className="flex items-center gap-2"><span className="w-6 h-[3px] bg-blue-600 rounded-full"></span>출석률(%)</span>
                        <span className="flex items-center gap-2"><span className="w-6 h-[3px] bg-emerald-500 rounded-full"></span>Daily 참여율(%)</span>
                        <span className="flex items-center gap-2"><span className="w-6 h-[3px] bg-violet-600 rounded-full"></span>평균 점수(점)</span>
                        <span className="flex items-center gap-2"><span className="w-6 h-[3px] bg-orange-500 rounded-full"></span>평균 학습시간(시간)</span>
                      </div>

                      <svg viewBox="0 0 720 230" className="w-full h-[185px]">
                        {[0, 25, 50, 75, 100].map((tick) => {
                          const y = 178 - (tick / 100) * 145;
                          return (
                            <g key={tick}>
                              <line x1="48" x2="704" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                              <text x="18" y={y + 4} fontSize="12" fill="#64748b" fontWeight="700">{tick}</text>
                            </g>
                          );
                        })}

                        <polyline points={makeLinePoints('attendance')} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points={makeLinePoints('daily')} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points={makeLinePoints('score')} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points={makeLinePoints('study')} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                        {trendData.map((item, index) => (
                          <text key={item.label} x={52 + index * 92} y="215" fontSize="10" fill="#64748b" fontWeight="700" textAnchor="middle">
                            {item.shortLabel || item.label.replace(/\(.\)/g, '')}
                          </text>
                        ))}

                        {trendData.map((item, index) => {
                          const x = 52 + index * 92;
                          const hoverLeft = Math.max(48, x - 46);
                          const hoverRight = Math.min(704, x + 46);
                          const hoverWidth = hoverRight - hoverLeft;
                          const tooltipX = x > 540 ? x - 155 : x + 10;
                          const tooltipTextX = tooltipX + 12;

                          return (
                            <g
                              key={`hover-${item.label}`}
                              onMouseEnter={() => setHoveredTrendIndex(index)}
                              onMouseMove={() => setHoveredTrendIndex(index)}
                              onMouseLeave={() => setHoveredTrendIndex(null)}
                              onClick={() => setHoveredTrendIndex(index)}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                setHoveredTrendIndex(index);
                              }}
                              style={{ cursor: 'default' }}
                            >
                              <rect
                                x={hoverLeft}
                                y="20"
                                width={hoverWidth}
                                height="195"
                                fill="rgba(255,255,255,0.001)"
                                pointerEvents="all"
                              />

                              {hoveredTrendIndex === index && (
                                <g pointerEvents="none">
                                  <rect
                                    x={hoverLeft}
                                    y="20"
                                    width={hoverWidth}
                                    height="195"
                                    fill="#dbeafe"
                                    opacity="0.18"
                                    rx="10"
                                  />
                                  <line x1={x} x2={x} y1="28" y2="180" stroke="#94a3b8" strokeDasharray="4 4" />
                                  <rect x={tooltipX} y="28" width="145" height="92" rx="12" fill="white" stroke="#dbeafe" />
                                  <text x={tooltipTextX} y="48" fontSize="12" fill="#0f172a" fontWeight="800">{item.label}</text>
                                  <text x={tooltipTextX} y="68" fontSize="11" fill="#2563eb" fontWeight="700">출석률 {Math.round(item.attendance)}%</text>
                                  <text x={tooltipTextX} y="84" fontSize="11" fill="#10b981" fontWeight="700">Daily {Math.round(item.daily)}%</text>
                                  <text x={tooltipTextX} y="100" fontSize="11" fill="#7c3aed" fontWeight="700">
                                    Weekly 평균 {item.scoreText || '데이터 없음'}
                                  </text>
                                  <text x={tooltipTextX} y="116" fontSize="11" fill="#f97316" fontWeight="700">학습시간 {Math.round(item.study)}%</text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </svg>

                      {showTrendAnalysis && (
                        <div className="absolute right-5 top-14 w-[340px] max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl bg-white border border-blue-100 shadow-[0_18px_45px_rgba(37,99,235,0.18)] p-4 z-30">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-base font-black text-slate-950">주요 지표 상세 분석</h4>
                            <button type="button" onClick={() => setShowTrendAnalysis(false)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><X size={15} /></button>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div><p className="font-black text-blue-600 mb-1">1. 종합 요약</p><p className="text-xs font-bold text-slate-600 leading-5">{dashboardMonth} 기준 출석률 {getClassAttendanceRate(dashboardMonth)}%, Daily 참여율 {getClassDailyRate(dashboardMonth)}%입니다.</p></div>
                            <div><p className="font-black text-blue-600 mb-1">2. 종합 관리 필요도</p><p className="text-xs font-bold text-slate-600 leading-5">관리 필요 학생은 총 {allNeedStudents.length}명이며, 출석 {attendanceNeedStudents.length}명, Daily {dailyNeedStudents.length}명, 성적 {scoreNeedStudents.length}명, 학습시간 {studyNeedStudents.length}명입니다.</p></div>
                            <div><p className="font-black text-blue-600 mb-1">3. 주요 지표 현황</p><p className="text-xs font-bold text-slate-600 leading-5">출석, Daily, 성적, 학습시간을 함께 확인해 종합 관리 우선순위를 판단하세요.</p></div>
                            <div><p className="font-black text-rose-500 mb-1">4. 위험 신호</p><p className="text-xs font-bold text-slate-600 leading-5">위험 단계 학생은 즉시 상담 또는 개별 연락이 필요합니다.</p></div>
                            <div><p className="font-black text-violet-600 mb-1">5. 자동 분석 코멘트</p><p className="text-xs font-bold text-slate-600 leading-5">현재 데이터 기준으로 출석률과 Daily 참여율이 낮은 학생을 우선 관리하는 것이 좋습니다.</p></div>
                            <div><p className="font-black text-emerald-600 mb-1">6. 추천 관리 액션</p><p className="text-xs font-bold text-slate-600 leading-5">출석 저조 학생 상담, Daily 미응시자 보완 안내, 학습시간 저조 학생 루틴 점검을 권장합니다.</p></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[22px] bg-white/90 backdrop-blur-xl border border-blue-100 shadow-[0_10px_24px_rgba(37,99,235,0.08)] p-4 min-h-[220px]">
                      <h3 className="text-lg font-black text-slate-900 mb-4">빠른 이동</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {quickLinks.map((link, index) => {
                          const Icon = link.icon;

                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={link.onClick}
                              className="min-h-[76px] rounded-2xl border border-blue-100 bg-white/80 hover:bg-blue-50/70 px-4 py-3 flex items-center gap-3 text-left transition-colors"
                            >
                              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Icon size={23} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-800">{link.title}</p>
                                <p className="text-xs font-bold text-slate-500 mt-0.5">{link.desc}</p>
                              </div>
                              <ChevronRight size={18} className="text-slate-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* [0-1] 관리 필요 학생 탭 */}
          {activeTab === 'needs' && (() => {
            const needTabs = [
              { key: 'all', label: '전체', count: allNeedStudents.length },
              { key: 'attendance', label: '출석', count: attendanceNeedStudents.length },
              { key: 'daily', label: 'Daily', count: dailyNeedStudents.length },
              { key: 'score', label: '성적', count: scoreNeedStudents.length },
              { key: 'study', label: '학습시간', count: studyNeedStudents.length }
            ];
            const currentNeedList = getNeedStudentsByType(activeNeedTab, dashboardMonth);

            return (
              <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-950 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" size={24} />
                        관리 필요 학생
                      </h1>
                      <p className="text-sm font-bold text-slate-500 mt-1">
                        출석, Daily, 성적, 학습시간 기준에 따라 관리 필요 학생을 분류합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors"
                    >
                      대시보드로 돌아가기
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {needTabs.map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveNeedTab(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
                          activeNeedTab === tab.key
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-blue-50'
                        }`}
                      >
                        {tab.label} {tab.count}명
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-black text-slate-600">학생명</th>
                        <th className="px-4 py-3 text-center font-black text-slate-600">출석률</th>
                        <th className="px-4 py-3 text-center font-black text-slate-600">Daily</th>
                        <th className="px-4 py-3 text-center font-black text-slate-600">Monthly</th>
                        <th className="px-4 py-3 text-center font-black text-slate-600">학습시간</th>
                        <th className="px-4 py-3 text-left font-black text-slate-600">관리 사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentNeedList.length > 0 ? currentNeedList.map(item => (
                        <tr key={item.student.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                          <td className="px-4 py-3 font-black text-slate-900">{item.student.name}</td>
                          <td className="px-4 py-3 text-center font-black text-slate-700">{item.attendanceRate}%</td>
                          <td className="px-4 py-3 text-center font-black text-slate-700">{item.dailyRate}%</td>
                          <td className="px-4 py-3 text-center font-black text-slate-700">{item.monthlyScore || '-'}점</td>
                          <td className="px-4 py-3 text-center font-black text-slate-700">{item.studyText}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {item.reasons.map(reason => (
                                <span
                                  key={`${item.student.id}-${reason.type}-${reason.text}`}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black border ${reason.severity.className}`}
                                >
                                  {reason.label} · {reason.text}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-bold">
                            해당 기준의 관리 필요 학생이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          {/* [1] 학생목록 탭 */}
          {activeTab === 'students' && (
             <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
               <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
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
                         <th className="px-4 py-3">아이디/수험번호</th>
                         <th className="px-4 py-3">수강반</th>
                         <th className="px-4 py-3">연락처</th>
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
                             <td className="px-4 py-3 font-mono text-slate-600">
                              <div className="font-bold text-slate-700">{student.userId || '-'}</div>
                              <div className="text-[11px] text-slate-400">{student.id || '-'}</div>
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-600">
                              <div className="flex flex-col items-center gap-1">
                                {[...new Set([
                                  ...(Array.isArray(student.classNames) ? student.classNames : []),
                                  ...(Array.isArray(student.classes) ? student.classes : []),
                                  student.className
                                ].filter(Boolean))]
                                  .sort((a, b) => a.localeCompare(b, 'ko'))
                                  .map(cls => (
                                    <div key={cls} className="leading-tight">
                                      {cls}
                                    </div>
                                  ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{student.contact || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{student.gender || '-'}</td>
                             <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{student.transferType || '-'}</span></td>
                             <td className="px-4 py-3">
                               <span className={`px-2 py-1 rounded text-xs font-bold ${
                                 student.targetTrack === '인문계'
                                   ? 'bg-rose-50 text-rose-600'
                                   : 'bg-blue-50 text-blue-600'
                               }`}>
                                 {student.targetTrack || '-'}
                               </span>
                             </td>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 border-l-4 border-l-emerald-500">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><CalendarCheck className="text-emerald-500" size={24} />31일 출결 관리</h1>
                  <p className="text-slate-500 text-sm mt-1">출석확인을 기록하면 개인별/반 평균 출석률과 벌점이 자동 계산됩니다.</p>
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

                  <button
                    type="button"
                    onClick={() => downloadAttendanceDailyTemplate('attendance')}
                    className="bg-white hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-200 transition-colors shadow-sm"
                  >
                    <FileSpreadsheet size={18} />
                    출석/Daily 양식
                  </button>

                  <button
                    type="button"
                    onClick={() => attendanceDailyExcelInputRef.current?.click()}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-200 transition-colors shadow-sm"
                  >
                    <UploadCloud size={18} />
                    출석/Daily 업로드
                  </button>

                  <input
                    ref={attendanceDailyExcelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => handleAttendanceDailyExcelUpload(event, 'attendance')}
                  />

                  <div className="bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-100"><CheckCircle2 size={18} />화면 반영 후 저장</div>
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
                  <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700">
                    {ATTENDANCE_SESSION_LABEL}
                  </div>
                  <select className="border border-emerald-200 rounded-lg px-3 py-2 outline-none text-sm font-bold text-slate-700 bg-white" value={batchAttendanceStatus} onChange={e => setBatchAttendanceStatus(e.target.value)}>
                    <option value="">출결 사유 선택</option>
                    {ATTENDANCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <button onClick={handleBatchAttendanceChange} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50" disabled={selectedStudents.length === 0}>
                    일괄 적용
                  </button>
                  <button onClick={() => handleResetAttendance(false)} className="bg-rose-100 hover:bg-rose-200 text-rose-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 ml-2" disabled={selectedStudents.length === 0}>
                    선택일자 삭제
                  </button>
                  <button onClick={() => handleResetAttendance(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50" disabled={selectedStudents.length === 0}>
                    월 전체 삭제
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
                <div
                  ref={attendanceTopScrollRef}
                  className="overflow-x-auto custom-scrollbar h-5 bg-slate-50 border-b border-slate-200"
                  onScroll={() => syncAttendanceScroll('top')}
                >
                  <div style={{ width: '4200px', height: '1px' }} />
                </div>

                <div
                  ref={attendanceBodyScrollRef}
                  className="overflow-x-auto custom-scrollbar pb-4"
                  onScroll={() => syncAttendanceScroll('body')}
                >
                  <table className="w-max min-w-full text-center text-sm border-collapse">
                    <thead className="bg-slate-800 text-white font-medium sticky top-0 z-20">
                      <tr>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-0 z-30 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-10 text-center">
                           <input type="checkbox" className="cursor-pointer" checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length} onChange={(e) => handleSelectAllStudents(e.target.checked)} />
                        </th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 sticky left-[40px] z-30 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-40 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                          <div className="flex items-center justify-between">이름 (출석률) {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                        </th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-[200px] z-30 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-20">구분</th>
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
                        const attendanceData = getUnifiedAttendanceArray(student.attendance?.[attendanceMonth] || {});
                        const memoData = getUnifiedAttendanceMemoArray(student.attendance?.[attendanceMonth] || {});
                        const isSelected = selectedStudents.includes(student.id);
                        return (
                          <React.Fragment key={student.id}>
                            <tr className={`hover:bg-emerald-50/50 group ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                              <td className="border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-emerald-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center px-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleStudentSelection(student.id); }}>
                                 <input type="checkbox" className="cursor-pointer" checked={isSelected} onChange={() => {}} />
                              </td>
                              <td className="border-r border-slate-200 sticky left-[40px] z-10 bg-white group-hover:bg-emerald-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-left px-4 cursor-pointer" onClick={() => setViewingAttendanceSummary(student)}>
                                <div className="flex flex-col w-full gap-1">
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-slate-900 text-[13px]">{student.name}</span>
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">{getAttendanceRate(student, attendanceMonth)}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono text-left">{student.id}</div>
                                </div>
                              </td>
                              <td className="border-r border-slate-200 sticky left-[200px] z-10 bg-slate-50 text-slate-500 font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{ATTENDANCE_SESSION_LABEL}</td>
                              {attendanceData.map((val, dayIdx) => {
                                const isExcluded = attendanceSettings[attendanceMonth].excludedDays.includes(dayIdx);
                                const memoVal = memoData[dayIdx] || '';
                                return (
                                <td key={`attendance-${dayIdx}`} className={`border-r border-slate-200 p-0 relative group/cell ${isExcluded ? 'bg-slate-100' : ''}`} onContextMenu={(e) => { if(isExcluded) return; e.preventDefault(); e.stopPropagation(); const newMemo = prompt(`${dayIdx+1}일 ${ATTENDANCE_SESSION_LABEL} 메모 입력:`, memoVal); if (newMemo !== null) handleAttendanceMemoChange(student.id, ATTENDANCE_SESSION_KEY, dayIdx, newMemo); }}>
                                  <select disabled={isExcluded} value={isExcluded ? '' : val} onChange={(e) => handleAttendanceChange(student.id, ATTENDANCE_SESSION_KEY, dayIdx, e.target.value)} className={`w-full h-full py-2.5 px-1 outline-none cursor-pointer appearance-none text-center font-medium tracking-tight ${isExcluded ? 'cursor-not-allowed opacity-0' : val === '출석' || val === 'Live' ? 'text-emerald-600 bg-emerald-50/30' : val === '결석' ? 'text-rose-600 bg-rose-100/50 font-bold' : val === '지각' ? 'text-amber-600 bg-amber-50/30' : val === '조퇴' ? 'text-orange-600 bg-orange-50/30' : val !== '' ? 'text-slate-600 bg-slate-100/50' : 'bg-transparent text-slate-400 hover:bg-slate-100 transition-colors'}`}>
                                    <option value=""></option>{ATTENDANCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  {!isExcluded && (
                                      <div className={`absolute top-0 right-0 w-3 h-3 z-10 cursor-pointer ${memoVal ? 'bg-red-500 rounded-bl-sm shadow-sm' : 'opacity-0 group-hover/cell:opacity-100 bg-slate-300 hover:bg-red-400 rounded-bl-sm'}`} onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          const newMemo = prompt(`${dayIdx+1}일 ${ATTENDANCE_SESSION_LABEL} 메모 입력:`, memoVal);
                                          if (newMemo !== null) handleAttendanceMemoChange(student.id, ATTENDANCE_SESSION_KEY, dayIdx, newMemo);
                                      }} title={memoVal ? `메모: ${memoVal}` : "메모 추가 (우클릭 가능)"}></div>
                                  )}
                                </td>
                              )})}
                              <td className="border-l border-slate-200 align-middle bg-rose-50/40">
                                  <div className={`font-extrabold text-[14px] flex justify-center w-full ${(typeof penaltyRules !== 'undefined' ? getAttendancePenalty(student, attendanceMonth) >= penaltyRules.maxPenalty : false) ? 'text-white bg-red-500 py-1 rounded px-2 animate-pulse' : 'text-rose-500'}`}>
                                      {getAttendancePenalty(student, attendanceMonth)} 점
                                  </div>
                              </td>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 border-l-4 border-l-indigo-500">
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
                     <button onClick={() => handleResetStudyTime(false)} className="bg-rose-100 hover:bg-rose-200 text-rose-600 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 ml-2" disabled={selectedStudents.length === 0}>
                        선택일자 삭제
                     </button>
                     <button onClick={() => handleResetStudyTime(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50" disabled={selectedStudents.length === 0}>
                        월 전체 삭제
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
                  <div
                    ref={studyTimeTopScrollRef}
                    className="overflow-x-auto custom-scrollbar h-5 bg-slate-50 border-b border-slate-200"
                    onScroll={() => syncStudyTimeScroll('top')}
                  >
                    <div style={{ width: '4200px', height: '1px' }} />
                  </div>

                  <div
                    ref={studyTimeBodyScrollRef}
                    className="overflow-x-auto custom-scrollbar pb-4"
                    onScroll={() => syncStudyTimeScroll('body')}
                  >
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 border-l-4 border-l-indigo-500">
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
                    <>
                      <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner w-fit">
                        <button onClick={()=>setActiveDailyTab('input')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeDailyTab === 'input' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>✏️ 일별 기입</button>
                        <button onClick={()=>setActiveDailyTab('summary')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeDailyTab === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📊 월간 종합 리포트</button>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadAttendanceDailyTemplate('daily')}
                        className="bg-white hover:bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-indigo-200 transition-colors shadow-sm"
                      >
                        <FileSpreadsheet size={18} />
                        출석/Daily 양식
                      </button>

                      <button
                        type="button"
                        onClick={() => testDailyExcelInputRef.current?.click()}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-indigo-200 transition-colors shadow-sm"
                      >
                        <UploadCloud size={18} />
                        출석/Daily 업로드
                      </button>

                      <input
                        ref={testDailyExcelInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(event) => handleAttendanceDailyExcelUpload(event, 'daily')}
                      />
                    </>
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
                      <button
                        onClick={() => openImportModal(activeTestTab)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-indigo-200 transition-colors"
                      >
                         <UploadCloud size={18} /> MONTHLY 엑셀 연동
                      </button>

                      <button
                        onClick={() => handleResetMonthlyOmrScores('english')}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-indigo-200 transition-colors"
                      >
                         <Trash2 size={18} /> {selectedMonth} 영어 초기화
                      </button>

                      <button
                        onClick={() => handleResetMonthlyOmrScores('math')}
                        className="bg-teal-50 hover:bg-teal-100 text-teal-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-teal-200 transition-colors"
                      >
                         <Trash2 size={18} /> {selectedMonth} 수학 초기화
                      </button>

                      <button
                        onClick={() => handleResetMonthlyOmrScores('total')}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-slate-200 transition-colors"
                      >
                         <Trash2 size={18} /> {selectedMonth} 합산 초기화
                      </button>

                      <button
                        onClick={() => handleResetMonthlyOmrScores('all')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-rose-200 transition-colors"
                      >
                         <Trash2 size={18} /> {selectedMonth} 전체 초기화
                      </button>

                      <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                        <button
                          onClick={()=>setTestViewMode('input')}
                          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${testViewMode === 'input' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-50 hover:text-slate-700'}`}
                        >
                          ✏️ 성적 뷰/기입 모드
                        </button>

                        <button
                          onClick={()=>setTestViewMode('report')}
                          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${testViewMode === 'report' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          📊 종합 리포트 출력
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* -- DAILY TEST (31일 표) -- */}
              {activeTestTab === 'daily' && activeDailyTab === 'input' && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setDailySubject('english')}
                      className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
                        dailySubject === 'english'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-blue-50'
                      }`}
                    >
                      영어 Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailySubject('math')}
                      className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
                        dailySubject === 'math'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-blue-50'
                      }`}
                    >
                      수학 Daily
                    </button>
                  </div>

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
                    <div className="bg-indigo-50/50 p-4 border-b border-indigo-100/50 flex flex-wrap items-center gap-3">
                      <div className="text-sm font-bold text-indigo-800 flex items-center gap-2 mr-2"><CheckCircle2 size={18} className="text-indigo-500"/> 👥 선택 학생 일괄 기입 (현재 {selectedStudents.length}명)</div>
                      <select className="border border-indigo-200 rounded-lg px-3 py-1.5 outline-none text-sm font-bold text-slate-700 bg-white" value={batchDailyDate} onChange={e => setBatchDailyDate(e.target.value)}>
                        {Array.from({length: 31}, (_, i) => <option key={i} value={i}>{i+1}일</option>)}
                      </select>
                      {dailySubject === 'math' ? (
                        <input type="number" placeholder="수학 점수" className="w-28 px-3 py-1.5 border border-indigo-200 rounded-lg outline-none text-sm font-bold text-slate-700" value={batchDailyMath} onChange={e => setBatchDailyMath(e.target.value)} />
                      ) : (
                        <>
                          <input type="number" placeholder="1차 점수" className="w-24 px-3 py-1.5 border border-indigo-200 rounded-lg outline-none text-sm font-bold text-slate-700" value={batchDailyT1} onChange={e => setBatchDailyT1(e.target.value)} />
                          <input type="number" placeholder="2차 점수" className="w-24 px-3 py-1.5 border border-indigo-200 rounded-lg outline-none text-sm font-bold text-slate-700" value={batchDailyT2} onChange={e => setBatchDailyT2(e.target.value)} />
                        </>
                      )}
                      <button onClick={handleBatchDailyChange} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50" disabled={selectedStudents.length === 0}>일괄 적용</button>
                      <button onClick={() => handleResetDaily(false)} className="bg-rose-100 hover:bg-rose-200 text-rose-600 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 ml-2" disabled={selectedStudents.length === 0}>선택일자 삭제</button>
                      <button onClick={() => handleResetDaily(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50" disabled={selectedStudents.length === 0}>월 전체 삭제</button>
                      <button onClick={() => handleSelectAllStudents(selectedStudents.length !== filteredStudents.length)} className="ml-auto text-sm font-bold text-indigo-700 hover:text-indigo-800 underline">
                        {selectedStudents.length === filteredStudents.length ? '전체 해제' : '전체 선택'}
                      </button>
                    </div>
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                       <div className="font-bold text-slate-700 flex items-center gap-2">
                         <PenTool size={18} className="text-indigo-500" />
                         {dailyMonth} {dailySubject === 'math' ? '수학 DAILY' : '영어 DAILY'} 현황 (전체 반 평균 참여율: <span className="text-emerald-600">{dailyClassStats.avgRate}%</span> / 반 평균 점수: <span className="text-indigo-600">{dailyClassStats.avgScore}점</span>)
                       </div>
                    </div>
                    <div
                      ref={dailyTopScrollRef}
                      className="overflow-x-auto custom-scrollbar h-5 bg-slate-50 border-b border-slate-200"
                      onScroll={() => syncDailyScroll('top')}
                    >
                      <div style={{ width: '4200px', height: '1px' }} />
                    </div>

                    <div
                      ref={dailyBodyScrollRef}
                      className="overflow-x-auto custom-scrollbar pb-4"
                      onScroll={() => syncDailyScroll('body')}
                    >
                    <table className="w-max min-w-full text-center text-sm border-collapse">
                      <thead className="bg-slate-800 text-white font-medium sticky top-0 z-20">
                        <tr>
                          <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-0 z-30 bg-slate-900 w-10 text-center">
                             <input type="checkbox" className="cursor-pointer" checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length} onChange={(e) => handleSelectAllStudents(e.target.checked)} />
                          </th>
                          <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 sticky left-[40px] z-30 bg-slate-900 w-44 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                             <div className="flex items-center justify-between">학생 정보 (참여율) {sortKey === 'name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={16}/> : <ArrowUpZA size={16}/>) : <ArrowDownAZ size={16} className="opacity-30"/>}</div>
                          </th>
                          <th rowSpan={2} className="px-3 py-3 border-r border-slate-700 sticky left-[216px] z-30 bg-slate-900 w-28 text-indigo-200">누적 / 평균</th>
                          <th colSpan={31} className="py-2 border-b border-slate-700 bg-slate-800">{dailyMonth} {dailySubject === 'math' ? '수학 DAILY SCORE' : '영어 DAILY SCORE'} (1일 ~ 31일)</th>
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
                          const dRecords = (student.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:'', math:''})).map(d => ({ t1: '', t2: '', math: '', ...(d || {}) }));
                          const dailyStats = getDailyStats(dRecords, dailyMonth, dailySubject);
                          const isSelected = selectedStudents.includes(student.id);
                          return (
                            <tr key={student.id} className={`hover:bg-indigo-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-indigo-50/30' : ''}`} onClick={() => setViewingDailySummary(student)}>
                              <td className="border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-indigo-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center px-3" onClick={(e) => { e.stopPropagation(); toggleStudentSelection(student.id); }}>
                                 <input type="checkbox" className="cursor-pointer" checked={isSelected} onChange={() => {}} />
                              </td>
                              <td className="border-r border-slate-200 sticky left-[40px] z-10 bg-white group-hover:bg-indigo-50 px-4 py-3 align-top text-left shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                <div className="flex justify-between w-full mb-1"><span className="font-bold text-slate-900 text-[14px]">{student.name}</span><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{dailyStats.rate}%</span></div>
                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{student.id}</div>
                              </td>
                              <td className="border-r border-slate-200 sticky left-[216px] z-10 bg-slate-50 group-hover:bg-indigo-50/80 py-3 px-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
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
                                      {dailySubject === 'math' ? (
                                        <input type="number" disabled={isExcluded} className={`w-12 text-center border rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-bold ${isExcluded ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : ''}`} value={rec.math || ''} placeholder="-" onChange={(e)=>handleDailyScoreChange(student.id, dayIdx, 'math', e.target.value)}/>
                                      ) : (
                                        <>
                                          <input type="number" disabled={isExcluded} className={`w-10 text-center border rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-bold ${isExcluded ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : ''}`} value={rec.t1} placeholder="-" onChange={(e)=>handleDailyScoreChange(student.id, dayIdx, 't1', e.target.value)}/>
                                          <input type="number" disabled={isExcluded} className={`w-10 text-center border rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-bold ${isExcluded ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : ''}`} value={rec.t2} placeholder="-" onChange={(e)=>handleDailyScoreChange(student.id, dayIdx, 't2', e.target.value)}/>
                                        </>
                                      )}
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
                          const dRecords = (student.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:'', math:''})).map(d => ({ t1: '', t2: '', math: '', ...(d || {}) }));
                          const stats = getDailyStats(dRecords, dailyMonth, dailySubject);
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
                      {weeklyWeekNumbers.map(week => (
                        <button
                          key={week}
                          onClick={() => setSelectedWeek(week)}
                          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                            selectedWeek === week
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {week}주차
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeWeeklyTab === 'setup' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-w-5xl">
                      {(() => {
                        const currentWeeklySetup = getWeeklySetting(weeklySubject, weeklyMonth, selectedWeek);
                        const targetClassText = Array.isArray(currentWeeklySetup.targetClasses)
                          ? currentWeeklySetup.targetClasses.join(', ')
                          : '';

                        return (
                          <div className="bg-slate-50 p-4 border-b border-slate-200 space-y-4">
                            <div className="flex justify-between items-center gap-4">
                              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <LayoutList size={18} className={weeklySubject === 'english' ? 'text-indigo-500' : 'text-teal-500'}/> 
                                {weeklyMonth} {selectedWeek}주차 [{weeklySubject === 'english' ? '영어' : '수학'}] 정답/유형 설정표
                              </h2>

                              {weeklySubject === 'math' ? (
                                  <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-500">문항 수</span>
                                          <input
                                              type="number"
                                              className="w-16 border border-slate-300 rounded px-2 py-1 text-sm outline-none font-bold"
                                              value={currentWeeklySetup.qCount || 20}
                                              onChange={e => updateWeeklySetting({ qCount: Number(e.target.value) })}
                                          />
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-500">문항당 점수</span>
                                          <input
                                              type="number"
                                              step="0.1"
                                              className="w-16 border border-slate-300 rounded px-2 py-1 text-sm outline-none font-bold"
                                              value={currentWeeklySetup.qScore || 5}
                                              onChange={e => updateWeeklySetting({ qScore: Number(e.target.value) })}
                                          />
                                      </div>
                                  </div>
                              ) : (
                                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold">40문항 고정 (2.5점)</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div>
                                <label className="block text-[11px] font-black text-slate-500 mb-1">시험명</label>
                                <input
                                  type="text"
                                  value={currentWeeklySetup.testName || ''}
                                  onChange={e => updateWeeklySetting({ testName: e.target.value })}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                                  placeholder="5월 3주차 Weekly"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-black text-slate-500 mb-1">시험일</label>
                                <input
                                  type="date"
                                  value={currentWeeklySetup.testDate || ''}
                                  onChange={e => updateWeeklySetting({ testDate: e.target.value })}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-black text-slate-500 mb-1">과목</label>
                                <div className={`h-[38px] flex items-center px-3 rounded-lg text-sm font-black border ${
                                  weeklySubject === 'english'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                    : 'bg-teal-50 text-teal-700 border-teal-100'
                                }`}>
                                  {weeklySubject === 'english' ? '영어 Weekly' : '수학 Weekly'}
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-black text-slate-500 mb-1">대상반</label>
                                <input
                                  type="text"
                                  value={targetClassText}
                                  onChange={e => updateWeeklySetting({
                                    targetClasses: e.target.value
                                      .split(',')
                                      .map(v => v.trim())
                                      .filter(Boolean)
                                  })}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                                  placeholder="GB1A, GD3A"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-black text-slate-500 mb-1">만점</label>
                                <input
                                  type="number"
                                  value={currentWeeklySetup.maxScore || 100}
                                  onChange={e => updateWeeklySetting({ maxScore: Number(e.target.value) })}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                              </div>
                            </div>

                            <p className="text-[11px] font-bold text-slate-400">
                              ※ 시험일은 홈화면 분석 탭의 Weekly 지난주 vs 2주 전 비교 기준으로 사용됩니다.
                            </p>
                          </div>
                        );
                      })()}
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

                  {activeWeeklyTab === 'omr' && (() => {
                    const currentWeeklyTest = getWeeklySetting(weeklySubject, weeklyMonth, selectedWeek);
                    const targetClassText = Array.isArray(currentWeeklyTest.targetClasses) && currentWeeklyTest.targetClasses.length
                      ? currentWeeklyTest.targetClasses.join(', ')
                      : className;

                    return (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col justify-center items-center">
                          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xl">
                            <UploadCloud className="text-indigo-500" size={28}/>
                            OMR 리딩 엑셀 업로드 [{weeklySubject === 'english' ? '영어' : '수학'}]
                          </h2>

                          <div className="w-full max-w-2xl mb-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <p className="text-sm font-black text-slate-800 mb-3">선택된 Weekly 시험 회차</p>

                            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
                              <div>
                                <span className="text-slate-400">시험명</span>
                                <p className="text-slate-800 mt-1">{currentWeeklyTest.testName || `${weeklyMonth} ${selectedWeek}주차 Weekly`}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">시험일</span>
                                <p className={currentWeeklyTest.testDate ? 'text-blue-600 mt-1' : 'text-rose-500 mt-1'}>
                                  {getWeeklySettingDateText(weeklySubject, weeklyMonth, selectedWeek)}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400">과목</span>
                                <p className="text-slate-800 mt-1">{weeklySubject === 'english' ? '영어 Weekly' : '수학 Weekly'}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">대상반</span>
                                <p className="text-slate-800 mt-1">{targetClassText}</p>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors w-full max-w-2xl ${
                              currentWeeklyTest.testDate
                                ? 'border-slate-300 cursor-pointer hover:bg-indigo-50 hover:border-indigo-400'
                                : 'border-rose-200 bg-rose-50/50 cursor-not-allowed'
                            }`}
                            onClick={() => {
                              if (!currentWeeklyTest.testDate) {
                                showAlert('정답 셋업에서 시험일을 먼저 설정해주세요.');
                                return;
                              }

                              triggerDirectUpload('weekly');
                            }}
                          >
                            <FileSpreadsheet size={64} className="mx-auto text-indigo-300 mb-4"/>
                            <p className="text-lg font-bold text-indigo-600 mb-2">
                              클릭하여 {weeklyMonth} {selectedWeek}주차 OMR 첨부
                            </p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                              정답 셋업에서 생성된 Weekly 시험 회차에 OMR 점수가 연결됩니다.<br/>
                              (※ 헤더 없이 A열 수험번호, B열부터 답안이 나열된 양식을 자동 지원합니다.)
                            </p>
                          </div>

                          <button
                            onClick={handleResetWeeklyOmrScores}
                            className="mt-6 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-colors"
                          >
                            {weeklyMonth} {selectedWeek}주차 {weeklySubject === 'english' ? '영어' : '수학'} OMR 점수 초기화
                          </button>

                          <p className="text-xs text-slate-400 mt-3 font-medium">
                            ※ OMR을 잘못 업로드한 경우, 해당 주차 점수를 초기화한 뒤 다시 업로드하세요.
                          </p>
                      </div>
                    );
                  })()}

                  {activeWeeklyTab === 'scores' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-sm text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
                           <span>
                            <FileText className="inline-block w-4 h-4 mr-2 text-indigo-500"/>
                            {weeklyMonth} 위클리 학생별 종합 성적 조회 [{weeklySubject === 'english' ? '영어' : '수학'}]
                           </span>

                           <div className="flex items-center gap-2">
                             <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                               <input
                                 type="text"
                                 placeholder="이름/아이디 검색..."
                                 value={weeklySearchTerm}
                                 onChange={(e) => setWeeklySearchTerm(e.target.value)}
                                 className="w-56 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                               />
                             </div>

                             <span className="text-xs font-normal text-slate-400">
                               행 클릭 시 상세 분석
                             </span>
                           </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                            <thead className="bg-white border-b-2 border-slate-200 shadow-sm z-10">
                              <tr>
                                <th className="py-4 text-slate-600 font-bold cursor-pointer hover:bg-slate-50" onClick={() => handleSort('name')}>
                                  이름 {sortKey === 'name' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                                </th>
                                <th className="py-4 text-slate-500 text-xs font-medium">수험번호</th>

                                {weeklyWeekNumbers.map(w => (
                                  <th
                                    key={w}
                                    className="py-4 text-slate-600 font-bold cursor-pointer hover:bg-indigo-50 transition-colors"
                                    onClick={() => {
                                      setWeeklyScoreSort(prev => {
                                        if (prev.week === w) {
                                          return {
                                            week: w,
                                            order: prev.order === 'asc' ? 'desc' : 'asc'
                                          };
                                        }
                                
                                        return {
                                          week: w,
                                          order: 'desc'
                                        };
                                      });
                                    }}
                                  >
                                    {w}주차 {weeklyScoreSort.week === w ? (weeklyScoreSort.order === 'asc' ? '↑' : '↓') : ''}
                                  </th>
                                ))}

                                <th className="py-4 text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" onClick={() => handleSort('weeklyAvg')}>
                                  월간 평균 {sortKey === 'weeklyAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                                </th>
                                <th className="py-4 text-emerald-600 font-bold">월간 정답률</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {weeklyFilteredStudents.map(student => {
                                const stats = getMonthlyWeeklyStats(student, weeklyMonth, weeklySubject);
                                const scoreField = weeklySubject === 'english' ? 'weeklyEnglish' : 'weeklyMath';

                                return (
                                  <tr key={student.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setViewingWeeklySummary(student)}>
                                    <td className="py-4 font-bold text-slate-800">{student.name}</td>
                                    <td className="py-4 text-xs font-mono text-slate-400">{student.id}</td>

                                    {weeklyWeekNumbers.map(w => {
                                      const score = student.scores[scoreField]?.[`${weeklyMonth}_w${w}`];

                                      return (
                                        <td key={w} className="py-4 text-slate-600 font-medium">
                                          {score !== undefined && score !== null ? `${score} 점` : '-'}
                                        </td>
                                      );
                                    })}

                                    <td className="py-4 font-extrabold text-indigo-600 text-base">
                                      {stats.avgScore !== '-' ? `${stats.avgScore} 점` : '-'}
                                    </td>
                                    <td className="py-4 font-bold text-emerald-600">
                                      {stats.overallRate !== '-' ? `${stats.overallRate}%` : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                    </div>
                  )}

                  {activeWeeklyTab === 'monthlyView' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-sm text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
                           <span>
                            <FileText className="inline-block w-4 h-4 mr-2 text-indigo-500"/>
                            전체 월별 위클리 평균 성적 조회 [영어 / 수학]
                           </span>

                           <div className="flex items-center gap-2">
                             <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                               <input
                                 type="text"
                                 placeholder="이름/아이디 검색..."
                                 value={weeklySearchTerm}
                                 onChange={(e) => setWeeklySearchTerm(e.target.value)}
                                 className="w-56 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                               />
                             </div>

                             <div className="flex items-center gap-3 text-xs font-extrabold">
                               <span className="flex items-center gap-1 text-indigo-600">
                                 <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                                 영어
                               </span>
                               <span className="flex items-center gap-1 text-teal-600">
                                 <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                                 수학
                               </span>
                             </div>
                           </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-center text-sm border-collapse min-w-[1200px]">
                            <thead className="bg-white border-b-2 border-slate-200 shadow-sm z-10">
                              <tr>
                                <th className="py-4 text-slate-600 font-bold cursor-pointer hover:bg-slate-50" onClick={() => handleSort('name')}>
                                  이름 {sortKey === 'name' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                                </th>

                                {MONTHS.map(m => (
                                  <th key={m} className="py-4 text-slate-500 font-bold text-xs">{m}</th>
                                ))}

                                <th className="py-4 text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" onClick={() => handleSort('weeklyEnglishOverallAvg')}>
                                  영어 총 평균 {sortKey === 'weeklyEnglishOverallAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                                </th>

                                <th className="py-4 text-teal-600 font-bold cursor-pointer hover:bg-teal-50" onClick={() => handleSort('weeklyMathOverallAvg')}>
                                  수학 총 평균 {sortKey === 'weeklyMathOverallAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {weeklyFilteredStudents.map(student => {
                                const engStats = getOverallWeeklyStats(student, 'english');
                                const mathStats = getOverallWeeklyStats(student, 'math');

                                return (
                                  <tr
                                    key={student.id}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                      setWeeklySubject('english');
                                      setViewingWeeklyMonthlySummary(student);
                                    }}
                                  >
                                    <td className="py-4 font-bold text-slate-800">{student.name}</td>

                                    {MONTHS.map(m => {
                                      const engVal = engStats.monthlyScores[m];
                                      const mathVal = mathStats.monthlyScores[m];

                                      return (
                                        <td key={m} className="py-4 text-slate-600 font-medium">
                                          {engVal !== '-' ? (
                                            <div className="text-indigo-600 font-bold">
                                              {engVal}점
                                            </div>
                                          ) : (
                                            mathVal === '-' ? <div>-</div> : null
                                          )}

                                          {mathVal !== '-' && (
                                            <div className="text-teal-600 font-bold mt-1">
                                              {mathVal}점
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}

                                    <td className="py-4 font-extrabold text-indigo-600 text-base">
                                      {engStats.avgScore !== '-' ? `${engStats.avgScore} 점` : '-'}
                                    </td>

                                    <td className="py-4 font-extrabold text-teal-600 text-base">
                                      {mathStats.avgScore !== '-' ? `${mathStats.avgScore} 점` : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
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
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-inner"><BarChart3 size={40} /></div>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 border-l-4 border-l-indigo-500">
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
                        <th className="px-6 py-4 cursor-pointer hover:bg-indigo-50 transition-colors" onClick={() => handleSort('weeklyEnglishOverallAvg')}>
                           <div className="flex items-center justify-center gap-1">
                             영어 Weekly 평균 {sortKey === 'weeklyEnglishOverallAvg' || sortKey === 'weeklyOverallAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                           </div>
                        </th>

                        <th className="px-6 py-4 cursor-pointer hover:bg-teal-50 transition-colors" onClick={() => handleSort('weeklyMathOverallAvg')}>
                           <div className="flex items-center justify-center gap-1">
                             수학 Weekly 평균 {sortKey === 'weeklyMathOverallAvg' ? (sortOrder === 'asc' ? '↓' : '↑') : ''}
                           </div>
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
                        const engWeeklyMonthStats = getMonthlyWeeklyStats(student, selectedMonth, 'english');
                        const mathWeeklyMonthStats = getMonthlyWeeklyStats(student, selectedMonth, 'math');
                        
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
                            <td
                              className="px-6 py-4 cursor-pointer hover:bg-indigo-50 transition-colors"
                              onClick={() => {
                                setWeeklySubject('english');
                                setViewingWeeklyMonthlySummary(student);
                              }}
                            >
                               <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                {engWeeklyMonthStats.avgScore !== '-' ? `${engWeeklyMonthStats.avgScore}점` : '-'}
                               </span>
                            </td>
                            <td
                              className="px-6 py-4 cursor-pointer hover:bg-teal-50 transition-colors"
                              onClick={() => {
                                setWeeklySubject('math');
                                setViewingWeeklyMonthlySummary(student);
                              }}
                            >
                               <span className="font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
                                {mathWeeklyMonthStats.avgScore !== '-' ? `${mathWeeklyMonthStats.avgScore}점` : '-'}
                               </span>
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
                   <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <FileText size={18}/> 리포트 생성 대상
                   </h2>

                   <div className="relative mb-3">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                     <input
                       type="text"
                       placeholder="학생 검색..."
                       className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                     />
                   </div>

                   <div className="flex gap-2 mb-2">
                     <button
                       onClick={() => setReportListSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                       className="w-full bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                     >
                       명단 정렬 {reportListSortOrder === 'asc' ? '오름차순' : '내림차순'}
                     </button>
                   </div>

                   <div className="flex gap-2">
                     <button
                       onClick={() => {
                         if (reportStudentsForList.length === 0) return;

                         if (selectedReportIds.length === reportStudentsForList.length) {
                           setSelectedReportIds([]);
                         } else {
                           setSelectedReportIds(reportStudentsForList.map(s => s.id));
                         }
                       }}
                       className="flex-1 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                     >
                       {reportStudentsForList.length > 0 && selectedReportIds.length === reportStudentsForList.length ? '전체 해제' : '전체 선택'}
                     </button>

                     <button
                       onClick={handlePrint}
                       className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                     >
                       선택 출력 {selectedReportIds.length > 0 ? `(${selectedReportIds.length})` : ''}
                     </button>
                   </div>
                 </div>
                 <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {reportStudentsForList.map(student => {
                      const isChecked = selectedReportIds.includes(student.id);

                      return (
                        <div
                          key={student.id}
                          onClick={() => setReportStudentId(student.id)}
                          className={`p-3 rounded-xl cursor-pointer transition-colors border flex gap-3 items-start ${
                            reportStudentId === student.id
                              ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                              : 'border-transparent hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const checked = e.target.checked;

                              setSelectedReportIds(prev =>
                                checked
                                  ? [...new Set([...prev, student.id])]
                                  : prev.filter(id => id !== student.id)
                              );
                            }}
                            className="mt-1 cursor-pointer"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 text-sm">
                              {student.name}
                              <span className="text-xs text-slate-400 font-medium ml-1">
                                ({student.targetTrack?.charAt(0) || '-'})
                              </span>
                            </div>

                            <div className="text-xs text-slate-400 mt-1 truncate">
                              {student.userId || student.id}
                            </div>

                            <div className="text-[10px] text-indigo-500 font-bold mt-1 truncate">
                              {getStudentClassNames(student)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
              
              <style>{`
                #monthly-report-preview {
                  overflow: visible !important;
                }

                #monthly-report-preview .report-chart-box {
                  min-height: 0 !important;
                }

                @media print {
                  body {
                    background: #ffffff !important;
                  }

                  #monthly-report-preview {
                    width: 210mm !important;
                    min-height: 297mm !important;
                    padding: 8mm !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                    page-break-after: always;
                    break-after: page;
                  }

                  #monthly-report-preview h1 {
                    font-size: 20px !important;
                    margin-bottom: 4px !important;
                  }

                  #monthly-report-preview h2,
                  #monthly-report-preview h3 {
                    font-size: 12px !important;
                    margin-bottom: 6px !important;
                  }

                  #monthly-report-preview p,
                  #monthly-report-preview td,
                  #monthly-report-preview th,
                  #monthly-report-preview span,
                  #monthly-report-preview div {
                    line-height: 1.25 !important;
                  }

                  #monthly-report-preview .p-12 { padding: 8mm !important; }
                  #monthly-report-preview .p-8 { padding: 8mm !important; }
                  #monthly-report-preview .p-6 { padding: 10px !important; }
                  #monthly-report-preview .p-5 { padding: 9px !important; }
                  #monthly-report-preview .p-4 { padding: 8px !important; }

                  #monthly-report-preview .mb-8 { margin-bottom: 10px !important; }
                  #monthly-report-preview .mb-4 { margin-bottom: 8px !important; }
                  #monthly-report-preview .mb-5 { margin-bottom: 7px !important; }
                  #monthly-report-preview .mb-4 { margin-bottom: 6px !important; }
                  #monthly-report-preview .mb-3 { margin-bottom: 5px !important; }
                  #monthly-report-preview .mt-4 { margin-top: 4px !important; }

                  #monthly-report-preview .min-h-\\[80px\\] {
                    min-height: 44px !important;
                  }

                  #monthly-report-preview .h-64 {
                    height: 120px !important;
                  }

                  #monthly-report-preview .h-56 {
                    height: 110px !important;
                  }

                  #monthly-report-preview .h-48 {
                    height: 96px !important;
                  }

                  #monthly-report-preview .text-4xl {
                    font-size: 22px !important;
                  }

                  #monthly-report-preview .text-3xl {
                    font-size: 19px !important;
                  }

                  #monthly-report-preview .text-2xl {
                    font-size: 17px !important;
                  }

                  #monthly-report-preview .text-xl {
                    font-size: 15px !important;
                  }

                  #monthly-report-preview .text-lg {
                    font-size: 13px !important;
                  }

                  #monthly-report-preview .text-sm {
                    font-size: 10.5px !important;
                  }

                  #monthly-report-preview .text-xs {
                    font-size: 9px !important;
                  }

                  #monthly-report-preview table th,
                  #monthly-report-preview table td {
                    padding: 4px 5px !important;
                    font-size: 9px !important;
                  }
                }
              `}</style>

              {/* A4 미리보기 영역 */}
              <div className="flex-1 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-y-auto p-8 print:p-0 print:bg-white print:border-none flex justify-center custom-scrollbar">
                 {reportStudent ? (
                    <div
                      id="monthly-report-preview"
                      className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-8 relative print:w-full print:h-auto overflow-visible"
                    >
                       
                       {/* 인쇄 버튼 (화면에만 보임) */}
                       <div className="absolute top-8 right-8 print:hidden">
                          <button onClick={handlePrint} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all transform hover:scale-105">
                             <Printer size={18}/> A4 PDF 출력/저장
                          </button>
                       </div>

                       {/* 1. 리포트 헤더 & 학생 정보 바 */}
                       <div className="border-b-4 border-slate-800 pb-4 mb-4 mt-2">
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
                             <div>
                               <div className="text-xs text-slate-400 font-bold mb-1">수강반</div>
                               <div className="font-extrabold text-slate-700">{getStudentClassNames(reportStudent)}</div>
                             </div>
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
                           <div className="h-32 flex items-end justify-between border-b border-slate-200 pb-0 relative px-8 mb-4">
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
                                          <div className="flex items-end justify-between h-24 border-b border-slate-200 pb-0 relative px-4 mb-4 mt-4">
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
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileSpreadsheet size={32} /></div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-2 uppercase">
                {importType === 'studyTimeDaily' ? `${uploadTargetDay !== null ? uploadTargetDay + 1 : ''}일자 학습시간 연동` : `${importType} 엑셀 업로드`}
              </h2>
              <p className="text-sm text-slate-500">파일을 올리시면 {importType === 'monthly' || importType === 'studyTimeDaily' ? '아이디' : '학번/이름'}을(를) 매칭하여 데이터를 추출합니다.</p>
            </div>
            {importType === 'student' && (
              <div className="mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="block text-xs font-extrabold text-slate-500 mb-2">
                  명단 업로드 방식 선택
                </label>

                <select
                  value={uploadMode}
                  onChange={(e) => setUploadMode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none bg-white focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="merge">① 추가/수정만 하기</option>
                  <option value="classOverwrite">② 해당 반 명단 덮어쓰기</option>
                  <option value="allOverwrite">③ 전체 명단 덮어쓰기</option>
                </select>

                <p className="text-[11px] text-slate-400 font-bold mt-2 leading-relaxed">
                  ※ 추천: 반별 엑셀 업로드는 ② 해당 반 명단 덮어쓰기를 사용하세요.
                  <br />
                  ※ 새 엑셀에 없는 기존 해당 반 학생은 명단에서 제외되며 Firebase에서도 삭제됩니다.
                </p>
              </div>
            )}

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
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 월별 모의고사 백분위 추이 (전체)</h3>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4 text-center">{detailSelectedMonth} 영어 Weekly 추이</h3>
                      <div className="flex items-end justify-between h-32 border-b border-slate-200 pb-0 relative px-4 mt-4 mb-4">
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
                        <h3 className="font-extrabold text-sm text-slate-800 mb-4 text-center">{detailSelectedMonth} 수학 Weekly 추이</h3>
                        <div className="flex items-end justify-between h-32 border-b border-slate-200 pb-0 relative px-4 mt-4 mb-4">
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
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 월별 모의고사 백분위 추이 (자동 업데이트)</h3>
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
            <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2"><UserPlus size={24} className="text-indigo-500"/> 학생 수기 등록</h2>
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
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
                <School size={150}/>
              </div>

              <div className="flex items-center gap-5 relative z-10 w-full pr-12">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-inner border border-white/20 shrink-0">
                  {studentProfileToView.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <input
                      className="text-3xl font-extrabold bg-transparent border-b border-transparent hover:border-white/30 focus:border-white outline-none w-40 transition-colors px-1 -ml-1"
                      value={studentProfileToView.name}
                      onChange={e => handleProfileChange(studentProfileToView.id, 'name', e.target.value)}
                    />

                    <select
                      className="bg-transparent border-b border-transparent hover:border-white/30 focus:border-white outline-none text-slate-300 font-medium cursor-pointer transition-colors"
                      value={studentProfileToView.gender || ''}
                      onChange={e => handleProfileChange(studentProfileToView.id, 'gender', e.target.value)}
                    >
                      <option className="text-black" value="남">남</option>
                      <option className="text-black" value="여">여</option>
                    </select>

                    <select
                      className="bg-indigo-500 hover:bg-indigo-400 text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm outline-none border border-indigo-400 ml-2 cursor-pointer transition-colors"
                      value={className === '대구캠퍼스 전체' ? (studentProfileToView.className || '') : className}
                      onChange={e => {
                        const targetClass = e.target.value;
                        const currentClass = className === '대구캠퍼스 전체' ? studentProfileToView.className : className;

                        showConfirm(
                          `해당 학생의 소속을 [${currentClass}] → [${targetClass}](으)로 변경하시겠습니까?\n(다른 반 수강 정보는 유지됩니다.)`,
                          () => {
                            setStudents(prev => prev.map(s => {
                              if (s.id !== studentProfileToView.id) return s;

                              let cNames = Array.isArray(s.classNames)
                                ? [...s.classNames]
                                : [s.className].filter(Boolean);

                              cNames = cNames.filter(c => c !== currentClass);

                              if (!cNames.includes(targetClass)) {
                                cNames.push(targetClass);
                              }

                              return {
                                ...s,
                                className: cNames[0] || targetClass || '미배정',
                                classNames: cNames
                              };
                            }));

                            setViewingProfileId(null);
                            showAlert('반 소속이 변경되었습니다.');
                          }
                        );
                      }}
                    >
                      {classes.map(c => (
                        <option key={c} value={c} className="text-black bg-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-indigo-200 font-mono text-sm tracking-wider flex items-center gap-2">
                    학번:
                    <input
                      className="bg-transparent border-b border-transparent hover:border-indigo-300/50 focus:border-indigo-300 outline-none w-28 px-1 transition-colors"
                      value={studentProfileToView.id}
                      readOnly
                      title="학번(고유키)은 수정할 수 없습니다."
                    />

                    <span className="opacity-50">|</span>

                    ID:
                    <input
                      className="bg-transparent border-b border-transparent hover:border-indigo-300/50 focus:border-indigo-300 outline-none w-32 px-1 transition-colors"
                      value={studentProfileToView.userId || ''}
                      onChange={e => handleProfileChange(studentProfileToView.id, 'userId', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingProfileId(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors z-20"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Phone size={18} className="text-emerald-500"/> 연락처 및 기본정보
                  </h3>

                  <div className="space-y-3 text-sm">
                    <ProfileRow label="학생 연락처" value={studentProfileToView.contact} onChange={e => handleProfileChange(studentProfileToView.id, 'contact', e.target.value)} bold />
                    <ProfileRow label="부모님 연락처" value={studentProfileToView.parentContact} onChange={e => handleProfileChange(studentProfileToView.id, 'parentContact', e.target.value)} bold />
                    <ProfileRow label="거주지역" value={studentProfileToView.address} onChange={e => handleProfileChange(studentProfileToView.id, 'address', e.target.value)} />
                    <ProfileRow label="등록월(시작월) 변경" value={studentProfileToView.startMonth || '1월'} onChange={e => handleProfileChange(studentProfileToView.id, 'startMonth', e.target.value)} options={MONTHS} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Bookmark size={18} className="text-amber-500"/> 편입 목표
                  </h3>

                  <div className="space-y-3 text-sm">
                    <ProfileRow label="편입구분" value={studentProfileToView.transferType} onChange={e => handleProfileChange(studentProfileToView.id, 'transferType', e.target.value)} options={['일반', '학사', '기타']} />
                    <ProfileRow label="희망계열" value={studentProfileToView.targetTrack} onChange={e => handleProfileChange(studentProfileToView.id, 'targetTrack', e.target.value)} options={['인문계', '자연계', '사범계', '예체능', '경찰대', '기타']} />
                    <ProfileRow label="편입준비계기" value={studentProfileToView.motivation} onChange={e => handleProfileChange(studentProfileToView.id, 'motivation', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-4">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Building size={18} className="text-blue-500"/> 출신 대학 및 스펙
                </h3>

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
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-500"/> 상담 및 특이사항
                </h3>

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

                    {/* 주차별 점수 뷰 */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 size={18} className="text-indigo-500"/> {weeklyMonth} 주차별 성적 추이
                      </h3>

                      <div className="h-48 flex items-end justify-around border-b border-slate-200 pb-2 relative px-4 mb-4">
                        <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none pb-2 text-[10px] text-slate-400 font-mono">
                          <div>100</div><div>75</div><div>50</div><div>25</div><div>0</div>
                        </div>

                        {[1, 2, 3, 4, 5].map(w => {
                          const score = viewingWeeklySummary.scores[scoreField]?.[`${weeklyMonth}_w${w}`];
                          const scoreVal = score !== undefined && score !== null ? Number(score) : 0;
                          const displaySc = scoreVal > 100 ? 100 : scoreVal;

                          return (
                            <div key={w} className="w-16 flex flex-col items-center justify-end h-full z-10 relative group">
                              <div
                                className="w-full bg-indigo-400 rounded-t-sm transition-all group-hover:bg-indigo-500 relative flex justify-center"
                                style={{ height: `${displaySc}%`, minHeight: scoreVal > 0 ? '4px' : '0' }}
                              >
                                {scoreVal > 0 && <span className="absolute -top-6 text-xs font-bold text-indigo-700">{scoreVal}</span>}
                              </div>
                              <span className="text-xs font-bold text-slate-500 absolute -bottom-8">{w}주차</span>
                            </div>
                          );
                        })}
                      </div>

                      <table className="w-full text-center text-sm border-collapse border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {[1, 2, 3, 4, 5].map(w => (
                              <th key={w} className="py-3 text-slate-500 font-bold border-r border-slate-200">
                                {w}주차
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {[1, 2, 3, 4, 5].map(w => {
                              const score = viewingWeeklySummary.scores[scoreField]?.[`${weeklyMonth}_w${w}`];
                              return (
                                <td key={w} className="py-4 font-bold text-indigo-600 border-r border-slate-200 last:border-0">
                                  {score !== undefined && score !== null ? `${score} 점` : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 유형별 정답률 요약 카드 */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ListChecks size={18} className="text-emerald-500"/> 월간 유형별 정답률 종합
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(stats.typeStats).map(([type, typeStat]) => (
                          <div key={type} className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl flex flex-col items-center">
                            <span className="text-xs text-emerald-600 font-bold mb-1">{type}</span>
                            <span className="text-xl font-extrabold text-emerald-700">
                              {typeStat.total > 0 ? Math.round((typeStat.correct / typeStat.total) * 100) : 0}%
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              ({typeStat.correct} / {typeStat.total}문항)
                            </span>
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
                const dRecords = viewingDailySummary.dailyRecords[dailyMonth] || Array(31).fill({t1:'', t2:'', math:''});
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
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500"/> 월별 DAILY 참여율 추이 (1월 ~ 12월)</h3>
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
                            const monthStats = getDailyStats(viewingDailySummary.dailyRecords[m] || Array(31).fill({t1:'', t2:'', math:''}), m);
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
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> {dailyMonth} 일별 득점 현황 (총 100점 만점 기준)</h3>
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
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 전체 월별 평균 점수 추이</h3>
                      
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
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 월별 누적 학습시간 추이</h3>
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

                  const stats = {
                    출석: 0,
                    지각: 0,
                    결석: 0,
                    조퇴: 0,
                    사전통보: 0,
                    개인사정: 0,
                    학교: 0,
                    병결: 0,
                    진료: 0,
                    기타: 0,
                    penalty: 0
                  };

                  entries.forEach(v => {
                    if (stats[v] !== undefined) stats[v]++;
                    else stats.기타++;
                  });

                  // 핵심: 벌점 기준 설정값을 그대로 사용
                  stats.penalty = getAttendancePenalty(viewingAttendanceSummary, month);

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
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500"/> 전체 월별 출석률 추이</h3>
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