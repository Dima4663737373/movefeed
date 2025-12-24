import { useState, useEffect } from 'react';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (date: Date) => void;
}

export default function CalendarModal({ isOpen, onClose, onSchedule }: CalendarModalProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [time, setTime] = useState("12:00");

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            // Default to next hour
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            setSelectedDate(now);
            setCurrentMonth(now);
            setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        setSelectedDate(newDate);
    };

    const handlePrevMonth = () => {
        const now = new Date();
        const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        if (prev < new Date(now.getFullYear(), now.getMonth(), 1)) return; // Prevent past months
        setCurrentMonth(prev);
    };

    const handleNextMonth = () => {
        const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        if (next.getFullYear() > 2030) return;
        setCurrentMonth(next);
    };

    const handleSchedule = () => {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduleDate = new Date(selectedDate);
        scheduleDate.setHours(hours);
        scheduleDate.setMinutes(minutes);
        
        if (scheduleDate < new Date()) {
            // Cannot schedule in past
            return;
        }

        onSchedule(scheduleDate);
        onClose();
    };

    const renderCalendar = () => {
        const days = [];
        const totalDays = daysInMonth(currentMonth);
        const startDay = firstDayOfMonth(currentMonth); // 0 = Sunday

        // Empty slots
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
        }

        // Days
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
            const isSelected = date.getDate() === selectedDate.getDate() && 
                             date.getMonth() === selectedDate.getMonth() && 
                             date.getFullYear() === selectedDate.getFullYear();
            const isToday = new Date().toDateString() === date.toDateString();
            const isPast = date < new Date(new Date().setHours(0,0,0,0));

            days.push(
                <button
                    key={i}
                    onClick={() => !isPast && handleDateClick(i)}
                    disabled={isPast}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                        ${isSelected ? 'bg-[var(--accent)] text-black font-bold' : 
                          isToday ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 
                          isPast ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-white/10'}
                    `}
                >
                    {i}
                </button>
            );
        }

        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1c1c1e] rounded-xl shadow-2xl overflow-hidden border border-gray-800 w-[320px]">
                {/* Header */}
                <div className="bg-[var(--accent)] p-4 text-black">
                    <div className="text-sm font-medium opacity-80">Schedule Message</div>
                    <div className="text-2xl font-bold">
                        {monthNames[selectedDate.getMonth()].substring(0, 3)} {selectedDate.getDate()}, {time}
                    </div>
                </div>

                {/* Calendar Controls */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4 text-white">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="font-bold">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </div>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-gray-500 font-medium">
                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-4">
                        {renderCalendar()}
                    </div>

                    {/* Time Picker */}
                    <div className="flex justify-center mb-4">
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="bg-[#2c2c2e] text-white border border-gray-700 rounded px-3 py-1 focus:border-[var(--accent)] outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-[var(--accent)] hover:bg-white/5 rounded-lg transition-colors font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSchedule}
                            className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg hover:opacity-90 transition-opacity font-bold text-sm"
                        >
                            Schedule
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}