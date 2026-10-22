import { cva } from "class-variance-authority";

export const buttonStyles = cva(
  "px-3 py-2 border text-sm flex gap-2 items-center cursor-pointer bg-white hover:bg-black hover:text-white transition-all",
  { variants: {} },
);
