'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarDays, Check } from 'lucide-react';

export const ALL_DAYS = [
  { key: 'SATURDAY', label: 'Sat', full: 'Saturday' },
  { key: 'SUNDAY', label: 'Sun', full: 'Sunday' },
  { key: 'MONDAY', label: 'Mon', full: 'Monday' },
  { key: 'TUESDAY', label: 'Tue', full: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wed', full: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thu', full: 'Thursday' },
  { key: 'FRIDAY', label: 'Fri', full: 'Friday' },
] as const;

export const DAY_PRESETS = [
  { label: 'Sat - Mon - Wed', days: ['SATURDAY', 'MONDAY', 'WEDNESDAY'] },
  { label: 'Sun - Tue - Thu', days: ['SUNDAY', 'TUESDAY', 'THURSDAY'] },
  { label: 'Fri - Sat (Weekend)', days: ['FRIDAY', 'SATURDAY'] },
  { label: 'All Days', days: ALL_DAYS.map((d) => d.key) },
];

export const TIME_PRESETS = [
  '09:00 AM - 10:30 AM',
  '10:30 AM - 12:00 PM',
  '02:00 PM - 03:30 PM',
  '03:30 PM - 05:00 PM',
  '05:00 PM - 06:30 PM',
  '06:30 PM - 08:00 PM',
];

interface ClassScheduleSelectorProps {
  selectedDays: string[];
  onChangeDays: (days: string[]) => void;
  selectedTime: string;
  onChangeTime: (time: string) => void;
}

export function ClassScheduleSelector({
  selectedDays,
  onChangeDays,
  selectedTime,
  onChangeTime,
}: ClassScheduleSelectorProps) {
  const toggleDay = (dayKey: string) => {
    if (selectedDays.includes(dayKey)) {
      onChangeDays(selectedDays.filter((d) => d !== dayKey));
    } else {
      onChangeDays([...selectedDays, dayKey]);
    }
  };

  const isPresetActive = (presetDays: string[]) => {
    if (selectedDays.length !== presetDays.length) return false;
    return presetDays.every((d) => selectedDays.includes(d));
  };

  const getFormattedScheduleSummary = () => {
    if (selectedDays.length === 0 && !selectedTime) return 'No schedule assigned';
    const dayLabels = ALL_DAYS.filter((d) => selectedDays.includes(d.key))
      .map((d) => d.label)
      .join(', ');
    return `${dayLabels || 'Any day'} ${selectedTime ? `• ${selectedTime}` : ''}`;
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      {/* Schedule Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Class Schedule</span>
        </div>
        <Badge variant={selectedDays.length > 0 || selectedTime ? 'default' : 'outline'} className="text-xs">
          {getFormattedScheduleSummary()}
        </Badge>
      </div>

      {/* 1. Class Days Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Class Days
          </Label>
          {selectedDays.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeDays([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Days
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5">
          {DAY_PRESETS.map((preset) => {
            const active = isPresetActive(preset.days);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChangeDays(preset.days)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background border hover:bg-muted text-muted-foreground'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Individual Day Buttons */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {ALL_DAYS.map((d) => {
            const isSelected = selectedDays.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => toggleDay(d.key)}
                className={`flex flex-col items-center justify-center rounded-md py-2 px-1 text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary'
                    : 'border-input bg-background hover:bg-muted/60 text-muted-foreground'
                }`}
              >
                <span>{d.label}</span>
                {isSelected && <Check className="mt-0.5 h-3 w-3 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Class Time Selection */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Class Time Slot
          </Label>
          {selectedTime && (
            <button
              type="button"
              onClick={() => onChangeTime('')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Time
            </button>
          )}
        </div>

        {/* Quick Time Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {TIME_PRESETS.map((t) => {
            const isSelected = selectedTime === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChangeTime(t)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium text-center transition-all border ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-input bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Custom Time Input */}
        <div className="pt-1">
          <input
            type="text"
            placeholder="Or enter custom time (e.g. 09:00 AM - 10:30 AM)"
            value={selectedTime}
            onChange={(e) => onChangeTime(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>
    </div>
  );
}
