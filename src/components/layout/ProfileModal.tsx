"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Power,
  Zap,
  Loader2,
  ArrowLeft,
  Mail,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

type DropdownView = "menu" | "profile_details";

export default function ProfileModal({
  isOpen,
  onClose,
  triggerRef,
}: ProfileModalProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [view, setView] = useState<DropdownView>("menu");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset to menu view when opened
  useEffect(() => {
    if (isOpen) {
      setView("menu");
      setIsLoggingOut(false);
    }
  }, [isOpen]);

  // Click outside listener: anywhere on document/window closes the modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // Click inside dropdown -> don't close
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }

      // Click on trigger container -> let trigger handle toggle
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }

      // Clicked anywhere else -> close immediately
      onClose();
    };

    // Attach to document with capture to catch all clicks reliably
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
    };
  }, [isOpen, onClose, triggerRef]);

  // Handle keyboard Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "profile_details") {
          setView("menu");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, view, onClose]);

  if (!isOpen) return null;

  const displayName = user?.name || "User";
  const displayEmail = user?.email || "user@example.com";
  const displayRole = user?.role || "SUPER_ADMIN";
  const displayInitials =
    user?.initials ||
    (displayName
      ? displayName
          .split(" ")
          .filter(Boolean)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : displayEmail
        ? displayEmail[0].toUpperCase()
        : "U");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
    } catch {
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Invisible Global Overlay as fallback */}
      <div
        className="fixed inset-0 z-40 bg-transparent cursor-default pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Profile Dropdown Container */}
      <div
        ref={dropdownRef}
        role="menu"
        aria-label="User profile options"
        className={`absolute right-0 top-full mt-2.5 z-50 bg-white rounded-3xl border border-[#e5ece7] shadow-2xl overflow-hidden animate-fade-in text-left transition-all duration-200 max-w-[calc(100vw-1.5rem)] ${
          view === "menu" ? "w-72" : "w-[330px] sm:w-[360px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Caret Arrow pointing to Header Avatar */}
        <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-[#e5ece7] rotate-45 z-10" />

        {view === "menu" ? (
          /* ==================== 1. COMPACT MENU VIEW ==================== */
          <div>
            {/* User Summary Header */}
            <div className="p-4 bg-white flex items-center gap-3 border-b border-[#f0f4f1]">
              <div className="w-12 h-12 rounded-full bg-[#1e4d3a] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 ring-2 ring-[#e5ece7]">
                {displayInitials}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-[#11261c] truncate leading-tight">
                  {displayName}
                </h4>
                <p className="text-[11px] text-[#6b7c72] truncate mt-0.5 leading-tight uppercase font-medium">
                  {displayRole}
                </p>
              </div>
            </div>

            {/* Navigation Item */}
            <div className="p-2">
              <button
                type="button"
                onClick={() => setView("profile_details")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#4b5563] hover:text-[#11261c] hover:bg-[#f4f7f4] transition-colors cursor-pointer group"
              >
                <User className="w-4 h-4 text-gray-400 group-hover:text-[#225740] transition-colors" />
                <span>My Profile</span>
              </button>
            </div>

            {/* Bottom Logout Button */}
            <div className="p-3 pt-1 border-t border-[#f0f4f1] bg-white">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-200/80 hover:border-purple-300 bg-white hover:bg-purple-50/60 text-[#6d28d9] hover:text-purple-700 text-xs font-bold shadow-2xs transition-all cursor-pointer group disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6d28d9]" />
                ) : (
                  <Power className="w-3.5 h-3.5 text-[#6d28d9] group-hover:scale-110 transition-transform" />
                )}
                <span>Logout</span>
                <Zap className="w-3 h-3 text-[#7c3aed] -ml-0.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ==================== 2. PROFILE DETAILS (READ-ONLY VIEW) ==================== */
          <div>
            {/* Header with Back Button */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#eef3ef] bg-white">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="p-1 -ml-1 text-gray-500 hover:text-[#16382b] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                aria-label="Back to menu"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
                <span>Back</span>
              </button>

              <div className="text-right">
                <h3 className="text-xs font-bold text-[#11261c]">
                  Account Details
                </h3>
                <p className="text-[10px] text-[#6b7c72]">
                  Profile overview
                </p>
              </div>
            </div>

            {/* Content (Read-Only) */}
            <div className="p-4 space-y-3.5 max-h-[calc(100vh-180px)] overflow-y-auto no-scrollbar custom-modal-scroll">
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[#f4f7f4] border border-[#dbe5dd]">
                <div className="w-16 h-16 rounded-full bg-[#1e4d3a] text-white flex items-center justify-center font-extrabold text-xl shadow-xs mb-2 ring-4 ring-white">
                  {displayInitials}
                </div>
                <h4 className="text-sm font-extrabold text-[#11261c] leading-snug">
                  {displayName}
                </h4>
                <p className="text-[11px] text-[#6b7c72] mt-0.5 break-all">
                  {displayEmail}
                </p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#1e4d3a] text-white uppercase tracking-wider shadow-xs">
                    {displayRole}
                  </span>
                </div>
              </div>

              {/* ACCOUNT DETAILS Cards */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#6b7c72] uppercase tracking-wider block px-1">
                  ACCOUNT DETAILS
                </span>

                {/* Full Name */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f8faf8] border border-[#dbe5dd]">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#e5ece7] text-[#1e4d3a] flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <User className="w-4 h-4 text-[#1e4d3a]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9.5px] text-[#6b7c72] font-medium leading-none mb-1">
                      Full Name
                    </span>
                    <span className="text-xs font-bold text-[#11261c] truncate leading-tight">
                      {displayName}
                    </span>
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f8faf8] border border-[#dbe5dd]">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#e5ece7] text-[#1e4d3a] flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <Mail className="w-4 h-4 text-[#1e4d3a]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9.5px] text-[#6b7c72] font-medium leading-none mb-1">
                      Email Address
                    </span>
                    <span className="text-xs font-bold text-[#11261c] truncate leading-tight">
                      {displayEmail}
                    </span>
                  </div>
                </div>

                {/* Assigned Role */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f8faf8] border border-[#dbe5dd]">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#e5ece7] text-[#1e4d3a] flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <Shield className="w-4 h-4 text-[#1e4d3a]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9.5px] text-[#6b7c72] font-medium leading-none mb-1">
                      Assigned Role
                    </span>
                    <span className="text-xs font-bold text-[#11261c] truncate leading-tight">
                      {displayRole}
                    </span>
                  </div>
                </div>

                {/* Session Status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8faf8] border border-[#dbe5dd]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-[#11261c]">
                      Session Status
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-[#eef8f1] border border-[#c7ded0] px-2.5 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Back Action */}
            <div className="p-3 border-t border-[#eef3ef] bg-white">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="w-full py-2 px-3 rounded-xl border border-[#dbe5dd] hover:bg-[#f4f7f4] text-xs font-semibold text-[#16382b] transition-colors cursor-pointer text-center"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
