"use client";

import React from "react";
import { UserStats } from "../types/user.types";

interface UserCategoriesFooterProps {
  stats: UserStats;
  isLoading?: boolean;
  onSelectCategory?: (category: string) => void;
}

export default function UserCategoriesFooter({
  stats,
  isLoading,
  onSelectCategory,
}: UserCategoriesFooterProps) {
  const { teachers = 0, administrators = 0, supportStaff = 0, other = 0 } =
    stats.roleCounts || {};

  const categories = [
    { label: "Teachers", count: teachers, roleKey: "Teacher" },
    { label: "Administrators", count: administrators, roleKey: "Administrator" },
    { label: "Support staff", count: supportStaff, roleKey: "Support staff" },
    { label: "Other", count: other, roleKey: "Other" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-[#edf2ee] rounded-2xl p-4 sm:p-5 border border-[#dbe5dd] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="font-extrabold text-[#11261c] text-sm">
          User categories
        </span>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-semibold text-[#16382b]">
          {categories.map((cat) => (
            <button
              key={cat.label}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectCategory && onSelectCategory(cat.roleKey)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#dfe9e1] transition-colors cursor-pointer text-left"
            >
              <span className="text-[#6b7c72] font-medium">{cat.label}</span>
              <span className="font-extrabold text-[#11261c] bg-white/70 px-1.5 py-0.5 rounded-md text-[11px]">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <footer className="pt-1 pb-4 text-center text-[10.5px] sm:text-xs text-[#6b7c72]">
        IntraShip UAM • Users concept • Sample data for design preview
      </footer>
    </div>
  );
}
