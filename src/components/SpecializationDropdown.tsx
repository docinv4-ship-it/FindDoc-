"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import {
  SPECIALIZATION_GROUPS,
  OTHER_SPECIALIZATION,
} from "@/lib/data/specializations";

interface SpecializationDropdownProps {
  value: string;
  customValue?: string;
  onChange: (value: string) => void;
  onCustomChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean | string;
  id?: string;
}

export default function SpecializationDropdown({
  value,
  customValue = "",
  onCustomChange,
  onChange,
  placeholder = "Search or select specialization",
  required = false,
  error = false,
  id = "specialization",
}: SpecializationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return SPECIALIZATION_GROUPS;
    const q = search.toLowerCase();
    return SPECIALIZATION_GROUPS.map((g) => ({
      ...g,
      options: g.options.filter((o) => o.toLowerCase().includes(q)),
    })).filter((g) => g.options.length > 0);
  }, [search]);

  const showCustom = value === OTHER_SPECIALIZATION;

  return (
    <div ref={ref} className="relative">
      <div
        className={`relative ${
          error ? "ring-2 ring-red-500 rounded-lg" : ""
        }`}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            if (!open) {
              setSearch("");
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown
            className={`w-5 h-5 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {filteredGroups.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No specializations found
            </div>
          )}
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
                {group.label}
              </div>
              {group.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 flex items-center justify-between ${
                    value === option
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {option}
                  {value === option && (
                    <Check className="w-4 h-4 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          ))}
          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                onChange(OTHER_SPECIALIZATION);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 flex items-center justify-between ${
                value === OTHER_SPECIALIZATION
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              {OTHER_SPECIALIZATION}
              {value === OTHER_SPECIALIZATION && (
                <Check className="w-4 h-4 text-primary-500" />
              )}
            </button>
          </div>
        </div>
      )}

      {showCustom && onCustomChange && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Enter your specialization"
          required
          className="w-full mt-2 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
    </div>
  );
}
