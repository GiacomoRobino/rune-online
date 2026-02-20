# Bug Audit — Sorcery Online

Systematic review of the server and client codebase. Each item verified by reading the actual source code.

---

## Critical

### 1. Fury trample uses `maxHealth` instead of actual health absorbed
**File:** `server/src/rooms/combatResolve.ts:99-100`

When a blocker dies, `remainingAttack` is reduced by `blocker.maxHealth`. But if the blocker was pre-damaged (e.g. by a spell before combat), its actual health was less than `maxHealth`, so less damage was needed to kill it. This under-calculates fury overflow damage.

```ts
// Current (wrong):
remainingAttack = Math.max(0, remainingAttack - blocker.maxHealth);
// Should use health BEFORE damage was applied
```

**Fix:** Track `healthBeforeDamage = blocker.health` before `applyDamageToCreature`, then subtract that instead of `maxHealth`.

---

### 2. `handleSummon` corrupts state if `chosenSubtype` is invalid
**File:** `server/src/rooms/cardPlay.ts:41-66`

Rune detachment/re-attachment (lines 41-48) and hand removal (line 51) happen BEFORE `chosenSubtype` validation (line 66). If validation fails and the function returns, the card is gone from hand, not on battlefield, and runes are in wrong state.

**Fix:** Move the `chosenSubtype` validation block before any state mutation (before line 41), or restructure so validation is fully front-loaded.

---

## Medium

### 3. Blockers can be assigned to non-attacking creatures
**File:** `server/src/rooms/combatDeclare.ts:99-100`

`handleDeclareBlockers` validates that `attackerCard` exists on the battlefield but never checks that `attackerId` is actually in `ctx.state.declaredAttackers`. A modified client could assign blockers to non-attacking creatures.

**Fix:** Add `if (!ctx.state.declaredAttackers.includes(attackerId)) continue;` after line 100.

---

### 4. `handlePlayEcho` missing battlefield size check
**File:** `server/src/rooms/cardPlay.ts:136`

`handleSummon` checks `MAX_BATTLEFIELD_SIZE` at line 28, but `handlePlayEcho` pushes directly to battlefield without any size check. Players can exceed the 7-creature limit with echoes.

**Fix:** Add `if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return;` before line 135.

---

### 5. `create_copies` effect doesn't check battlefield size
**File:** `server/src/rooms/effects.ts:54`

The `create_copies` on-enter effect (overpay mechanic) pushes copies to battlefield without checking `MAX_BATTLEFIELD_SIZE`. Token creation (line 176) and reanimate (line 196) both check it properly.

**Fix:** Add `if (caster.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;` before line 54.

---

### 6. Inconsistent death triggers on runeless sacrifice
**File:** `server/src/rooms/deathCleanup.ts:145-158 vs 161-177`

Two different code paths sacrifice runeless creatures:
- `sacrificeRunelessSummonings` (line 162-177): calls `handleOnDeathEffect` — death triggers fire
- `cleanupDeadCreatures` inner loop (line 145-158): does NOT call `handleOnDeathEffect` — death triggers skipped

So a creature sacrificed for losing runes after combat cleanup won't fire its death effects, but the same creature sacrificed after rune transfer will.

**Fix:** Add `handleOnDeathEffect(ctx, card, player);` in the `cleanupDeadCreatures` runeless loop (before line 154).

---

### 7. Simultaneous death picks arbitrary winner
**File:** `server/src/rooms/utils.ts:53-65`

If both players reach 0 health simultaneously, `checkWinCondition` iterates the MapSchema and the first player found at 0 health causes the opponent to win. The "winner" depends on join order, not game logic.

**Fix:** Collect all players at 0 health first, then if both are dead, declare a draw (or apply a tiebreaker rule).

---

### 8. Death-prevention follow-up damage queued at end instead of immediately
**File:** `server/src/rooms/deathResolution.ts:92`

When a death_prevention_cancel resolves, the follow-up death_damage effect is `push()`ed to the END of the queue. If other pending effects exist, the follow-up gets delayed behind them, breaking the expected "cancel rune then deal damage" sequence.

**Fix:** Insert at position 0 (or position matching the splice) instead of pushing to end: `ctx.state.pendingDeathEffects.splice(0, 0, dmgEffect)` (then adjust the subsequent splice at line 96 to splice index 1).

---

### 9. Death effect target doesn't validate creature type
**File:** `server/src/rooms/deathResolution.ts:32`

`handleResolveDeathTarget` finds a target via `findCardOnAnyBattlefield` but doesn't check `target.cardType === "summoning"`. An echo card could be targeted and take damage, even though echoes don't have meaningful health stats.

**Fix:** Add `if (target.cardType !== "summoning") return;` after finding the target.

---

### 10. `Array.from(ArraySchema).indexOf()` could return wrong index
**File:** `server/src/rooms/effects.ts:46`

```ts
const runeIdx = Array.from(card.attachedRuneIds).indexOf(extraRuneId);
if (runeIdx !== -1) card.attachedRuneIds.splice(runeIdx, 1);
```

`Array.from(ArraySchema)` can produce `(T | undefined)[]`. The indexOf on the copy may return an index that doesn't match the ArraySchema's actual index.

**Fix:** Use `card.attachedRuneIds.findIndex((id) => id === extraRuneId)` directly.

---

## Low

### 11. `canAttack = true` set on echo cards at turn start
**File:** `server/src/rooms/lifecycle.ts:50-54`

`startTurn` sets `canAttack = true` on ALL battlefield cards including echoes. Echoes shouldn't have combat flags. Harmless now (downstream type checks prevent echoes from attacking) but fragile.

---

### 12. End-turn cancel-rune skips death effect resolution between multiple cards
**File:** `server/src/rooms/deathResolution.ts:214`

If canceling a rune on card A causes card B to lose runes and get sacrificed (triggering death effects), but more cancel-rune cards remain, the code moves to the next cancel-rune card instead of first resolving the pending death effects. Death effects only get resolved when `remaining.length === 0` (line 219).

---


### 14. Deck search silently fails when hand is full
**File:** `server/src/rooms/deathResolution.ts:119`

If the player's hand has 10 cards during a deck search resolution, the card isn't added to hand but the pending effect is consumed. No feedback to the client.
