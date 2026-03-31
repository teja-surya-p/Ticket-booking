'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import styles from "./avatar.module.css";
function Avatar({
  className,
  ...props
}) {
  return <AvatarPrimitive.Root data-slot="avatar" className={cn(styles["avatar-class-1"], className)} {...props} />;
}
function AvatarImage({
  className,
  ...props
}) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn(styles["avatar-class-2"], className)} {...props} />;
}
function AvatarFallback({
  className,
  ...props
}) {
  return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn(styles["avatar-class-3"], className)} {...props} />;
}
export { Avatar, AvatarImage, AvatarFallback };
