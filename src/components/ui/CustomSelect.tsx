'use client';

import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroupItem {
  label: string;
  options: SelectOptionItem[];
}

export type ParsedSelectChild =
  | { type: 'option'; item: SelectOptionItem }
  | { type: 'group'; group: SelectGroupItem };

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return '';
}

function parseSelectChildren(children: React.ReactNode): {
  entries: ParsedSelectChild[];
  flatOptions: SelectOptionItem[];
} {
  const entries: ParsedSelectChild[] = [];
  const flatOptions: SelectOptionItem[] = [];

  const visit = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;

      const props = child.props as Record<string, any>;

      if (child.type === React.Fragment) {
        visit(props.children);
        return;
      }

      if (child.type === 'option') {
        const label = extractText(props.children).trim();
        const value = props.value !== undefined ? String(props.value) : label;
        const item: SelectOptionItem = {
          value,
          label,
          disabled: Boolean(props.disabled),
        };
        entries.push({ type: 'option', item });
        flatOptions.push(item);
        return;
      }

      if (child.type === 'optgroup') {
        const groupLabel = String(props.label || '');
        const groupOptions: SelectOptionItem[] = [];

        const visitGroup = (groupNodes: React.ReactNode) => {
          React.Children.forEach(groupNodes, (gChild) => {
            if (!React.isValidElement(gChild)) return;
            const gProps = gChild.props as Record<string, any>;
            if (gChild.type === React.Fragment) {
              visitGroup(gProps.children);
              return;
            }
            if (gChild.type === 'option') {
              const label = extractText(gProps.children).trim();
              const value = gProps.value !== undefined ? String(gProps.value) : label;
              const item: SelectOptionItem = {
                value,
                label,
                disabled: Boolean(gProps.disabled),
              };
              groupOptions.push(item);
              flatOptions.push(item);
            }
          });
        };

        visitGroup(props.children);
        entries.push({
          type: 'group',
          group: { label: groupLabel, options: groupOptions },
        });
      }
    });
  };

  visit(children);
  return { entries, flatOptions };
}

export interface CustomSelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: any) => void;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  variant?: 'light' | 'dark';
  children?: React.ReactNode;
  options?: SelectOptionItem[];
}

export function CustomSelect({
  id,
  name,
  value,
  defaultValue,
  onChange,
  onValueChange,
  className = '',
  disabled = false,
  required = false,
  placeholder,
  variant,
  children,
  options,
}: CustomSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const { entries, flatOptions } = React.useMemo(() => {
    if (options && options.length > 0) {
      return {
        entries: options.map((item) => ({ type: 'option' as const, item })),
        flatOptions: options,
      };
    }
    return parseSelectChildren(children);
  }, [children, options]);

  const isControlled = value !== undefined;

  const getInitialValue = () => {
    if (value !== undefined) return String(value);
    if (defaultValue !== undefined) return String(defaultValue);
    const firstEnabled = flatOptions.find((o) => !o.disabled);
    return firstEnabled ? firstEnabled.value : flatOptions[0]?.value ?? '';
  };

  const [internalValue, setInternalValue] = useState<string>(getInitialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternalValue(String(defaultValue));
    }
  }, [defaultValue, isControlled]);

  const currentValue = isControlled ? String(value) : internalValue;
  const selectedOption =
    flatOptions.find((opt) => opt.value === currentValue) ||
    (currentValue ? { value: currentValue, label: currentValue } : null) ||
    flatOptions[0] ||
    null;

  const isDark =
    variant === 'dark' ||
    (!variant &&
      (className.includes('bg-[#05080e]') ||
        className.includes('bg-[#0c1322]') ||
        className.includes('text-slate-100') ||
        className.includes('text-white')));

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow;

    const minWidth = Math.max(rect.width, 180);
    const left = Math.min(rect.left, Math.max(8, viewportWidth - minWidth - 8));

    if (openUpward) {
      setMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        width: `${minWidth}px`,
        bottom: `${viewportHeight - rect.top + 6}px`,
        maxHeight: `${Math.min(280, spaceAbove - 16)}px`,
        zIndex: 9999,
      });
    } else {
      setMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        width: `${minWidth}px`,
        top: `${rect.bottom + 6}px`,
        maxHeight: `${Math.min(280, Math.max(160, spaceBelow - 16))}px`,
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updateMenuPosition]);

  const handleSelect = (opt: SelectOptionItem) => {
    if (opt.disabled) return;
    if (!isControlled) {
      setInternalValue(opt.value);
    }
    setIsOpen(false);
    onValueChange?.(opt.value);
    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value, name: name || '' },
        currentTarget: { value: opt.value, name: name || '' },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(syntheticEvent);
    }
  };

  // Strip any legacy native-select background arrow classes from className
  const cleanedClassName = className
    .replace(/bg-\[url\([^\]]+\)\]/g, '')
    .replace(/bg-\[length:[^\]]+\]/g, '')
    .replace(/bg-\[right_[^\]]+\]/g, '')
    .replace(/\bbg-no-repeat\b/g, '')
    .replace(/\bappearance-none\b/g, '')
    .trim();

  const isPlaceholderSelected =
    !selectedOption || (selectedOption.value === '' && selectedOption.disabled);

  const displayLabel = selectedOption
    ? selectedOption.label
    : placeholder || 'Select...';

  const renderOptionButton = (opt: SelectOptionItem, keyPrefix = '') => {
    const isSelected = opt.value === currentValue;
    if (opt.disabled && opt.value === '') {
      return null;
    }

    return (
      <button
        key={`${keyPrefix}${opt.value}-${opt.label}`}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={opt.disabled}
        onClick={() => handleSelect(opt)}
        className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-3 transition-all duration-150 ${
          opt.disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer'
        } ${
          isDark
            ? isSelected
              ? 'bg-brand-pink/15 text-brand-pink font-bold'
              : 'text-slate-200 font-medium hover:bg-white/5 hover:text-white'
            : isSelected
            ? 'bg-brand-pink/8 text-brand-pink font-bold'
            : 'text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <span className="truncate">{opt.label}</span>
        {isSelected && (
          <svg
            className="w-4 h-4 shrink-0 text-brand-pink"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <>
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue}
          required={required}
        />
      )}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={`custom-select-trigger flex items-center justify-between gap-2.5 text-left select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${cleanedClassName} ${
          isOpen
            ? isDark
              ? 'border-brand-pink ring-1 ring-brand-pink/40'
              : 'border-brand-pink ring-2 ring-brand-pink/15'
            : ''
        }`}
      >
        <span
          className={`truncate ${
            isPlaceholderSelected
              ? isDark
                ? 'text-slate-500'
                : 'text-slate-400'
              : ''
          }`}
        >
          {displayLabel}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180 text-brand-pink'
              : isDark
              ? 'text-slate-400'
              : 'text-slate-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2.25"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={menuStyle}
            className={`overflow-y-auto rounded-2xl p-1.5 border transition-all animate-in fade-in zoom-in-95 duration-150 ${
              isDark
                ? 'bg-[#0c1322]/95 backdrop-blur-xl border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]'
                : 'bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)]'
            }`}
          >
            {entries.map((entry, idx) => {
              if (entry.type === 'option') {
                return renderOptionButton(entry.item, `opt-${idx}-`);
              }
              return (
                <div key={`group-${idx}-${entry.group.label}`} className="py-1">
                  <div
                    className={`px-3.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest select-none ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {entry.group.label}
                  </div>
                  {entry.group.options.map((gOpt, gIdx) =>
                    renderOptionButton(gOpt, `grp-${idx}-${gIdx}-`)
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

export default CustomSelect;
