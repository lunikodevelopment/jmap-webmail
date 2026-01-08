'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCalendarStore } from '@/stores/calendar-store';
import { AlertCircle, ArrowLeft, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarEvent } from '@/lib/jmap/types';

export default function CalendarPage() {
  const t = useTranslations();
  const router = useRouter();
  const { client, isAuthenticated } = useAuthStore();
  const {
    calendars,
    events,
    selectedCalendarId,
    selectedEventId,
    isLoading,
    error,
    viewMode,
    selectedDate,
    supportsCalendars,
    isSyncing,
    initializeSync,
    syncCalendars,
    selectCalendar,
    selectEvent,
    createEvent,
    setViewMode,
    setSelectedDate,
    getEventsForDate,
    getEventsForDateRange,
    clearError,
  } = useCalendarStore();

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventCalendarId, setNewEventCalendarId] = useState<string>('');

  // Initialize calendar sync on mount
  useEffect(() => {
    if (client && isAuthenticated) {
      console.log('Initializing calendar sync with client:', client);
      void initializeSync(client);
    }
  }, [client, isAuthenticated]);

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !newEventCalendarId) return;

    try {
      await createEvent(client!, {
        calendarId: newEventCalendarId,
        title: newEventTitle,
        description: newEventDescription,
        startTime: newEventStartTime || new Date().toISOString(),
        endTime: newEventEndTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventStartTime('');
      setNewEventEndTime('');
      setShowEventForm(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handlePreviousMonth = () => {
    const prev = new Date(selectedDate);
    prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const renderCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">{t('login.loading')}</p>
      </div>
    );
  }

  const calendarDays = renderCalendarDays();
  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todaysEvents = getEventsForDate(selectedDate);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={t('common.back') || 'Back to email'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 font-semibold">{t('calendar.title')}</h2>
        </div>

        {/* Create Event Button */}
        <div className="p-4 border-b border-border">
          <Button
            onClick={() => setShowEventForm(true)}
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('calendar.new_event')}
          </Button>
        </div>

        {/* Sync Status */}
        {supportsCalendars && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
            {isSyncing ? (
              <span>{t('calendar.syncing')}</span>
            ) : (
              <button
                onClick={() => client && syncCalendars(client)}
                className="hover:text-foreground transition-colors"
              >
                {t('calendar.sync')}
              </button>
            )}
          </div>
        )}

        {/* Calendars List */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t('calendar.my_calendars')}
          </h3>
          {calendars.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {supportsCalendars ? t('calendar.no_calendars') : t('calendar.not_supported')}
            </p>
          ) : (
            <div className="space-y-2">
              {calendars.map((calendar) => (
                <button
                  key={calendar.id}
                  onClick={() => selectCalendar(calendar.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedCalendarId === calendar.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: calendar.color || '#3b82f6' }}
                    />
                    <span className="truncate">{calendar.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today Button */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleToday}
            variant="outline"
            className="w-full text-sm"
          >
            {t('calendar.today')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border-b border-destructive/20 p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <button
              onClick={clearError}
              className="text-xs text-destructive hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Calendar Header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{monthName}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
            >
              {t('calendar.today')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const isToday =
                  day &&
                  day.toDateString() === new Date().toDateString();
                const dayEvents = day ? getEventsForDate(day) : [];

                return (
                  <div
                    key={index}
                    onClick={() => day && setSelectedDate(day)}
                    className={`min-h-24 p-2 rounded-lg border transition-colors cursor-pointer ${
                      day
                        ? isToday
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:bg-muted'
                        : 'bg-muted/50 border-transparent'
                    }`}
                  >
                    {day && (
                      <>
                        <div
                          className={`text-sm font-semibold mb-1 ${
                            isToday ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="text-xs bg-primary/20 text-primary px-2 py-1 rounded truncate"
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground px-2">
                              +{dayEvents.length - 2} more
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
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                {t('calendar.new_event')}
              </h2>

              <input
                type="text"
                placeholder={t('calendar.event_title_placeholder')}
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <textarea
                placeholder={t('calendar.event_description_placeholder')}
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={newEventStartTime}
                  onChange={(e) => setNewEventStartTime(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <input
                  type="datetime-local"
                  value={newEventEndTime}
                  onChange={(e) => setNewEventEndTime(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              {calendars.length > 0 && (
                <select
                  value={newEventCalendarId}
                  onChange={(e) => setNewEventCalendarId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('calendar.select_calendar')}</option>
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setShowEventForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={!newEventTitle.trim() || !newEventCalendarId}
                  className="flex-1"
                >
                  {t('calendar.create_event')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
