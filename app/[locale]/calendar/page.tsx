'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useCalendarStore } from '@/stores/calendar-store';
import { CalendarView } from '@/components/calendar/calendar-view';

export default function CalendarPage() {
  const { client, isAuthenticated } = useAuthStore();
  const { initializeSync, supportsCalendars } = useCalendarStore();

  // Initialize calendar sync on mount
  useEffect(() => {
    if (client && isAuthenticated) {
      console.log('Initializing calendar sync with client:', client);
      void initializeSync(client);
    }
  }, [client, isAuthenticated, initializeSync]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!supportsCalendars) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Calendar feature not supported by this server</p>
      </div>
    );
  }

  return <CalendarView />;
}
