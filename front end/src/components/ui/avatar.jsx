'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import "./avatar.module.css";
function Avatar({
  className,
  ...props
}) {
  return <AvatarPrimitive.Root data-slot="avatar" className={cn("avatar-class-1", className)} {...props} />;
}
function AvatarImage({
  className,
  ...props
}) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn("avatar-class-2", className)} {...props} />;
}
function AvatarFallback({
  className,
  ...props
}) {
  return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn("avatar-class-3", className)} {...props} />;
}
export { Avatar, AvatarImage, AvatarFallback };
