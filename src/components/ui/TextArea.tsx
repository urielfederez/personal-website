import type { TextareaHTMLAttributes } from "react";
import { inputStyles } from "./input-styles";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, ...props }: Props) {
  return <textarea className={inputStyles({ className })} {...props} />;
}
