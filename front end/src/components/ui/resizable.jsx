'use client';

import * as React from 'react';
import { GripVerticalIcon } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import styles from "./resizable.module.css";
function ResizablePanelGroup({
  className,
  ...props
}) {
  return <ResizablePrimitive.PanelGroup data-slot="resizable-panel-group" className={cn(styles["resizable-class-1"], className)} {...props} />;
}
function ResizablePanel({
  ...props
}) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}
function ResizableHandle({
  withHandle,
  className,
  ...props
}) {
  return <ResizablePrimitive.PanelResizeHandle data-slot="resizable-handle" className={cn(styles["resizable-class-2"], className)} {...props}>
      {withHandle && <div className={styles["resizable-class-3"]}>
          <GripVerticalIcon className={styles["resizable-class-4"]} />
        </div>}
    </ResizablePrimitive.PanelResizeHandle>;
}
export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
