'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { MinusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./input-otp.module.css";
function InputOTP({
  className,
  containerClassName,
  ...props
}) {
  return <OTPInput data-slot="input-otp" containerClassName={cn('flex items-center gap-2 has-disabled:opacity-50', containerClassName)} className={cn("input-otp-class-1", className)} {...props} />;
}
function InputOTPGroup({
  className,
  ...props
}) {
  return <div data-slot="input-otp-group" className={cn("input-otp-class-2", className)} {...props} />;
}
function InputOTPSlot({
  index,
  className,
  ...props
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const {
    char,
    hasFakeCaret,
    isActive
  } = inputOTPContext?.slots[index] ?? {};
  return <div data-slot="input-otp-slot" data-active={isActive} className={cn("input-otp-class-3", className)} {...props}>
      {char}
      {hasFakeCaret && <div className={"input-otp-class-4"}>
          <div className={"input-otp-class-5"} />
        </div>}
    </div>;
}
function InputOTPSeparator({
  ...props
}) {
  return <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>;
}
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
