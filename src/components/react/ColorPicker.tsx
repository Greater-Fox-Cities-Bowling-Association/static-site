import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export default function ColorPicker({
  value,
  onChange,
  label,
  required,
  error,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handlePickerChange = (color: string) => {
    setLocalValue(color);
    onChange(color);
  };

  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(localValue);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex gap-2 relative">
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="h-10 w-14 rounded border border-gray-300 cursor-pointer overflow-hidden hover:border-gray-400 transition-colors"
            style={{
              backgroundColor: isValidColor ? localValue : "#ffffff",
            }}
            title="Open color picker"
          >
            {!isValidColor && (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                ?
              </div>
            )}
          </button>

          {isOpen && (
            <div
              className="absolute top-12 left-0 z-50 p-3 bg-white rounded-lg shadow-xl border border-gray-200"
              style={{ minWidth: "220px" }}
            >
              <HexColorPicker
                color={localValue}
                onChange={handlePickerChange}
              />
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: localValue }}
                  ></div>
                  <input
                    type="text"
                    value={localValue}
                    onChange={handleTextChange}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          type="text"
          value={localValue}
          onChange={handleTextChange}
          className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="#000000"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
