'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./sheet.module.css";
function Sheet({
  ...props
}) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}
function SheetTrigger({
  ...props
}) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}
function SheetClose({
  ...props
}) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}
function SheetPortal({
  ...props
}) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}
function SheetOverlay({
  className,
  ...props
}) {
  return <SheetPrimitive.Overlay data-slot="sheet-overlay" className={cn("sheet-class-1", className)} {...props} />;
}
function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}) {
  return <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content data-slot="sheet-content" className={cn("sheet-class-2", side === 'right' && "sheet-class-3", side === 'left' && "sheet-class-4", side === 'top' && "sheet-class-5", side === 'bottom' && "sheet-class-6", className)} {...props}>
        {children}
        <SheetPrimitive.Close className={"sheet-class-7"}>
          <XIcon className={"sheet-class-8"} />
          <span className={"sheet-class-9"}>Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>;
}
function SheetHeader({
  className,
  ...props
}) {
  return <div data-slot="sheet-header" className={cn("sheet-class-10", className)} {...props} />;
}
function SheetFooter({
  className,
  ...props
}) {
  return <div data-slot="sheet-footer" className={cn("sheet-class-11", className)} {...props} />;
}
function SheetTitle({
  className,
  ...props
}) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("sheet-class-12", className)} {...props} />;
}
function SheetDescription({
  className,
  ...props
}) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("sheet-class-13", className)} {...props} />;
}
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
