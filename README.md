# ⬡ NEXUS — Electronic Trading Exchange

A full-stack real-time trading exchange built with **Next.js 14**, **MongoDB**, **Socket.IO**, and **React**.  
Implements a real price-time priority matching engine with limit orders, market orders, partial fills, and live WebSocket updates.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React)                          │
│  OrderEntry → useOrders → POST /api/orders                  │
│  useSocket  ← Socket.IO ← server/index.js                   │
│                                                             │
│  Components: Header, OrderBookPanel, TradesPanel,           │
│              PriceChart, DepthChart, MyOrders, ActivityFeed │
└─────────────────────────────────────────────────────────────┘
         │ HTTP (Next.js API Routes)    │ WebSocket (Socket.IO)
┌────────▼──────────────────────────────▼────────────────────┐
│              server/index.js  (Custom Express server)       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Matching Engine  (lib/matchingEngine.ts)  │   │
│  │  createOrder() → matchOrder() → MatchResult         │   │
│  │  In-memory OrderBook (bids[] + asks[])              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  API Routes:                                                │
│    POST   /api/orders        — Place new order              │
│    DELETE /api/orders/:id    — Cancel order                 │
│    GET    /api/orders        — List orders (DB)             │
│    GET    /api/orderbook     — Current order book           │
│    GET    /api/trades        — Recent trades                │
│                                                             │
│  WebSocket Events (Socket.IO):                              │
│    → orderbook_update        — Full book snapshot           │
│    → trade_executed          — Array of new trades          │
│    → order_placed            — Final order state            │
│    → order_cancelled         — {orderId}                    │
└───────────────────────────────┬─────────────────────────────┘
                                │ Mongoose
                    ┌───────────▼────────────┐
                    │       MongoDB          │
                    │  Collections:          │
                    │    orders              │
                    │    trades              │
                    └────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** 18+
- **MongoDB** running locally (`mongod`) OR a MongoDB Atlas connection string

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local — set MONGODB_URI if needed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> ⚠️ Use `npm run dev` (not `next dev`) — this starts the custom Express+Socket.IO server.

---

## 📁 Project Structure

```
nexus-exchange/
├── server/
│   └── index.js              # Custom Express + Socket.IO server
├── app/
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   ├── globals.css            # Global styles + animations
│   ├── hooks/
│   │   ├── useSocket.ts       # Socket.IO client hook
│   │   └── useOrders.ts       # Order placement/cancellation
│   ├── components/
│   │   ├── ExchangeClient.tsx # Main client shell
│   │   ├── Header.tsx         # Ticker + market stats
│   │   ├── OrderEntry.tsx     # Buy/sell form
│   │   ├── OrderBookPanel.tsx # Bid/ask depth
│   │   ├── TradesPanel.tsx    # Recent executions
│   │   ├── PriceChart.tsx     # Recharts area chart
│   │   ├── DepthChart.tsx     # Market depth visualization
│   │   ├── MyOrders.tsx       # User order blotter
│   │   ├── ActivityFeed.tsx   # Live event log
│   │   └── Sparkline.tsx      # Mini price sparkline
│   └── api/
│       ├── orders/
│       │   ├── route.ts        # POST + GET /api/orders
│       │   └── [id]/route.ts   # DELETE /api/orders/:id
│       ├── orderbook/
│       │   └── route.ts        # GET /api/orderbook
│       └── trades/
│           └── route.ts        # GET /api/trades
├── lib/
│   ├── matchingEngine.ts      # Core matching logic
│   ├── mongodb.ts             # Mongoose connection
│   └── models/
│       ├── Order.ts           # Order schema
│       └── Trade.ts           # Trade schema
├── types/
│   └── index.ts               # Shared TypeScript types
├── server/
│   └── index.js               # Custom server entry point
├── .env.local                 # Your environment (git-ignored)
├── .env.example               # Template
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## ⚙️ Matching Engine

Located in `lib/matchingEngine.ts`. Implements:

- **Price-time priority**: Orders at the same price are matched in FIFO order
- **Limit orders**: Only execute at specified price or better
- **Market orders**: Execute immediately at best available price; unfilled remainder is discarded
- **Partial fills**: Order splits across multiple counterparty orders
- **Order states**: `open` → `partiallyFilled` → `filled` | `cancelled`

### Matching rules

| New order | Matches against | Condition |
|-----------|-----------------|-----------|
| Buy limit | Lowest ask | `buy.price >= ask.price` |
| Sell limit | Highest bid | `sell.price <= bid.price` |
| Buy market | Lowest ask | Always (until filled or book empty) |
| Sell market | Highest bid | Always (until filled or book empty) |

---

## 🌐 API Reference

### `POST /api/orders`

Place a new order.

**Body:**
```json
{
  "userId": "string",
  "orderType": "limit" | "market",
  "side": "buy" | "sell",
  "price": 100.50,       // required for limit orders
  "quantity": 10
}
```

**Response:**
```json
{
  "finalOrder": { ...Order },
  "trades": [ ...Trade ],
  "orderBook": { "bids": [...], "asks": [...] }
}
```

**Rate limit:** 20 orders per 10 seconds per IP.

---

### `DELETE /api/orders/:id`

Cancel an open order.

**Response:**
```json
{ "success": true, "orderId": "ORD-XXXXXXXX" }
```

---

### `GET /api/orderbook`

Returns top 20 levels on each side.

```json
{
  "bids": [...Order],
  "asks": [...Order],
  "timestamp": 1234567890
}
```

---

### `GET /api/trades?limit=50`

Returns recent trades (max 200).

```json
{
  "trades": [...Trade],
  "count": 50
}
```

---

## 🔌 WebSocket Events

Connect via `socket.io-client` to `NEXT_PUBLIC_SOCKET_URL`.

| Event | Direction | Payload |
|-------|-----------|---------|
| `orderbook_update` | Server → Client | `OrderBook` |
| `trade_executed` | Server → Client | `Trade[]` |
| `order_placed` | Server → Client | `Order` |
| `order_cancelled` | Server → Client | `{ orderId }` |

---

## 🤖 Market Simulator

A bot runs automatically in `server/index.js` placing limit orders every ~2 seconds to maintain a live, liquid order book. Remove or adjust the `runBot()` call in `server/index.js` to disable it.

---

## 🗄 MongoDB Collections

### `orders`
```
orderId, userId, orderType, side, price, quantity,
remainingQuantity, status, timestamp
```
Indexed on: `orderId`, `userId`, `status + side + price + timestamp`

### `trades`
```
tradeId, buyOrderId, sellOrderId, price, quantity, timestamp
```
Indexed on: `tradeId`, `buyOrderId`, `sellOrderId`, `timestamp`

---

## 🔮 Bonus Features (roadmap)

- [ ] Redis caching for order book reads
- [ ] JWT authentication
- [ ] Multiple asset pairs
- [ ] Stop-limit orders
- [ ] Load testing with Artillery
- [ ] Performance metrics dashboard
