'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from "./dialog.module.css";
function Dialog({
  ...props
}) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}
function DialogTrigger({
  ...props
}) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}
function DialogPortal({
  ...props
}) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}
function DialogClose({
  ...props
}) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}
function DialogOverlay({
  className,
  ...props
}) {
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn(styles["dialog-class-1"], className)} {...props} />;
}
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}) {
  return <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content data-slot="dialog-content" className={cn(styles["dialog-class-2"], className)} {...props}>
        {children}
        {showCloseButton && <DialogPrimitive.Close data-slot="dialog-close" className={styles["dialog-class-3"]}>
            <XIcon />
            <span className={styles["dialog-class-4"]}>Close</span>
          </DialogPrimitive.Close>}
      </DialogPrimitive.Content>
    </DialogPortal>;
}
function DialogHeader({
  className,
  ...props
}) {
  return <div data-slot="dialog-header" className={cn(styles["dialog-class-5"], className)} {...props} />;
}
function DialogFooter({
  className,
  ...props
}) {
  return <div data-slot="dialog-footer" className={cn(styles["dialog-class-6"], className)} {...props} />;
}
function DialogTitle({
  className,
  ...props
}) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn(styles["dialog-class-7"], className)} {...props} />;
}
function DialogDescription({
  className,
  ...props
}) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn(styles["dialog-class-8"], className)} {...props} />;
}
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
