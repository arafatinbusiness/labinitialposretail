import React from 'react';

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success' }> = ({ 
  className = '', 
  variant = 'primary', 
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700"
  };

  return <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />;
};

export default Button;