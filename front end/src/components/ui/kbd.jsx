import { cn } from '@/lib/utils';
import styles from "./kbd.module.css";
function Kbd({
  className,
  ...props
}) {
  return <kbd data-slot="kbd" className={cn(styles["kbd-class-1"], styles["kbd-class-2"], styles["kbd-class-3"], className)} {...props} />;
}
function KbdGroup({
  className,
  ...props
}) {
  return <kbd data-slot="kbd-group" className={cn(styles["kbd-class-4"], className)} {...props} />;
}
export { Kbd, KbdGroup };
