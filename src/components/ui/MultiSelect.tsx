import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

export interface SelectOption {
  id: string | number;
  label: string;
}

interface MultiSelectProps {
  options: SelectOption[];
  selected: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  allowCreate = false,
}: MultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(
    (o) =>
      !selected.includes(o.id) &&
      o.label.toLowerCase().includes(query.toLowerCase())
  );

  const canCreate =
    allowCreate &&
    query.trim() !== '' &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) &&
    !selected.includes(query.trim());

  const showDropdown = open && (filtered.length > 0 || canCreate);

  const remove = (id: string | number) => onChange(selected.filter((s) => s !== id));

  const add = (id: string | number) => {
    onChange([...selected, id]);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      remove(selected[selected.length - 1]);
    } else if (e.key === 'Enter' && canCreate) {
      e.preventDefault();
      add(query.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const selectedLabels = selected.map((id) => {
    const opt = options.find((o) => o.id === id);
    return { id, label: opt?.label ?? String(id) };
  });

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`min-h-[40px] w-full px-2 py-1.5 border rounded-lg flex flex-wrap gap-1.5 items-center cursor-text transition-colors ${
          open
            ? 'border-indigo-400 ring-2 ring-indigo-500/20'
            : 'border-gray-300 dark:border-gray-600'
        } bg-white dark:bg-gray-700`}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selectedLabels.map(({ id, label }) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
          >
            {label}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(id);
              }}
              className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(option.id);
              }}
              className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              {option.label}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(query.trim());
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 transition-colors ${
                filtered.length > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''
              }`}
            >
              <Plus size={13} />
              Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
