'use client';

import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import "./alert-dialog.module.css";
function AlertDialog({
  ...props
}) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}
function AlertDialogTrigger({
  ...props
}) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}
function AlertDialogPortal({
  ...props
}) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}
function AlertDialogOverlay({
  className,
  ...props
}) {
  return <AlertDialogPrimitive.Overlay data-slot="alert-dialog-overlay" className={cn("alert-dialog-class-1", className)} {...props} />;
}
function AlertDialogContent({
  className,
  ...props
}) {
  return <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content data-slot="alert-dialog-content" className={cn("alert-dialog-class-2", className)} {...props} />
    </AlertDialogPortal>;
}
function AlertDialogHeader({
  className,
  ...props
}) {
  return <div data-slot="alert-dialog-header" className={cn("alert-dialog-class-3", className)} {...props} />;
}
function AlertDialogFooter({
  className,
  ...props
}) {
  return <div data-slot="alert-dialog-footer" className={cn("alert-dialog-class-4", className)} {...props} />;
}
function AlertDialogTitle({
  className,
  ...props
}) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("alert-dialog-class-5", className)} {...props} />;
}
function AlertDialogDescription({
  className,
  ...props
}) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("alert-dialog-class-6", className)} {...props} />;
}
function AlertDialogAction({
  className,
  ...props
}) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
}
function AlertDialogCancel({
  className,
  ...props
}) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({
    variant: "alert-dialog-class-7"
  }), className)} {...props} />;
}
export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
