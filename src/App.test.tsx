import userEvent from '@testing-library/user-event';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const THEME_STORAGE_KEY = 'sloscope.themePreference';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

interface MatchMediaController {
  setDarkMode: (enabled: boolean) => void;
}

interface LocalStorageMock extends Storage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
}

const createLocalStorageMock = (initialEntries: Record<string, string> = {}): LocalStorageMock => {
  const store = new Map(Object.entries(initialEntries));

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    }
  } as LocalStorageMock;
};

const installMatchMediaMock = (initiallyDark: boolean): MatchMediaController => {
  let isDark = initiallyDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQueryList = {
    get matches(): boolean {
      return isDark;
    },
    media: DARK_MEDIA_QUERY,
    onchange: null as ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null,
    addListener: (listener: (event: MediaQueryListEvent) => void): void => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void): void => {
      listeners.delete(listener);
    },
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject): void => {
      if (type !== 'change') {
        return;
      }

      listeners.add(listener as (event: MediaQueryListEvent) => void);
    },
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject): void => {
      if (type !== 'change') {
        return;
      }

      listeners.delete(listener as (event: MediaQueryListEvent) => void);
    },
    dispatchEvent: (event: Event): boolean => {
      const mediaQueryEvent = event as MediaQueryListEvent;

      if (typeof mediaQueryList.onchange === 'function') {
        mediaQueryList.onchange.call(mediaQueryList as MediaQueryList, mediaQueryEvent);
      }

      listeners.forEach((listener) => listener(mediaQueryEvent));
      return true;
    }
  } as MediaQueryList;

  const matchMediaMock = vi.fn().mockImplementation((query: string): MediaQueryList => {
    if (query === DARK_MEDIA_QUERY) {
      return mediaQueryList;
    }

    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as unknown as MediaQueryList;
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaMock
  });

  return {
    setDarkMode: (enabled: boolean) => {
      isDark = enabled;
      mediaQueryList.dispatchEvent({
        matches: isDark,
        media: DARK_MEDIA_QUERY
      } as MediaQueryListEvent as Event);
    }
  };
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: createLocalStorageMock()
  });

  document.documentElement.removeAttribute('data-theme');
});

describe('App', () => {
  it('renders site contact footer with mailto link', () => {
    installMatchMediaMock(false);
    render(<App />);

    expect(screen.getByText('Built by Ivan Volkov')).toBeInTheDocument();

    const contactLink = screen.getByRole('link', { name: 'imwolkow@gmail.com' });
    expect(contactLink).toHaveAttribute('href', 'mailto:imwolkow@gmail.com');
  });

  it('defaults to dark when system preference is dark and no stored preference exists', async () => {
    installMatchMediaMock(true);
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  });

  it('defaults to light when system preference is light and no stored preference exists', async () => {
    installMatchMediaMock(false);
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  });

  it('persists explicit light and dark selections', async () => {
    installMatchMediaMock(false);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
  });

  it('tracks OS changes while in system mode and ignores OS changes in explicit mode', async () => {
    const media = installMatchMediaMock(false);
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });

    act(() => {
      media.setDarkMode(true);
    });
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    act(() => {
      media.setDarkMode(false);
    });
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });

    await user.click(screen.getByRole('radio', { name: 'System' }));
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });
  });

  it('ignores invalid stored preference and falls back to system behavior', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'invalid-preference');
    installMatchMediaMock(true);
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('supports keyboard navigation in the theme radiogroup', async () => {
    installMatchMediaMock(false);
    render(<App />);

    const systemOption = screen.getByRole('radio', { name: 'System' });
    systemOption.focus();

    fireEvent.keyDown(systemOption, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });

    const lightOption = screen.getByRole('radio', { name: 'Light' });
    fireEvent.keyDown(lightOption, { key: 'End' });
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });
});
