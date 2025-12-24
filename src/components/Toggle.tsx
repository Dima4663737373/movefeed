import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex flex-col">
                {label && <span className="text-[var(--text-primary)] font-medium">{label}</span>}
                {description && <span className="text-xs text-[var(--text-secondary)]">{description}</span>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 
                    focus-visible:ring-[var(--accent)] focus-visible:ring-opacity-75
                    ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'}
                `}
            >
                <span className="sr-only">{label || 'Toggle'}</span>
                <span
                    aria-hidden="true"
                    className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 
                        transition duration-200 ease-in-out
                        ${checked ? 'translate-x-5' : 'translate-x-0'}
                    `}
                />
            </button>
        </div>
    );
}
