import type { ButtonHTMLAttributes } from "react";
import { buttonStyles } from "./button-styles";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, ...props }: Props) {
  return <button className={buttonStyles({ className })} {...props} />;
}
