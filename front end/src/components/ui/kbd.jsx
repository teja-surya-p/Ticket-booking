import { cn } from '@/lib/utils';
import "./kbd.module.css";
function Kbd({
  className,
  ...props
}) {
  return <kbd data-slot="kbd" className={cn("kbd-class-1", "kbd-class-2", "kbd-class-3", className)} {...props} />;
}
function KbdGroup({
  className,
  ...props
}) {
  return <kbd data-slot="kbd-group" className={cn("kbd-class-4", className)} {...props} />;
}
export { Kbd, KbdGroup };
