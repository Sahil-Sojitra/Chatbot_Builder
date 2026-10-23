"use client";

import * as React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeVariant?: "purple" | "green" | "amber" | "zinc" | "default";
  sublabel?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange?: (value: string) => void;
  options?: CustomSelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
}

export function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  children,
  placeholder = "Select an option…",
  disabled = false,
  className,
  dropdownClassName,
}: CustomSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Parse options if child <option> elements are provided
  const resolvedOptions: CustomSelectOption[] = React.useMemo(() => {
    if (options && options.length > 0) return options;

    const parsed: CustomSelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.type === "option" || (child.props as any)?.value !== undefined)) {
        const val = String((child.props as any).value ?? "");
        const rawLabel = String((child.props as any).children ?? val);
        
        parsed.push({
          value: val,
          label: rawLabel,
          disabled: Boolean((child.props as any).disabled),
        });
      }
    });
    return parsed;
  }, [options, children]);

  const selectedOption = resolvedOptions.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = resolvedOptions.findIndex((o) => o.value === value);
        const nextIndex = currentIndex < resolvedOptions.length - 1 ? currentIndex + 1 : 0;
        const nextOpt = resolvedOptions[nextIndex];
        if (nextOpt && !nextOpt.disabled) {
          onChange?.(nextOpt.value);
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = resolvedOptions.findIndex((o) => o.value === value);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : resolvedOptions.length - 1;
        const prevOpt = resolvedOptions[prevIndex];
        if (prevOpt && !prevOpt.disabled) {
          onChange?.(prevOpt.value);
        }
      }
    }
  };

  const getBadgeStyle = (variant?: CustomSelectOption["badgeVariant"]) => {
    switch (variant) {
      case "purple":
        return "bg-violet-500/15 text-violet-300 border-violet-500/30";
      case "green":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "amber":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full", className)}>
      {/* Hidden input to support standard form submissions */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Dropdown Trigger */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-zinc-800 bg-[#0d0d10] px-3 py-1.5 text-xs sm:text-sm text-zinc-100 transition-all outline-none cursor-pointer",
          "hover:border-zinc-700 hover:bg-[#121217]",
          "focus-visible:border-violet-500 focus-visible:ring-1 focus-visible:ring-violet-500",
          isOpen && "border-violet-500/80 ring-1 ring-violet-500/40 bg-[#121217]",
          disabled && "cursor-not-allowed opacity-50 bg-zinc-950",
        )}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption ? (
            <>
              <span className="truncate font-medium text-zinc-100">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0",
                    getBadgeStyle(selectedOption.badgeVariant),
                  )}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-zinc-500 truncate">{placeholder}</span>
          )}
        </div>

        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ml-2",
            isOpen && "rotate-180 text-violet-400",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className={cn(
            "absolute z-50 mt-1.5 w-full min-w-full sm:min-w-[280px] rounded-xl border border-zinc-800 bg-[#0e0e12] p-1.5 shadow-2xl shadow-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 overflow-hidden",
            dropdownClassName,
          )}
        >
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent flex flex-col gap-0.5">
            {resolvedOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500">No options available</div>
            ) : (
              resolvedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange?.(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer w-full",
                      isSelected
                        ? "bg-violet-600/20 text-violet-200 font-semibold border border-violet-500/30"
                        : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white",
                      opt.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-zinc-500",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0",
                            getBadgeStyle(opt.badgeVariant),
                          )}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-violet-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
