'use client';

import { useTheme } from '@/contexts/theme-context';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';

export default function RadixThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isModern, colorMode } = useTheme();

  // Always render <Theme> to keep a stable tree structure.
  // Switching between <>{children}</> and <Theme>{children}</Theme>
  // causes a full remount of all child components, breaking state.
  return (
    <Theme
      appearance={colorMode}
      accentColor="blue"
      grayColor="slate"
      radius="medium"
      scaling="100%"
      hasBackground={isModern}
    >
      {children}
    </Theme>
  );
}
