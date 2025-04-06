// --- START OF FILE backend/index.js (Corrected Route Order) ---
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const Client = require("@replit/database");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.PORT || 3001;
const db = new Client();

// --- LNbits Configuration ---
const lnbitsUrl = process.env.LNBITS_URL;
const lnbitsInvoiceKey = process.env.LNBITS_INVOICE_KEY;
const PAYMENT_AMOUNT_SATS = 21;
const INVOICE_MEMO = "Madame Satoshi Reading";

// --- Jackpot Pool ---
const JACKPOT_DB_KEY = "currentJackpotPool_v1";
const JACKPOT_CONTRIBUTION = Math.floor(PAYMENT_AMOUNT_SATS * 0.8);
const MIN_JACKPOT_SEED = 500;

// --- Middleware & Config Check ---
if (!lnbitsUrl || !lnbitsInvoiceKey) {
    console.warn("!!! WARNING: LNBITS config missing !!!");
}
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// --- Tarot Card Data & Logic (Restored Original Logic) ---
const majorArcana = [
    { name: "00 The Fool", image: "0-fool.webp" },
    { name: "I The Magician", image: "1-magician.webp" },
    { name: "II The High Priestess", image: "2-high-priestess.webp" },
    { name: "III The Empress", image: "3-empress.webp" },
    { name: "IV The Emperor", image: "4-emperor.webp" },
    { name: "V The Hierophant", image: "5-hierophant.webp" },
    { name: "VI The Lovers", image: "6-lovers.webp" },
    { name: "VII The Chariot", image: "7-chariot.webp" },
    { name: "VIII Strength", image: "8-strength.webp" },
    { name: "IX The Hermit", image: "9-hermit.webp" },
    { name: "X Wheel of Fortune", image: "10-wheel-of-fortune.webp" },
    { name: "XI Justice", image: "11-justice.webp" },
    { name: "XII The Hanged Man", image: "12-hanged-man.webp" },
    { name: "XIII Death", image: "13-death.webp" },
    { name: "XIV Temperance", image: "14-temperance.webp" },
    { name: "XV The Tower", image: "15-tower.webp" },
    { name: "XVI The Star", image: "16-star.webp" },
    { name: "XVII The Moon", image: "17-moon.webp" },
    { name: "XVIII The Sun", image: "18-sun.webp" },
    { name: "XIX Judgment", image: "19-judgement.webp" },
    { name: "XX The World", image: "20-world.webp" },
    { name: "XXI Ace of Pentacles", image: "21-ace-of-pentacles.webp" },
];
function drawCards() {
    const deck = [...majorArcana];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.slice(0, 3);
}
function calculateFortune(drawnCardObjects, poolAmount) {
    let fortune = "";
    let sats_won = 0;
    let isJackpotWin = false;
    const cardNames = drawnCardObjects.map((cardObj) => {
        const parts = cardObj.name.split(" ");
        return parts.length > 2 ? parts.slice(1).join(" ") : parts[1];
    });
    let messageAssigned = false;
    const choose = (options) =>
        options[Math.floor(Math.random() * options.length)];
    const TIER_S_PERCENT = 1.0;
    const TIER_A_PERCENT = 0.35;
    const TIER_A_MIN_SATS = 75;
    const TIER_B_PERCENT = 0.15;
    const TIER_B_MIN_SATS = 21;
    const effectiveJackpotPool = Math.max(poolAmount, MIN_JACKPOT_SEED);
    if (
        cardNames.includes("The Sun") &&
        cardNames.includes("The World") &&
        cardNames.includes("The Magician")
    ) {
        let potentialWin = effectiveJackpotPool;
        if (potentialWin < MIN_JACKPOT_SEED) potentialWin = MIN_JACKPOT_SEED;
        sats_won = Math.min(potentialWin, poolAmount);
        fortune = `*** JACKPOT! *** Sun, World, Magician! Ultimate Bitcoin alignment! ${sats_won} sats added to your balance!`;
        isJackpotWin = true;
        messageAssigned = true;
    } else if (
        cardNames.includes("The Sun") &&
        cardNames.includes("The World") &&
        cardNames.includes("Ace of Pentacles")
    ) {
        let potentialWin = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(potentialWin, poolAmount);
        fortune = `Major Win! Brilliance, completion, and new wealth! +${sats_won} sats to your balance!`;
        messageAssigned = true;
    } else if (
        cardNames.includes("The Emperor") &&
        cardNames.includes("The Empress") &&
        cardNames.includes("Strength")
    ) {
        let potentialWin = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(potentialWin, poolAmount);
        fortune = `Major Win! Sovereign power and inner fortitude! +${sats_won} sats to your balance!`;
        messageAssigned = true;
    } else if (
        cardNames.includes("The Star") &&
        cardNames.includes("The Sun") &&
        cardNames.includes("Temperance")
    ) {
        let potentialWin = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(potentialWin, poolAmount);
        fortune = `Major Win! Hope, clarity, and balance unite! +${sats_won} sats to your balance!`;
        messageAssigned = true;
    } else if (
        cardNames.includes("Ace of Pentacles") &&
        cardNames.includes("Wheel of Fortune")
    ) {
        let potentialWin = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(potentialWin, poolAmount);
        fortune = `Minor Win! Opportunity meets good fortune! +${sats_won} sats to your balance!`;
        messageAssigned = true;
    } else if (
        cardNames.includes("The Chariot") &&
        cardNames.includes("Strength")
    ) {
        let potentialWin = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(potentialWin, poolAmount);
        fortune = `Minor Win! Focused willpower and courage! +${sats_won} sats to your balance!`;
        messageAssigned = true;
    } else if (
        cardNames.includes("The Sun") &&
        cardNames.includes("The Lovers")
    ) {
        let potentialWin = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(potentialWin, poolAmount);
        fortune = `Minor Win! Joyful alignment and connection! +${sats_won} sats to your balance!`;
        messageAssigned = true;
    }
    if (!messageAssigned) {
        if (cardNames.includes("The Moon") && cardNames.includes("The Fool")) {
            fortune = choose([
                "Illusion & recklessness (Moon & Fool)! Avoid shadowy shitcoin projects.",
                "Deception & poor judgment (Moon & Fool)! Don't FOMO into scams.",
            ]);
        } else if (
            cardNames.includes("The Tower") &&
            cardNames.includes("Death")
        ) {
            fortune =
                "Warning! Sudden upheaval meets finality (Tower, Death). Brace for significant, hard changes.";
        } else if (cardNames.includes("The Tower")) {
            fortune = choose([
                "Sudden disruption (The Tower)! Weak foundations may crumble.",
                "Sudden change hits (The Tower)! Secure your keys.",
            ]);
        } else if (
            cardNames.includes("The Hanged Man") &&
            cardNames.includes("The Moon")
        ) {
            fortune =
                "Warning! Suspension and illusion combine (Hanged Man, Moon). Pause is needed.";
        } else if (cardNames.includes("The Hanged Man")) {
            fortune = choose([
                "A pause for perspective (Hanged Man). Re-evaluate; understand core value.",
                "Suspension required (Hanged Man). Seek a different viewpoint.",
            ]);
        } else if (cardNames.includes("The Moon")) {
            fortune = choose([
                "Uncertainty and FUD abound (The Moon). Trust transparency.",
                "Hidden factors at play (The Moon). Rely on verifiable nature.",
            ]);
        } else if (cardNames.includes("Death")) {
            fortune = choose([
                "Endings bring new beginnings (Death). Prune failing assets.",
                "Necessary endings arrive (Death). Rebuild stronger.",
            ]);
        } else if (cardNames.includes("Ace of Pentacles")) {
            fortune = choose([
                "New opportunities manifest (Ace of Pentacles)!",
                "Material beginnings flourish (Ace of Pentacles).",
            ]);
        } else if (cardNames.includes("The Star")) {
            fortune = choose([
                "Hope and inspiration shine (The Star)!",
                "Guidance & healing light the way (The Star).",
            ]);
        } else if (cardNames.includes("The Sun")) {
            fortune = choose([
                "Clarity and success illuminate your path (The Sun)!",
                "Vitality & joy abound (The Sun)!",
            ]);
        } else if (cardNames.includes("The World")) {
            fortune = choose([
                "Completion and integration (The World)! Bitcoin connects you globally.",
                "Achievement & wholeness arrive (The World).",
            ]);
        } else if (cardNames.includes("The Magician")) {
            fortune = choose([
                "Manifest your vision (The Magician)! Use your skills on Lightning.",
                "Willpower & resources are yours (The Magician)!",
            ]);
        } else if (cardNames.includes("Strength")) {
            fortune = choose([
                "Inner fortitude needed (Strength). HODL through volatility.",
                "Courage & patience required (Strength).",
            ]);
        } else if (cardNames.includes("The Empress")) {
            fortune = choose([
                "Nurture your sats (The Empress). Consistent stacking yields abundance.",
                "Fertility & growth abound (The Empress).",
            ]);
        } else if (cardNames.includes("The Chariot")) {
            fortune = choose([
                "Drive forward with focus (The Chariot).",
                "Control & determination lead (The Chariot).",
            ]);
        } else if (cardNames.includes("Temperance")) {
            fortune = choose([
                "Balance is key (Temperance). Integrate Bitcoin thoughtfully.",
                "Harmony & patience prevail (Temperance).",
            ]);
        } else if (cardNames.includes("Justice")) {
            fortune = choose([
                "Fairness and balance prevail (Justice). Bitcoin's protocol ensures rules.",
                "Truth & consequences matter (Justice).",
            ]);
        } else if (cardNames.includes("Judgment")) {
            fortune = choose([
                "A call to awareness (Judgment). Assess your Bitcoin path.",
                "Rebirth & awakening possible (Judgment).",
            ]);
        } else if (cardNames.includes("The Lovers")) {
            fortune = choose([
                "Meaningful choices present (The Lovers). Align your values with Bitcoin.",
                "Harmony & relationships matter (The Lovers).",
            ]);
        } else if (cardNames.includes("The High Priestess")) {
            fortune = choose([
                "Trust your intuition (High Priestess), backed by knowledge.",
                "Unveil mystery with wisdom (High Priestess).",
            ]);
        } else if (cardNames.includes("The Emperor")) {
            fortune = choose([
                "Structure and authority required (The Emperor).",
                "Leadership & stability matter (The Emperor).",
            ]);
        } else if (cardNames.includes("The Hierophant")) {
            fortune = choose([
                "Learn from tradition (Hierophant), but verify yourself.",
                "Seek guidance but confirm (Hierophant).",
            ]);
        } else if (cardNames.includes("Wheel of Fortune")) {
            fortune = choose([
                "Market cycles turn (Wheel of Fortune). Consider DCA.",
                "Change & destiny unfold (Wheel of Fortune). Adapt to swings.",
            ]);
        } else if (cardNames.includes("The Hermit")) {
            fortune = choose([
                "Seek wisdom (The Hermit). Deepen your Bitcoin knowledge.",
                "Introspection needed (The Hermit). Study deeply.",
            ]);
        } else if (cardNames.includes("The Fool")) {
            fortune = choose([
                "A new journey begins (The Fool)! Learn first.",
                "Innocence & potential arise (The Fool)! Mind risk.",
            ]);
        } else {
            const genericFortunes = [
                "The path unfolds...",
                "The ledger guides...",
                "Low time preference is rewarded...",
                "Focus on fundamentals...",
                "Observe the market...",
                "Patience is a virtue...",
                "Study is wise...",
                "Network effects strengthen...",
                "Not your keys, not your coins.",
                "Lightning offers speed...",
            ];
            fortune = choose(genericFortunes);
        }
    }
    if (fortune === "") {
        fortune = "The blockchain remains enigmatic...";
    }
    return {
        fortune: fortune,
        sats_won: Math.max(0, Math.floor(sats_won)),
        is_jackpot: isJackpotWin,
    };
}

// --- Helper Functions for DB (User Balance & Jackpot) ---
async function getUserBalance(sessionId) {
    if (!sessionId) return 0;
    const balance = await db.get(`balance_${sessionId}`);
    return Math.max(0, parseInt(balance || 0));
}
async function updateUserBalance(sessionId, amountToAdd) {
    if (!sessionId || isNaN(amountToAdd)) return;
    const currentBalance = await getUserBalance(sessionId);
    const newBalance = Math.max(0, currentBalance + Math.floor(amountToAdd));
    await db.set(`balance_${sessionId}`, newBalance);
    console.log(
        ` -> Session ${sessionId.substring(0, 6)} balance updated: ${currentBalance} + ${Math.floor(amountToAdd)} = ${newBalance}`,
    );
    return newBalance;
}
async function resetUserBalance(sessionId) {
    if (!sessionId) return false;
    await db.set(`balance_${sessionId}`, 0);
    console.log(` -> Session ${sessionId.substring(0, 6)} balance reset to 0.`);
    return true;
}
async function getJackpot() {
    const pool = await db.get(JACKPOT_DB_KEY);
    return Math.max(0, parseInt(pool || 0));
}
async function updateJackpot(amountChange) {
    if (isNaN(amountChange)) return;
    const currentPool = await getJackpot();
    const newPool = Math.max(0, currentPool + Math.floor(amountChange));
    await db.set(JACKPOT_DB_KEY, newPool);
    console.log(
        ` -> Jackpot DB updated: ${currentPool} + ${Math.floor(amountChange)} = ${newPool}`,
    );
    return newPool;
}

// --- API Routes ---
app.get("/api/session", (req, res) => {
    const sessionId = uuidv4();
    console.log(`Generated session ID: ${sessionId.substring(0, 6)}...`);
    res.json({ sessionId: sessionId });
});
app.get("/api/balance/:sessionId", async (req, res) => {
    const sessionId = req.params.sessionId;
    if (!sessionId)
        return res.status(400).json({ error: "Session ID required." });
    try {
        const balance = await getUserBalance(sessionId);
        res.json({ balance: balance });
    } catch (error) {
        console.error(
            `Error fetching balance for session ${sessionId.substring(0, 6)}:`,
            error,
        );
        res.status(500).json({ error: "Failed to fetch balance." });
    }
});
app.post("/api/draw", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId)
        return res.status(400).json({ error: "Session ID is required." });
    console.log(
        `Request received: /api/draw for session ${sessionId.substring(0, 6)}...`,
    );
    try {
        let currentPoolValue = await getJackpot();
        let poolAfterContribution = await updateJackpot(JACKPOT_CONTRIBUTION);
        await broadcastJackpotUpdate();
        const drawnCardObjects = drawCards();
        const fortuneResult = calculateFortune(
            drawnCardObjects,
            poolAfterContribution,
        );
        let actualSatsWon = fortuneResult.sats_won;
        let userNewTotalBalance = 0;
        let finalPoolValue = poolAfterContribution;
        if (actualSatsWon > 0) {
            console.log(` -> Raw Win Calculated: ${actualSatsWon} sats`);
            try {
                finalPoolValue = await updateJackpot(-actualSatsWon);
                await broadcastJackpotUpdate();
            } catch (dbError) {
                console.error(
                    ` !! CRITICAL: Failed to update jackpot DB after win!`,
                    dbError,
                );
            }
            try {
                userNewTotalBalance = await updateUserBalance(
                    sessionId,
                    actualSatsWon,
                );
            } catch (dbError) {
                console.error(
                    ` !! CRITICAL: Failed to update user balance after win!`,
                    dbError,
                );
                actualSatsWon = 0;
            }
        } else {
            try {
                userNewTotalBalance = await getUserBalance(sessionId);
            } catch (dbError) {
                console.error(`Error fetching balance (no win):`, dbError);
            }
        }
        console.log(" -> Draw Results:", {
            cards: drawnCardObjects.map((c) => c.name),
            fortune: fortuneResult.fortune,
            sats_actually_won_this_round: actualSatsWon,
            user_total_withdrawable_balance: userNewTotalBalance,
            current_jackpot: finalPoolValue,
        });
        res.json({
            cards: drawnCardObjects,
            fortune: fortuneResult.fortune,
            sats_won_this_round: actualSatsWon,
            user_balance: userNewTotalBalance,
            current_jackpot: finalPoolValue,
        });
    } catch (error) {
        console.error("Error in /api/draw handler:", error);
        if (!res.headersSent)
            res.status(500).json({
                error: "Internal server error during draw.",
            });
    }
});
app.post("/api/create-invoice", async (req, res) => {
    console.log(
        `Request received: /api/create-invoice for ${PAYMENT_AMOUNT_SATS} sats`,
    );
    if (!lnbitsUrl || !lnbitsInvoiceKey) {
        console.error(" /api/create-invoice error: LNbits config missing.");
        return res
            .status(500)
            .json({ error: "LNbits backend configuration missing." });
    }
    try {
        console.log(
            ` -> Contacting LNbits at ${lnbitsUrl} to create invoice...`,
        );
        const response = await axios.post(
            `${lnbitsUrl}/api/v1/payments`,
            { out: false, amount: PAYMENT_AMOUNT_SATS, memo: INVOICE_MEMO },
            {
                headers: {
                    "X-Api-Key": lnbitsInvoiceKey,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            },
        );
        if (!response.data?.payment_hash || !response.data?.payment_request) {
            console.error(" -> LNbits response missing data:", response.data);
            throw new Error("Invalid response received from LNbits API.");
        }
        console.log(
            " -> LNbits invoice created. Hash:",
            response.data.payment_hash.substring(0, 10) + "...",
        );
        res.json({
            payment_hash: response.data.payment_hash,
            payment_request: response.data.payment_request,
        });
    } catch (error) {
        console.error("--- ERROR calling LNbits /api/v1/payments ---");
        if (error.response) {
            console.error("LNbits Response Status:", error.response.status);
            console.error("LNbits Response Data:", error.response.data);
        } else if (error.request) {
            console.error(
                "No response received from LNbits.",
                error.code === "ECONNABORTED"
                    ? "(Request Timed Out)"
                    : `Code: ${error.code}`,
            );
        } else {
            console.error("Axios Setup Error:", error.message);
        }
        console.error("---------------------------------------------");
        if (!res.headersSent)
            res.status(500).json({
                error: "Failed to create Lightning invoice.",
            });
    }
});
app.get("/api/check-invoice/:payment_hash", async (req, res) => {
    const paymentHash = req.params.payment_hash;
    if (!lnbitsUrl || !lnbitsInvoiceKey)
        return res.status(500).json({ error: "LNbits config missing." });
    if (!paymentHash || paymentHash.length !== 64)
        return res.status(400).json({ error: "Invalid payment hash." });
    try {
        const response = await axios.get(
            `${lnbitsUrl}/api/v1/payments/${paymentHash}`,
            {
                headers: {
                    "X-Api-Key": lnbitsInvoiceKey,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            },
        );
        res.json({ paid: response.data?.paid === true });
    } catch (error) {
        if (error.response && error.response.status === 404)
            res.json({ paid: false });
        else {
            console.error(
                ` Error checking LNbits invoice ${paymentHash.substring(0, 10)}...:`,
                error.message,
            );
            res.status(500).json({ error: "Failed to check invoice status." });
        }
    }
});
app.post("/api/claim-payout", async (req, res) => {
    const { sessionId, userInvoice } = req.body;
    if (!sessionId || !userInvoice)
        return res
            .status(400)
            .json({ error: "Session ID and user invoice required." });
    if (!lnbitsUrl || !lnbitsInvoiceKey)
        return res.status(500).json({ error: "Payout service config error." });
    console.log(
        `Request received: /api/claim-payout for session ${sessionId.substring(0, 6)}...`,
    );
    try {
        const balance = await getUserBalance(sessionId);
        console.log(` -> Current balance: ${balance} sats`);
        if (balance <= 0)
            return res.status(400).json({ error: "Insufficient balance." });
        let decodedInvoice;
        try {
            console.log(" -> Decoding user invoice...");
            const decodeResponse = await axios.post(
                `${lnbitsUrl}/api/v1/payments/decode`,
                { data: userInvoice },
                {
                    headers: {
                        "X-Api-Key": lnbitsInvoiceKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                },
            );
            decodedInvoice = decodeResponse.data;
            if (
                !decodedInvoice ||
                typeof decodedInvoice.amount_msat === "undefined"
            )
                throw new Error("Invalid decode response");
            console.log(
                ` -> Decoded amount: ${decodedInvoice.amount_msat / 1000} sats`,
            );
        } catch (decodeError) {
            console.error(" -> Error decoding invoice:", decodeError.message);
            return res
                .status(400)
                .json({ error: "Invalid Lightning invoice." });
        }
        const invoiceAmountSats = decodedInvoice.amount_msat / 1000;
        if (invoiceAmountSats !== balance)
            return res
                .status(400)
                .json({
                    error: `Invoice amount (${invoiceAmountSats}) must match balance (${balance}).`,
                });
        console.log(` -> Paying invoice for ${balance} sats...`);
        let paymentResponse;
        try {
            paymentResponse = await axios.post(
                `${lnbitsUrl}/api/v1/payments`,
                { out: true, bolt11: userInvoice },
                {
                    headers: {
                        "X-Api-Key": lnbitsInvoiceKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 45000,
                },
            );
            if (!paymentResponse.data || !paymentResponse.data.payment_hash)
                throw new Error("LNbits payment API invalid response.");
            console.log(
                ` -> Payment successful! Hash: ${paymentResponse.data.payment_hash.substring(0, 10)}...`,
            );
        } catch (paymentError) {
            console.error(
                " -> Error paying invoice:",
                paymentError.response
                    ? paymentError.response.data
                    : paymentError.message,
            );
            let errorDetail = "Payment failed via LNbits.";
            if (paymentError.response?.data?.detail) {
                errorDetail = paymentError.response.data.detail;
                if (errorDetail.toLowerCase().includes("insufficient balance"))
                    errorDetail = "Operator wallet insufficient funds.";
            }
            return res
                .status(500)
                .json({ error: "Payout failed.", details: errorDetail });
        }
        const resetSuccess = await resetUserBalance(sessionId);
        if (!resetSuccess)
            console.error(
                ` !! CRITICAL: Payment sent (${paymentResponse.data.payment_hash}) but failed to reset balance for ${sessionId.substring(0, 6)}!`,
            );
        res.json({
            success: true,
            paid_amount: balance,
            payment_hash: paymentResponse.data.payment_hash,
        });
    } catch (error) {
        console.error(` Error during /api/claim-payout:`, error.message);
        if (!res.headersSent)
            res.status(500).json({ error: "Internal error during claim." });
    }
});

// --- Simple Test Endpoint (Defined BEFORE Catch-all) ---
app.get("/ping", (req, res) => {
    console.log(">>> Received /ping request <<<");
    res.send("pong");
});

// --- Catch-all Route (MUST BE LAST route definition before listen) ---
app.get("*", (req, res) => {
    if (req.path.startsWith("/api/") || req.path.includes(".")) {
        console.log(`Catch-all: Sending 404 for ${req.method} ${req.path}`);
        return res.status(404).send("Not Found");
    }
    console.log(`Catch-all: Serving index.html for ${req.method} ${req.path}`);
    res.sendFile(path.resolve(__dirname, "../frontend", "index.html"));
});

// --- Start Server & WebSocket ---
const server = app.listen(port, "0.0.0.0", async () => {
    console.log(`Madame Satoshi Backend listening on port ${port}`);
    try {
        const initialJackpot = await getJackpot();
        console.log(`Initial Jackpot Pool loaded: ${initialJackpot} sats`);
    } catch (dbError) {
        console.error("!!! FAILED to load initial jackpot:", dbError);
    }
    if (lnbitsUrl && lnbitsInvoiceKey)
        console.log("LNbits configured (Invoice Key).");
    else console.warn("!!! LNbits config MISSING.");
});

// --- WebSocket Setup ---
const wss = new WebSocket.Server({ server });
let clients = new Set();
console.log("WebSocket Server initializing...");
wss.on("connection", async (ws) => {
    clients.add(ws);
    console.log(`WS Client connected. Total: ${clients.size}`);
    try {
        const currentPool = await getJackpot();
        ws.send(JSON.stringify({ type: "jackpotUpdate", amount: currentPool }));
    } catch (err) {
        console.error("Error sending initial jackpot via WS:", err);
    }
    ws.on("message", (message) => {});
    ws.on("close", () => {
        clients.delete(ws);
    });
    ws.on("error", (error) => {
        console.error("WS Error:", error);
        clients.delete(ws);
    });
});
async function broadcastJackpotUpdate() {
    if (clients.size === 0) return;
    try {
        const currentPool = await getJackpot();
        const message = JSON.stringify({
            type: "jackpotUpdate",
            amount: currentPool,
        });
        console.log(
            `Broadcasting jackpot: ${currentPool} sats to ${clients.size} clients`,
        );
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message, (err) => {
                    if (err) console.error("Error sending ws message:", err);
                });
            }
        });
    } catch (dbError) {
        console.error("!!! FAILED get jackpot for broadcast:", dbError);
    }
}
console.log("WebSocket Server setup complete.");
// --- END OF FILE backend/index.js ---
