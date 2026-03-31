'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from "./accordion.module.css";
function Accordion({
  ...props
}) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}
function AccordionItem({
  className,
  ...props
}) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn(styles["accordion-class-1"], className)} {...props} />;
}
function AccordionTrigger({
  className,
  children,
  ...props
}) {
  return <AccordionPrimitive.Header className={styles["accordion-class-2"]}>
      <AccordionPrimitive.Trigger data-slot="accordion-trigger" className={cn(styles["accordion-class-3"], className)} {...props}>
        {children}
        <ChevronDownIcon className={styles["accordion-class-4"]} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>;
}
function AccordionContent({
  className,
  children,
  ...props
}) {
  return <AccordionPrimitive.Content data-slot="accordion-content" className={styles["accordion-class-5"]} {...props}>
      <div className={cn(styles["accordion-class-6"], className)}>{children}</div>
    </AccordionPrimitive.Content>;
}
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
