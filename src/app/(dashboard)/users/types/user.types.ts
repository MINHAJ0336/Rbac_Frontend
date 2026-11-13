export type UserStatus = "Active" | "Pending" | "Inactive";

export type UserRole =
  "Teacher" | "Administrator" | "Support staff" | "Student" | "Other";

export interface UserSecuritySettings {
  notificationAlerts: boolean;
  emailMfa: boolean;
  smsMfa: boolean;
  deviceBinding: boolean;
  deviceId: string;
  accessEnvironment: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  role_id?: number | null;
  status: UserStatus;
  lastActive: string;
  initials: string;
  securitySettings?: UserSecuritySettings;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCategoryItem {
  name: string;
  count: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  inactiveUsers: number;
  totalGrowth: string;
  activePercent: string;
  categories?: UserCategoryItem[];
  roleCounts: Record<string, number> & {
    teachers?: number;
    administrators?: number;
    supportStaff?: number;
    other?: number;
  };
}

export interface UserFilterParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: UserStats;
}

export interface CreateUserInput {
  name: string;
  email: string;
  status: UserStatus;
  role: string;
  role_id?: number | null;
  roleId?: number | string | null;
  notificationAlerts?: boolean;
  emailMfa?: boolean;
  smsMfa?: boolean;
  deviceBinding?: boolean;
  deviceId?: string;
  accessEnvironment?: string;
  assignedRoles?: string[];
  password?: string;
}

export interface UpdateUserInput extends Partial<CreateUserInput> {
  id: string;
  role_id?: number | null;
  roleId?: number | string | null;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  role_changed?: boolean;
  errors?: Record<string, string[]>;
}
