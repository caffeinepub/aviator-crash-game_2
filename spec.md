# Aviator Crash Game

## Current State
New project with empty backend scaffold.

## Requested Changes (Diff)

### Add
- Aviator-style crash game with animated plane
- Multiplier display that increases in real-time each round
- Random crash point per round
- Virtual credit/balance system (start with 1000 credits)
- Bet placement before each round
- Cash Out button to collect winnings before crash
- Auto-cashout option with target multiplier input
- Bet/crash history showing recent round results
- Backend: store balance, bet history, round results

### Modify
- Nothing (new project)

### Remove
- Nothing

## Implementation Plan
1. Backend: store player balance, save round results, record bets
2. Frontend: game engine (round state machine: waiting -> flying -> crashed)
3. Animated plane using CSS/canvas that flies across the screen
4. Multiplier counter that ticks up smoothly
5. Betting panel with bet amount, cash out, auto-cashout
6. Recent crash history chips at top
7. Dark casino-style UI with neon accents
