"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Eye, Edit2, Trash2, Shield, User as UserIcon } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Checkbox,
  EmptyState,
} from "@/components/ui";
import { usePermissions } from "@/context/permission-context";
import { User } from "../types/user.types";

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

interface MenuState {
  user: User;
  position: {
    top?: number;
    bottom?: number;
    right?: number;
    left?: number;
  };
}

export default function UserTable({
  users,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: UserTableProps) {
  const { can } = usePermissions();
  const canReadUser = can("users", "read");
  const canUpdateUser = can("users", "update");
  const canDeleteUser = can("users", "delete");
  const hasAnyRowAction = canReadUser || canUpdateUser || canDeleteUser;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close floating dropdown on scroll or window resize
  useEffect(() => {
    if (!menuState) return;

    const handleDismiss = () => setMenuState(null);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [menuState]);

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleOpenMenu = (user: User, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (menuState?.user.id === user.id) {
      setMenuState(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 150;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setMenuState({
      user,
      position: {
        top: openUpward ? undefined : rect.bottom + 6,
        bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
        right: Math.max(12, window.innerWidth - rect.right),
      },
    });
  };

  // 1. Loading Skeleton (Desktop Table + Mobile Cards)
  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#e5ece7] p-4 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3.5 bg-gray-200 rounded" />
                    <div className="w-36 h-2.5 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="w-7 h-7 bg-gray-100 rounded-lg" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#f0f4f1]">
                <div className="w-20 h-5 bg-gray-100 rounded-full" />
                <div className="w-16 h-5 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table skeleton */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-[#e5ece7] min-h-[220px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#edf2ee] text-[10.5px] uppercase font-bold text-[#6b7c72] tracking-wider">
                <th className="p-3 w-10"></th>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Active</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3ef] bg-white">
              {[1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="p-3">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200" />
                      <div className="space-y-1.5">
                        <div className="w-24 h-3.5 bg-gray-200 rounded" />
                        <div className="w-32 h-2.5 bg-gray-100 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="w-20 h-3 bg-gray-200 rounded" />
                  </td>
                  <td className="p-3">
                    <div className="w-16 h-5 bg-gray-200 rounded-full" />
                  </td>
                  <td className="p-3">
                    <div className="w-20 h-3 bg-gray-100 rounded" />
                  </td>
                  <td className="p-3">
                    <div className="w-6 h-6 bg-gray-100 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (users.length === 0) {
    return (
      <EmptyState
        title="No users found"
        description="We couldn't find any users matching your search filters. Try adjusting your query or resetting filters."
        icon={<Shield className="w-6 h-6 text-[#225740]" />}
        className="rounded-2xl border border-dashed border-[#dbe5dd] bg-[#f8faf8] my-4"
      />
    );
  }

  return (
    <div>
      {/* ============================================================== */}
      {/* MOBILE CARD VIEW (< md screens)                                 */}
      {/* ============================================================== */}
      <div className="md:hidden space-y-3">
        {/* Mobile Select All row */}
        <div className="flex items-center justify-between px-1 py-1 text-xs text-[#6b7c72]">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#16382b]">
            <Checkbox
              checked={
                selectedIds.length > 0 && selectedIds.length === users.length
              }
              onChange={toggleSelectAll}
            />
            <span>Select all ({users.length})</span>
          </label>
          {selectedIds.length > 0 && (
            <span className="text-[#225740] font-bold">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {users.map((user) => {
          const isSelected = selectedIds.includes(user.id);

          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl border p-4 transition-all ${
                isSelected
                  ? "border-[#225740] bg-[#f4f8f5] shadow-xs"
                  : "border-[#e5ece7] hover:border-[#ccd9cf] shadow-2xs"
              }`}
            >
              {/* Top Row: Checkbox + Avatar + Name/Email + Action Button */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelectRow(user.id)}
                  />
                  <div className="w-9 h-9 rounded-full bg-[#e6efe8] text-[#16382b] flex items-center justify-center font-bold text-xs flex-shrink-0 border border-[#c7ded0]">
                    {user.initials}
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold text-sm text-[#11261c] truncate leading-tight">
                      {user.name}
                    </span>
                    <span className="block text-[11px] text-[#6b7c72] truncate leading-tight mt-0.5">
                      {user.email}
                    </span>
                  </div>
                </div>

                {hasAnyRowAction && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenMenu(user, e)}
                    aria-label={`Actions for ${user.name}`}
                    className="p-1.5 rounded-lg border border-[#e0eae2] text-gray-600 hover:text-[#11261c] hover:bg-[#edf2ee] transition-colors cursor-pointer flex-shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Bottom Meta Row: Role, Status, and Last Active */}
              <div className="mt-3 pt-3 border-t border-[#f0f4f1] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#16382b] bg-[#f0f4f1] px-2.5 py-0.5 rounded-lg text-[11px]">
                    <UserIcon className="w-3 h-3 text-[#225740]" />
                    {user.role}
                  </span>
                  <Badge
                    variant={
                      user.status === "Active"
                        ? "success"
                        : user.status === "Pending"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {user.status}
                  </Badge>
                </div>

                <span className="text-[11px] text-[#6b7c72] font-medium">
                  {user.lastActive}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP TABLE VIEW (>= md screens)                             */}
      {/* ============================================================== */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[#e5ece7] min-h-[220px]">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-[#edf2ee] text-[10.5px] uppercase font-bold text-[#6b7c72] tracking-wider">
              <TableHead className="p-3 w-10">
                <Checkbox
                  checked={
                    selectedIds.length > 0 && selectedIds.length === users.length
                  }
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="p-3">User</TableHead>
              <TableHead className="p-3">Role</TableHead>
              <TableHead className="p-3">Status</TableHead>
              <TableHead className="p-3">Last Active</TableHead>
              <TableHead className="p-3 text-right pr-4 w-14"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#eef3ef] bg-white text-xs text-[#16382b]">
            {users.map((user) => {
              const isSelected = selectedIds.includes(user.id);

              return (
                <TableRow
                  key={user.id}
                  className={`hover:bg-[#f9fbf9] transition-colors ${
                    isSelected ? "bg-[#f4f8f5]" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <TableCell className="p-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleSelectRow(user.id)}
                    />
                  </TableCell>

                  {/* User Info (Avatar + Name + Email) */}
                  <TableCell className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#e6efe8] text-[#16382b] flex items-center justify-center font-bold text-xs flex-shrink-0 border border-[#c7ded0]">
                        {user.initials}
                      </div>
                      <div>
                        <span className="block font-bold text-sm text-[#11261c] leading-snug">
                          {user.name}
                        </span>
                        <span className="block text-[11px] text-[#6b7c72] leading-tight">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="p-3 font-medium text-[#16382b]">
                    {user.role}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="p-3">
                    <Badge
                      variant={
                        user.status === "Active"
                          ? "success"
                          : user.status === "Pending"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>

                  {/* Last Active */}
                  <TableCell className="p-3 text-[#6b7c72] font-medium text-[11.5px]">
                    {user.lastActive}
                  </TableCell>

                  {/* Actions Button */}
                  <TableCell className="p-3 text-right pr-4">
                    {hasAnyRowAction ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenMenu(user, e)}
                        aria-label={`Actions for ${user.name}`}
                        className="p-1.5 rounded-lg border border-[#dbe5dd] text-gray-500 hover:text-[#11261c] hover:bg-gray-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ============================================================== */}
      {/* PORTAL-BASED ACTION DROPDOWN MENU                              */}
      {/* Completely eliminates clipping/cut-off from overflow containers */}
      {/* ============================================================== */}
      {mounted &&
        menuState &&
        createPortal(
          <>
            {/* Transparent backdrop to close menu on outside click */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setMenuState(null)}
            />

            {/* Menu container positioned with fixed coordinates */}
            <div
              style={{
                position: "fixed",
                top:
                  menuState.position.top !== undefined
                    ? `${menuState.position.top}px`
                    : undefined,
                bottom:
                  menuState.position.bottom !== undefined
                    ? `${menuState.position.bottom}px`
                    : undefined,
                right:
                  menuState.position.right !== undefined
                    ? `${menuState.position.right}px`
                    : undefined,
              }}
              className="z-50 w-44 bg-white rounded-xl shadow-xl border border-[#e5ece7] py-1.5 text-left animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1 mb-1 border-b border-[#f0f4f1] text-[10.5px] font-bold text-[#6b7c72] truncate uppercase tracking-wider">
                {menuState.user.name}
              </div>

              {canReadUser && (
                <button
                  type="button"
                  onClick={() => {
                    const u = menuState.user;
                    setMenuState(null);
                    onView(u);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-[#16382b] hover:bg-[#f4f7f4] flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                  <span>View details</span>
                </button>
              )}

              {canUpdateUser && (
                <button
                  type="button"
                  onClick={() => {
                    const u = menuState.user;
                    setMenuState(null);
                    onEdit(u);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-[#16382b] hover:bg-[#f4f7f4] flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>Edit user</span>
                </button>
              )}

              {canDeleteUser && (canReadUser || canUpdateUser) && (
                <div className="border-t border-[#eef3ef] my-1" />
              )}

              {canDeleteUser && (
                <button
                  type="button"
                  onClick={() => {
                    const u = menuState.user;
                    setMenuState(null);
                    onDelete(u);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete user</span>
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
