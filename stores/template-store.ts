import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EmailTemplate, generateTemplateId, extractVariables } from "@/lib/template-types";

interface TemplateStore {
  templates: EmailTemplate[];
  selectedTemplateId: string | null;
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  createTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => EmailTemplate | undefined;
  getTemplatesByCategory: (category: string) => EmailTemplate[];

  // Selection
  selectTemplate: (id: string | null) => void;
  duplicateTemplate: (id: string) => EmailTemplate | null;

  // Filtering
  searchTemplates: (query: string) => EmailTemplate[];
  getSignatures: () => EmailTemplate[];

  // UI state
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],
      selectedTemplateId: null,
      isLoading: false,
      error: null,

      createTemplate: (template) => {
        const newTemplate: EmailTemplate = {
          id: generateTemplateId(),
          ...template,
          variables: extractVariables(template.subject + ' ' + template.body),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) => {
            if (t.id === id) {
              const updated = { ...t, ...updates, updatedAt: Date.now() };
              // Re-extract variables if subject or body changed
              if (updates.subject || updates.body) {
                updated.variables = extractVariables(
                  updated.subject + ' ' + updated.body
                );
              }
              return updated;
            }
            return t;
          }),
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
        }));
      },

      getTemplate: (id) => {
        return get().templates.find((t) => t.id === id);
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter((t) => t.category === category);
      },

      selectTemplate: (id) => {
        set({ selectedTemplateId: id });
      },

      duplicateTemplate: (id) => {
        const original = get().templates.find((t) => t.id === id);
        if (!original) return null;

        const duplicate: EmailTemplate = {
          ...original,
          id: generateTemplateId(),
          name: `${original.name} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          templates: [...state.templates, duplicate],
        }));

        return duplicate;
      },

      searchTemplates: (query) => {
        if (!query.trim()) {
          return get().templates;
        }

        const lowerQuery = query.toLowerCase();
        return get().templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.subject.toLowerCase().includes(lowerQuery) ||
            t.body.toLowerCase().includes(lowerQuery) ||
            (t.category && t.category.toLowerCase().includes(lowerQuery))
        );
      },

      getSignatures: () => {
        return get().templates.filter((t) => t.isSignature);
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "template-store",
      version: 1,
    }
  )
);
