import { useState } from "react";

type Props = {
  caption?: string;
};

export default function Bitboard({ caption }: Props) {
  const [board, setBoard] = useState(0n);

  return (
    <figure className="not-prose flex flex-col gap-2">
      {!!caption && (
        <figcaption className="text-sm text-neutral-500">{caption}</figcaption>
      )}
      <code className="grid grid-flow-col">
        {new Array(64).fill(0n).map((_, idx) => {
          const bit = board & (1n << BigInt(64 - idx - 1));
          return (
            <span key={`${idx}`} className="text-sm">
              {bit > 0 ? "1" : "0"}
            </span>
          );
        })}
      </code>
      <div className="grid grid-cols-8 gap-1 mb-8">
        {new Array(64).fill(0).map((_, idx) => {
          const col = idx % 8;
          const row = 7 - Math.floor(idx / 8);
          const bitIdx = row * 8 + col;
          const bit = board & (1n << BigInt(bitIdx));
          return (
            <div
              className="w-full aspect-square grid place-items-center relative"
              key={`cell-${idx}`}
            >
              {col == 0 && <code className="absolute -left-8">{row + 1}</code>}
              {row == 0 && (
                <code className="absolute -bottom-8">
                  {String.fromCharCode(65 + col)}
                </code>
              )}
              <button
                className={`${bit > 0 ? "bg-sky-400" : "bg-gray-300"} cursor-pointer hover:ring-4 hover:ring-sky-300 w-full h-full`}
                onClick={() => setBoard((p) => p ^ (1n << BigInt(bitIdx)))}
              ></button>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
