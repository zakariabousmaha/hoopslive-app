import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CalendarWidgetProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, onSelectDate, onClose }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  // Sync view if selectedDate changes externally
  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const getDaysArray = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 0 = Sunday, 1 = Monday, etc.
    const startDayOfWeek = firstDayOfMonth.getDay(); 
    
    const days = [];
    
    // Add empty slots for days before start of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysArray();
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
            onClick={() => changeMonth(-1)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
        >
            <ChevronLeft size={20} />
        </button>
        <div className="font-bold text-slate-200">
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button 
            onClick={() => changeMonth(1)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
        >
            <ChevronRight size={20} />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-bold text-slate-500 py-1">
                {day}
            </div>
        ))}
        {days.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} />;
            
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentDay = isToday(date);

            return (
                <button
                    key={index}
                    onClick={() => {
                        onSelectDate(date);
                        onClose();
                    }}
                    className={`
                        h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                        ${isSelected ? 'bg-hoops-orange text-white shadow-lg shadow-orange-900/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                        ${!isSelected && isCurrentDay ? 'border border-hoops-orange text-hoops-orange' : ''}
                    `}
                >
                    {date.getDate()}
                </button>
            );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-2">
         <button 
            onClick={() => {
                const today = new Date();
                onSelectDate(today);
                onClose();
            }}
            className="text-xs font-bold text-hoops-orange hover:text-white transition-colors"
         >
            Today
         </button>
         <button 
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300"
         >
            Close
         </button>
      </div>
    </div>
  );
};