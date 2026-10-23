"use client";

import * as React from "react";
import { CustomSelect, CustomSelectOption } from "./CustomSelect";

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string | number | readonly string[];
  onChange?: (e: any) => void;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  options?: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

function Select({
  id,
  name,
  value = "",
  onChange,
  onValueChange,
  children,
  options,
  placeholder,
  disabled,
  className,
  dropdownClassName,
}: SelectProps) {
  const strValue = String(value ?? "");

  const handleChange = (newVal: string) => {
    if (onValueChange) {
      onValueChange(newVal);
    }
    if (onChange) {
      // Create synthetic event for compatibility with standard React event handlers (e.target.value)
      const syntheticEvent = {
        target: { value: newVal, name: name || id || "" },
        currentTarget: { value: newVal, name: name || id || "" },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      (onChange as any)(syntheticEvent);
    }
  };

  return (
    <CustomSelect
      id={id}
      name={name}
      value={strValue}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      dropdownClassName={dropdownClassName}
    >
      {children}
    </CustomSelect>
  );
}

export { Select };
