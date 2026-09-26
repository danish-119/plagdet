import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function useThemeKeyboardShortcut() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl+Shift+D (Windows/Linux) or Cmd+Shift+D (macOS)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        
        // Don't trigger if user is typing in an input or textarea
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }

        // Toggle between light and dark
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme]);
}
