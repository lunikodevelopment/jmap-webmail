"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useVacationStore } from "@/stores/vacation-store";
import { useAuthStore } from "@/stores/auth-store";
import { SettingsSection } from "./settings-section";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { VacationResponder } from "@/lib/vacation-types";

export function VacationResponderSettings() {
  const t = useTranslations("settings.vacation_responder");
  const {
    responders,
    settings,
    selectedResponderId,
    createResponder,
    updateResponder,
    deleteResponder,
    selectResponder,
    updateSettings,
    getRespondersByIdentity,
    getActiveResponder,
  } = useVacationStore();

  const { identities, primaryIdentity } = useAuthStore();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [respondToAll, setRespondToAll] = useState(false);
  const [respondOncePerSender, setRespondOncePerSender] = useState(true);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string>(
    primaryIdentity?.id || identities[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedResponderIds, setExpandedResponderIds] = useState<Set<string>>(new Set());

  const filteredResponders = useMemo(() => {
    const identityResponders = getRespondersByIdentity(selectedIdentityId);
    if (!searchQuery.trim()) {
      return identityResponders;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return identityResponders.filter(
      (r) =>
        r.subject.toLowerCase().includes(lowerQuery) ||
        r.message.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, selectedIdentityId, responders]);

  const handleCreateResponder = () => {
    if (!subject.trim() || !message.trim() || !startDate || !endDate) return;

    const startDateTime = new Date(`${startDate}T${startTime}`).getTime();
    const endDateTime = new Date(`${endDate}T${endTime}`).getTime();

    if (startDateTime >= endDateTime) {
      alert(t("error_invalid_dates"));
      return;
    }

    createResponder({
      identityId: selectedIdentityId,
      isEnabled: false,
      subject: subject.trim(),
      message: message.trim(),
      startDate: startDateTime,
      endDate: endDateTime,
      respondToAll,
      respondOncePerSender,
    });

    setSubject("");
    setMessage("");
    setStartDate("");
    setStartTime("09:00");
    setEndDate("");
    setEndTime("17:00");
    setRespondToAll(false);
    setRespondOncePerSender(true);
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedResponderIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedResponderIds(newSet);
  };

  const handleDuplicateResponder = (responder: VacationResponder) => {
    createResponder({
      identityId: responder.identityId,
      isEnabled: false,
      subject: `${responder.subject} (copy)`,
      message: responder.message,
      startDate: responder.startDate,
      endDate: responder.endDate,
      respondToAll: responder.respondToAll,
      respondOncePerSender: responder.respondOncePerSender,
    });
  };

  const activeResponder = getActiveResponder(selectedIdentityId);
  const now = Date.now();

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isResponderActive = (responder: VacationResponder) => {
    return responder.isEnabled && responder.startDate <= now && responder.endDate >= now;
  };

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-medium text-foreground">{t("total_responders")}</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {getRespondersByIdentity(selectedIdentityId).length}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t("active_responder")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {activeResponder ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activeResponder.subject}
              </span>
            ) : (
              t("none")
            )}
          </p>
        </div>
      </div>

      {/* Identity Selector */}
      {identities.length > 1 && (
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">
            {t("select_identity")}
          </label>
          <select
            value={selectedIdentityId}
            onChange={(e) => {
              setSelectedIdentityId(e.target.value);
              setSearchQuery("");
            }}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {identities.map((identity) => (
              <option key={identity.id} value={identity.id}>
                {identity.name ? `${identity.name} <${identity.email}>` : identity.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Vacation Responder Settings */}
      <div className="p-4 bg-secondary rounded-lg mb-6 border border-border space-y-3">
        <h3 className="font-semibold text-foreground">{t("responder_settings")}</h3>

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoDisableOnReturn}
            onChange={(e) => updateSettings({ autoDisableOnReturn: e.target.checked })}
            className="w-4 h-4 rounded border-border"
          />
          {t("auto_disable_on_return")}
        </label>

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.notifyOnResponses}
            onChange={(e) => updateSettings({ notifyOnResponses: e.target.checked })}
            className="w-4 h-4 rounded border-border"
          />
          {t("notify_on_responses")}
        </label>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder={t("search_placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-background"
        />
      </div>

      {/* Create New Responder */}
      <div className="p-4 bg-secondary rounded-lg mb-6 border border-border space-y-3">
        <h3 className="font-semibold text-foreground">{t("new_responder")}</h3>

        <Input
          placeholder={t("subject_placeholder")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-background"
        />

        <textarea
          placeholder={t("message_placeholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={6}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("start_date")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("start_time")}
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("end_date")}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("end_time")}
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={respondToAll}
            onChange={(e) => setRespondToAll(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          {t("respond_to_all")}
        </label>

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={respondOncePerSender}
            onChange={(e) => setRespondOncePerSender(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          {t("respond_once_per_sender")}
        </label>

        <Button
          onClick={handleCreateResponder}
          disabled={!subject.trim() || !message.trim() || !startDate || !endDate}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("create_responder")}
        </Button>
      </div>

      {/* Responders List */}
      <div className="space-y-3">
        {filteredResponders.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">{t("no_responders")}</p>
        ) : (
          filteredResponders.map((responder) => (
            <div
              key={responder.id}
              className="border border-border rounded-lg overflow-hidden bg-card"
            >
              {/* Responder Header */}
              <div
                className={cn(
                  "flex items-center gap-2 p-4 transition-colors cursor-pointer",
                  isResponderActive(responder)
                    ? "bg-green-500/10 hover:bg-green-500/20"
                    : "bg-secondary hover:bg-accent"
                )}
                onClick={() => toggleExpanded(responder.id)}
              >
                {isResponderActive(responder) && (
                  <div className="text-xs font-semibold bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t("active")}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate text-foreground">{responder.subject}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatDateTime(responder.startDate)} - {formatDateTime(responder.endDate)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <label
                    className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={responder.isEnabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateResponder(responder.id, { isEnabled: e.target.checked });
                      }}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-xs font-medium text-foreground">{t("enabled")}</span>
                  </label>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateResponder(responder);
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={t("duplicate_responder")}
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteResponder(responder.id);
                    }}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors"
                    title={t("delete_responder")}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>

                  {expandedResponderIds.has(responder.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Responder Details */}
              {expandedResponderIds.has(responder.id) && (
                <div className="border-t border-border p-4 bg-background space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {t("message")}
                    </p>
                    <div className="text-sm text-foreground font-mono bg-muted p-3 rounded break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {responder.message}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold">{t("respond_to_all")}:</p>
                      <p>{responder.respondToAll ? t("yes") : t("no")}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{t("respond_once_per_sender")}:</p>
                      <p>{responder.respondOncePerSender ? t("yes") : t("no")}</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t("created")}: {new Date(responder.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </SettingsSection>
  );
}
