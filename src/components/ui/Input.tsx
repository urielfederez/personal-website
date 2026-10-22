import type { InputHTMLAttributes } from "react";
import { inputStyles } from "./input-styles";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Props) {
  return <input className={inputStyles({ className })} {...props} />;
}
