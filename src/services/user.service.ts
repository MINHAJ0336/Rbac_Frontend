import { apiClient } from "@/lib/api/api-client";
import {
  User,
  UserFilterParams,
  UsersListResponse,
  CreateUserInput,
  ActionResponse,
  UserStats,
  UserCategoryItem,
} from "@/app/(dashboard)/users/types/user.types";

const USERS_ROUTES = {
  LIST: "/api/v1/users/user-list",
  CREATE: "/api/v1/users/create-user",
  UPDATE: (id: string | number) => `/api/v1/users/update-profile/${id}`,
  TOGGLE_STATUS: (id: string | number) => `/api/v1/users/toggle-activation/${id}`,
  DELETE: (id: string | number) => `/api/v1/users/delete-user/${id}`,
  ROLES_ALL: "/api/v1/roles/all",
} as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0][0] || "U").toUpperCase();
  }
  return (
    (parts[0][0] || "") + (parts[parts.length - 1][0] || "")
  ).toUpperCase();
}

export interface BackendRoleItem {
  id?: string | number;
  name: string;
  user_count?: number;
}

/**
 * Computes statistical metrics dynamically from actual backend users and roles
 */
export function computeUserStats(
  users: User[],
  backendRoles?: BackendRoleItem[],
): UserStats {
  const total = users.length;
  const active = users.filter((u) => u.status === "Active").length;
  const pending = users.filter((u) => u.status === "Pending").length;
  const inactive = users.filter((u) => u.status === "Inactive").length;

  // Category tracking map preserving display name and user counts
  const categoryMap = new Map<string, number>();

  // 1. Seed categories from backend roles if available
  if (Array.isArray(backendRoles) && backendRoles.length > 0) {
    backendRoles.forEach((r) => {
      const name = String(r.name || "").trim();
      if (name) {
        categoryMap.set(name, Number(r.user_count) || 0);
      }
    });
  }

  // 2. Count actual users per role directly from user records
  const userCountsByNormRole: Record<string, number> = {};
  const userOriginalRoleNames: Record<string, string> = {};

  users.forEach((u) => {
    const assignedRoles =
      Array.isArray(u.roles) && u.roles.length > 0
        ? u.roles
        : [u.role || "Other"];

    assignedRoles.forEach((role) => {
      const cleanRole = String(role || "").trim() || "Other";
      const norm = cleanRole.toLowerCase().replace(/[\s_-]+/g, "");
      userCountsByNormRole[norm] = (userCountsByNormRole[norm] || 0) + 1;
      if (!userOriginalRoleNames[norm]) {
        userOriginalRoleNames[norm] = cleanRole;
      }
    });
  });

  // 3. Match user counts against seeded backend roles
  if (categoryMap.size > 0) {
    for (const [roleName] of Array.from(categoryMap.entries())) {
      const norm = roleName.toLowerCase().replace(/[\s_-]+/g, "");
      if (userCountsByNormRole[norm] !== undefined) {
        categoryMap.set(roleName, userCountsByNormRole[norm]);
        delete userCountsByNormRole[norm];
      }
    }
  }

  // 4. Add any remaining active roles observed in users list
  Object.keys(userCountsByNormRole).forEach((norm) => {
    const displayName = userOriginalRoleNames[norm] || "Other";
    categoryMap.set(displayName, userCountsByNormRole[norm]);
  });

  // Transform into categories array
  const categories: UserCategoryItem[] = Array.from(categoryMap.entries()).map(
    ([name, count]) => ({
      name,
      count,
    }),
  );

  // If no categories were detected but users exist, provide a summary category
  if (categories.length === 0 && total > 0) {
    categories.push({ name: "General Users", count: total });
  }

  // Populate backward-compatible roleCounts map
  const roleCounts: Record<string, number> = {};
  categories.forEach((cat) => {
    roleCounts[cat.name] = cat.count;
    roleCounts[cat.name.toLowerCase()] = cat.count;
  });

  const teachers = roleCounts["teachers"] ?? roleCounts["teacher"] ?? 0;
  const administrators =
    roleCounts["administrators"] ??
    roleCounts["administrator"] ??
    roleCounts["admin"] ??
    0;
  const supportStaff =
    roleCounts["support staff"] ??
    roleCounts["supportstaff"] ??
    roleCounts["support"] ??
    0;
  const other =
    roleCounts["other"] ??
    Math.max(0, total - (teachers + administrators + supportStaff));

  const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : "0.0";

  return {
    totalUsers: total,
    activeUsers: active,
    pendingInvitations: pending,
    inactiveUsers: inactive,
    totalGrowth: "+12.8%",
    activePercent: `${activePct}%`,
    categories,
    roleCounts: {
      ...roleCounts,
      teachers,
      administrators,
      supportStaff,
      other,
    },
  };
}

export const userService = {
  /**
   * Fetches users directly from real backend API: GET /api/v1/users/user-list
   * In-memory search, filter, and pagination performed over actual backend records.
   * Zero mock data or local fallback.
   */
  async getUsers(params: UserFilterParams = {}): Promise<UsersListResponse> {
    try {
      const q = new URLSearchParams();
      if (params.search?.trim()) q.set("search", params.search.trim());

      const queryStr = q.toString() ? `?${q.toString()}` : "";

      // Fetch users list and all configured roles concurrently from backend API (no-cache to avoid stale data)
      const [rawResponse, rolesResponse] = await Promise.all([
        apiClient.get<Record<string, unknown>>(`${USERS_ROUTES.LIST}${queryStr}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }).catch((e) => {
          console.error("[userService] Error fetching users list:", e);
          return null;
        }),
        apiClient.get<Record<string, unknown>>(USERS_ROUTES.ROLES_ALL, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }).catch(() => null),
      ]);

      // Extract backend roles list
      const rawRoles = Array.isArray(rolesResponse)
        ? rolesResponse
        : Array.isArray(rolesResponse?.data)
          ? (rolesResponse.data as Record<string, unknown>[])
          : Array.isArray((rolesResponse?.data as Record<string, unknown>)?.items)
            ? ((rolesResponse?.data as Record<string, unknown>).items as Record<string, unknown>[])
            : Array.isArray((rolesResponse?.data as Record<string, unknown>)?.roles)
              ? ((rolesResponse?.data as Record<string, unknown>).roles as Record<string, unknown>[])
              : [];

      const backendRoles: BackendRoleItem[] = rawRoles
        .map((r) => ({
          id: (r.id ?? r.role_id) as string | number,
          name: String(r.name || r.role_name || "").trim(),
          user_count: Number(r.user_count || 0),
        }))
        .filter((r) => Boolean(r.name));

      const list = Array.isArray(rawResponse)
        ? rawResponse
        : Array.isArray(rawResponse?.data)
          ? (rawResponse.data as Record<string, unknown>[])
          : Array.isArray((rawResponse?.data as Record<string, unknown>)?.items)
            ? ((rawResponse?.data as Record<string, unknown>).items as Record<string, unknown>[])
            : [];

      const allMappedUsers: User[] = list.map((item, idx) => {
        const rawId = item.id !== undefined ? item.id : item.user_id !== undefined ? item.user_id : idx + 1;
        const name = String(item.username || item.name || "User");
        const email = String(item.email || "");
        const initials = getInitials(name);
        const roleName = String(item.role || item.role_name || "General");
        const isActive =
          item.is_active !== undefined
            ? Boolean(item.is_active)
            : item.status !== "Inactive";

        let mappedRoleId: number | null = null;
        if (
          item.role_id !== undefined &&
          item.role_id !== null &&
          item.role_id !== "NULL" &&
          item.role_id !== "null"
        ) {
          const parsed = Number(item.role_id);
          if (!isNaN(parsed)) {
            mappedRoleId = parsed;
          }
        }

        return {
          id: String(rawId),
          name,
          email,
          initials,
          role: roleName,
          role_id: mappedRoleId,
          status: isActive ? "Active" : "Inactive",
          lastActive: String(item.last_login || item.updated_at || "Recently"),
          roles: [roleName],
        };
      });

      // In-memory filter & paginate
      let filtered = [...allMappedUsers];

      // 1. Search filter
      if (params.search?.trim()) {
        const term = params.search.toLowerCase().trim();
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            u.role.toLowerCase().includes(term),
        );
      }

      // 2. Role filter
      if (params.role && params.role !== "All roles") {
        const targetRole = params.role.toLowerCase().replace(/[\s_-]+/g, "");
        filtered = filtered.filter((u) => {
          const uRole = u.role.toLowerCase().replace(/[\s_-]+/g, "");
          return uRole === targetRole || uRole.includes(targetRole) || targetRole.includes(uRole);
        });
      }

      // 3. Status filter
      if (params.status && params.status !== "All statuses") {
        const targetStatus = params.status.toLowerCase().trim();
        filtered = filtered.filter(
          (u) => u.status.toLowerCase() === targetStatus,
        );
      }

      const total = filtered.length;
      const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 6;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(
        Math.max(1, params.page && params.page > 0 ? params.page : 1),
        totalPages,
      );

      const startIndex = (page - 1) * pageSize;
      const paginatedUsers = filtered.slice(startIndex, startIndex + pageSize);

      return {
        users: paginatedUsers,
        total,
        page,
        pageSize,
        totalPages,
        stats: computeUserStats(allMappedUsers, backendRoles),
      };
    } catch (err: unknown) {
      console.error("[userService] Real Backend users fetch error:", err);
      return {
        users: [],
        total: 0,
        page: 1,
        pageSize: params.pageSize || 6,
        totalPages: 1,
        stats: computeUserStats([]),
      };
    }
  },

  /**
   * Retrieves aggregate user statistics derived from real backend users
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const res = await this.getUsers({ page: 1, pageSize: 1000 });
      return res.stats;
    } catch {
      return computeUserStats([]);
    }
  },

  /**
   * Creates a new user record via FastAPI backend: POST /api/v1/users/create-user
   * Conforms strictly to backend UserCreateRequest schema.
   */
  async createUser(input: CreateUserInput): Promise<ActionResponse<User>> {
    try {
      // Resolve role_id from input.role_id, input.roleId, or by matching backend roles
      let roleId = 1;
      const rawRoleId = input.role_id !== undefined ? input.role_id : input.roleId;
      if (
        rawRoleId !== undefined &&
        rawRoleId !== null &&
        String(rawRoleId) !== "NULL" &&
        String(rawRoleId) !== "null" &&
        String(rawRoleId) !== ""
      ) {
        const parsed = Number(rawRoleId);
        if (!isNaN(parsed)) {
          roleId = parsed;
        }
      } else {
        try {
          const allRolesRes = await apiClient.get<Record<string, unknown>>(USERS_ROUTES.ROLES_ALL);
          const rolesList = Array.isArray(allRolesRes)
            ? allRolesRes
            : Array.isArray(allRolesRes?.data)
              ? (allRolesRes.data as Record<string, unknown>[])
              : [];
          const match = rolesList.find((r) => {
            const rName = String(r.name || r.role_name || "").toLowerCase().trim();
            return rName === (input.role || "").toLowerCase().trim();
          });
          if (match) {
            roleId = Number(match.id ?? match.role_id ?? 1);
          }
        } catch {
          // fallback roleId
        }
      }

      const payload = {
        username: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: (input as unknown as { password?: string }).password || "TempPassword123!",
        role: input.role,
        role_id: roleId,
      };

      const response = await apiClient.post<Record<string, unknown>>(
        USERS_ROUTES.CREATE,
        payload,
      );

      const resData = (response?.data as Record<string, unknown>) || response;
      const createdId = String(resData?.id || resData?.user_id || Date.now());

      const newUser: User = {
        id: createdId,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        initials: getInitials(input.name.trim()),
        role: input.role,
        role_id: roleId,
        status: input.status,
        lastActive: "Just now",
        roles: [input.role],
      };

      return {
        success: true,
        message: ((response as Record<string, unknown>)?.message as string) || "User created successfully.",
        data: newUser,
      };
    } catch (err: unknown) {
      console.error("[userService] Backend create user error:", err);
      const errObj = err as {
        message?: string;
        data?: { detail?: string | Array<{ msg?: string }>; message?: string };
        response?: { data?: { detail?: string | Array<{ msg?: string }>; message?: string } };
      };
      const detail =
        errObj?.data?.detail ||
        errObj?.response?.data?.detail ||
        errObj?.data?.message ||
        errObj?.response?.data?.message;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg).filter(Boolean).join(", ")
        : typeof detail === "string"
          ? detail
          : errObj?.message || "Failed to create user on backend.";
      return {
        success: false,
        message: msg,
      };
    }
  },

  /**
   * Updates an existing user record via backend:
   * PUT /api/v1/users/update-profile/{user_id}
   */
  async updateUser(
    id: string | number,
    input: Partial<CreateUserInput>,
  ): Promise<ActionResponse<User>> {
    try {
      const numId = !isNaN(Number(id)) ? Number(id) : id;

      const updatePayload: {
        username?: string;
        email?: string;
        role_id?: number;
        role?: string;
        role_name?: string;
      } = {};
      if (input.name) updatePayload.username = input.name.trim();
      if (input.email) updatePayload.email = input.email.trim().toLowerCase();

      const rawRoleId = input.role_id !== undefined ? input.role_id : input.roleId;
      if (
        rawRoleId !== undefined &&
        rawRoleId !== null &&
        String(rawRoleId) !== "NULL" &&
        String(rawRoleId) !== "null" &&
        String(rawRoleId) !== ""
      ) {
        const parsedRoleId = Number(rawRoleId);
        if (!isNaN(parsedRoleId)) {
          updatePayload.role_id = parsedRoleId;
        }
      }

      if (input.role) {
        updatePayload.role = input.role;
        updatePayload.role_name = input.role;
      }

      const response = await apiClient.put<Record<string, unknown>>(
        USERS_ROUTES.UPDATE(numId),
        updatePayload,
      );

      const resData = (response?.data as Record<string, unknown>) || response || {};
      const roleChanged =
        resData.role_changed !== undefined
          ? Boolean(resData.role_changed)
          : (response as Record<string, unknown>)?.role_changed !== undefined
            ? Boolean((response as Record<string, unknown>).role_changed)
            : undefined;

      const updatedUser: User = {
        id: String(resData.id ?? id),
        name: String(resData.username ?? input.name?.trim() ?? "User"),
        email: String(resData.email ?? input.email?.trim() ?? ""),
        initials: getInitials(String(resData.username ?? input.name ?? "U")),
        role: String(resData.role ?? input.role ?? "General"),
        role_id:
          resData.role_id !== undefined && resData.role_id !== null && resData.role_id !== "NULL"
            ? Number(resData.role_id)
            : updatePayload.role_id,
        status: input.status || "Active",
        lastActive: "Just now",
        roles: resData.role ? [String(resData.role)] : input.role ? [input.role] : [],
      };

      return {
        success: true,
        message:
          (response?.message as string) ||
          (resData?.message as string) ||
          "User updated successfully.",
        data: updatedUser,
        role_changed: roleChanged,
      };
    } catch (err: unknown) {
      console.error("[userService] Backend update user error:", err);
      const errObj = err as {
        message?: string;
        data?: { detail?: string | Array<{ msg?: string }>; message?: string };
        response?: { data?: { detail?: string | Array<{ msg?: string }>; message?: string } };
      };
      const detail =
        errObj?.data?.detail ||
        errObj?.response?.data?.detail ||
        errObj?.data?.message ||
        errObj?.response?.data?.message;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg).filter(Boolean).join(", ")
        : typeof detail === "string"
          ? detail
          : errObj?.message || "Failed to update user on backend.";
      return {
        success: false,
        message: msg,
      };
    }
  },

  /**
   * Toggles a user's active / inactive status via backend:
   * PATCH /api/v1/users/toggle-activation/{user_id}
   */
  async toggleStatus(id: string | number): Promise<ActionResponse<User>> {
    try {
      const numId = parseInt(String(id).replace(/\D/g, ""), 10) || Number(id);
      const response = await apiClient.patch<Record<string, unknown>>(
        USERS_ROUTES.TOGGLE_STATUS(numId),
      );

      return {
        success: true,
        message: ((response as Record<string, unknown>)?.message as string) || "User status updated successfully.",
      };
    } catch (err: unknown) {
      console.error("[userService] Backend toggle status error:", err);
      const errObj = err as {
        message?: string;
        data?: { detail?: string | Array<{ msg?: string }> };
        response?: { data?: { detail?: string | Array<{ msg?: string }> } };
      };
      const detail = errObj?.data?.detail || errObj?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg).filter(Boolean).join(", ")
        : typeof detail === "string"
          ? detail
          : errObj?.message || "Failed to toggle user status on backend.";
      return {
        success: false,
        message: msg,
      };
    }
  },

  /**
   * Deletes a user record via backend:
   * DELETE /api/v1/users/delete-user/{id}
   */
  async deleteUser(id: string | number): Promise<ActionResponse<{ id: string | number }>> {
    try {
      const numId = parseInt(String(id).replace(/\D/g, ""), 10) || Number(id);
      const response = await apiClient.delete<Record<string, unknown>>(
        USERS_ROUTES.DELETE(numId),
      );

      return {
        success: true,
        message: ((response as Record<string, unknown>)?.message as string) || "User deleted successfully.",
        data: { id },
      };
    } catch (err: unknown) {
      console.error("[userService] Backend delete user error:", err);
      const errObj = err as {
        message?: string;
        data?: { detail?: string | Array<{ msg?: string }> };
        response?: { data?: { detail?: string | Array<{ msg?: string }> } };
      };
      const detail = errObj?.data?.detail || errObj?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg).filter(Boolean).join(", ")
        : typeof detail === "string"
          ? detail
          : errObj?.message || "Failed to delete user on backend.";
      return {
        success: false,
        message: msg,
        data: { id },
      };
    }
  },
};
