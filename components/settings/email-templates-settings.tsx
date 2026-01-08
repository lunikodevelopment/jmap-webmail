"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useTemplateStore } from "@/stores/template-store";
import { SettingsSection } from "./settings-section";
import { COMMON_VARIABLES } from "@/lib/template-types";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/lib/template-types";

export function EmailTemplatesSettings() {
  const t = useTranslations("settings.email_templates");
  const {
    templates,
    selectedTemplateId,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    selectTemplate,
    duplicateTemplate,
    searchTemplates,
  } = useTemplateStore();

  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSignature, setIsSignature] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Set<string>>(new Set());
  const [selectedVariables, setSelectedVariables] = useState<Set<string>>(new Set());

  const filteredTemplates = useMemo(
    () => searchTemplates(searchQuery),
    [searchQuery, templates]
  );

  const handleCreateTemplate = () => {
    if (!templateName.trim() || (!templateSubject.trim() && !templateBody.trim())) return;

    createTemplate({
      name: templateName,
      subject: templateSubject,
      body: templateBody,
      category: templateCategory || undefined,
      description: templateDescription || undefined,
      isSignature,
    });

    setTemplateName("");
    setTemplateSubject("");
    setTemplateBody("");
    setTemplateCategory("");
    setTemplateDescription("");
    setIsSignature(false);
    setSelectedVariables(new Set());
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedTemplateIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedTemplateIds(newSet);
  };

  const insertVariable = (
    field: 'subject' | 'body',
    variable: string
  ) => {
    const placeholder = `{{${variable}}}`;
    if (field === 'subject') {
      setTemplateSubject((prev) => prev + (prev ? ' ' : '') + placeholder);
    } else {
      setTemplateBody((prev) => prev + (prev ? '\n' : '') + placeholder);
    }
  };

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[];

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-medium text-foreground">{t("total_templates")}</p>
          <p className="text-2xl font-bold text-primary mt-1">{templates.length}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t("signatures")}</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {templates.filter((t) => t.isSignature).length}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t("categories")}</p>
          <p className="text-2xl font-bold text-primary mt-1">{categories.length}</p>
        </div>
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

      {/* Create New Template */}
      <div className="p-4 bg-secondary rounded-lg mb-6 border border-border space-y-3">
        <h3 className="font-semibold text-foreground">{t("new_template")}</h3>

        <Input
          placeholder={t("template_name_placeholder")}
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="bg-background"
        />

        <Input
          placeholder={t("template_category_placeholder")}
          value={templateCategory}
          onChange={(e) => setTemplateCategory(e.target.value)}
          className="bg-background text-sm"
          list="template-categories"
        />
        <datalist id="template-categories">
          {categories.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        <Input
          placeholder={t("template_description_placeholder")}
          value={templateDescription}
          onChange={(e) => setTemplateDescription(e.target.value)}
          className="bg-background text-sm"
        />

        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSignature}
              onChange={(e) => setIsSignature(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            {t("is_signature")}
          </label>
        </div>

        <Input
          placeholder={t("subject_placeholder")}
          value={templateSubject}
          onChange={(e) => setTemplateSubject(e.target.value)}
          className="bg-background"
        />

        <textarea
          placeholder={t("body_placeholder")}
          value={templateBody}
          onChange={(e) => setTemplateBody(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={6}
        />

        {/* Variable Insertion */}
        <div className="bg-card border border-border rounded p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">{t("insert_variable")}</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(COMMON_VARIABLES).map(([key, variable]) => (
              <div key={key} className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => insertVariable('subject', key)}
                  className="flex-1 text-xs"
                >
                  {variable.label} (S)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => insertVariable('body', key)}
                  className="flex-1 text-xs"
                >
                  {variable.label} (B)
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleCreateTemplate}
          disabled={!templateName.trim() || (!templateSubject.trim() && !templateBody.trim())}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("create_template")}
        </Button>
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        {filteredTemplates.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">{t("no_templates")}</p>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-border rounded-lg overflow-hidden bg-card"
            >
              {/* Template Header */}
              <div
                className="flex items-center gap-2 p-4 bg-secondary hover:bg-accent transition-colors cursor-pointer"
                onClick={() => toggleExpanded(template.id)}
              >
                {template.isSignature && (
                  <div className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded">
                    {t("signature")}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate text-foreground">{template.name}</h4>
                  {template.category && (
                    <p className="text-xs text-muted-foreground truncate">
                      {template.category}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTemplate(template.id);
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={t("duplicate_template")}
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors"
                    title={t("delete_template")}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>

                  {expandedTemplateIds.has(template.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Template Details */}
              {expandedTemplateIds.has(template.id) && (
                <div className="border-t border-border p-4 bg-background space-y-3">
                  {template.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        {t("description")}
                      </p>
                      <p className="text-sm text-foreground">{template.description}</p>
                    </div>
                  )}

                  {template.subject && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        {t("subject")}
                      </p>
                      <p className="text-sm text-foreground font-mono bg-muted p-2 rounded break-words">
                        {template.subject}
                      </p>
                    </div>
                  )}

                  {template.body && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        {t("body")}
                      </p>
                      <p className="text-sm text-foreground font-mono bg-muted p-2 rounded break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {template.body}
                      </p>
                    </div>
                  )}

                  {template.variables && template.variables.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        {t("variables")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {template.variables.map((variable) => (
                          <span
                            key={variable}
                            className="text-xs bg-primary/20 text-primary px-2 py-1 rounded font-mono"
                          >
                            {`{{${variable}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </SettingsSection>
  );
}
