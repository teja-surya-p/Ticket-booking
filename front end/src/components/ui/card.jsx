import * as React from 'react';
import { cn } from '@/lib/utils';
import styles from "./card.module.css";
function Card({
  className,
  ...props
}) {
  return <div data-slot="card" className={cn(styles["card-class-1"], className)} {...props} />;
}
function CardHeader({
  className,
  ...props
}) {
  return <div data-slot="card-header" className={cn(styles["card-class-2"], className)} {...props} />;
}
function CardTitle({
  className,
  ...props
}) {
  return <div data-slot="card-title" className={cn(styles["card-class-3"], className)} {...props} />;
}
function CardDescription({
  className,
  ...props
}) {
  return <div data-slot="card-description" className={cn(styles["card-class-4"], className)} {...props} />;
}
function CardAction({
  className,
  ...props
}) {
  return <div data-slot="card-action" className={cn(styles["card-class-5"], className)} {...props} />;
}
function CardContent({
  className,
  ...props
}) {
  return <div data-slot="card-content" className={cn(styles["card-class-6"], className)} {...props} />;
}
function CardFooter({
  className,
  ...props
}) {
  return <div data-slot="card-footer" className={cn(styles["card-class-7"], className)} {...props} />;
}
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
