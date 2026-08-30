# ⚡ AgenteSmart WebSockets — Real-Time WhatsApp Bridge

[![Node.js](https://img.shields.io/badge/Node.js-WebSockets%20Server-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

A high-performance **Node.js / TypeScript WebSockets Server** engineered to provide bi-directional, real-time message tunneling between **WhatsApp messaging clients** and the **AgenteSmart** conversational backend.

Part of the **AgenteSmart Full-Stack Suite**:
- 🖥️ [**`agenteSmart-frontend`**](https://github.com/jgu7man/agenteSmart-frontend) (Visual Angular Dashboard)
- ⚙️ [**`agenteSmart-backend`**](https://github.com/jgu7man/agenteSmart-backend) (Firebase Cloud Functions & Firestore API)
- ⚡ [**`agentesmart-ws`**](https://github.com/jgu7man/agentesmart-ws) (Real-Time WebSockets WhatsApp Bridge)

---

## 🏗️ Real-Time Tunneling Architecture

```mermaid
flowchart LR
    WhatsApp["📱 WhatsApp Client / Gateway"] <--> Sockets["⚡ agentesmart-ws<br/>(Socket.io / ws Event Loop)"]
    Sockets <--> Backend["⚙️ agenteSmart-backend<br/>(Cloud Functions API)"]
    Backend <--> Dialogflow["🤖 Dialogflow Conversational Engine"]
```

---

## ✨ Features

- ⚡ **Low-Latency Event Loop:** Handles concurrent persistent WebSocket connections with minimal memory overhead.
- 🔄 **Bidirectional Event Dispatching:** Relays user inbound text/media events to backend and pushes bot responses back to WhatsApp.
- 🛡️ **Connection Heartbeats & Auto-Reconnect:** Resilient ping/pong mechanisms to prevent socket drops on mobile networks.

---

## 📄 License
Distributed under the [MIT License](LICENSE). Created by [Jorge Guzmán (@jgu7man)](https://github.com/jgu7man).
