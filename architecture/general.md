# Sorcery Online Architecture

## Overview

Sorcery Online is a real-time multiplayer card game built with a modern web stack. Players compete in 1v1 matches, summoning minions and casting spells to reduce their opponent's health to zero.

## Project Structure

The project is organized as a monorepo using npm workspaces:

```
sorcery_online/
├── client/          # React + Vite frontend
├── server/          # Node.js + Colyseus backend
├── shared/          # Common schemas and types
├── fly.toml         # Fly.io deployment config
├── vercel.json      # Vercel deployment config
└── package.json     # Root workspace config
```

### Package Dependencies

```
shared (schemas)
   ↑
   ├── client (imports shared)
   └── server (imports shared)
```

## Technology Stack

### Frontend (`client/`)
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **colyseus.js** - WebSocket client for Colyseus

### Backend (`server/`)
- **Node.js** - Runtime
- **Express** - HTTP server (health checks, monitor)
- **Colyseus** - WebSocket multiplayer framework
  - `@colyseus/core` - Core server
  - `@colyseus/ws-transport` - WebSocket transport
  - `@colyseus/monitor` - Debug dashboard
- **tsx** - TypeScript execution in development

### Shared (`shared/`)
- **@colyseus/schema** - Network-serialized state classes

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Vercel)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │    Lobby    │  │  GameBoard  │  │   Card Components       │ │
│  │  Component  │  │  Component  │  │   (Hand, Battlefield)   │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                      │              │
│         └────────────────┴──────────────────────┘              │
│                          │                                     │
│              ┌───────────┴───────────┐                         │
│              │    useColyseus Hook   │                         │
│              │  (connection manager) │                         │
│              └───────────┬───────────┘                         │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                    WebSocket (wss://)
                           │
┌──────────────────────────┼─────────────────────────────────────┐
│                          │           SERVER (Fly.io)           │
│              ┌───────────┴───────────┐                         │
│              │   Colyseus Server     │                         │
│              │  (WebSocket Handler)  │                         │
│              └───────────┬───────────┘                         │
│                          │                                     │
│              ┌───────────┴───────────┐                         │
│              │       GameRoom        │                         │
│              │  - Game logic         │                         │
│              │  - State management   │                         │
│              │  - Message handlers   │                         │
│              └───────────┬───────────┘                         │
│                          │                                     │
│              ┌───────────┴───────────┐                         │
│              │      GameState        │                         │
│              │  (Synchronized State) │                         │
│              └───────────────────────┘                         │
└────────────────────────────────────────────────────────────────┘
                           │
                     imports schemas
                           │
┌──────────────────────────┴─────────────────────────────────────┐
│                        SHARED PACKAGE                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  GameState  │  │   Player    │  │    Card     │            │
│  │   Schema    │  │   Schema    │  │   Schema    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────────────────────────────────────────┐          │
│  │              cards.ts (card definitions)        │          │
│  └─────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

## Key Components

### Client

| Component | Location | Purpose |
|-----------|----------|---------|
| `App.tsx` | `client/src/` | Main app, routing between Lobby and Game |
| `Lobby` | `client/src/components/Lobby/` | Room creation/joining UI |
| `Game` | `client/src/components/Game/` | Main game board UI |
| `Card` | `client/src/components/Card/` | Card rendering |
| `useColyseus` | `client/src/hooks/` | Hook managing Colyseus connection and state |

### Server

| Component | Location | Purpose |
|-----------|----------|---------|
| `index.ts` | `server/src/` | Server bootstrap, room registration |
| `GameRoom` | `server/src/rooms/` | All game logic, message handlers |

### Shared

| Schema | Location | Purpose |
|--------|----------|---------|
| `GameState` | `shared/src/schema/` | Root state: phase, currentTurn, players, winner |
| `Player` | `shared/src/schema/` | Player data: health, mana, hand, battlefield, deck |
| `Card` | `shared/src/schema/` | Card data: stats, abilities, state |
| `cards.ts` | `shared/src/` | Card definitions and deck generation |

## Data Flow

### State Synchronization

Colyseus automatically synchronizes state changes from server to all connected clients:

```
1. Client sends action message → Server
   Example: { type: "playCard", cardId: "abc123", targetId: "xyz789" }

2. Server validates and processes in GameRoom
   - Check it's player's turn
   - Check mana cost
   - Apply card effects

3. Server mutates GameState
   - Deduct mana
   - Move card from hand to battlefield
   - Apply damage/effects

4. Colyseus detects changes and broadcasts deltas
   - Only changed properties are sent
   - Clients automatically receive updates

5. Client React state updates via useColyseus hook
   - UI re-renders with new state
```

### Message Types

Client → Server:
- `setNickname` - Set player display name
- `playCard` - Play a card from hand
- `attack` - Attack with a minion
- `endTurn` - End current turn

Server → Client:
- State patches (automatic via Colyseus)

## Game Phases

```
waiting → playing → ended
   │         │        │
   │         │        └─ Winner determined
   │         └─ Turn-based gameplay
   └─ Waiting for 2 players
```

## Deployment

### Server (Fly.io)

Configuration in `fly.toml`:
- **App name**: `sorcery-online`
- **Region**: `fra` (Frankfurt)
- **Resources**: 1 shared CPU, 1GB memory
- **Port**: 8080 (internal), 443 (external with TLS)
- **Auto-scaling**: Minimum 1 machine always running

Build uses `server/Dockerfile`.

### Client (Vercel)

Configuration in `vercel.json`:
- **Framework**: Vite
- **Build**: `npm run build --workspace=shared && npm run build --workspace=client`
- **Output**: `client/dist`

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run both server and client
npm run dev

# Or run separately
npm run dev:server  # Server on :2567
npm run dev:client  # Client on :5173

# Test with two browsers
npm run dev:multi   # Runs server + 2 client instances (:5173, :3001)
```

### Debugging

- **Colyseus Monitor**: Available at `/colyseus` on the server
- **Health Check**: `GET /health` returns "OK"
