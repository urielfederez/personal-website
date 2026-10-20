import { cn } from "@/components/utils";
import { useReducer } from "react";

type State = {
  numOccupancyBits: number;
  position: number;
  board: bigint;
  piece: "rook" | "bishop";
};

type Action =
  | { type: "switch-piece"; piece: "rook" | "bishop" }
  | {
      type: "click-pos";
      index: number;
    };

function reducer(state: State, action: Action): State {
  const idx = action.type === "click-pos" ? action.index : state.position;
  const piece = action.type === "click-pos" ? state.piece : action.piece;

  const file = idx % 8;
  const rank = Math.floor(idx / 8);

  let newBoard = 0n;
  let numBits = 0;
  switch (piece) {
    case "rook":
      {
        for (let f = file - 1; f >= 1; f--) {
          newBoard |= 1n << BigInt(rank * 8 + f);
          numBits++;
        }
        for (let f = file + 1; f < 7; f++) {
          newBoard |= 1n << BigInt(rank * 8 + f);
          numBits++;
        }
        for (let r = rank - 1; r >= 1; r--) {
          newBoard |= 1n << BigInt(r * 8 + file);
          numBits++;
        }
        for (let r = rank + 1; r < 7; r++) {
          newBoard |= 1n << BigInt(r * 8 + file);
          numBits++;
        }
      }
      break;
    case "bishop": {
      for (let f = file - 1, r = rank - 1; f >= 1 && r >= 1; f--, r--) {
        newBoard |= 1n << BigInt(r * 8 + f);
        numBits++;
      }
      for (let f = file - 1, r = rank + 1; f >= 1 && r < 7; f--, r++) {
        newBoard |= 1n << BigInt(r * 8 + f);
        numBits++;
      }
      for (let f = file + 1, r = rank - 1; f < 7 && r >= 1; f++, r--) {
        newBoard |= 1n << BigInt(r * 8 + f);
        numBits++;
      }
      for (let f = file + 1, r = rank + 1; f < 7 && r < 7; f++, r++) {
        newBoard |= 1n << BigInt(r * 8 + f);
        numBits++;
      }
    }
  }

  return {
    piece,
    numOccupancyBits: numBits,
    board: newBoard,
    position: idx,
  };
}

export function OccupancyBits() {
  const [state, dispatch] = useReducer(reducer, {
    piece: "rook",
    numOccupancyBits: 0,
    position: 0,
    board: 0n,
  });

  return (
    <figure className="not-prose flex flex-col gap-2">
      <div className="flex justify-between">
        <div>
          <button
            className={cn(
              "px-4 border-b-2 text-gray-500 border-b-transparent cursor-pointer hover:border-b-gray-400",
              state.piece === "rook" && "border-b-black text-black",
            )}
            onClick={() => dispatch({ type: "switch-piece", piece: "rook" })}
          >
            Rook
          </button>
          <button
            className={cn(
              "px-4 border-b-2 text-gray-500 border-b-transparent cursor-pointer hover:border-b-gray-400",
              state.piece === "bishop" && "border-b-black text-black",
            )}
            onClick={() => dispatch({ type: "switch-piece", piece: "bishop" })}
          >
            Bishop
          </button>
        </div>
        {state.board === 0n ? (
          <span className="text-gray-600">Click on a square to start</span>
        ) : (
          <span>
            # of bits:{" "}
            <b>
              {state.numOccupancyBits} bits ={" "}
              {Math.pow(2, state.numOccupancyBits)} entries
            </b>
          </span>
        )}
      </div>
      <div className="grid grid-cols-8 mb-8">
        {new Array(64).fill(0).map((_, idx) => {
          const col = idx % 8;
          const row = 7 - Math.floor(idx / 8);
          const bitIdx = row * 8 + col;
          const isDark = (bitIdx + row + 1) % 2 === 0;
          const isOrigin = bitIdx === state.position && state.board !== 0n;
          const bit = state.board & (1n << BigInt(bitIdx));
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
                className={cn(
                  "border-collapse",
                  isDark ? "bg-[#AE8A68]" : "bg-[#ECDAB9]",
                  bit > 0 && (isDark ? "bg-[#6b9452]" : "bg-[#aae79b]"),
                  "cursor-pointer hover:border-4 hover:border-[#771825] w-full h-full",
                )}
                onClick={() => dispatch({ type: "click-pos", index: bitIdx })}
              ></button>
              {isOrigin && (
                <img
                  src={`/chess-pieces/w${state.piece === "bishop" ? "B" : "R"}.svg`}
                  alt="White bishop"
                  className="absolute top-0 left-0"
                />
              )}
            </div>
          );
        })}
      </div>
      {state.board !== 0n && (
        <figcaption className="text-sm text-neutral-500">
          Highlighted squares represent the relevant occupancy squares
          (blockers) which excludes the farthest squares and the location
          clicked.
        </figcaption>
      )}
    </figure>
  );
}
