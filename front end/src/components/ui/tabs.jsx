'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import styles from "./tabs.module.css";
function Tabs({
  className,
  ...props
}) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn(styles["tabs-class-1"], className)} {...props} />;
}
function TabsList({
  className,
  ...props
}) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn(styles["tabs-class-2"], className)} {...props} />;
}
function TabsTrigger({
  className,
  ...props
}) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(styles["tabs-class-3"], className)} {...props} />;
}
function TabsContent({
  className,
  ...props
}) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn(styles["tabs-class-4"], className)} {...props} />;
}
export { Tabs, TabsList, TabsTrigger, TabsContent };
