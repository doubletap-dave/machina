"use client";

import { font, fontMono, type MachinaThemeId } from "@machina/ui";
import { useEffect, type CSSProperties, type ReactNode } from "react";

type ThemeRootProps = {
  theme: MachinaThemeId;
  uiFontFamily?: string;
  monoFontFamily?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function ThemeRoot({
  theme,
  uiFontFamily = font,
  monoFontFamily = fontMono,
  className,
  style,
  children,
}: ThemeRootProps) {
  useEffect(() => {
    document.documentElement.dataset.machinaTheme = theme;
    return () => {
      delete document.documentElement.dataset.machinaTheme;
    };
  }, [theme]);

  return (
    <div
      className={className}
      data-machina-theme={theme}
      style={{
        ...style,
        ["--machina-font-ui" as string]: uiFontFamily,
        ["--machina-font-mono" as string]: monoFontFamily,
      }}
    >
      {children}
    </div>
  );
}
