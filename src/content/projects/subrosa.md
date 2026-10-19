---
title: "Subrosa"
status: "in-progress"
showcase: "../../assets/projects/subrosa/showcase.png"
technologies:
  - Zig
repository: "https://github.com/urielfederez/subrosa"
description: |
  Subrosa is an implementation of a bitboard chess engine, determining optimal moves using an efficient representation in order to play a chess game.

  Here I write about the mechanics of implementing bitboards, measuring the engine's improvement as I work on it, and implementing a playable interface over the web.
---

Chess, and chess engines in general, are very fun rabbit holes to explore. After learning about the modern state-of-the-art ways that engines like Stockfish are implemented, I figured I'd approach this field by trying to build my own engine from the ground up.

This article outlines my process of exploring the mechanics of working with bitboards, assessing model improvements, and engineering an interface playable over the web.

## Bitboards

The first decision you always make when implementing a chess engine is: "How do you represent the *state* of the position?" What data format/structure would you use to convey that a rook is on E5, or that a bishop can move to C2, or that the king has no legal moves?

The subtle but important note on state is that it's important to think about **positions** rather than just the placement of the pieces on the board itself. What moves are legal is also dependent, obviously, on the side whose turn it is, castling rights, pawns eligible to be taken *en passant*, and more. For this project, I chose to represent the piece placement using *bitboards*.

Bitboards are nothing more than using a 64-bit number to represent the presence or absence of a particular piece of a particular color on the board.

The advantage of using bitboards is that certain downstream questions such as determining whether any "enemy" piece occupies a square or what moves are available, become answerable by simply using fast bitwise operations. From personal experience, while it does take a bit to get up to speed on thinking about boards this way, I consider them no more or less difficult in terms of ease of implementation. There are trade-offs at the end of the day.
