'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useT } from '@/i18n/IntlProvider';

export type SearchSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

type SearchSelectProps = {
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  value?: string | number | null;
  defaultValue?: string | number | null;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children?: React.ReactNode;
  options?: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  loading?: boolean;
  error?: string | null;
};

function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function collectOptions(children: React.ReactNode, group?: string): SearchSelectOption[] {
  const options: SearchSelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      options.push(...collectOptions((child.props as { children?: React.ReactNode }).children, group));
      return;
    }
    if (child.type === 'optgroup') {
      const props = child.props as { label?: string; children?: React.ReactNode };
      options.push(...collectOptions(props.children, props.label ? String(props.label) : group));
      return;
    }
    if (child.type !== 'option') return;
    const props = child.props as { value?: string | number; disabled?: boolean; children?: React.ReactNode };
    const label = nodeText(props.children).trim();
    const value = props.value == null ? label : String(props.value);
    options.push({
      value,
      label: label || value,
      disabled: Boolean(props.disabled),
      group,
    });
  });
  return options;
}

function safeOptions(options: SearchSelectOption[] | undefined, children: React.ReactNode): SearchSelectOption[] {
  if (options != null) {
    if (!Array.isArray(options)) return [];
    return options.flatMap((option) => {
      if (!option || typeof option !== 'object') return [];
      const value = option.value == null ? '' : String(option.value);
      const labelSource = option.label == null ? '' : String(option.label).trim();
      return [{
        value,
        label: labelSource || value,
        disabled: Boolean(option.disabled),
        group: option.group ? String(option.group) : undefined,
      }];
    });
  }
  try {
    return collectOptions(children);
  } catch {
    return [];
  }
}

function normalize(value: string) {
  try {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return value.toLowerCase();
  }
}

function toValue(value: string | number | null | undefined) {
  if (value == null) return '';
  return String(value);
}

export function SearchSelect({
  id,
  name,
  required,
  disabled,
  className,
  value,
  defaultValue,
  onChange,
  onBlur,
  children,
  options: optionsProp,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  loading = false,
  error,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: SearchSelectProps) {
  const t = useT();
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const listId = `${controlId}-listbox`;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [invalid, setInvalid] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState(toValue(defaultValue));
  const [box, setBox] = React.useState<{ left: number; top: number; width: number; flip: boolean; maxHeight: number } | null>(null);
  const isControlled = value !== undefined;
  const current = isControlled ? toValue(value) : uncontrolled;
  const options = safeOptions(optionsProp, children);
  const resolvedPlaceholder = placeholder ?? t('admin.common.select', { defaultValue: 'Selecteer' });
  const resolvedSearch = searchPlaceholder ?? t('admin.common.search', { defaultValue: 'Zoeken…' });
  const resolvedEmpty = emptyLabel ?? t('admin.common.noResults', { defaultValue: 'Geen resultaten' });
  const resolvedLoading = t('admin.common.loading', { defaultValue: 'Laden…' });
  const resolvedRequired = t('admin.common.chooseOption', { defaultValue: 'Kies een optie.' });

  const optionSignature = options
    .map((option) => `${option.group ?? ''}\u0002${option.value}\u0002${option.label}\u0002${option.disabled ? 1 : 0}`)
    .join('\u0001');
  const filtered = React.useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return options;
    return options.filter((option) => {
      const label = normalize(option.label);
      const optionValue = normalize(option.value);
      return label.includes(needle) || optionValue.includes(needle);
    });
    // optionSignature tracks the option values without resetting highlight on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionSignature, query]);
  const filteredRef = React.useRef(filtered);
  filteredRef.current = filtered;

  const selected = options.find((option) => option.value === current);
  const buttonLabel = selected?.label || (current ? current : '');
  const showPlaceholder = buttonLabel === '';

  const emit = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    onChange?.({
      target: { value: next },
      currentTarget: { value: next },
      preventDefault() {},
      stopPropagation() {},
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const choose = (option: SearchSelectOption) => {
    if (option.disabled || disabled) return;
    emit(option.value);
    setInvalid(false);
    close(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const list = filteredRef.current;
    const selectedIndex = list.findIndex((option) => option.value === current && !option.disabled);
    const enabledIndex = list.findIndex((option) => !option.disabled);
    setActive(!query && selectedIndex >= 0 ? selectedIndex : Math.max(enabledIndex, 0));
  }, [open, query, current, optionSignature]);

  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const flip = spaceBelow < 220 && spaceAbove > spaceBelow;
      const top = flip ? rect.top - 4 : rect.bottom + 4;
      const maxHeight = Math.max(140, Math.min(320, flip ? spaceAbove : spaceBelow));
      setBox((prev) => {
        if (
          prev
          && prev.left === left
          && prev.top === top
          && prev.width === width
          && prev.flip === flip
          && prev.maxHeight === maxHeight
        ) return prev;
        return { left, top, width, flip, maxHeight };
      });
    };
    place();
    const onScroll = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) return;
      place();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen(false);
      setQuery('');
      triggerRef.current?.focus();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const node = menuRef.current?.querySelector(`[data-index="${active}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const move = (delta: number) => {
    if (filtered.length === 0) return;
    setActive((prev) => {
      let next = prev;
      for (let step = 0; step < filtered.length; step += 1) {
        next = (next + delta + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) return next;
      }
      return prev;
    });
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const enabled = filtered.findIndex((option) => !option.disabled);
      if (enabled >= 0) setActive(enabled);
    } else if (event.key === 'End') {
      event.preventDefault();
      for (let index = filtered.length - 1; index >= 0; index -= 1) {
        if (!filtered[index]?.disabled) {
          setActive(index);
          break;
        }
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[active];
      if (option) choose(option);
    }
  };

  let lastGroup: string | undefined;
  const menu = open && box && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className="flex flex-col overflow-hidden rounded-xl border border-navy-200 bg-white shadow-elev ring-1 ring-navy-900/5"
          style={{
            position: 'fixed',
            left: box.left,
            top: box.top,
            width: box.width,
            maxHeight: box.maxHeight,
            transform: box.flip ? 'translateY(-100%)' : undefined,
            zIndex: 250,
          }}
          onKeyDown={onMenuKeyDown}
        >
          <div className="border-b border-navy-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy-400" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={filtered[active] ? `${listId}-opt-${active}` : undefined}
                value={query}
                placeholder={resolvedSearch}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg border border-navy-100 bg-sand-50/60 py-2 pl-8 pr-3 text-sm text-navy-900 outline-none placeholder:text-navy-300 focus:border-marine-400 focus:ring-2 focus:ring-marine-200"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={ariaLabel || resolvedPlaceholder}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
          >
            {loading && filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-navy-400">{resolvedLoading}</div>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-navy-400">{error || resolvedEmpty}</div>
            ) : null}
            {filtered.map((option, index) => {
              const showGroup = Boolean(option.group) && option.group !== lastGroup;
              if (option.group) lastGroup = option.group;
              const isSelected = option.value === current;
              const isActive = index === active;
              return (
                <React.Fragment key={`${option.group ?? ''}-${option.value}-${index}`}>
                  {showGroup ? (
                    <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-navy-400">
                      {option.group}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    id={`${listId}-opt-${index}`}
                    role="option"
                    data-index={index}
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={cn(
                      'flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm text-navy-800',
                      option.disabled && 'cursor-not-allowed opacity-40',
                      isActive && 'bg-sand-100',
                      isSelected && 'bg-marine-50 font-semibold text-marine-800',
                    )}
                    onMouseEnter={() => {
                      if (!option.disabled) setActive(index);
                    }}
                    onClick={() => choose(option)}
                  >
                    <span className="truncate">{option.label || resolvedPlaceholder}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative min-w-0">
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || Boolean(error) || undefined}
        title={buttonLabel || undefined}
        className={cn(
          'input-base flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60',
          (invalid || error) && 'border-rose-400 ring-2 ring-rose-100',
          className,
        )}
        onClick={() => {
          if (disabled) return;
          setOpen((isOpen) => {
            if (isOpen) {
              setQuery('');
              return false;
            }
            setQuery('');
            return true;
          });
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setQuery('');
            setOpen(true);
          }
        }}
        onBlur={onBlur}
      >
        <span className={cn('min-w-0 flex-1 truncate', showPlaceholder && 'text-navy-300')}>
          {showPlaceholder ? resolvedPlaceholder : buttonLabel}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-navy-400 transition', open && 'rotate-180')} />
      </button>
      {name || required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            triggerRef.current?.focus();
          }}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      ) : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {invalid && !error ? <p className="mt-1 text-xs text-rose-600">{resolvedRequired}</p> : null}
      {menu}
    </div>
  );
}
