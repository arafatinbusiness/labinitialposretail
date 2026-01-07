import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
}

const Input: React.FC<InputProps> = ({ label, className = '', id, ...props }) => {
  // Generate an id if not provided
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : `input-${Math.random().toString(36).substr(2, 9)}`);
  
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input 
        id={inputId}
        className={`px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-400 ${className}`} 
        {...props} 
      />
    </div>
  );
};

export default Input;
