'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useCalendarStore } from '@/stores/calendar-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarEvent } from '@/lib/jmap/types';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  event: CalendarEvent | null;
}

export function CalendarView() {
  const t = useTranslations();
  const router = useRouter();
  const { client } = useAuthStore();
  const {
    calendars,
    events,
    selectedCalendarIds,
    visibleEvents,
    viewMode,
    selectedDate,
    isLoading,
    error,
    selectEvent,
    setViewMode,
    setSelectedDate,
    toggleCalendarVisibility,
    setSelectedCalendars,
    updateVisibleEvents,
    createEvent,
    deleteEvent,
    createCalendar,
    clearError,
  } = useCalendarStore();

  const [showEventForm, setShowEventForm] = useState(false);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    event: null,
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    calendarId: '',
  });
  const [calendarFormData, setCalendarFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Ensure selectedDate is always a Date object (handle persistence string serialization)
  const normalizedSelectedDate = React.useMemo(() => {
    return selectedDate instanceof Date ? selectedDate : new Date(selectedDate as string);
  }, [selectedDate]);

  // Initialize selected calendars on mount and sync events
  useEffect(() => {
    if (calendars.length > 0) {
      if (selectedCalendarIds.size === 0) {
        // First time: select all calendars
        setSelectedCalendars(calendars.map((c) => c.id));
      } else {
        // Update visible events whenever calendars or events change
        updateVisibleEvents();
      }
    }
  }, [calendars, selectedCalendarIds, setSelectedCalendars, updateVisibleEvents]);

  // Ensure visible events are updated when events change
  useEffect(() => {
    if (events.length > 0) {
      updateVisibleEvents();
    }
  }, [events, updateVisibleEvents]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu({ ...contextMenu, isOpen: false });
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            setShowEventForm(true);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            handlePreviousPeriod();
            break;
          case 'ArrowRight':
            e.preventDefault();
            handleNextPeriod();
            break;
        }
      }
      if (e.key === 'Escape') {
        setShowEventForm(false);
        setContextMenu({ ...contextMenu, isOpen: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, normalizedSelectedDate]);

  const handlePreviousPeriod = () => {
    const prev = new Date(normalizedSelectedDate);
    if (viewMode === 'month') {
      prev.setMonth(prev.getMonth() - 1);
    } else if (viewMode === 'week') {
      prev.setDate(prev.getDate() - 7);
    } else if (viewMode === 'day') {
      prev.setDate(prev.getDate() - 1);
    }
    setSelectedDate(prev);
  };

  const handleNextPeriod = () => {
    const next = new Date(normalizedSelectedDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    }
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleCreateEvent = async () => {
    if (!formData.title.trim() || !formData.calendarId) return;

    try {
      await createEvent(client!, {
        calendarId: formData.calendarId,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        startTime: formData.startTime || new Date().toISOString(),
        endTime:
          formData.endTime ||
          new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      setFormData({
        title: '',
        description: '',
        location: '',
        startTime: '',
        endTime: '',
        calendarId: '',
      });
      setShowEventForm(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm(t('calendar.confirm_delete_event'))) return;
    try {
      await deleteEvent(client!, eventId);
      setContextMenu({ ...contextMenu, isOpen: false });
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleCreateCalendar = async () => {
    if (!calendarFormData.name.trim()) return;

    try {
      await createCalendar(client!, {
        name: calendarFormData.name,
        description: calendarFormData.description,
        color: calendarFormData.color,
      });

      setCalendarFormData({
        name: '',
        description: '',
        color: '#3b82f6',
      });
      setShowCalendarForm(false);
    } catch (error) {
      console.error('Failed to create calendar:', error);
    }
  };

  const handleEventContextMenu = (
    e: React.MouseEvent,
    event: CalendarEvent
  ) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      event,
    });
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return visibleEvents.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return eventStart <= endOfDay && eventEnd >= startOfDay;
    });
  };

  const getWeekDates = (date: Date): Date[] => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const startOfWeek = new Date(d.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const getWeekRange = (): string => {
    const weekDates = getWeekDates(normalizedSelectedDate);
    const start = weekDates[0];
    const end = weekDates[6];
    const startStr = start.toLocaleDateString('default', {
      month: 'short',
      day: 'numeric',
    });
    const endStr = end.toLocaleDateString('default', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  };

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString('default', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('default', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = (date: Date | string): boolean => {
    const today = new Date();
    const checkDate = date instanceof Date ? date : new Date(date);
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    );
  };

  const renderMonthView = () => {
    const date = normalizedSelectedDate;
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 gap-px bg-border flex-shrink-0">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground bg-muted/50 p-1 md:p-2"
            >
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{day.substring(0, 1)}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 gap-px bg-border p-px min-h-0">
          {days.map((day, index) => {
            const dayEvents = day ? getEventsForDate(day) : [];
            const isCurrentDay = day && isToday(day);

            return (
              <div
                key={index}
                onClick={() => day && setSelectedDate(day)}
                className={`p-1 md:p-1.5 transition-colors cursor-pointer overflow-hidden flex flex-col text-xs ${
                  day
                    ? isCurrentDay
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-card border border-border hover:bg-muted'
                    : 'bg-muted/50 border border-transparent'
                }`}
              >
                {day && (
                  <>
                    <div
                      className={`text-xs font-semibold ${
                        isCurrentDay ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="text-xs text-muted-foreground md:hidden">
                        {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                      </div>
                    )}
                    <div className="flex-1 space-y-0.5 min-h-0 overflow-hidden text-xs hidden md:block">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectEvent(event.id);
                          }}
                          onContextMenu={(e) => handleEventContextMenu(e, event)}
                          className="bg-primary/20 text-primary px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary/30 line-clamp-1 text-xs"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-muted-foreground px-1 line-clamp-1 text-xs">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(normalizedSelectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const slotHeightClass = 'h-8 md:h-12';

    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Time column */}
          <div className="w-12 md:w-16 border-r border-border bg-muted/50 flex-shrink-0 overflow-y-auto">
            <div className={`${slotHeightClass} flex-shrink-0`} />
            {hours.map((hour) => (
              <div
                key={hour}
                className={`${slotHeightClass} border-b border-border/30 text-xs text-muted-foreground text-center flex-shrink-0 flex items-center justify-center`}
              >
                <span className="hidden md:inline text-xs">{hour.toString().padStart(2, '0')}:00</span>
                <span className="md:hidden text-xs">{hour}</span>
              </div>
            ))}
          </div>

          {/* Days columns */}
          <div className="flex-1 flex overflow-x-auto">
            {weekDates.map((date) => {
              const dayEvents = getEventsForDate(date);
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`flex-1 border-r border-border min-w-[50px] md:min-w-[120px] ${
                    isCurrentDay ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Day header */}
                  <div
                    className={`${slotHeightClass} md:h-12 border-b border-border p-0.5 md:p-1 text-center flex-shrink-0 flex items-center justify-center ${
                      isCurrentDay ? 'bg-primary/10' : 'bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-muted-foreground hidden sm:block">
                      {date.toLocaleDateString('default', { weekday: 'short' })}
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground sm:hidden">
                      {date.toLocaleDateString('default', { weekday: 'short' }).substring(0, 1)}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        isCurrentDay ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="relative">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className={`${slotHeightClass} border-b border-border/30 hover:bg-muted/50 transition-colors cursor-pointer flex-shrink-0`}
                        onClick={() => {
                          const newDate = new Date(date);
                          newDate.setHours(hour, 0, 0, 0);
                          setFormData({
                            ...formData,
                            startTime: newDate.toISOString(),
                            endTime: new Date(
                              newDate.getTime() + 60 * 60 * 1000
                            ).toISOString(),
                          });
                          setShowEventForm(true);
                        }}
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const startHour = new Date(event.startTime).getHours();
                      const startMinute = new Date(event.startTime).getMinutes();
                      const duration =
                        (new Date(event.endTime).getTime() -
                          new Date(event.startTime).getTime()) /
                        (1000 * 60);
                      const slotHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? 32 : 48;
                      const top = startHour * slotHeight + (startMinute / 60) * slotHeight;
                      const height = Math.max(24, (duration / 60) * slotHeight);

                      return (
                        <div
                          key={event.id}
                          className="absolute left-0.5 right-0.5 bg-primary/20 border border-primary rounded p-0.5 text-xs cursor-pointer hover:bg-primary/30 overflow-hidden line-clamp-2"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                          }}
                          onClick={() => selectEvent(event.id)}
                          onContextMenu={(e) => handleEventContextMenu(e, event)}
                        >
                          <div className="font-semibold truncate text-xs">
                            {event.title}
                          </div>
                          <div className="text-muted-foreground text-xs hidden sm:block">
                            {formatTime(event.startTime)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(normalizedSelectedDate);
    const isCurrentDay = isToday(normalizedSelectedDate);
    const slotHeightClass = 'h-8 md:h-12';

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Day header */}
        <div
          className={`px-3 md:px-4 py-2 border-b border-border flex-shrink-0 ${
            isCurrentDay ? 'bg-primary/10' : 'bg-card'
          }`}
        >
          <h2 className="text-base md:text-lg font-bold text-foreground">
            {normalizedSelectedDate.toLocaleDateString('default', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
        </div>

        {/* Time slots */}
        <div className="flex flex-1 min-h-0">
          {/* Time column */}
          <div className="w-12 md:w-16 border-r border-border bg-muted/50 flex-shrink-0 overflow-y-auto">
            {hours.map((hour) => (
              <div
                key={hour}
                className={`${slotHeightClass} border-b border-border/30 text-xs text-muted-foreground text-center flex-shrink-0 flex items-center justify-center`}
              >
                <span className="hidden md:inline text-xs">{hour.toString().padStart(2, '0')}:00</span>
                <span className="md:hidden text-xs">{hour}</span>
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="flex-1 relative overflow-y-auto">
            {hours.map((hour) => (
              <div
                key={hour}
                className={`${slotHeightClass} border-b border-border/30 hover:bg-muted/50 transition-colors cursor-pointer flex-shrink-0`}
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setHours(hour, 0, 0, 0);
                  setFormData({
                    ...formData,
                    startTime: newDate.toISOString(),
                    endTime: new Date(
                      newDate.getTime() + 60 * 60 * 1000
                    ).toISOString(),
                  });
                  setShowEventForm(true);
                }}
              />
            ))}

            {/* Events */}
            {dayEvents.map((event) => {
              const startHour = new Date(event.startTime).getHours();
              const startMinute = new Date(event.startTime).getMinutes();
              const duration =
                (new Date(event.endTime).getTime() -
                  new Date(event.startTime).getTime()) /
                (1000 * 60);
              const slotHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? 32 : 48;
              const top = startHour * slotHeight + (startMinute / 60) * slotHeight;
              const height = Math.max(24, (duration / 60) * slotHeight);

              return (
                <div
                  key={event.id}
                  className="absolute left-1 md:left-2 right-1 md:right-2 bg-primary/20 border border-primary rounded p-0.5 md:p-1 text-xs cursor-pointer hover:bg-primary/30 overflow-hidden"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                  }}
                  onClick={() => selectEvent(event.id)}
                  onContextMenu={(e) => handleEventContextMenu(e, event)}
                >
                  <div className="font-semibold truncate">{event.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(event.startTime)} -{' '}
                    {formatTime(event.endTime)}
                  </div>
                  {event.location && (
                    <div className="text-xs text-muted-foreground truncate">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {event.location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const sortedEvents = [...visibleEvents].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-2">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {t('calendar.no_events')}
              </p>
            </div>
          ) : (
            sortedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-card border border-border rounded p-3 hover:shadow-md transition-shadow cursor-pointer text-sm"
                onClick={() => selectEvent(event.id)}
                onContextMenu={(e) => handleEventContextMenu(e, event)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 truncate">
                      {event.title}
                    </h3>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {formatDate(event.startTime)} {formatTime(event.startTime)} -{' '}
                          {formatTime(event.endTime)}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {event.description && (
                        <div className="mt-1 text-foreground line-clamp-2">
                          {event.description}
                        </div>
                      )}
                      {event.participants && event.participants.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {event.participants.length} participant
                            {event.participants.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{
                      backgroundColor:
                        calendars.find((c) => c.id === event.calendarId)
                          ?.color || '#3b82f6',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const titleText = (() => {
    const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
    if (viewMode === 'month') {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      return getWeekRange();
    } else if (viewMode === 'day') {
      return date.toLocaleDateString('default', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
    return 'Agenda';
  })();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'w-full md:w-64' : 'hidden md:flex md:w-64'
      } border-b md:border-b-0 md:border-r border-border flex flex-col overflow-hidden absolute md:relative top-0 left-0 right-0 bottom-0 md:bottom-auto z-40 md:z-auto bg-background`}>
        {/* Close button for mobile */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{t('calendar.my_calendars')}</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-foreground hover:text-muted-foreground"
          >
            ✕
          </button>
        </div>
        
        {/* Calendar List */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 hidden md:block">
            {t('calendar.my_calendars')}
          </h3>

          {calendars.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('calendar.no_calendars')}
            </p>
          ) : (
            <div className="space-y-2">
              {calendars.map((calendar) => (
                <label
                  key={calendar.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors cursor-pointer"
                  title={calendar.isReadOnly ? 'Read-only calendar' : ''}
                >
                  <input
                    type="checkbox"
                    checked={selectedCalendarIds.has(calendar.id)}
                    onChange={() => toggleCalendarVisibility(calendar.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: calendar.color || '#3b82f6' }}
                  />
                  <span className="text-sm text-foreground truncate flex-1">
                    {calendar.name}
                  </span>
                  {calendar.isReadOnly && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      🔒
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Buttons */}
        <div className="p-4 border-b border-border space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            {t('calendar.view')}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
            {(['month', 'week', 'day', 'agenda'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode(mode);
                  setSidebarOpen(false); // Close sidebar on view selection on mobile
                }}
                className="text-xs"
              >
                {t(`calendar.${mode}_view`)}
              </Button>
            ))}
          </div>
        </div>

        {/* Today Button */}
        <div className="p-4 space-y-2">
          <Button
            onClick={handleToday}
            variant="outline"
            className="w-full text-sm"
          >
            {t('calendar.today')}
          </Button>
          <Button
            onClick={() => setShowCalendarForm(true)}
            variant="outline"
            className="w-full text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('calendar.new_calendar')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center justify-between p-1.5 bg-muted/50 border-b border-border gap-1 flex-wrap flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-muted rounded flex-shrink-0"
            title="Toggle calendar menu"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <h2 className="text-xs font-semibold text-foreground flex-1 min-w-0 truncate text-center">{titleText}</h2>
          
          {/* Mobile Navigation Buttons */}
          <div className="flex gap-0 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousPeriod}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-7 px-1 text-xs"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPeriod}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="h-7 px-1.5 text-xs flex-shrink-0"
            title={t('calendar.back_to_email')}
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Button>
        </div>
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border-b border-destructive/20 p-3 flex items-center gap-2">
            <span className="text-sm text-destructive flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-xs text-destructive hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <div className="hidden md:flex border-b border-border px-4 py-2 items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="h-8 px-2"
              title={t('calendar.back_to_email')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('calendar.back_to_email')}
            </Button>
            <h1 className="text-lg font-bold text-foreground">{titleText}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPeriod}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 px-2"
            >
              {t('calendar.today')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPeriod}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              onClick={() => setShowEventForm(true)}
              size="sm"
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('calendar.new_event')}
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 overflow-hidden min-h-0">
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'agenda' && renderAgendaView()}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.event && (
        <div
          ref={contextMenuRef}
          className="fixed bg-card border border-border rounded-lg shadow-lg z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={() => {
              setEditingEvent(contextMenu.event);
              setShowEventForm(true);
              setContextMenu({ ...contextMenu, isOpen: false });
            }}
            className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2 border-b border-border"
          >
            <Edit2 className="w-4 h-4" />
            {t('common.edit')}
          </button>
          <button
            onClick={() => handleDeleteEvent(contextMenu.event!.id)}
            className="w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                {editingEvent
                  ? t('calendar.edit_event')
                  : t('calendar.new_event')}
              </h2>

              <input
                type="text"
                placeholder={t('calendar.event_title_placeholder')}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />

              <textarea
                placeholder={t('calendar.event_description_placeholder')}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                rows={3}
              />

              <input
                type="text"
                placeholder={t('calendar.event_location_placeholder')}
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              {calendars.length > 0 && (
                <select
                  value={formData.calendarId}
                  onChange={(e) =>
                    setFormData({ ...formData, calendarId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="">{t('calendar.select_calendar')}</option>
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-2 pt-4 flex-col md:flex-row">
                <Button
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                    setFormData({
                      title: '',
                      description: '',
                      location: '',
                      startTime: '',
                      endTime: '',
                      calendarId: '',
                    });
                  }}
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={!formData.title.trim() || !formData.calendarId}
                  className="flex-1"
                >
                  {editingEvent
                    ? t('calendar.update_event')
                    : t('calendar.create_event')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Form Modal */}
      {showCalendarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                {t('calendar.new_calendar')}
              </h2>

              <input
                type="text"
                placeholder={t('calendar.calendar_name_placeholder')}
                value={calendarFormData.name}
                onChange={(e) =>
                  setCalendarFormData({ ...calendarFormData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />

              <textarea
                placeholder={t('calendar.calendar_description_placeholder')}
                value={calendarFormData.description}
                onChange={(e) =>
                  setCalendarFormData({ ...calendarFormData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                rows={3}
              />

              <div className="flex items-center gap-2">
                <label className="text-sm text-foreground">
                  {t('calendar.calendar_color')}
                </label>
                <input
                  type="color"
                  value={calendarFormData.color}
                  onChange={(e) =>
                    setCalendarFormData({ ...calendarFormData, color: e.target.value })
                  }
                  className="w-12 h-10 rounded cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-4 flex-col md:flex-row">
                <Button
                  onClick={() => {
                    setShowCalendarForm(false);
                    setCalendarFormData({
                      name: '',
                      description: '',
                      color: '#3b82f6',
                    });
                  }}
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreateCalendar}
                  disabled={!calendarFormData.name.trim()}
                  className="flex-1 text-sm"
                >
                  {t('calendar.create_calendar')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
