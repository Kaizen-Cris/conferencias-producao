import { useState, useEffect, useCallback } from 'react';

interface MaskedDateInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function MaskedDateInput({
  value,
  onChange,
  label = '',
  placeholder = 'dd/mm/aaaa',
  className = '',
  disabled = false,
  required = false,
}: MaskedDateInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [hasFocus, setHasFocus] = useState(false);

  // Initialize input value from date prop
  useEffect(() => {
    if (value) {
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = value.getFullYear();
      setInputValue(`${day}/${month}/${year}`);
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    let value = target.value;

    // Remove all non-digits
    let numbers = value.replace(/\D/g, '');

    // Limit to 8 digits (ddmmyyyy)
    numbers = numbers.slice(0, 8);

    // Smart year handling: if we have exactly 4 digits (ddmm), assume current year
    if (numbers.length === 4) {
      const currentYear = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year
      // Check if the 4 digits could be a reasonable day/month
      const day = parseInt(numbers.slice(0, 2));
      const month = parseInt(numbers.slice(2, 4));

      // If day is 1-31 and month is 1-12, treat as ddmm and append current year
      if ((day >= 1 && day <= 31) && (month >= 1 && month <= 12)) {
        numbers = numbers + currentYear;
      }
    }

    // Format with slashes as we type
    let formatted = '';
    if (numbers.length > 0) {
      formatted += numbers.slice(0, 2);
    }
    if (numbers.length > 2) {
      formatted += '/' + numbers.slice(2, 4);
    }
    if (numbers.length > 4) {
      formatted += '/' + numbers.slice(4, 8);
    }

    setInputValue(formatted);

    // Update state with actual Date object if we have a complete date
    if (numbers.length === 8) {
      const day = parseInt(numbers.slice(0, 2));
      const month = parseInt(numbers.slice(2, 4)) - 1; // Month is 0-indexed
      const year = parseInt(numbers.slice(4, 8));

      // Validate date
      const date = new Date(year, month, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        onChange(date);
      } else {
        onChange(null);
      }
    } else {
      // Not enough digits for a complete date
      onChange(null);
    }
  }, [onChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocus(false);
    // If we have a partial date that looks like ddmm, auto-complete with current year
    const numbers = inputValue.replace(/\D/g, '');
    if (numbers.length === 4 && !disabled) {
      const day = parseInt(numbers.slice(0, 2));
      const month = parseInt(numbers.slice(2, 4));

      if ((day >= 1 && day <= 31) && (month >= 1 && month <= 12)) {
        const currentYear = new Date().getFullYear();
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        const newValue = `${dayStr}/${monthStr}/${currentYear}`;
        setInputValue(newValue);

        const date = new Date(currentYear, month - 1, day);
        onChange(date);
      }
    }
  }, [inputValue, disabled, onChange]);

  const handleFocus = useCallback(() => {
    setHasFocus(true);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: '14px', fontWeight: '500' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={`input w-full ${className} ${hasFocus ? 'focus:border-blue-500' : ''}`}
        disabled={disabled}
        maxLength={10}
        style={{
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '16px',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}