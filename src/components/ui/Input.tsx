import React from 'react';

interface InputProps {
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    id?: string; // Added id prop
    required?: boolean; // Added required prop
    className?: string; // Added className to allow for custom styling
}

const Input: React.FC<InputProps> = ({ placeholder, value, onChange, type = 'text', id, required, className }) => {
    const baseClasses = "border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            id={id} // Pass id to input element
            required={required} // Pass required to input element
            className={`${baseClasses} ${className || ''}`} // Combine base classes with custom ones
        />
    );
};

export default Input;