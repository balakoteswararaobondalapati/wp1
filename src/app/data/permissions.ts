export interface PermissionRequest {
  id: string;
  studentName: string;
  rollNumber: string;
  semester: string;
  section: string;
  studentEmail?: string;
  department?: string;
  course?: string;
  type: string;
  typeLabel: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  remark?: string;
  attachments?: {
    id?: string;
    name: string;
    size: string;
    type?: string;
    data?: string; // base64 encoded file data
  }[];
}

export const permissionsData: PermissionRequest[] = [];
