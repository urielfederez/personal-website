import type { AnchorHTMLAttributes } from "react";
import { buttonStyles } from "./button-styles";

type Props = AnchorHTMLAttributes<HTMLAnchorElement>;

export function LinkButton({ className, ...props }: Props) {
  return <a className={buttonStyles({ className })} {...props} />;
}
