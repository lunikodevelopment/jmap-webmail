import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JMAPClient } from '@/lib/jmap/client';
import { useEmailStore } from './email-store';
import type { Identity } from '@/lib/jmap/types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  serverUrl: string | null;
  username: string | null;
  client: JMAPClient | null;
  identities: Identity[];
  primaryIdentity: Identity | null;
  rememberMe: boolean;

  login: (serverUrl: string, username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      serverUrl: null,
      username: null,
      client: null,
      identities: [],
      primaryIdentity: null,
      rememberMe: false,

      login: async (serverUrl, username, password, rememberMe = false) => {
        set({ isLoading: true, error: null });

        try {
          // Create JMAP client
          const client = new JMAPClient(serverUrl, username, password);

          // Try to connect
          await client.connect();

          // Fetch identities from the server
          const identities = await client.getIdentities();
          const primaryIdentity = identities.length > 0 ? identities[0] : null;

          // If remember me is enabled, store password in sessionStorage
          if (rememberMe) {
            try {
              sessionStorage.setItem('auth-pwd', btoa(password));
            } catch (e) {
              console.warn('Failed to store remember me credentials:', e);
            }
          }

          // Success - save state
          set({
            isAuthenticated: true,
            isLoading: false,
            serverUrl,
            username,
            client,
            identities,
            primaryIdentity,
            rememberMe,
            error: null,
          });

          return true;
        } catch (error) {
          console.error('Login error:', error);
          let errorKey = 'generic';

          // Map common errors to translation keys
          if (error instanceof Error) {
            if (error.message.includes('Invalid username or password') ||
                error.message.includes('401') ||
                error.message.includes('Unauthorized')) {
              errorKey = 'invalid_credentials';
            } else if (error.message.includes('network') ||
                       error.message.includes('Failed to fetch')) {
              errorKey = 'connection_failed';
            }
          }

          set({
            isLoading: false,
            error: errorKey,
            isAuthenticated: false,
            client: null,
          });
          return false;
        }
      },

      logout: () => {
        const state = get();

        // Disconnect the JMAP client if it exists
        if (state.client) {
          state.client.disconnect();
        }

        set({
          isAuthenticated: false,
          serverUrl: null,
          username: null,
          client: null,
          identities: [],
          primaryIdentity: null,
          rememberMe: false,
          error: null,
        });

        // Clear persisted storage
        localStorage.removeItem('auth-storage');
        sessionStorage.removeItem('auth-pwd');

        // Clear email store state
        useEmailStore.setState({
          emails: [],
          mailboxes: [],
          selectedEmail: null,
          selectedMailbox: "",
          isLoading: false,
          error: null,
          searchQuery: "",
          quota: null,
        });
      },

      checkAuth: async () => {
        const state = get();

        // If not authenticated, check if we can restore from remember me
        if (!state.isAuthenticated && state.rememberMe && state.serverUrl && state.username) {
          try {
            const storedPassword = sessionStorage.getItem('auth-pwd');
            if (storedPassword) {
              const password = atob(storedPassword);
              // Try to restore the session
              const success = await get().login(state.serverUrl, state.username, password, true);
              if (success) {
                console.log('Session restored from remember me');
                return;
              }
            }
          } catch (error) {
            console.error('Failed to restore session from remember me:', error);
            // Clear invalid credentials
            sessionStorage.removeItem('auth-pwd');
            set({ rememberMe: false });
          }
        }

        // If authenticated but no client (e.g., after page refresh), try to restore
        if (state.isAuthenticated && !state.client && state.rememberMe && state.serverUrl && state.username) {
          try {
            const storedPassword = sessionStorage.getItem('auth-pwd');
            if (storedPassword) {
              const password = atob(storedPassword);
              // Try to restore the session
              const success = await get().login(state.serverUrl, state.username, password, true);
              if (success) {
                console.log('Session restored after page refresh');
                return;
              }
            }
          } catch (error) {
            console.error('Failed to restore session after refresh:', error);
            sessionStorage.removeItem('auth-pwd');
          }
        }

        // If we can't restore, reset auth state
        if (state.isAuthenticated && !state.client) {
          set({
            isAuthenticated: false,
            isLoading: false,
            client: null,
            serverUrl: null,
            username: null,
            rememberMe: false,
          });
        }

        // Mark loading as complete
        set({ isLoading: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data (except rememberMe which is just a flag)
        serverUrl: state.serverUrl,
        username: state.username,
        rememberMe: state.rememberMe,
      }),
    }
  )
);