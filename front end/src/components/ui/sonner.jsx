'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';
import "./sonner.module.css";
const Toaster = ({
  ...props
}) => {
  const {
    theme = 'system'
  } = useTheme();
  return <Sonner theme={theme} className={"group sonner-class-1"} style={{
    '--normal-bg': 'var(--popover)',
    '--normal-text': 'var(--popover-foreground)',
    '--normal-border': 'var(--border)'
  }} {...props} />;
};
export { Toaster };
