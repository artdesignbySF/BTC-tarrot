# Madame Satoshi's Bitcoin Tarot Automaton

🔮 A web-based simulation of a vintage fortune-telling automaton providing Bitcoin-themed Tarot readings via the Lightning Network.

---

## Table of Contents

*   [Overview](#overview)
*   [Features](#features)
    *   [Backend](#backend)
    *   [Frontend](#frontend)
*   [How it Works (User Flow)](#how-it-works-user-flow)
*   [Tech Stack](#tech-stack)
*   [Getting Started (on Replit)](#getting-started-on-replit)
*   [Status & Roadmap](#status--roadmap)
    *   [Known Issues](#known-issues)
    *   [Potential Next Steps](#potential-next-steps)
*   [Appendix: Bitcoin Tarot Card Concepts](#appendix-bitcoin-tarot-card-concepts)

---

## Overview

Madame Satoshi's is an interactive, web-based simulation of a vintage fortune-telling automaton. Users pay a small fee (21 sats) via the Lightning Network (using LNbits) to receive a three-card Major Arcana Tarot reading with a Bitcoin/crypto-themed fortune. The app features a shared jackpot pool funded by contributions from each play. Users can accumulate winnings from certain card combinations into a personal, persistent balance, which they can claim by providing a Lightning invoice.

---

## Features

### Backend (Node.js / Express / WebSockets / Replit DB) <a name="backend"></a>

*   **Web Server:** Serves static frontend files (`index.html`, `style.css`, `script.js`, images).
*   **LNbits Integration:**
    *   Connects to a configured LNbits instance (URL and Invoice/Read Key via Replit Secrets).
    *   Creates 21-sat invoices (`/api/create-invoice`) for users to pay.
    *   Checks the payment status of invoices (`/api/check-invoice/:payment_hash`).
    *   Decodes user-provided invoices during claims (`/api/claim-payout`) to verify amount.
    *   Pays out winnings by fulfilling the user's provided invoice (`/api/claim-payout`).
*   **Replit Database Persistence:**
    *   **Jackpot Pool:** Stores the shared `currentJackpotPool` value. Loaded on server start and updated (contribution added, wins subtracted) on each draw.
    *   **User Balances:** Stores individual `withdrawableBalance` for each user, keyed by a unique `sessionId`. Balances persist across browser refreshes for that session.
*   **Session Management:**
    *   Generates a unique `sessionId` for new visitors (`/api/session`) stored in the browser's `localStorage`.
    *   Retrieves user-specific balance from DB based on `sessionId` (`/api/balance/:sessionId`).
*   **Tarot & Fortune Logic (`/api/draw`):**
    *   Requires a valid `sessionId`.
    *   Adds the `JACKPOT_CONTRIBUTION` (16 sats) to the Jackpot Pool in DB.
    *   Draws 3 unique Major Arcana cards (from a 22-card deck).
    *   Calculates fortune text and potential `sats_won` based on tiered winning combinations (Jackpot, Major Win, Minor Win) and the current pool value (payouts capped at available pool).
    *   If `sats_won > 0`:
        *   Subtracts `sats_won` from the Jackpot Pool in DB.
        *   Adds `sats_won` to the user's specific balance in DB using their `sessionId`.
    *   Returns card data, fortune text, `sats_won_this_round`, the user's *new* total `user_balance`, and the final `current_jackpot` pool amount to the frontend.
*   **WebSocket Server:**
    *   Broadcasts the updated `currentJackpotPool` amount (fetched from DB) to all connected clients whenever the pool changes (after contribution and after win deduction).
    *   Sends the current Jackpot amount to newly connected clients.
*   **Claim Payout (`/api/claim-payout`):**
    *   Requires `sessionId` and a user-provided `userInvoice` (Bolt11).
    *   Retrieves the user's balance from DB.
    *   Decodes the `userInvoice` via LNbits to verify the amount matches the user's balance exactly.
    *   If valid, pays the invoice using the LNbits Invoice/Read Key.
    *   If payment is successful, resets the user's balance to 0 in the DB.
    *   Returns success/failure status to the frontend.

### Frontend (HTML / CSS / JavaScript) <a name="frontend"></a>

*   **Display:** Renders the automaton cabinet background image with overlayed interactive elements.
*   **Session Management:** On load, retrieves `sessionId` from `localStorage` or fetches a new one from the backend. Stores the received ID.
*   **Payment Flow:**
    *   "Insert 21 Sats" button triggers `/api/create-invoice`.
    *   Displays a payment modal with QR code (via `qrcode.min.js`) and invoice text.
    *   Supports click-to-copy for QR code and invoice text, providing visual feedback.
    *   Polls `/api/check-invoice/:payment_hash` until payment is confirmed or timeout.
    *   On confirmation, hides modal and triggers `/api/draw`.
*   **Card/Fortune Display:**
    *   Receives data from `/api/draw`.
    *   Displays the 3 drawn card images with a flip animation.
    *   Displays the received fortune text. Adds a `.fortune-win` class for visual emphasis on winning draws.
    *   Adds card names to image `title` attribute for hover info.
*   **Real-time Updates & Info:**
    *   Establishes WebSocket connection to receive live Jackpot updates.
    *   Displays current "Jackpot Pool" amount.
    *   Displays user's current "Withdrawable" balance (fetched on load and updated after draws/claims).
    *   Displays a static "Key Wins" section showing the Jackpot combo and a prompt to see the info panel.
*   **Information Panel:**
    *   Pulsing (ⓘ) icon toggles a scrollable panel containing concise rules, win tier info, and warnings.
*   **Claim Flow:**
    *   "Claim Winnings" button enabled when "Withdrawable" balance > 0.
    *   Opens a claim modal displaying the amount to claim.
    *   User pastes a Lightning invoice for the exact amount into a textarea.
    *   "Submit Claim" button triggers `/api/claim-payout`.
    *   Displays success or error messages in the modal. Resets balance display on success.

---

## How it Works (User Flow)

1.  **Visit:** User loads the page. Frontend gets/stores a unique `sessionId` and fetches the initial balance (usually 0) and Jackpot value. The "Insert 21 Sats" button becomes enabled.
2.  **Pay:** User clicks "Insert 21 Sats". Frontend requests an invoice from the backend. Backend uses LNbits to create a 21 sat invoice. Frontend displays QR/text and starts polling for payment confirmation.
3.  **Confirm & Draw:** User pays the invoice. Frontend polling detects payment via the backend check. Frontend requests a draw from the backend (`/api/draw`), sending its `sessionId`.
4.  **Backend Draw Logic:**
    *   Adds 16 sats (contribution) to the Jackpot Pool (Replit DB).
    *   Broadcasts the new Jackpot value via WebSocket.
    *   Draws 3 cards.
    *   Calculates fortune and potential `sats_won` based on cards and current Jackpot value.
    *   If a win occurs:
        *   Subtracts `sats_won` from Jackpot Pool (Replit DB).
        *   Broadcasts the *new* Jackpot value via WebSocket.
        *   Adds `sats_won` to the specific user's balance (Replit DB, using `sessionId`).
    *   Sends cards, fortune, win amount for *this round*, user's *total* balance, and final Jackpot value back to the frontend.
5.  **Display:** Frontend receives draw results. It flips the cards, shows the fortune (highlighting wins), updates the user's displayed "Withdrawable" balance, and updates the Jackpot display based on WebSocket messages.
6.  **Claim (Optional):** If user's balance > 0, they click "Claim Winnings". Frontend shows claim modal with the amount. User generates an invoice for that exact amount in their wallet and pastes it. Frontend sends `sessionId` and the invoice to `/api/claim-payout`.
7.  **Backend Claim Logic:** Backend verifies balance against DB, decodes invoice via LNbits, checks amount match. If OK, it pays the invoice using the LNbits API and resets the user's balance in DB to 0. Returns success/failure to frontend.
8.  **Claim Display:** Frontend shows success/error message. On success, the "Withdrawable" balance display updates to 0.

---

## Tech Stack

*   **Backend:** Node.js, Express.js, ws (WebSockets), axios, cors, dotenv, @replit/database, uuid
*   **Frontend:** HTML, CSS, JavaScript (ES6+), qrcode.min.js
*   **Platform:** Replit
*   **Payments:** LNbits

---

## Getting Started (on Replit)

1.  **Fork/Clone:** Get the code onto your Replit account.
2.  **Secrets:** Configure the following secrets in the Replit "Secrets" tab (Tools -> Secrets):
    *   `LNBITS_URL`: The full URL of your LNbits instance (e.g., `https://legend.lnbits.com`).
    *   `LNBITS_INVOICE_KEY`: Your Invoice/Read-only API key from LNbits (used for creating/checking invoices and *paying claims*). Ensure this key has payment capabilities if you want claims to work automatically.
3.  **Install Dependencies:** Open the "Shell" tab and run `npm install`.
4.  **Run:** Click the "Run" button at the top or type `npm start` in the Shell tab.

---

## Status & Roadmap

*   ✅ **Core Functionality:** Payment, drawing, fortunes, tiered wins, persistent jackpot/balances (DB), claims via invoice, real-time jackpot updates are implemented.
*   ✨ **UI/UX Enhancements:** Card flip animation, win/balance visual feedback, dynamic jackpot display, key wins info, info panel added.

### Known Issues

*   Investigating reports of potential withdrawable balance inconsistencies across different browser sessions/windows (e.g., Incognito). The `sessionId` *should* isolate balances, but requires further testing and verification under various conditions.

### Potential Next Steps

*   Resolve any confirmed balance isolation issues definitively.
*   Implement a distinct, possibly more secure or manual, payout mechanism for the main *Jackpot* win (as opposed to regular tiered wins added to balance). This might involve LNURL-Withdraw or an admin notification.
*   Add sound effects for immersion.
*   Consider implementing a "Free Play" or demo mode.
*   Further visual polish, animations, and responsiveness improvements.
*   Expand the variety of fortune text messages.

---

## Appendix: Bitcoin Tarot Card Concepts

This project uses custom Bitcoin/Lightning-themed interpretations for the 22 Major Arcana cards.

### 00. The Fool
**Visual:** An androgynous figure stands at the edge of a precipice, seemingly oblivious to the danger. They wear tattered, dark clothing with subtle circuit board patterns. A small, glowing Bitcoin symbol is attached to their back like a backpack. The background is a swirling vortex of dark colors, with faint lightning bolt patterns.
**Bitcoin/Lightning Theme:** Taking risks, embracing the unknown, volatility of crypto.

### I. The Magician
**Visual:** A figure with intense, glowing eyes stands behind a table covered in arcane symbols and tools. One hand holds a wand that emits a beam of light, while the other points downwards, grounding the energy. The table is adorned with a prominent Lightning Network node symbol.
**Bitcoin/Lightning Theme:** Skill, resourcefulness, manifesting desires, potential of blockchain tech.

### II. The High Priestess
**Visual:** A mysterious figure sits between two pillars, holding a scroll with encrypted symbols. A veil partially obscures their face. The pillars are etched with binary code and Bitcoin addresses.
**Bitcoin/Lightning Theme:** Intuition, secrets, hidden knowledge, anonymity/privacy aspects.

### III. The Empress
**Visual:** A regal figure sits on a throne, surrounded by lush vegetation and symbols of abundance. They wear a crown adorned with Bitcoin symbols and hold a scepter that emits a warm, golden light.
**Bitcoin/Lightning Theme:** Abundance, fertility, creativity, wealth generation, innovation.

### IV. The Emperor
**Visual:** A powerful figure sits on a throne, holding a scepter and wearing a crown. They exude authority and control. The throne is made of a dark, metallic material with circuit board patterns and Lightning Network node symbols.
**Bitcoin/Lightning Theme:** Structure, authority, control, regulation, established systems.

### V. The Hierophant
**Visual:** A wise figure sits on a throne, surrounded by two acolytes. They wear elaborate robes with intricate patterns and hold a staff with a Bitcoin symbol at the top.
**Bitcoin/Lightning Theme:** Tradition, conformity, established institutions, legacy finance view of crypto.

### VI. The Lovers
**Visual:** Two figures stand facing each other, connected by a beam of light emanating from a Bitcoin symbol between them. Surrounded by swirling energy.
**Bitcoin/Lightning Theme:** Choices, partnerships, harmony, collaboration, community.

### VII. The Chariot
**Visual:** A powerful figure stands in a chariot pulled by two creatures. Adorned with circuit patterns and Bitcoin symbols. Holds a scepter emitting a focused beam of light.
**Bitcoin/Lightning Theme:** Willpower, control, determination, drive, ambition in the crypto space.

### VIII. Strength
**Visual:** A figure gently tames a wild creature, exuding calm confidence. Subtle Lightning Network patterns woven into their clothing.
**Bitcoin/Lightning Theme:** Inner power, courage, resilience, navigating volatility.

### IX. The Hermit
**Visual:** A solitary figure in a dark landscape holds a lantern emitting a faint glow, revealing subtle Bitcoin symbols etched into rocks.
**Bitcoin/Lightning Theme:** Introspection, solitude, seeking wisdom, individualistic/decentralized nature.

### X. Wheel of Fortune
**Visual:** A large wheel marked with Bitcoin and Lightning Network symbols spins against a cosmic backdrop.
**Bitcoin/Lightning Theme:** Change, cycles, destiny, fluctuating values, market trends.

### XI. Justice
**Visual:** A figure holds a sword and scales symbolizing balance and fairness. Scales subtly designed with blockchain patterns.
**Bitcoin/Lightning Theme:** Fairness, truth, accountability, transparency, immutability.

### XII. The Hanged Man
**Visual:** A figure hangs upside down calmly, suggesting surrender. Faint Bitcoin symbols visible in the background.
**Bitcoin/Lightning Theme:** Sacrifice, surrender, shifting perspective, risk-taking, embracing change.

### XIII. Death
**Visual:** A skeletal figure rides a dark horse, holding a scythe, representing transformation (not menacing). Subtle circuit board patterns on horse's armor.
**Bitcoin/Lightning Theme:** Transformation, endings, new beginnings, disruptive nature of blockchain, market evolution.

### XIV. Temperance
**Visual:** A figure mixes substances between two glowing vessels, representing balance. Subtle Lightning Network symbols in the background.
**Bitcoin/Lightning Theme:** Balance, moderation, patience, measured approach to investment/development.

### XV. The Tower
**Visual:** A tall tower made of dark metallic material with circuit patterns and LN nodes is struck by lightning, crumbling. Figures fall.
**Bitcoin/Lightning Theme:** Sudden change, upheaval, destruction of old structures, disruptive potential, volatility. (*Note: Original description had this as XV, traditionally it's XVI. Adjusted numbering based on standard Tarot.*) **Re-checking... Ah, the *input* had Tower as XV. Let's keep the user's numbering for consistency with their project, even if non-standard.**

### XVI. The Star
**Visual:** A figure kneels by water, pouring from two vessels under stars. Clothing has subtle LN patterns. Stars resemble Bitcoin network nodes.
**Bitcoin/Lightning Theme:** Hope, inspiration, renewal, optimism, potential of blockchain. (*User's numbering*)

### XVII. The Moon
**Visual:** A dark, mysterious landscape with a large moon, two towers, and a path. Moon reveals subtle Bitcoin symbols in shadows.
**Bitcoin/Lightning Theme:** Intuition, fear, subconscious, uncertainty, hidden potential. (*User's numbering*)

### XVIII. The Sun
**Visual:** A bright, radiant sun (depicted as a glowing Bitcoin symbol) shines on a joyful scene.
**Bitcoin/Lightning Theme:** Joy, success, vitality, wealth generation, positive impact. (*User's numbering*)

### XIX. Judgment
**Visual:** Figures rise from graves summoned by an angel's trumpet emitting light forming an LN connection.
**Bitcoin/Lightning Theme:** Awakening, rebirth, transformation, disruptive nature of blockchain. (*User's numbering*)

### XX. The World
**Visual:** A figure dances within a wreath composed of interconnected LN nodes (global network). Surrounded by symbols of elements.
**Bitcoin/Lightning Theme:** Completion, fulfillment, global connection, potential for interconnected/equitable world. (*User's numbering*)

### XXI. Ace of Pentacles
**Visual:** A hand holds a large coin resembling a physical Bitcoin, glowing center. Surrounded by abundance symbols.
**Bitcoin/Lightning Theme:** New beginnings, material wealth, prosperity, financial gain, economic empowerment. (*Note: This is often considered a Minor Arcana card, but included here as per the user's list.*)
