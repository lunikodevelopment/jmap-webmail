export interface VacationResponder {
  id: string;
  identityId: string;
  isEnabled: boolean;
  subject: string;
  message: string;
  startDate: number; // timestamp
  endDate: number; // timestamp
  respondToAll: boolean; // respond to all senders or only known contacts
  respondOncePerSender: boolean; // only send one response per sender
  createdAt: number;
  updatedAt: number;
}

export interface VacationResponderSettings {
  autoDisableOnReturn: boolean; // automatically disable when end date passes
  notifyOnResponses: boolean; // notify user when vacation response is sent
}

export function generateVacationId(): string {
  return `vacation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
