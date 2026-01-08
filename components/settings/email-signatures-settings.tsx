"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSignatureStore } from "@/stores/signature-store";
import { useAuthStore } from "@/stores/auth-store";
import { SettingsSection } from "./settings-section";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EmailSignature } from "@/lib/signature-types";

export function EmailSignaturesSettings() {
  const t = useTranslations("settings.email_signatures");
  const {
    signatures,
    settings,
    selectedSignatureId,
    createSignature,
    updateSignature,
    deleteSignature,
    selectSignature,
    setDefaultSignature,
    updateSettings,
    getSignaturesByIdentity,
    getDefaultSignature,
  } = useSignatureStore();

  const { identities, primaryIdentity } = useAuthStore();

  const [signatureName, setSignatureName] = useState("");
  const [signatureContent, setSignatureContent] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string>(
    primaryIdentity?.id || identities[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSignatureIds, setExpandedSignatureIds] = useState<Set<string>>(new Set());

  const filteredSignatures = useMemo(() => {
    const identitySignatures = getSignaturesByIdentity(selectedIdentityId);
    if (!searchQuery.trim()) {
      return identitySignatures;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return identitySignatures.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.content.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, selectedIdentityId, signatures]);

  const handleCreateSignature = () => {
    if (!signatureName.trim() || !signatureContent.trim()) return;

    createSignature({
      identityId: selectedIdentityId,
      name: signatureName,
      content: signatureContent,
      isHtml,
      isDefault: getSignaturesByIdentity(selectedIdentityId).length === 0, // First signature is default
    });

    setSignatureName("");
    setSignatureContent("");
    setIsHtml(false);
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedSignatureIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSignatureIds(newSet);
  };

  const handleDuplicateSignature = (signature: EmailSignature) => {
    createSignature({
      identityId: signature.identityId,
      name: `${signature.name} (copy)`,
      content: signature.content,
      isHtml: signature.isHtml,
      isDefault: false,
    });
  };

  const defaultSignature = getDefaultSignature(selectedIdentityId);

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-medium text-foreground">{t("total_signatures")}</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {getSignaturesByIdentity(selectedIdentityId).length}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t("default_signature")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {defaultSignature?.name || t("none")}
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

      {/* Signature Settings */}
      <div className="p-4 bg-secondary rounded-lg mb-6 border border-border space-y-3">
        <h3 className="font-semibold text-foreground">{t("signature_settings")}</h3>

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoAppendSignature}
            onChange={(e) => updateSettings({ autoAppendSignature: e.target.checked })}
            className="w-4 h-4 rounded border-border"
          />
          {t("auto_append_signature")}
        </label>

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoAppendToReplies}
            onChange={(e) => updateSettings({ autoAppendToReplies: e.target.checked })}
            className="w-4 h-4 rounded border-border"
          />
          {t("auto_append_replies")}
        </label>

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoAppendToForwards}
            onChange={(e) => updateSettings({ autoAppendToForwards: e.target.checked })}
            className="w-4 h-4 rounded border-border"
          />
          {t("auto_append_forwards")}
        </label>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {t("separator_style")}
          </label>
          <select
            value={settings.separatorStyle}
            onChange={(e) =>
              updateSettings({ separatorStyle: e.target.value as 'none' | 'dashes' | 'line' })
            }
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="none">{t("separator_none")}</option>
            <option value="dashes">{t("separator_dashes")}</option>
            <option value="line">{t("separator_line")}</option>
          </select>
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

      {/* Create New Signature */}
      <div className="p-4 bg-secondary rounded-lg mb-6 border border-border space-y-3">
        <h3 className="font-semibold text-foreground">{t("new_signature")}</h3>

        <Input
          placeholder={t("signature_name_placeholder")}
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          className="bg-background"
        />

        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <input
            type="checkbox"
            checked={isHtml}
            onChange={(e) => setIsHtml(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          {t("is_html")}
        </label>

        <textarea
          placeholder={t("signature_content_placeholder")}
          value={signatureContent}
          onChange={(e) => setSignatureContent(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={6}
        />

        <Button
          onClick={handleCreateSignature}
          disabled={!signatureName.trim() || !signatureContent.trim()}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("create_signature")}
        </Button>
      </div>

      {/* Signatures List */}
      <div className="space-y-3">
        {filteredSignatures.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">{t("no_signatures")}</p>
        ) : (
          filteredSignatures.map((signature) => (
            <div
              key={signature.id}
              className="border border-border rounded-lg overflow-hidden bg-card"
            >
              {/* Signature Header */}
              <div
                className="flex items-center gap-2 p-4 bg-secondary hover:bg-accent transition-colors cursor-pointer"
                onClick={() => toggleExpanded(signature.id)}
              >
                {signature.isDefault && (
                  <div className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {t("default")}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate text-foreground">{signature.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {signature.isHtml ? t("html_format") : t("plain_text_format")}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {!signature.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDefaultSignature(signature.id, signature.identityId);
                      }}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title={t("set_as_default")}
                    >
                      <Star className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateSignature(signature);
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={t("duplicate_signature")}
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSignature(signature.id);
                    }}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors"
                    title={t("delete_signature")}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>

                  {expandedSignatureIds.has(signature.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Signature Details */}
              {expandedSignatureIds.has(signature.id) && (
                <div className="border-t border-border p-4 bg-background space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {t("preview")}
                    </p>
                    <div
                      className={cn(
                        "text-sm text-foreground font-mono bg-muted p-3 rounded break-words whitespace-pre-wrap max-h-40 overflow-y-auto",
                        signature.isHtml && "font-sans"
                      )}
                      dangerouslySetInnerHTML={
                        signature.isHtml ? { __html: signature.content } : undefined
                      }
                    >
                      {!signature.isHtml && signature.content}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t("created")}: {new Date(signature.createdAt).toLocaleDateString()}
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
