'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./accordion.module.css";
function Accordion({
  ...props
}) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}
function AccordionItem({
  className,
  ...props
}) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn("accordion-class-1", className)} {...props} />;
}
function AccordionTrigger({
  className,
  children,
  ...props
}) {
  return <AccordionPrimitive.Header className={"accordion-class-2"}>
      <AccordionPrimitive.Trigger data-slot="accordion-trigger" className={cn("accordion-class-3", className)} {...props}>
        {children}
        <ChevronDownIcon className={"accordion-class-4"} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>;
}
function AccordionContent({
  className,
  children,
  ...props
}) {
  return <AccordionPrimitive.Content data-slot="accordion-content" className={"accordion-class-5"} {...props}>
      <div className={cn("accordion-class-6", className)}>{children}</div>
    </AccordionPrimitive.Content>;
}
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
