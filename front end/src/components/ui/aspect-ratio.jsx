'use client';

import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';
import "./aspect-ratio.module.css";
function AspectRatio({
  ...props
}) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}
export { AspectRatio };
