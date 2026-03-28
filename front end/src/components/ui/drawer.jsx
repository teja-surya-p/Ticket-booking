'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '@/lib/utils';
import styles from "./drawer.module.css";
function Drawer({
  ...props
}) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}
function DrawerTrigger({
  ...props
}) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}
function DrawerPortal({
  ...props
}) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}
function DrawerClose({
  ...props
}) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}
function DrawerOverlay({
  className,
  ...props
}) {
  return <DrawerPrimitive.Overlay data-slot="drawer-overlay" className={cn(styles["drawer-class-1"], className)} {...props} />;
}
function DrawerContent({
  className,
  children,
  ...props
}) {
  return <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content data-slot="drawer-content" className={cn(styles["drawer-class-2"], styles["drawer-class-3"], styles["drawer-class-4"], styles["drawer-class-5"], styles["drawer-class-6"], className)} {...props}>
        <div className={styles["drawer-class-7"]} />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>;
}
function DrawerHeader({
  className,
  ...props
}) {
  return <div data-slot="drawer-header" className={cn(styles["drawer-class-8"], className)} {...props} />;
}
function DrawerFooter({
  className,
  ...props
}) {
  return <div data-slot="drawer-footer" className={cn(styles["drawer-class-9"], className)} {...props} />;
}
function DrawerTitle({
  className,
  ...props
}) {
  return <DrawerPrimitive.Title data-slot="drawer-title" className={cn(styles["drawer-class-10"], className)} {...props} />;
}
function DrawerDescription({
  className,
  ...props
}) {
  return <DrawerPrimitive.Description data-slot="drawer-description" className={cn(styles["drawer-class-11"], className)} {...props} />;
}
export { Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription };
