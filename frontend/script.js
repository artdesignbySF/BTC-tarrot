document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('play-button');
    const paymentStatus = document.getElementById('payment-status');
    const cardDisplay = document.getElementById('card-display');
    const fortuneText = document.getElementById('fortune-text');
    const jackpotClaim = document.getElementById('jackpot-claim');
    const claimButton = document.getElementById('claim-button');
    const claimStatus = document.getElementById('claim-status');
    const invoiceInput = document.getElementById('invoice-input');

    const cards = [
        // Array of card image URLs and fortune texts
        // Example: { image: 'card1.jpg', fortune: 'Your future is bright.' },
    ];

    const winningCombination = ['sun.jpg', 'world.jpg', 'star.jpg']; // Example card names

    const lnurlPayString = 'LNURL1DP68GURN8GHJ7CT60FSK6MEWW35HQUE0D3H82UNVWQH4Q5PHX4TKWV3LQGD'; // Your provided LNURL Pay string

    playButton.addEventListener('click', async () => {
        paymentStatus.textContent = 'Processing payment...';

        try {
            const paymentSuccess = await processPayment();

            if (paymentSuccess) {
                paymentStatus.textContent = 'Payment successful!';
                playGame();
            } else {
                paymentStatus.textContent = 'Payment failed.';
            }
        } catch (error) {
            paymentStatus.textContent = 'An error occurred during payment.';
            console.error(error);
        }
    });

    async function processPayment() {
        try {
            const decoded = lnurl.decode(lnurlPayString);
            const response = await fetch(decoded.callback);
            const data = await response.json();

            if (data.status === 'ERROR') {
                return false;
            }

            const invoiceResponse = await fetch(data.callback + '?amount=21000'); // 21,000 millisats = 21 sats
            const invoiceData = await invoiceResponse.json();

            // Here, you would typically present the invoiceData.pr to the user
            // using a Lightning payment library or QR code.
            // For simplicity, we'll just log it to the console.
            console.log('Payment Request:', invoiceData.pr);

            // You would then wait for the payment to be confirmed.
            // This part requires more complex logic, such as polling the LNBits API.
            // For now, we'll simulate a successful payment after a short delay.
            await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate 3 seconds

            return true; // Simulate successful payment
        } catch (error) {
            console.error('LNURL Payment Error:', error);
            return false;
        }
    }

    function playGame() {
        cardDisplay.innerHTML = '';
        fortuneText.textContent = '';

        const drawnCards = [];
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * cards.length);
            const card = cards[randomIndex];
            drawnCards.push(card);

            const img = document.createElement('img');
            img.src = card.image;
            cardDisplay.appendChild(img);
        }

        const drawnCardNames = drawnCards.map(card => card.image);
        const fortune = getFortune(drawnCards);
        fortuneText.textContent = fortune;

        if (drawnCardNames.every((card, index) => card === winningCombination[index])) {
            jackpotClaim.style.display = 'block';
        } else {
            jackpotClaim.style.display = 'none';
        }
    }

    function getFortune(drawnCards) {
        // Implement logic to generate fortune based on drawn cards
        // Example: return a fortune based on the combination of cards
        return 'Your fortune is being determined...'; // Placeholder
    }

    claimButton.addEventListener('click', async () => {
        claimStatus.textContent = 'Processing claim...';

        try {
            // Replace with actual jackpot claim logic
            const claimSuccess = await processJackpotClaim(invoiceInput.value);

            if (claimSuccess) {
                claimStatus.textContent = 'Jackpot claimed successfully!';
            } else {
                claimStatus.textContent = 'Claim failed.';
            }
        } catch (error) {
            claimStatus.textContent = 'An error occurred during claim.';
            console.error(error);
        }
    });

    async function processJackpotClaim(invoice) {
        // Replace with your jackpot claim handling
        // Example: send invoice to LNBits, verify payment
        // Return true if claim is successful, false otherwise
        return true; // Placeholder
    }
});

// Add the lnurl library
const lnurl = {
    decode: (lnurl) => {
        const bech32 = lnurl.toLowerCase();
        const { words } = bech32decode(bech32, bech32.substring(0, 4) === 'lnurl');
        const data = bech32wordsToString(words);
        return { callback: data };
    },
};

function bech32decode(bech32, isLnurl = false) {
    let checksum = 1;
    let expanded = [];
    let values = [];
    let words = [];
    let i;
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

    for (i = 0; i < bech32.length; ++i) {
        let value = CHARSET.indexOf(bech32.charAt(i));
        if (value < 0) {
            if (i >= 4 || bech32.charAt(i) !== '1') {
                return { error: 'Invalid character' };
            }
        }
        values.push(value);
    }
    const separator = bech32.lastIndexOf('1');
    if (separator === -1) {
        return { error: 'Missing separator' };
    }
    for (i = 0; i < separator; ++i) {
        expanded.push(values[i] >> 5);
    }
    expanded.push(0);
    for (i = 0; i < separator; ++i) {
        expanded.push(values[i] & 31);
    }
    for (i = 0; i < bech32.length; ++i) {
        let value = values[i];
        if (value < 0) {
            value = 0;
        }
        checksum = polymodStep(checksum) ^ value;
    }
    if (checksum !== 1) {
        return { error: 'Invalid checksum' };
    }
    for (i = separator + 1; i < bech32.length; ++i) {
        words.push(values[i]);
    }
    return { words };
}

function bech32wordsToString(words) {
    let string = '';
    let bitLength = 0;
    let value = 0;
    for (let i = 0; i < words.length; ++i) {
        value = (value << 5) | words[i];
        bitLength += 5;
        if (bitLength >= 8) {
            string += String.fromCharCode((value >> (bitLength - 8)) & 255);
            bitLength -= 8;
        }
    }
    return string;
}

function polymodStep(pre) {
    const b = pre >> 25;
    return ((pre & 0x1ffffff) << 5) ^
        (-((b >> 0) & 1) & 0x3b6a57b2) ^
        (-((b >> 1) & 1) & 0x26508e6d) ^
        (-((b >> 2) & 1) & 0x1ea119fa) ^
        (-((b >> 3) & 1) & 0x3d4233dd) ^
        (-((b >> 4) & 1) & 0x2a1462b3);
}
