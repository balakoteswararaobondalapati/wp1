import React, { useState, useRef } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Clock, FileText, Upload, X, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { appStorage } from './';
import { permissionsAPI } from '../api';
const to12Hour = (hour: number) => hour % 12 || 12;

const to24Hour = (hour: number, meridiem: 'AM' | 'PM') => {
  if (meridiem === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
};

const TimeWheel = ({
  values,
  selected,
  onChange,
}: {
  values: number[];
  selected: number;
  onChange: (val: number) => void;
}) => (
  <div className="h-40 w-16 overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
    {values.map((val) => (
      <div
        key={val}
        onClick={() => onChange(val)}
        className={`h-10 flex items-center justify-center snap-center cursor-pointer ${
          val === selected
            ? 'text-blue-600 font-semibold'
            : 'text-gray-400'
        }`}
      >
        {String(val).padStart(2, '0')}
      </div>
    ))}
  </div>
);

interface PermissionRequestFormProps {
  permissionType: string;
  onBack: () => void;
  onSubmit: (data: PermissionRequestData) => void;
}

export interface PermissionRequestData {
  type: string;
  date: string;
  time: string;
  reason: string;

  // 🔥 CHANGE → plural + array
  attachments?: {
    id: string;
    name: string;
    size: string;
    type?: string;
    data?: string;
  }[];
}

export function PermissionRequestForm({ permissionType, onBack, onSubmit }: PermissionRequestFormProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [errors, setErrors] = useState({ date: '', time: '', reason: '' });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedSecond, setSelectedSecond] = useState(0);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const permissionTitles: Record<string, string> = {
    'late-entry': 'Late Entry Permission',
    'early-leave': 'Early Leave Permission',
    'midday-exit': 'Midday Exit Permission',
    'general': 'Other / General Permission',
  };

  const permissionSubtitles: Record<string, string> = {
    'late-entry': 'Gate Pass',
    'early-leave': 'Leaving Class',
    'midday-exit': 'Temporary Exit',
    'general': 'Special Request',
  };

  const permissionPlaceholders: Record<string, string> = {
    'late-entry': 'Please provide a detailed reason for your permission request (minimum 10 characters)',
    'early-leave': 'Please provide a detailed reason for your permission request (minimum 10 characters)',
    'midday-exit': 'Please provide a detailed reason for your permission request (minimum 10 characters)',
    'general': 'Please provide a detailed reason for your permission request (minimum 10 characters)',
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const formatDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${month}/${dayStr}/${year}`;
  };

  const handleDateSelect = (day: number) => {
    const formattedDate = formatDate(day);
    setDate(formattedDate);
    setShowCalendar(false);
    setErrors({ ...errors, date: '' });
  };

  const handleTimeConfirm = () => {
    const formattedTime = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}:${String(selectedSecond).padStart(2, '0')}`;
    setTime(formattedTime);
    setShowTimePicker(false);
    setErrors({ ...errors, time: '' });
  };

  const toIsoDate = (value: string) => {
    if (!value) return '';
    const parts = value.split('/');
    if (parts.length !== 3) return value;
    const [mm, dd, yyyy] = parts;
    if (!mm || !dd || !yyyy) return value;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleFileSelect = () => {
    // In production, this would open a file picker
    // For now, simulating file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const base64Data = await fileToBase64(file);
          setAttachment({
            name: file.name,
            size: `${(file.size / 1024).toFixed(0)} KB`,
            type: file.type,
            data: base64Data,
          } as any);
        } catch (error) {
          console.error('Error converting file to base64:', error);
        }
      }
    };
    input.click();
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const validateForm = () => {
    const newErrors = { date: '', time: '', reason: '' };
    let isValid = true;

    if (!date) {
      newErrors.date = 'Please select a date';
      isValid = false;
    }

    if (!time) {
      newErrors.time = 'Please select a time';
      isValid = false;
    }

    if (!reason.trim()) {
      newErrors.reason = 'Please provide a reason';
      isValid = false;
    } else if (reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      // Get current student information
      const currentUser = JSON.parse(appStorage.getItem('current_user') || '{}');
      const registeredStudents = JSON.parse(appStorage.getItem('registered_students') || '[]');
      const studentData = registeredStudents.find((s: any) => 
        s.userId === currentUser.userId || s.email === currentUser.email
      );

      const course = studentData?.department || currentUser.course || currentUser.department || 'BCA';
      const section = studentData?.section || currentUser.section || 'B1';
      const semester = studentData?.semester || currentUser.semester || '1';
      const rollNumber = studentData?.rollNumber || studentData?.registerNumber || currentUser.registerNumber || '';
      const studentName = currentUser.name || 'Student';
      const studentEmail = currentUser.email || '';

      // Get permission type labels
      const permissionTitles: Record<string, string> = {
        'late-entry': 'Late Entry Permission',
        'early-leave': 'Early Leave Permission',
        'midday-exit': 'Midday Exit Permission',
        'general': 'Other / General Permission',
      };

      // Create permission request object
      const permissionRequest = {
        id: '',
        studentName: studentName,
        studentEmail: studentEmail,
        rollNumber: rollNumber,
        course: course,
        semester: `Semester ${semester}`,
        section: section,
        type: permissionType,
        typeLabel: permissionTitles[permissionType] || permissionType,
        date: date,
        time: time,
        reason: reason,
       attachments: attachment
  ? [{
      id: `att-${Date.now()}`,
      name: attachment.name,
      size: attachment.size,
      type: (attachment as any).type,
      data: (attachment as any).data
    }]
  : [],

        status: 'pending' as const,
        submittedDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        remark: undefined,
      };

      // Save to backend
      try {
        const isoDate = toIsoDate(date);
        const response = await permissionsAPI.create({
          reason: `${permissionTitles[permissionType] || permissionType} | ${date} ${time} | ${reason}`,
          from_date: isoDate,
          to_date: isoDate,
          attachments: attachment
            ? [{
                id: `att-${Date.now()}`,
                name: attachment.name,
                size: attachment.size,
                type: (attachment as any).type,
                data: (attachment as any).data
              }]
            : [],
        });
        const dbId = response?.id ? String(response.id) : `PRM-${Date.now()}`;
        permissionRequest.id = `#${dbId}`;
        window.dispatchEvent(new Event('permissionsUpdated'));
        console.log('Permission request saved:', permissionRequest);
      } catch (error: any) {
        console.error('Failed to save permission request:', error);
        const status = error?.status;
        const message = error?.message || 'Failed to save permission request to database.';
        if (status === 401 || status === 403) {
          alert('Login expired or role not allowed. Please login again as student.');
        } else {
          alert(message);
        }
        return;
      }

      setRequestId(permissionRequest.id);
      setShowSuccess(true);

      setTimeout(() => {
        onSubmit({
          type: permissionType,
          date,
          time,
          reason,
          attachments: attachment
  ? [{
      id: `att-${Date.now()}`,
      name: attachment.name,
      size: attachment.size,
      type: (attachment as any).type,
      data: (attachment as any).data
    }]
  : [],

        });
      }, 2500);
    }
  };

  const isFormValid = date && time && reason.trim().length >= 10;

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-gray-900 mb-2">Request Sent Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Permission request sent to Principal for approval
          </p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Request ID</p>
            <p className="text-xl text-blue-600">{requestId}</p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <p className="text-sm text-gray-700">Status: <span className="text-yellow-600">Pending</span></p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            You will be notified once the Principal reviews your request
          </p>
          <button
            onClick={onBack}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-xl py-3 hover:shadow-lg transition-all active:scale-95"
          >
            Back to Permissions
          </button>
        </div>
      </div>
    );
  }

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gray-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-white">Request Permission</h1>
            <p className="text-sm text-blue-100">{permissionTitles[permissionType]} • {permissionSubtitles[permissionType]}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 pb-24 max-w-md mx-auto">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          {/* Permission Type */}
          <div className="mb-4">
            <label className="text-sm text-gray-700 mb-2 block">Permission Type</label>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-sm text-gray-900">{permissionTitles[permissionType]} <span className="text-gray-600">• {permissionSubtitles[permissionType]}</span></p>
            </div>
          </div>

          {/* Date Selector */}
          <div className="mb-4">
            <label className="text-sm text-gray-700 mb-2 block flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
  <input
    type="text"
    placeholder="dd/mm/yyyy"
    value={date}
    onChange={(e) => {
      setDate(e.target.value);
      setErrors({ ...errors, date: '' });
    }}
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm bg-gray-50"
  />

  <button
    type="button"
    onClick={() => setShowCalendar(!showCalendar)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
  >
    <CalendarIcon className="w-5 h-5" />
  </button>
</div>

            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Calendar Popup */}
          {showCalendar && (
            <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <p className="text-sm text-gray-900">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</p>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-xs text-gray-500 py-1">{day}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handleDateSelect(i + 1)}
                    className="p-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white rounded transition-colors"
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time Selector */}
          <div className="mb-4">
            <label className="text-sm text-gray-700 mb-2 block flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Time <span className="text-red-500">*</span>
            </label>
            <button
              onClick={() => setShowTimePicker(!showTimePicker)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-left bg-gray-50 text-sm text-gray-700"
            >
              {time || '--:--:--'}
            </button>
            {errors.time && <p className="text-xs text-red-500 mt-1">{errors.time}</p>}
          </div>

          {/* Time Picker Popup */}
          {showTimePicker && (
  <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
    <div className="flex items-center justify-center gap-6">

      {/* HOURS */}
      <TimeWheel
        values={Array.from({ length: 12 }, (_, i) => i + 1)}
        selected={to12Hour(selectedHour)}
        onChange={(h) =>
          setSelectedHour(to24Hour(h, meridiem))
        }
      />

      <span className="text-xl text-gray-400">:</span>

      {/* MINUTES */}
      <TimeWheel
        values={Array.from({ length: 60 }, (_, i) => i)}
        selected={selectedMinute}
        onChange={setSelectedMinute}
      />

      <span className="text-xl text-gray-400">:</span>

      {/* SECONDS */}
      <TimeWheel
        values={Array.from({ length: 60 }, (_, i) => i)}
        selected={selectedSecond}
        onChange={setSelectedSecond}
      />

      {/* AM / PM */}
      <div className="flex flex-col gap-2 ml-2">
        <button
          onClick={() => setMeridiem('AM')}
          className={`px-3 py-1 rounded ${
            meridiem === 'AM'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100'
          }`}
        >
          AM
        </button>
        <button
          onClick={() => setMeridiem('PM')}
          className={`px-3 py-1 rounded ${
            meridiem === 'PM'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100'
          }`}
        >
          PM
        </button>
      </div>
    </div>

    <button
      onClick={handleTimeConfirm}
      className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2"
    >
      Confirm Time
    </button>
  </div>
)}


          {/* Reason Text Area */}
          <div className="mb-4">
            <label className="text-sm text-gray-700 mb-2 block">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrors({ ...errors, reason: '' });
              }}
              placeholder={permissionPlaceholders[permissionType]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors resize-none text-sm"
              rows={4}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">0 / 10 minimum characters</p>
              {errors.reason && <p className="text-xs text-red-500">{errors.reason}</p>}
            </div>
          </div>

          {/* Attachment Upload */}
          <div className="mb-4">
            <label className="text-sm text-gray-700 mb-2 block flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Attachment <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            
            {attachment ? (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{attachment.name}</p>
                    <p className="text-xs text-gray-500">{attachment.size}</p>
                  </div>
                </div>
                <button
                  onClick={removeAttachment}
                  className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleFileSelect}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-600">Click to upload supporting document</p>
                  <p className="text-xs text-gray-400">(medical slip, letter, or proof - JPG, PNG, PDF, max 5 MB)</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`w-full mt-4 rounded-lg py-3.5 transition-all text-white ${
            isFormValid
              ? 'bg-gray-800 hover:bg-gray-900 active:scale-98'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Send Request to Principal
        </button>

        {/* Info Text */}
        <p className="text-xs text-center text-gray-500 mt-3">
          Please fill in all required fields (*) to submit your request
        </p>
      </div>
    </div>
  );
}

