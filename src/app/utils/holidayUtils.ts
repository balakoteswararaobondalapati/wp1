import { appStorage } from './storage';
import { getLocalDateISO } from './date';

interface PeriodBlock {
  period: number;
  isBlocked: boolean;
}

interface SessionBlock {
  morning: PeriodBlock[];
  afternoon: PeriodBlock[];
}

interface DayBlock {
  date: string;
  scopeCourse?: string;
  scopeSection?: string;
  scopeSemester?: string;
  isHoliday: boolean;
  isClosed: boolean;
  hasPermission?: boolean;
  reason?: string;
  sessions: SessionBlock;
}

interface HolidayData {
  [key: string]: DayBlock;
}

interface Scope {
  course?: string;
  section?: string;
  semester?: string;
}

const getScopeKey = (dateStr: string, course: string, section: string, semester: string) =>
  `${dateStr}|${course}|${section}|${semester}`;

const isSunday = (dateStr: string) => new Date(dateStr).getDay() === 0;

const createDefaultSundayBlock = (dateStr: string): DayBlock => ({
  date: dateStr,
  isHoliday: true,
  isClosed: false,
  hasPermission: false,
  reason: 'Sunday Holiday',
  sessions: {
    morning: [],
    afternoon: [],
  },
});

const isNeutralDayBlock = (day: DayBlock | null | undefined) => {
  if (!day) return true;
  const hasBlockedPeriods =
    (day.sessions?.morning || []).some((period) => period.isBlocked) ||
    (day.sessions?.afternoon || []).some((period) => period.isBlocked);

  return !day.isHoliday && !day.isClosed && !day.hasPermission && !hasBlockedPeriods;
};

export function getHolidayData(): HolidayData {
  const saved = appStorage.getItem('holiday_attendance_data');
  return saved ? JSON.parse(saved) : {};
}

export function resolveHolidayBlock(dateStr: string, scope: Scope = {}): DayBlock | null {
  const holidayData = getHolidayData();
  const course = scope.course || 'all';
  const section = scope.section || 'all';
  const semester = scope.semester || 'all';

  const resolved =
    holidayData[getScopeKey(dateStr, course, section, semester)] ||
    holidayData[getScopeKey(dateStr, 'all', 'all', 'all')] ||
    holidayData[dateStr] ||
    null;

  if (resolved && !(isSunday(dateStr) && isNeutralDayBlock(resolved))) {
    return resolved;
  }

  return isSunday(dateStr) ? createDefaultSundayBlock(dateStr) : null;
}

export function getTodayStatus(scope: Scope = {}) {
  const today = getLocalDateISO();
  const todayData = resolveHolidayBlock(today, scope);

  return {
    date: today,
    isHoliday: todayData?.isHoliday || false,
    isClosed: todayData?.isClosed || false,
    hasPermission: todayData?.hasPermission || false,
    isBlocked: (todayData?.isHoliday || todayData?.isClosed) && !todayData?.hasPermission,
    reason: todayData?.reason || '',
    sessions: todayData?.sessions || {
      morning: [],
      afternoon: [],
    },
  };
}

export function isPeriodBlocked(
  session: 'morning' | 'afternoon',
  periodNumber: number,
  scope: Scope = {},
): boolean {
  const todayStatus = getTodayStatus(scope);

  if ((todayStatus.isHoliday || todayStatus.isClosed) && !todayStatus.hasPermission) {
    return true;
  }

  const periods = todayStatus.sessions?.[session];
  if (!periods || periods.length === 0) return false;

  const period = periods.find((item) => item.period === periodNumber);
  return period?.isBlocked || false;
}

export function getBlockedPeriods(session: 'morning' | 'afternoon', scope: Scope = {}): number[] {
  const todayStatus = getTodayStatus(scope);

  if ((todayStatus.isHoliday || todayStatus.isClosed) && !todayStatus.hasPermission) {
    return [1, 2, 3, 4, 5];
  }

  const periods = todayStatus.sessions?.[session];
  if (!periods) return [];

  return periods.filter((item) => item.isBlocked).map((item) => item.period);
}

export function canAccessAttendance(scope: Scope = {}): {
  allowed: boolean;
  reason?: string;
  status: 'normal' | 'holiday' | 'closed' | 'permission';
} {
  const todayStatus = getTodayStatus(scope);

  if (todayStatus.isHoliday && !todayStatus.hasPermission) {
    return {
      allowed: false,
      reason: todayStatus.reason || 'Today is a Holiday',
      status: 'holiday',
    };
  }

  if (todayStatus.isClosed && !todayStatus.hasPermission) {
    return {
      allowed: false,
      reason: todayStatus.reason || 'College is Closed Today',
      status: 'closed',
    };
  }

  if (todayStatus.hasPermission) {
    return {
      allowed: true,
      reason: todayStatus.reason || 'Special Permission Granted',
      status: 'permission',
    };
  }

  return {
    allowed: true,
    status: 'normal',
  };
}
