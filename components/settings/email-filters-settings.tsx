"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useFilterStore } from "@/stores/filter-store";
import { SettingsSection } from "./settings-section";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  EmailFilter,
  FilterCondition,
  FilterAction,
  FilterConditionType,
  FilterActionType,
} from "@/lib/filter-types";

export function EmailFiltersSettings() {
  const t = useTranslations("settings.email_filters");
  const {
    filters,
    selectedFilterId,
    createFilter,
    updateFilter,
    deleteFilter,
    toggleFilter,
    duplicateFilter,
    selectFilter,
    addCondition,
    updateCondition,
    removeCondition,
    addAction,
    updateAction,
    removeAction,
    stats,
  } = useFilterStore();

  const [filterName, setFilterName] = useState("");
  const [newFilterDescription, setNewFilterDescription] = useState("");
  const [expandedFilterIds, setExpandedFilterIds] = useState<Set<string>>(
    new Set()
  );

  const selectedFilter = useMemo(
    () => filters.find((f) => f.id === selectedFilterId),
    [filters, selectedFilterId]
  );

  const handleCreateFilter = () => {
    if (!filterName.trim()) return;

    const filter = createFilter(filterName, newFilterDescription);
    selectFilter(filter.id);
    setFilterName("");
    setNewFilterDescription("");
    toggleExpanded(filter.id);
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedFilterIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedFilterIds(newSet);
  };

  const conditionTypes: {
    value: FilterConditionType;
    label: string;
  }[] = [
    { value: "from", label: t("condition_types.from") },
    { value: "to", label: t("condition_types.to") },
    { value: "subject", label: t("condition_types.subject") },
    { value: "body", label: t("condition_types.body") },
    { value: "hasAttachment", label: t("condition_types.has_attachment") },
  ];

  const operators = [
    { value: "contains", label: t("operators.contains") },
    { value: "equals", label: t("operators.equals") },
    { value: "startsWith", label: t("operators.starts_with") },
    { value: "endsWith", label: t("operators.ends_with") },
  ];

  const actionTypes: {
    value: FilterActionType;
    label: string;
  }[] = [
    { value: "markAsRead", label: t("action_types.mark_as_read") },
    { value: "markAsSpam", label: t("action_types.mark_as_spam") },
    { value: "markAsImportant", label: t("action_types.mark_as_important") },
    { value: "addLabel", label: t("action_types.add_label") },
    { value: "moveToMailbox", label: t("action_types.move_to_mailbox") },
    { value: "delete", label: t("action_types.delete") },
  ];

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-medium text-foreground">
            {t("total_rules")}
          </p>
          <p className="text-2xl font-bold text-primary mt-1">
            {stats.totalRules}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {t("enabled_rules")}
          </p>
          <p className="text-2xl font-bold text-primary mt-1">
            {stats.enabledRules}
          </p>
        </div>
      </div>

      {/* Create New Filter */}
      <div className="p-4 bg-secondary rounded-lg mb-6 border border-border">
        <h3 className="font-semibold text-foreground mb-3">{t("new_filter")}</h3>
        <div className="space-y-3">
          <Input
            placeholder={t("filter_name_placeholder")}
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="bg-background"
          />
          <Input
            placeholder={t("filter_description_placeholder")}
            value={newFilterDescription}
            onChange={(e) => setNewFilterDescription(e.target.value)}
            className="bg-background text-sm"
          />
          <Button
            onClick={handleCreateFilter}
            disabled={!filterName.trim()}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("create_filter")}
          </Button>
        </div>
      </div>

      {/* Filters List */}
      <div className="space-y-3">
        {filters.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            {t("no_filters")}
          </p>
        ) : (
          filters.map((filter, index) => (
            <div
              key={filter.id}
              className="border border-border rounded-lg overflow-hidden bg-card"
            >
              {/* Filter Header */}
              <div className="flex items-center gap-2 p-4 bg-secondary hover:bg-accent transition-colors cursor-pointer"
                onClick={() => toggleExpanded(filter.id)}
              >
                <button
                  className="p-1 hover:bg-muted rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFilter(filter.id);
                  }}
                >
                  {filter.enabled ? (
                    <Eye className="w-4 h-4 text-foreground" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "font-medium truncate",
                      !filter.enabled && "text-muted-foreground"
                    )}
                  >
                    {filter.name}
                  </h4>
                  {filter.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {filter.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateFilter(filter.id);
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={t("duplicate_filter")}
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFilter(filter.id);
                    }}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors"
                    title={t("delete_filter")}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>

                  {expandedFilterIds.has(filter.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Filter Details */}
              {expandedFilterIds.has(filter.id) && (
                <div className="border-t border-border p-4 bg-background space-y-4">
                  {/* Conditions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-sm text-foreground">
                        {t("conditions")}
                      </h5>
                      <select
                        value={filter.conditionMatch}
                        onChange={(e) =>
                          updateFilter(filter.id, {
                            conditionMatch: e.target.value as "all" | "any",
                          })
                        }
                        className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground"
                      >
                        <option value="all">{t("match_all_conditions")}</option>
                        <option value="any">{t("match_any_condition")}</option>
                      </select>
                    </div>

                    {filter.conditions.length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("no_conditions")}
                      </p>
                    ) : (
                      <div className="space-y-2 mb-2">
                        {filter.conditions.map((condition) => (
                          <ConditionRow
                            key={condition.id}
                            condition={condition}
                            conditionTypes={conditionTypes}
                            operators={operators}
                            onUpdate={(updates) =>
                              updateCondition(filter.id, condition.id, updates)
                            }
                            onRemove={() =>
                              removeCondition(filter.id, condition.id)
                            }
                          />
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCondition(filter.id)}
                      className="w-full"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {t("add_condition")}
                    </Button>
                  </div>

                  {/* Actions */}
                  <div>
                    <h5 className="font-semibold text-sm text-foreground mb-3">
                      {t("actions")}
                    </h5>

                    {filter.actions.length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("no_actions")}
                      </p>
                    ) : (
                      <div className="space-y-2 mb-2">
                        {filter.actions.map((action) => (
                          <ActionRow
                            key={action.id}
                            action={action}
                            actionTypes={actionTypes}
                            onUpdate={(updates) =>
                              updateAction(filter.id, action.id, updates)
                            }
                            onRemove={() => removeAction(filter.id, action.id)}
                          />
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addAction(filter.id)}
                      className="w-full"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {t("add_action")}
                    </Button>
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

function ConditionRow({
  condition,
  conditionTypes,
  operators,
  onUpdate,
  onRemove,
}: {
  condition: FilterCondition;
  conditionTypes: Array<{ value: FilterConditionType; label: string }>;
  operators: Array<{ value: string; label: string }>;
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const isBoolean = condition.type === "hasAttachment";

  return (
    <div className="flex gap-2 items-end">
      <select
        value={condition.type}
        onChange={(e) =>
          onUpdate({ type: e.target.value as FilterConditionType })
        }
        className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground flex-1"
      >
        {conditionTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {!isBoolean && (
        <select
          value={condition.operator}
          onChange={(e) => onUpdate({ operator: e.target.value as any })}
          className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground"
        >
          {operators.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {!isBoolean && (
        <input
          type="text"
          value={condition.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value..."
          className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground flex-1"
        />
      )}

      <button
        onClick={onRemove}
        className="p-1 hover:bg-destructive/10 rounded transition-colors"
      >
        <X className="w-4 h-4 text-destructive" />
      </button>
    </div>
  );
}

function ActionRow({
  action,
  actionTypes,
  onUpdate,
  onRemove,
}: {
  action: FilterAction;
  actionTypes: Array<{ value: FilterActionType; label: string }>;
  onUpdate: (updates: Partial<FilterAction>) => void;
  onRemove: () => void;
}) {
  const needsValue =
    action.type === "moveToMailbox" || action.type === "addLabel";

  return (
    <div className="flex gap-2 items-end">
      <select
        value={action.type}
        onChange={(e) =>
          onUpdate({ type: e.target.value as FilterActionType })
        }
        className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground flex-1"
      >
        {actionTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {needsValue && (
        <input
          type="text"
          value={action.value || ""}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder={
            action.type === "moveToMailbox"
              ? "Mailbox ID..."
              : "Label name..."
          }
          className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground flex-1"
        />
      )}

      <button
        onClick={onRemove}
        className="p-1 hover:bg-destructive/10 rounded transition-colors"
      >
        <X className="w-4 h-4 text-destructive" />
      </button>
    </div>
  );
}
