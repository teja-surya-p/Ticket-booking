import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import "./utils.module.css";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
