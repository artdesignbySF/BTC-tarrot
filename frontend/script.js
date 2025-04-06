// --- START OF FILE frontend/script.js ---
document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const drawButton = document.getElementById("draw-button");
    const cardDisplay = document.getElementById("card-display");
    const fortuneDisplay = document.getElementById("fortune-display");
    const jackpotInfo = document.getElementById("jackpot-info");
    const balanceInfo = document.getElementById("balance-info");
    const infoTrigger = document.getElementById("info-trigger");
    const instructionsArea = document.getElementById("instructions-area");
    const claimButton = document.getElementById("claim-button");
    const paymentModal = document.getElementById("payment-modal");
    const modalCloseButton = document.getElementById("modal-close-button");
    const qrcodeContainer = document.getElementById("qrcode-container");
    const paymentStatus = document.getElementById("payment-status");
    const claimModal = document.getElementById("claim-modal");
    const claimModalCloseButton = document.getElementById( "claim-modal-close-button" );
    const claimInstructions = document.getElementById("claim-instructions");
    const claimAmountSpan = document.getElementById("claim-amount");
    const claimInvoiceInput = document.getElementById("claim-invoice-input");
    const submitClaimButton = document.getElementById("submit-claim-button");
    const claimStatus = document.getElementById("claim-status");

    // --- Constants and State Variables ---
    const SESSION_URL = "/api/session"; const BALANCE_URL_BASE = "/api/balance/"; const CREATE_INVOICE_URL = "/api/create-invoice"; const CHECK_INVOICE_URL_BASE = "/api/check-invoice/"; const DRAW_CARDS_URL = "/api/draw"; const CLAIM_PAYOUT_URL = "/api/claim-payout";
    const POLLING_INTERVAL_MS = 3000; const POLLING_TIMEOUT_MS = 300000;
    let currentJackpotDisplay = 0; let currentWithdrawableBalance = 0; let sessionId = localStorage.getItem("madameSatoshiSessionId") || null; let pollingIntervalId = null; let paymentHash = null; let pollingTimeoutId = null; let currentInvoiceString = ""; let socket = null; let wsReconnectTimeout = null; let isClaiming = false;

    // --- Helper Functions ---
    function resetButtonState(enabled, text) { if (!drawButton) return; drawButton.disabled = !enabled; if (text) { drawButton.textContent = text; } }

    async function initializeSession() {
        console.log("--- initializeSession ---"); // LOG
        resetButtonState(false, "Initializing...");

        sessionId = localStorage.getItem("madameSatoshiSessionId") || null; // Re-check localStorage directly

        if (sessionId) {
            console.log("Found stored session ID:", sessionId.substring(0, 6) + "...");
            console.log("-> Optimistically enabling draw button.");
            resetButtonState(true, "Insert 21 Sats");
            await fetchBalance(); // Fetch balance, might disable button if invalid
        } else {
            console.log("No stored session ID found, fetching new one...");
            try {
                const response = await fetch(SESSION_URL); if (!response.ok) throw new Error(`Session fetch failed: ${response.status}`);
                const data = await response.json(); if (!data.sessionId) throw new Error("No sessionId received.");
                sessionId = data.sessionId;
                localStorage.setItem("madameSatoshiSessionId", sessionId);
                console.log("New session ID obtained:", sessionId.substring(0, 6) + "...");
                updateBalanceDisplay(0); if(claimButton) claimButton.disabled = true;
                resetButtonState(true, "Insert 21 Sats"); // Enable on new session success
            } catch (error) {
                console.error("Error initializing new session:", error); displayError("Could not establish session. Please refresh.", false);
                resetButtonState(false, "Session Error"); if(claimButton) claimButton.disabled = true;
            }
        }
         console.log("initializeSession finished. Current session ID:", sessionId ? sessionId.substring(0,6)+'...' : 'None'); // LOG
    }

    async function fetchBalance() {
        if (!sessionId) { console.log("fetchBalance skipped: no sessionId."); return; }
        console.log(`fetchBalance: Checking balance for session ${sessionId.substring(0,6)}...`); // LOG session used
        try {
            const response = await fetch(BALANCE_URL_BASE + sessionId);
            if (!response.ok) {
                if (response.status === 404 || response.status === 400) {
                    console.warn(`fetchBalance: Session ID ${sessionId.substring(0,6)} invalid on backend. Clearing.`);
                    localStorage.removeItem("madameSatoshiSessionId");
                    const oldSessionId = sessionId; // Keep for logging
                    sessionId = null;
                    displayError("Session expired. Please refresh.", false);
                    resetButtonState(false, "Session Error"); if(claimButton) claimButton.disabled = true; updateBalanceDisplay(0);
                    console.log("fetchBalance: Invalidated session ID:", oldSessionId ? oldSessionId.substring(0,6)+'...' : 'null'); // LOG invalidated ID
                } else { console.error(`fetchBalance: Status ${response.status}.`); }
                return;
            }
            const data = await response.json();
            if (typeof data.balance === "number") {
                console.log(`fetchBalance: Balance for ${sessionId.substring(0,6)} is ${data.balance}`); // LOG balance fetched
                updateBalanceDisplay(data.balance);
                if(sessionId && drawButton && drawButton.disabled) { console.log("fetchBalance: Re-enabling draw button."); resetButtonState(true, "Insert 21 Sats"); }
            } else { console.warn("fetchBalance: Invalid balance data received:", data); }
        } catch (error) { console.error("fetchBalance: Network error fetching balance:", error); }
    }

    function createSingleCard(cardData) { const cardElement = document.createElement("div"); cardElement.classList.add("card"); const img = document.createElement("img"); img.src = `cards/${cardData.image}`; img.alt = cardData.name; img.title = cardData.name; cardElement.appendChild(img); return cardElement; }
    function displayError( message, isPaymentModalError = false, isClaimModalError = false ) { console.error(`Error: ${message}`, isPaymentModalError ? "(Payment Modal)" : isClaimModalError ? "(Claim Modal)" : "(Main Display)"); let targetDisplay; if(isPaymentModalError && paymentStatus) { targetDisplay = paymentStatus; paymentStatus.className = "error"; } else if (isClaimModalError && claimStatus) { targetDisplay = claimStatus; claimStatus.className = "claim-status-area error"; if(submitClaimButton) submitClaimButton.disabled = false; isClaiming = false; } else if (fortuneDisplay) { targetDisplay = fortuneDisplay; fortuneDisplay.classList.remove("fortune-visible", "showing-invoice", "clickable-invoice", "copy-success", "fortune-win"); fortuneDisplay.style.opacity = "1"; fortuneDisplay.style.cursor = "default"; fortuneDisplay.title = ""; if(cardDisplay) cardDisplay.innerHTML = ""; } else { console.error("Cannot find target for error message."); return; } targetDisplay.textContent = `Error: ${message}`; targetDisplay.style.color = "#ff6b6b"; }
    function resetFortuneDisplay(message = "Madame Satoshi awaits...") { if (!fortuneDisplay || !cardDisplay) return; fortuneDisplay.classList.remove( "showing-invoice", "fortune-visible", "clickable-invoice", "copy-success", "fortune-win"); fortuneDisplay.style.opacity = "1"; fortuneDisplay.style.color = "#e8d8b8"; fortuneDisplay.style.cursor = "default"; fortuneDisplay.title = ""; fortuneDisplay.textContent = message; cardDisplay.innerHTML = ""; currentInvoiceString = ""; }
    function showPaymentModal(invoice, pHashToShow) { if (!fortuneDisplay || !cardDisplay || !qrcodeContainer || !paymentStatus || !paymentModal) return; currentInvoiceString = invoice; fortuneDisplay.textContent = invoice; fortuneDisplay.classList.add("showing-invoice", "clickable-invoice"); fortuneDisplay.classList.remove("fortune-visible", "copy-success", "fortune-win"); fortuneDisplay.style.opacity = "1"; fortuneDisplay.style.cursor = "pointer"; fortuneDisplay.title = "Click to copy invoice"; cardDisplay.innerHTML = ""; qrcodeContainer.innerHTML = '<canvas id="qrcode-canvas"></canvas>'; qrcodeContainer.classList.remove("copy-success-qr"); const canvas = document.getElementById("qrcode-canvas"); if (!canvas || typeof QRCode === "undefined") { displayError("Cannot display QR Code.", true); return; } try { const qrSize = Math.min(qrcodeContainer.offsetWidth * 0.85, 240); QRCode.toCanvas( canvas, invoice, { width: qrSize, margin: 1, errorCorrectionLevel: "L" }, function (error) { if (error) { console.error("QR Code gen error:", error); displayError("Could not generate QR Code.", true); } } ); } catch (qrError) { console.error("QR Canvas exception:", qrError); displayError("QR generation failed.", true); } paymentStatus.textContent = "Waiting for payment..."; paymentStatus.className = ""; paymentStatus.style.color = "#ffcc66"; paymentModal.style.display = "flex"; setTimeout(() => paymentModal.classList.add("is-visible"), 10); }
    function hidePaymentModal(reason = "unknown") { if (!paymentModal) return; paymentModal.classList.remove("is-visible"); setTimeout(() => { paymentModal.style.display = "none"; const wasPolling = pollingIntervalId || pollingTimeoutId; stopPolling(false, `hidePaymentModal via ${reason}`); if (wasPolling) { if (fortuneDisplay && fortuneDisplay.classList.contains("showing-invoice")) resetFortuneDisplay("Payment cancelled or timed out."); if(sessionId) resetButtonState(true, "Insert 21 Sats"); } else if (fortuneDisplay && fortuneDisplay.classList.contains("showing-invoice")) { resetFortuneDisplay("Payment cancelled."); if(sessionId) resetButtonState(true, "Insert 21 Sats"); } }, 400); }
    function showClaimModal() { if (currentWithdrawableBalance <= 0 || !claimModal || !claimAmountSpan || !claimInvoiceInput || !claimStatus || !submitClaimButton) return; claimAmountSpan.textContent = currentWithdrawableBalance; claimInvoiceInput.value = ""; claimStatus.textContent = ""; claimStatus.className = "claim-status-area"; submitClaimButton.disabled = false; isClaiming = false; claimModal.style.display = "flex"; setTimeout(() => claimModal.classList.add("is-visible"), 10); claimInvoiceInput.focus(); }
    function hideClaimModal(reason = "unknown") { if(!claimModal) return; claimModal.classList.remove("is-visible"); setTimeout(() => { claimModal.style.display = "none"; }, 400); }
    function updateJackpotDisplay(poolAmount) { if (typeof poolAmount === "number" && !isNaN(poolAmount) && jackpotInfo) { currentJackpotDisplay = poolAmount; jackpotInfo.textContent = `Jackpot Pool: ${poolAmount} sats`; } }
    function updateBalanceDisplay(balanceAmount) { if (typeof balanceAmount === "number" && !isNaN(balanceAmount) && balanceInfo && claimButton) { const oldBalance = currentWithdrawableBalance; currentWithdrawableBalance = Math.floor(balanceAmount); balanceInfo.textContent = `Withdrawable: ${currentWithdrawableBalance} sats`; claimButton.disabled = currentWithdrawableBalance <= 0; if (currentWithdrawableBalance > oldBalance && balanceInfo) { balanceInfo.classList.add("flash-success"); setTimeout(() => { balanceInfo.classList.remove("flash-success"); }, 700); } } else if (!balanceInfo) { console.warn("updateBalanceDisplay: balanceInfo element not found."); } else if (!claimButton) { console.warn("updateBalanceDisplay: claimButton element not found."); } else { console.warn("Invalid balance amount received:", balanceAmount); } }
    function stopPolling(isSuccess = false, reason = "unknown") { if (pollingIntervalId) { clearInterval(pollingIntervalId); pollingIntervalId = null; } if (pollingTimeoutId) { clearTimeout(pollingTimeoutId); pollingTimeoutId = null; } if (!isSuccess) { paymentHash = null; currentInvoiceString = ""; } }
    function startPolling() { if (!paymentHash || paymentHash.length !== 64) { displayError("Invalid payment reference.", false); if(sessionId) resetButtonState(true, "Insert 21 Sats"); return; } console.log(`Polling started for hash: ${paymentHash.substring(0, 10)}...`); if (pollingIntervalId) clearInterval(pollingIntervalId); if (pollingTimeoutId) clearTimeout(pollingTimeoutId); pollingIntervalId = setInterval(async () => { if (!paymentHash) { stopPolling(false, "intervalCheckNoHash"); if(sessionId) resetButtonState(true, "Insert 21 Sats"); return; } try { const response = await fetch(CHECK_INVOICE_URL_BASE + paymentHash); if (!response.ok) return; const data = await response.json(); if (data && data.paid === true) { console.log("Payment confirmed!"); if(paymentStatus) { paymentStatus.textContent = "Payment Confirmed!"; paymentStatus.className = "paid"; } stopPolling(true, "paymentSuccess"); setTimeout(() => { hidePaymentModal("paymentSuccess"); setTimeout(() => { performCardDraw(); }, 400); }, 800); } } catch (error) { console.error("Polling fetch error:", error); } }, POLLING_INTERVAL_MS); pollingTimeoutId = setTimeout(() => { console.warn("Polling timed out."); if (paymentModal && paymentModal.classList.contains("is-visible")) { hidePaymentModal("timeout"); displayError("Payment timed out. Please try again.", false); } else { stopPolling(false, "timeout"); if(sessionId) resetButtonState(true, "Insert 21 Sats"); } }, POLLING_TIMEOUT_MS); }

    async function performCardDraw() {
        if (!sessionId) { console.error("Cannot draw: No session ID."); displayError("Session error. Please refresh.", false); return; }
        console.log(`Performing card draw for session: ${sessionId.substring(0,6)}...`); // LOG session used
        resetButtonState(false, "Drawing...");
        resetFortuneDisplay("Payment Successful! Consulting the Oracle..."); if(fortuneDisplay) fortuneDisplay.style.color = "#77cc77";
        await new Promise((resolve) => setTimeout(resolve, 1800));
        if(fortuneDisplay) { fortuneDisplay.textContent = "Divining the blockchain..."; fortuneDisplay.style.color = "#e8d8b8"; fortuneDisplay.style.opacity = "0"; }
        if(cardDisplay) cardDisplay.innerHTML = "";
        let drawSuccessful = false;
        try {
            console.log(`performCardDraw: Sending POST to ${DRAW_CARDS_URL} with sessionId ${sessionId.substring(0,6)}`); // LOG before fetch
            const response = await fetch(DRAW_CARDS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionId }), });
            console.log(`performCardDraw: Received response status ${response.status} for sessionId ${sessionId.substring(0,6)}`); // LOG after fetch
            if (!response.ok) { let eText = `Oracle fail (${response.status})`; try { const bErr=await response.text(); eText+=bErr ? ` - ${bErr.substring(0,100)}`:"" } catch(e){} throw new Error(eText); }
            const data = await response.json();
            if ( !data || !Array.isArray(data.cards) || typeof data.fortune !== "string" || data.cards.length !== 3 || typeof data.sats_won_this_round === "undefined" || typeof data.user_balance === "undefined" || typeof data.current_jackpot === "undefined" ) throw new Error("Invalid draw data.");

            if(cardDisplay) cardDisplay.innerHTML = "";
            data.cards.forEach((card, index) => { const cardElement = createSingleCard(card); if(cardDisplay) cardDisplay.appendChild(cardElement); setTimeout(() => cardElement.classList.add("is-visible"), 50 + index * 200); });

            let finalFortuneText = data.fortune;
            const isWin = data.sats_won_this_round > 0 || data.fortune.includes("*** JACKPOT! ***");

            setTimeout( () => {
                if(fortuneDisplay) {
                    fortuneDisplay.textContent = finalFortuneText;
                    fortuneDisplay.classList.remove("fortune-win"); fortuneDisplay.style.color = "";
                    if (isWin) { fortuneDisplay.classList.add("fortune-win"); }
                    fortuneDisplay.classList.add("fortune-visible");
                }
            }, 100 + data.cards.length * 200 + 300 );

            updateJackpotDisplay(data.current_jackpot);
            updateBalanceDisplay(data.user_balance); // Updates display based on specific user balance from response
            console.log(`performCardDraw: Updated balance display for ${sessionId.substring(0,6)} to ${data.user_balance}`); // LOG balance update
            drawSuccessful = true;
        } catch (error) { console.error("Card Draw Error:", error); displayError(error.message || "Could not get reading.", false); }
        finally { if (sessionId) resetButtonState(true, "Insert 21 Sats"); else resetButtonState(false, "Session Error"); }
    }

    async function submitClaimPayout() {
        if (!sessionId || isClaiming || !claimInvoiceInput || !submitClaimButton || !claimStatus) return;
        console.log(`submitClaimPayout: Attempting claim for session ${sessionId.substring(0,6)}...`); // LOG session used
        const userInvoice = claimInvoiceInput.value.trim(); if (!userInvoice || !userInvoice.toLowerCase().startsWith("lnbc")) { displayError( "Please paste a valid Lightning invoice (starting with lnbc...).", false, true ); return; }
        isClaiming = true; submitClaimButton.disabled = true; claimStatus.textContent = "Verifying & sending..."; claimStatus.className = "claim-status-area pending"; claimStatus.style.color = "#ffcc66";
        try {
            console.log(`submitClaimPayout: Sending POST to ${CLAIM_PAYOUT_URL} for sessionId ${sessionId.substring(0,6)}`); // LOG before fetch
            const response = await fetch(CLAIM_PAYOUT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionId, userInvoice: userInvoice }), });
            console.log(`submitClaimPayout: Received response status ${response.status} for sessionId ${sessionId.substring(0,6)}`); // LOG after fetch
            const data = await response.json(); if (!response.ok) { let errorMsg = data.error || `Claim failed (${response.status})`; if (data.details) errorMsg += `: ${data.details}`; throw new Error(errorMsg); } if (!data.success || typeof data.paid_amount === "undefined") throw new Error("Claim response invalid.");
            claimStatus.textContent = `Success! ${data.paid_amount} sats sent.`; claimStatus.className = "claim-status-area success"; claimStatus.style.color = "#77cc77";
            updateBalanceDisplay(0); // Balance is reset on backend, update display
            console.log(`submitClaimPayout: Claim successful for ${sessionId.substring(0,6)}. Balance reset on backend.`); // LOG success
            claimInvoiceInput.value = ""; setTimeout(() => { hideClaimModal("claimSuccess"); }, 2500);
        } catch (error) { console.error("Claim Payout Error:", error); displayError( error.message || "Could not process claim.", false, true ); }
    }

    function copyToClipboard( textToCopy, feedbackElement, successClass, isQrCode = false ) { if (!textToCopy || !feedbackElement) return; navigator.clipboard .writeText(textToCopy) .then(() => { const originalText = feedbackElement.textContent; feedbackElement.classList.add(successClass); if (!isQrCode) feedbackElement.textContent = "Copied!"; setTimeout(() => { feedbackElement.classList.remove(successClass); if ( !isQrCode && feedbackElement.classList.contains("clickable-invoice") ) feedbackElement.textContent = currentInvoiceString; }, 1500); }) .catch((err) => { console.error(`Copy failed: `, err); alert("Could not copy automatically."); }); }
    function connectWebSocket() { if (wsReconnectTimeout) { clearTimeout(wsReconnectTimeout); wsReconnectTimeout = null; } if ( socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) ) return; const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"; const wsUrl = `${wsProtocol}//${window.location.host}`; console.log(`Attempting WS connection to ${wsUrl}`); socket = new WebSocket(wsUrl); socket.onopen = function (event) { console.log("WS open."); }; socket.onmessage = function (event) { try { const message = JSON.parse(event.data); if ( message.type === "jackpotUpdate" && typeof message.amount === "number" ) updateJackpotDisplay(message.amount); else if (message.type !== "pong") console.warn("WS: Unknown msg:", message.type); } catch (e) { console.error("Error parsing WS msg:", e, "Data:", event.data); } }; socket.onclose = function (event) { console.log( `WS closed. Code: ${event.code}. Clean: ${event.wasClean}` ); socket = null; if (!event.wasClean && !wsReconnectTimeout) { console.log("WS reconnecting in 5s..."); wsReconnectTimeout = setTimeout(connectWebSocket, 5000); } }; socket.onerror = function (error) { console.error("WS error observed."); }; }

    // --- Event Listeners ---
    if (drawButton) { drawButton.addEventListener("click", async () => { console.log("Draw button clicked. Session ID:", sessionId ? sessionId.substring(0,6)+'...' : 'None'); if (!sessionId) { console.error("Draw aborted, no session ID."); resetFortuneDisplay( "Session not ready. Please wait or refresh." ); return; } resetButtonState(false, "Generating Invoice..."); resetFortuneDisplay("Connecting to Lightning Network..."); paymentHash = null; currentInvoiceString = ""; console.log("Attempting fetch to:", CREATE_INVOICE_URL); try { const response = await fetch(CREATE_INVOICE_URL, { method: "POST", }); console.log("Fetch call completed. Status:", response.status); if (!response.ok) { let eMsg = `Net error (${response.status})`; try { const eData = await response.json(); eMsg = eData.error || eMsg; } catch (e) {} throw new Error(eMsg); } const data = await response.json(); if ( !data || !data.payment_hash || !data.payment_request || data.payment_hash.length !== 64 ) throw new Error("Invalid invoice data."); paymentHash = data.payment_hash; showPaymentModal(data.payment_request, data.payment_hash); startPolling(); } catch (error) { console.error("Catch block in drawButton listener:", error); paymentHash = null; currentInvoiceString = ""; displayError( error.message || "Could not create Lightning invoice.", false ); if (sessionId) resetButtonState(true, "Insert 21 Sats"); else resetButtonState(false, "Session Error"); } }); } else { console.error("Initialization Error: Could not find #draw-button!"); }
    if (infoTrigger) { infoTrigger.addEventListener("click", (event) => { if(instructionsArea) { event.stopPropagation(); instructionsArea.classList.toggle("is-visible"); } }); } else { console.warn("Init Warning: No #info-trigger."); }
    if (modalCloseButton) { modalCloseButton.addEventListener("click", () => { hidePaymentModal("modalCloseButton"); }); } else { console.warn("Init Warning: No #modal-close-button."); }
    if (claimButton) { claimButton.addEventListener("click", () => { if (currentWithdrawableBalance > 0) { showClaimModal(); } }); } else { console.warn("Init Warning: No #claim-button."); }
    if (claimModalCloseButton) { claimModalCloseButton.addEventListener("click", () => { hideClaimModal("claimModalCloseButton"); }); } else { console.warn("Init Warning: No #claim-modal-close-button."); }
    if (submitClaimButton) { submitClaimButton.addEventListener("click", () => { submitClaimPayout(); }); } else { console.warn("Init Warning: No #submit-claim-button."); }
    document.addEventListener("click", (event) => { if ( instructionsArea && instructionsArea.classList.contains("is-visible") && infoTrigger && !infoTrigger.contains(event.target) && !instructionsArea.contains(event.target) ) instructionsArea.classList.remove("is-visible"); if ( paymentModal && paymentModal.classList.contains("is-visible") && event.target === paymentModal ) hidePaymentModal("clickOutsidePayment"); if ( claimModal && claimModal.classList.contains("is-visible") && event.target === claimModal ) hideClaimModal("clickOutsideClaim"); });
    if (fortuneDisplay) { fortuneDisplay.addEventListener("click", () => { if (fortuneDisplay.classList.contains("clickable-invoice")) copyToClipboard( currentInvoiceString, fortuneDisplay, "copy-success", false ); }); } else { console.error("Init Error: No #fortune-display!"); }
    if (qrcodeContainer) { qrcodeContainer.addEventListener("click", () => { if (currentInvoiceString) copyToClipboard( currentInvoiceString, qrcodeContainer, "copy-success-qr", true ); }); } else { console.error("Init Error: No #qrcode-container!"); }

    // --- Initial Setup ---
    console.log("--- Madame Satoshi Initializing ---"); resetFortuneDisplay(); updateJackpotDisplay(0); updateBalanceDisplay(0); if(cardDisplay) cardDisplay.innerHTML = ""; if(claimButton) claimButton.disabled = true; resetButtonState(false, "Initializing...");
    initializeSession(); // This function now handles enabling the button
    connectWebSocket();

}); // End DOMContentLoaded
// --- END OF FILE frontend/script.js ---