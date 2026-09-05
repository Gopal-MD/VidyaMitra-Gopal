import { JobRole } from "@/types";
import { jobRoles } from "./interviewUtils";
import { rolesApi } from "@/lib/api";

const ROLES_COLLECTION = 'roles';

export interface RoleManagement {
  openRoles: string[]; // Array of role IDs that are currently open
}

// ============= REST API-BACKED ROLE MANAGEMENT =============

/**
 * Toggle role open/closed status via API (persists in SQLite)
 */
export const toggleRoleStatusInDB = async (roleId: string, currentlyOpen: boolean): Promise<void> => {
  try {
    await rolesApi.update(roleId, !currentlyOpen);
    console.log(`✅ Role ${roleId} ${!currentlyOpen ? 'opened' : 'closed'}`);
  } catch (error) {
    console.error('Failed to toggle role status:', error);
    throw error;
  }
};

/**
 * Fetch all roles with their open/closed status from the database.
 * Roles not yet in the database default to open.
 */
export const getAllRolesWithStatusFromDB = async (): Promise<Array<JobRole & { isOpen: boolean }>> => {
  try {
    const data = await rolesApi.getAll();
    const dbRoles: Record<string, boolean> = {};
    (data.roles || []).forEach((r: any) => {
      if (r.role_id) {
        dbRoles[r.role_id] = r.is_open !== 0;
      }
    });

    return jobRoles.map(role => ({
      ...role,
      isOpen: dbRoles[role.id] !== undefined ? dbRoles[role.id] : true,
    }));
  } catch (error) {
    console.error('Failed to get roles:', error);
    return jobRoles.map(role => ({ ...role, isOpen: true }));
  }
};

/**
 * Fetch only open roles (for end-user RoleSelector).
 */
export const getOpenRolesFromDB = async (): Promise<JobRole[]> => {
  const allRoles = await getAllRolesWithStatusFromDB();
  return allRoles.filter(role => role.isOpen);
};

/**
 * Check if a specific role is open.
 */
export const isRoleOpenInDB = async (roleId: string): Promise<boolean> => {
  const allRoles = await getAllRolesWithStatusFromDB();
  const role = allRoles.find(r => r.id === roleId);
  return role ? role.isOpen : true;
};

/**
 * Subscribe to role changes - polls every 5 seconds (replaces Firestore onSnapshot).
 * Returns an unsubscribe function.
 */
export const subscribeToRoleChanges = (
  callback: (roles: Array<JobRole & { isOpen: boolean }>) => void
): (() => void) => {
  let active = true;

  const poll = async () => {
    try {
      const roles = await getAllRolesWithStatusFromDB();
      if (active) callback(roles);
    } catch {
      if (active) callback(jobRoles.map(role => ({ ...role, isOpen: true })));
    }
  };

  poll(); // Initial fetch
  const interval = setInterval(poll, 5000);

  return () => {
    active = false;
    clearInterval(interval);
  };
};

// ============= LEGACY EXPORTS (kept for backward compatibility) =============
const ROLE_MANAGEMENT_KEY = 'vidyamitra-role-management';

const getRoleManagementFromStorage = (): RoleManagement => {
  try {
    const stored = localStorage.getItem(ROLE_MANAGEMENT_KEY);
    if (stored) return JSON.parse(stored);
    return { openRoles: jobRoles.map(role => role.id) };
  } catch {
    return { openRoles: jobRoles.map(role => role.id) };
  }
};

export const getOpenRoles = (): JobRole[] => {
  const management = getRoleManagementFromStorage();
  return jobRoles.filter(role => management.openRoles.includes(role.id));
};

export const isRoleOpen = (roleId: string): boolean => {
  const management = getRoleManagementFromStorage();
  return management.openRoles.includes(roleId);
};

export const getAllRolesWithStatus = (): Array<JobRole & { isOpen: boolean }> => {
  const management = getRoleManagementFromStorage();
  return jobRoles.map(role => ({
    ...role,
    isOpen: management.openRoles.includes(role.id)
  }));
};

export const toggleRoleStatus = (roleId: string): RoleManagement => {
  const management = getRoleManagementFromStorage();
  const isOpen = management.openRoles.includes(roleId);
  if (isOpen) {
    management.openRoles = management.openRoles.filter(id => id !== roleId);
  } else {
    management.openRoles.push(roleId);
  }
  try { localStorage.setItem(ROLE_MANAGEMENT_KEY, JSON.stringify(management)); } catch { }
  return management;
};