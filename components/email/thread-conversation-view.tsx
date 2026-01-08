"use client";

import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { Email, ThreadGroup } from "@/lib/jmap/types";
import { Avatar } from "@/components/ui/avatar";
import { Favicon } from "@/components/favicon";
import { Button } from "@/components/ui/button";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  Star,
  Download,
  Loader2,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File,
  Code,
  Copy,
  X,
  MoreVertical,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/stores/settings-store";
import { useAuthStore } from "@/stores/auth-store";

interface ThreadConversationViewProps {
  thread: ThreadGroup;
  emails: Email[];
  isLoading?: boolean;
  onBack: () => void;
  onReply?: (email: Email) => void;
  onReplyAll?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onDownloadAttachment?: (blobId: string, name: string, type?: string) => void;
  onMarkAsRead?: (emailId: string, read: boolean) => void;
}

// Helper function to get file icon based on mime type or extension
const getFileIcon = (name?: string, type?: string) => {
  const ext = name?.split('.').pop()?.toLowerCase();
  const mimeType = type?.toLowerCase();

  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return FileImage;
  }
  if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) {
    return FileVideo;
  }
  if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) {
    return FileAudio;
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return FileText;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return FileArchive;
  }
  return File;
};

export function ThreadConversationView({
  thread,
  emails,
  isLoading = false,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onDownloadAttachment,
  onMarkAsRead,
}: ThreadConversationViewProps) {
  const t = useTranslations();
  const externalContentPolicy = useSettingsStore((state) => state.externalContentPolicy);
  const addTrustedSender = useSettingsStore((state) => state.addTrustedSender);
  const isSenderTrusted = useSettingsStore((state) => state.isSenderTrusted);

  // Track which emails are expanded (most recent by default)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [allowExternalContent, setAllowExternalContent] = useState<Set<string>>(new Set());

  // Auto-expand most recent email AND all unread emails when thread opens
  useEffect(() => {
    if (emails.length > 0) {
      const idsToExpand = new Set<string>();

      // Always expand most recent
      idsToExpand.add(emails[0].id);

      // Also expand all unread emails
      emails.forEach(email => {
        if (!email.keywords?.$seen) {
          idsToExpand.add(email.id);
        }
      });

      setExpandedIds(idsToExpand);
    }
  }, [emails]);

  const toggleExpanded = (emailId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const toggleAllowExternal = (emailId: string) => {
    setAllowExternalContent(prev => {
      const next = new Set(prev);
      next.add(emailId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("threads.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate">
            {thread.latestEmail.subject || t("email_viewer.no_subject")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("threads.messages_other", { count: emails.length })}
          </p>
        </div>
      </div>

      {/* Email Cards */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {emails.map((email, index) => {
            const senderEmail = email.from?.[0]?.email?.toLowerCase();
            const senderIsTrusted = senderEmail ? isSenderTrusted(senderEmail) : false;
            return (
              <EmailCard
                key={email.id}
                email={email}
                isExpanded={expandedIds.has(email.id)}
                isLatest={index === 0}
                allowExternal={externalContentPolicy === 'allow' || senderIsTrusted || allowExternalContent.has(email.id)}
                onToggleExpanded={() => toggleExpanded(email.id)}
                onAllowExternal={() => toggleAllowExternal(email.id)}
                onTrustSender={senderEmail ? () => {
                  addTrustedSender(senderEmail);
                  toggleAllowExternal(email.id);
                } : undefined}
                onReply={onReply ? () => onReply(email) : undefined}
                onReplyAll={onReplyAll ? () => onReplyAll(email) : undefined}
                onForward={onForward ? () => onForward(email) : undefined}
                onDownloadAttachment={onDownloadAttachment}
                onMarkAsRead={onMarkAsRead}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Individual email card component
interface EmailCardProps {
  email: Email;
  isExpanded: boolean;
  isLatest: boolean;
  allowExternal: boolean;
  onToggleExpanded: () => void;
  onAllowExternal: () => void;
  onTrustSender?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onDownloadAttachment?: (blobId: string, name: string, type?: string) => void;
  onMarkAsRead?: (emailId: string, read: boolean) => void;
}

function EmailCard({
  email,
  isExpanded,
  isLatest: _isLatest,
  allowExternal,
  onToggleExpanded,
  onAllowExternal,
  onTrustSender,
  onReply,
  onReplyAll,
  onForward,
  onDownloadAttachment,
  onMarkAsRead,
}: EmailCardProps) {
  const t = useTranslations();
  const sender = email.from?.[0];
  const isUnread = !email.keywords?.$seen;
  const isStarred = email.keywords?.$flagged;
  const [hasBlockedContent, setHasBlockedContent] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showHeadersInline, setShowHeadersInline] = useState(false);
  const [showRawInline, setShowRawInline] = useState(false);
  const [rawSource, setRawSource] = useState<string | null>(null);
  const [fullRawSource, setFullRawSource] = useState<string | null>(null);
  const [isLoadingRawSource, setIsLoadingRawSource] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { client } = useAuthStore();

  // Mark as read when email is expanded
  useEffect(() => {
    // Only trigger if expanded, email is unread, and we have a handler
    if (!isExpanded || !onMarkAsRead || email.keywords?.$seen) {
      return;
    }

    const markAsReadDelay = useSettingsStore.getState().markAsReadDelay;

    // Never auto-mark
    if (markAsReadDelay === -1) {
      return;
    }

    // Instant mark
    if (markAsReadDelay === 0) {
      onMarkAsRead(email.id, true);
      return;
    }

    // Delayed mark
    const timeout = setTimeout(() => {
      onMarkAsRead(email.id, true);
    }, markAsReadDelay);

    return () => clearTimeout(timeout);
  }, [isExpanded, email.id, email.keywords?.$seen, onMarkAsRead]);

  // Fetch raw source when modal is opened or inline view toggled
  useEffect(() => {
    if ((showSourceModal || showRawInline || showHeadersInline) && email && client && !fullRawSource) {
      const fetchRaw = async () => {
        setIsLoadingRawSource(true);
        setFetchError(null);
        try {
          const raw = await client.getRawEmail(email.id);
          setFullRawSource(raw);
          setRawSource(raw); // Keep for compatibility with modal logic if needed
        } catch (error) {
          console.error("Failed to fetch raw email source:", error);
          setFetchError(error instanceof Error ? error.message : String(error));
        } finally {
          setIsLoadingRawSource(false);
        }
      };
      fetchRaw();
    }
  }, [showSourceModal, showRawInline, showHeadersInline, email, client, fullRawSource]);

  const copySourceToClipboard = async () => {
    const source = fullRawSource || rawSource || generateEmailSource(email);
    try {
      await navigator.clipboard.writeText(source);
    } catch (err) {
      console.error("Failed to copy source:", err);
    }
  };

  const formatHeaders = (headers: Record<string, any>) => {
    return Object.entries(headers)
      .map(([key, value]) => {
        const val = Array.isArray(value) ? value.join(', ') : String(value);
        return `${key}: ${val}`;
      })
      .join('\n');
  };

  // Helper to extract headers block from raw RFC822 source
  const getRawHeaderBlock = (raw: string) => {
    if (!raw) return "";
    // RFC822 headers are separated from body by the first blank line
    const match = raw.match(/^[\s\S]*?\r?\n\r?\n/);
    if (match) {
      return match[0].trim();
    }
    // If no double newline found, it might be only headers or improperly formatted
    // but we'll return the whole thing as a fallback
    return raw.trim();
  };

  // Generate email source fallback
  const generateEmailSource = (email: Email): string => {
    let source = '';
    source += '=== EMAIL HEADERS (Generated) ===\n\n';
    if (email.messageId) source += `Message-ID: ${email.messageId}\n`;
    if (email.from) source += `From: ${email.from.map(a => a.name ? `${a.name} <${a.email}>` : a.email).join(', ')}\n`;
    if (email.to) source += `To: ${email.to.map(a => a.name ? `${a.name} <${a.email}>` : a.email).join(', ')}\n`;
    if (email.subject) source += `Subject: ${email.subject}\n`;
    if (email.receivedAt) source += `Date: ${new Date(email.receivedAt).toUTCString()}\n`;

    if (email.headers) {
      source += '\n--- Raw Headers ---\n';
      Object.entries(email.headers).forEach(([key, value]) => {
        const val = Array.isArray(value) ? value.join('\n    ') : String(value);
        source += `${key}: ${val}\n`;
      });
    }
    return source;
  };

  // Sanitize and prepare email HTML content
  const emailContent = useMemo(() => {
    if (!email) return { html: "", isHtml: false };

    if (email.bodyValues) {
      let useHtmlVersion = false;
      let htmlContent = '';

      if (email.htmlBody?.[0]?.partId && email.bodyValues[email.htmlBody[0].partId]) {
        htmlContent = email.bodyValues[email.htmlBody[0].partId].value;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const hasRichFormatting = tempDiv.querySelector('table, img, style, b, strong, i, em, u, font, div[style], span[style], p[style], h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
        const hasMultipleParagraphs = tempDiv.querySelectorAll('p').length > 2;
        const hasBrTags = tempDiv.querySelectorAll('br').length > 0;

        useHtmlVersion = !!(hasRichFormatting || hasMultipleParagraphs || hasBrTags);
      }

      if (useHtmlVersion && htmlContent) {
        let blockedExternalContent = false;

        const sanitizeConfig = {
          ADD_TAGS: ['style'],
          ADD_ATTR: ['target', 'style', 'class', 'width', 'height', 'align', 'valign', 'bgcolor', 'color'],
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'base'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
        };

        if (!allowExternal) {
          DOMPurify.addHook('afterSanitizeAttributes', (node) => {
            if (node.tagName === 'IMG') {
              const src = node.getAttribute('src');
              if (src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//'))) {
                node.setAttribute('data-blocked-src', src);
                node.removeAttribute('src');
                node.setAttribute('alt', '[Image blocked]');
                blockedExternalContent = true;
              }
            }
            if (node.hasAttribute('style')) {
              const style = node.getAttribute('style');
              if (style && /url\s*\(/i.test(style)) {
                const cleanStyle = style.replace(/url\s*\([^)]*\)/gi, 'none');
                node.setAttribute('style', cleanStyle);
                blockedExternalContent = true;
              }
            }
          });
        }

        const sanitized = DOMPurify.sanitize(htmlContent, sanitizeConfig);
        DOMPurify.removeHook('afterSanitizeAttributes');

        let processedHtml = sanitized;
        // Implement quoted content folding from MessageDetail.vue
        processedHtml = processedHtml.replace(/<hr[^>]*>([\s\S]*?)(?=<hr|$)/gi, (match, content) => {
          if (content.trim().length > 100) {
            return `<hr><div class="quoted-content-scrollable">${content}</div>`;
          }
          return match;
        });

        if (blockedExternalContent) {
          setHasBlockedContent(true);
        }

        return { html: processedHtml, isHtml: true };
      }

      // Plain text fallback
      if (email.textBody?.[0]?.partId && email.bodyValues[email.textBody[0].partId]) {
        const text = email.bodyValues[email.textBody[0].partId].value;
        const htmlEscaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')
          .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
        return { html: htmlEscaped, isHtml: false };
      }
    }

    // Fallback to preview
    if (email.preview) {
      return { html: email.preview.replace(/\n/g, '<br>'), isHtml: false };
    }

    return { html: "", isHtml: false };
  }, [email, allowExternal]);

  return (
    <div className={cn(
      "rounded-lg border border-border overflow-hidden transition-all duration-200",
      isExpanded ? "bg-background shadow-sm" : "bg-muted/30",
      isUnread && !isExpanded && "border-l-2 border-l-primary"
    )}>
      {/* Card Header - Always visible */}
      <button
        onClick={onToggleExpanded}
        className={cn(
          "w-full flex items-start gap-3 p-4 text-left transition-colors",
          !isExpanded && "hover:bg-muted/50"
        )}
      >
        <div className="relative flex-shrink-0">
          <Avatar
            name={sender?.name}
            email={sender?.email}
            size="md"
            className="flex-shrink-0 shadow-sm"
          />
          {sender?.email && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full border border-border shadow-sm overflow-hidden z-10">
              <Favicon
                email={sender.email}
                size="sm"
                className="w-full h-full"
              />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              "font-medium truncate",
              isUnread ? "text-foreground" : "text-muted-foreground"
            )}>
              {sender?.name || sender?.email || "Unknown"}
            </span>
            {isStarred && (
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
            )}
            {email.hasAttachment && (
              <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(email.receivedAt)}
          </div>
          {!isExpanded && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {email.preview || "No preview available"}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 p-1">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border animate-in slide-in-from-top-2 duration-200">
          {/* External content warning */}
          {hasBlockedContent && !allowExternal && (
            <div className="px-4 py-2 bg-muted/50 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("email_viewer.external_content_warning")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAllowExternal();
                  }}
                >
                  {t("email_viewer.load_external_content")}
                </Button>
                {onTrustSender && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrustSender();
                    }}
                  >
                    {t("email_viewer.trust_sender")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Email Body */}
          <div className="px-4 py-4">
            {/* Metadata Grid from MessageDetail.vue */}
            <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-xs mb-4 pb-4 border-b border-border/50">
              <div className="text-muted-foreground uppercase tracking-wider font-semibold">From</div>
              <div className="text-foreground break-all">{sender?.name ? `${sender.name} <${sender.email}>` : sender?.email}</div>
              <div className="text-muted-foreground uppercase tracking-wider font-semibold">To</div>
              <div className="text-foreground break-all">{email.to?.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')}</div>
              {email.cc && email.cc.length > 0 && (
                <>
                  <div className="text-muted-foreground uppercase tracking-wider font-semibold">CC</div>
                  <div className="text-foreground break-all">{email.cc.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')}</div>
                </>
              )}
              <div className="text-muted-foreground uppercase tracking-wider font-semibold">Date</div>
              <div className="text-foreground">{new Date(email.receivedAt).toLocaleString()}</div>
              {email.keywords && (
                <>
                  <div className="text-muted-foreground uppercase tracking-wider font-semibold">Flags</div>
                  <div className="text-foreground flex flex-wrap gap-1">
                    {Object.entries(email.keywords)
                      .filter(([_, v]) => v)
                      .map(([k]) => (
                        <span key={k} className="px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border/50">
                          {k.startsWith('$') ? k.substring(1) : k}
                        </span>
                      ))}
                  </div>
                </>
              )}
              <div className="text-muted-foreground uppercase tracking-wider font-semibold">Size</div>
              <div className="text-foreground">{formatFileSize(email.size)}</div>
              <div className="text-muted-foreground uppercase tracking-wider font-semibold">ID</div>
              <div className="text-foreground font-mono text-[10px] break-all">{email.id}</div>
            </div>

            {/* Inline Headers toggle */}
            {showHeadersInline && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border overflow-hidden">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  Full Message Headers (Raw)
                </h4>
                {isLoadingRawSource ? (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-4 justify-center">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading Headers...
                  </div>
                ) : fetchError ? (
                  <div className="text-[10px] text-destructive py-2 px-3 bg-destructive/10 rounded border border-destructive/20">
                    Failed to fetch headers: {fetchError}
                  </div>
                ) : (
                  <pre className="text-[10px] font-mono whitespace-pre-wrap break-all opacity-80 max-h-[400px] overflow-y-auto">
                    {fullRawSource ? getRawHeaderBlock(fullRawSource) : formatHeaders(email.headers || {})}
                  </pre>
                )}
              </div>
            )}

            {/* Inline Raw Source toggle */}
            {showRawInline && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border overflow-hidden">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                  <Code className="w-3 h-3" />
                  Full RFC822 Source
                </h4>
                {isLoadingRawSource ? (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-4 justify-center">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading Full Message...
                  </div>
                ) : fetchError ? (
                  <div className="text-[10px] text-destructive py-2 px-3 bg-destructive/10 rounded border border-destructive/20">
                    Failed to fetch raw source: {fetchError}
                  </div>
                ) : (
                  <pre className="text-[10px] font-mono whitespace-pre-wrap break-all opacity-80 max-h-[500px] overflow-y-auto">
                    {fullRawSource || generateEmailSource(email)}
                  </pre>
                )}
              </div>
            )}

            {!showHeadersInline && !showRawInline && (
              <div
                className={cn(
                  "prose prose-sm max-w-none dark:prose-invert",
                  "prose-p:my-2 prose-headings:my-3",
                  "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
                  "[&_table]:border-collapse [&_td]:p-2 [&_th]:p-2",
                  "[&_img]:max-w-full [&_img]:h-auto"
                )}
                dangerouslySetInnerHTML={{ __html: emailContent.html }}
              />
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((attachment, idx) => {
                  const Icon = getFileIcon(attachment.name, attachment.type);
                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadAttachment?.(attachment.blobId, attachment.name || 'attachment', attachment.type);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate max-w-[150px]">{attachment.name || 'Attachment'}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatFileSize(attachment.size)}
                      </span>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-4 pb-4 flex gap-2">
            {onReply && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply();
                }}
                className="flex-1"
              >
                <Reply className="w-4 h-4 mr-2" />
                {t("email_viewer.reply")}
              </Button>
            )}
            {onReplyAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReplyAll();
                }}
                className="flex-1"
              >
                <ReplyAll className="w-4 h-4 mr-2" />
                {t("email_viewer.reply_all")}
              </Button>
            )}
            {onForward && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onForward();
                }}
                className="flex-1"
              >
                <Forward className="w-4 h-4 mr-2" />
                {t("email_viewer.forward")}
              </Button>
            )}
            <Button
              variant={showHeadersInline ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowHeadersInline(!showHeadersInline);
                setShowRawInline(false);
              }}
              title="Toggle Headers Inline"
              className="flex-1"
            >
              Headers
            </Button>
            <Button
              variant={showRawInline ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowRawInline(!showRawInline);
                setShowHeadersInline(false);
                if (!showRawInline && !rawSource) {
                  setShowSourceModal(false); // don't open modal, just trigger the effect via state if needed
                  // Actually the effect depends on showSourceModal. Let's fix that.
                }
              }}
              title="Toggle Raw Source Inline"
              className="flex-1"
            >
              Raw
            </Button>
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="px-2 h-9"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-background rounded-md shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSourceModal(true);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-foreground flex items-center gap-2"
                >
                  <Code className="w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span>{t("email_viewer.view_source")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw Source Modal */}
      {showSourceModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowSourceModal(false);
          }}
        >
          <div 
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{t("email_viewer.raw_source")}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copySourceToClipboard}
                  title={t("email_viewer.copy_source")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSourceModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-muted/30 font-mono text-sm">
              {isLoadingRawSource ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">{t("email_viewer.loading_source")}</p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-all text-xs">
                  {fullRawSource || generateEmailSource(email)}
                </pre>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <Button onClick={() => setShowSourceModal(false)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
