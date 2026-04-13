import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  style?: React.CSSProperties;
}

export default function DatePickerInput({
  value,
  onChange,
  label = '',
  placeholder = 'dd/mm/aaaa',
  className = '',
  disabled = false,
  required = false,
  minDate,
  maxDate,
  style,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [tempDateStr, setTempDateStr] = useState('');
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const dateStr = `${value.getDate().toString().padStart(2, '0')}/${(value.getMonth() + 1).toString().padStart(2, '0')}/${value.getFullYear()}`;
      setTempDateStr(dateStr);
      setViewDate(value);
    } else {
      setTempDateStr('');
    }
  }, [value]);

  const handleChange = (date: Date | null) => {
    onChange(date);
    if (date) {
      const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      setTempDateStr(dateStr);
    } else {
      setTempDateStr('');
    }
    setOpen(false);
  };

  const handleInputChange = (inputValue: string) => {
    const onlyDigits = inputValue.replace(/\D/g, '');
    const truncated = onlyDigits.slice(0, 8);
    
    let formatted = '';
    if (truncated.length > 0) {
      formatted += truncated.slice(0, 2);
    }
    if (truncated.length > 2) {
      formatted += '/' + truncated.slice(2, 4);
    }
    if (truncated.length > 4) {
      formatted += '/' + truncated.slice(4, 8);
    }
    
    setTempDateStr(formatted);
    
    if (truncated.length === 8) {
      const day = parseInt(truncated.slice(0, 2), 10);
      const month = parseInt(truncated.slice(2, 4), 10) - 1;
      const year = parseInt(truncated.slice(4, 8), 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
          day >= 1 && day <= 31 && 
          month >= 0 && month <= 11 && 
          year >= 1000 && year <= 9999) {
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          onChange(date);
          setViewDate(date);
        }
      }
    } else if (truncated.length >= 4) {
      const month = parseInt(truncated.slice(2, 4), 10) - 1;
      if (!isNaN(month) && month >= 0 && month <= 11) {
        const baseYear = truncated.length >= 6 ? parseInt(truncated.slice(4, 6), 10) + 2000 : new Date().getFullYear();
        const newDate = new Date(baseYear, month, 1);
        setViewDate(newDate);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: '14px', fontWeight: '500' }}>
          {label}{required && ' *'}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={tempDateStr}
          onClick={() => setOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={`input w-full ${className}`}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            ...style,
          }}
          disabled={disabled}
        />
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, marginTop: 4 }}>
            <DatePicker
              selected={value}
              onChange={handleChange}
              onClickOutside={() => setOpen(false)}
              dateFormat="dd/MM/yyyy"
              minDate={minDate}
              maxDate={maxDate}
              showTimeSelect={false}
              openToDate={viewDate}
              inline
            />
          </div>
        )}
      </div>
    </div>
  );
}