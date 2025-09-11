
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, className = '', labelClassName = '', ...props }) => {
  const baseInputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const baseLabelClasses = "block text-sm font-medium text-gray-700 mb-1";
  
  return (
    <div>
      <label htmlFor={id} className={`${baseLabelClasses} ${labelClassName}`}>
        {label}
      </label>
      <input
        id={id}
        className={`${baseInputClasses} ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;