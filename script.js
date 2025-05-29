document.addEventListener('DOMContentLoaded', () => {
    const playerNameInput = document.getElementById('playerName');
    const startGameButton = document.getElementById('startGameButton');
    const nameSetupDiv = document.getElementById('name-setup');
    const gamePlayDiv = document.getElementById('game-play');
    const displayPlayerNameSpan = document.getElementById('displayPlayerName');
    const clickCountSpan = document.getElementById('clickCount');
    const clickButton = document.getElementById('clickButton');
    const leaderboardList = document.getElementById('leaderboard-list');
    const submitScoreButton = document.getElementById('submitScoreButton'); // Get the new button

    let playerName = "Anonymous";
    let clickCount = 0;

    // --- JSONBin.io Configuration ---
    const JSONBIN_BIN_ID = '683805bc8960c979a5a28af2'; // Your provided Bin ID
    const JSONBIN_MASTER_KEY = '$2a$10$f70uReJz0DPw8f.h9AN4fu0XspUA3cs3pKerRqXOLGB4Na9PFTare'; // Your provided Secret Key
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

    // --- Game Initialization ---
    startGameButton.addEventListener('click', () => {
        const inputName = playerNameInput.value.trim();
        if (inputName) {
            playerName = inputName;
        }
        displayPlayerNameSpan.textContent = playerName;
        nameSetupDiv.style.display = 'none'; // Hide name setup
        gamePlayDiv.style.display = 'block'; // Show game play area

        // Reset game state for a new session
        clickCount = 0;
        clickCountSpan.textContent = clickCount;
        clickButton.disabled = false; // Enable click button
        submitScoreButton.style.display = 'block'; // Ensure submit button is visible

        loadLeaderboard(); // Load leaderboard when game starts
    });

    // --- Click Logic ---
    clickButton.addEventListener('click', () => {
        clickCount++;
        clickCountSpan.textContent = clickCount;
    });

    // --- Leaderboard Interaction with JSONBin.io ---

    async function loadLeaderboard() {
        leaderboardList.innerHTML = '<li>Loading leaderboard...</li>'; // Show loading message

        try {
            const response = await fetch(JSONBIN_URL, {
                method: 'GET',
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false' // Get only the content
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Access the 'scores' array from the returned object (e.g., { "scores": [...] })
                const scores = data.scores && Array.isArray(data.scores) ? data.scores : [];

                // Sort scores (descending by score, then ascending by timestamp for tie-breaking)
                scores.sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                });

                leaderboardList.innerHTML = ''; // Clear loading message
                if (scores.length === 0) {
                    leaderboardList.innerHTML = '<li>No scores yet. Be the first!</li>';
                } else {
                    scores.slice(0, 10).forEach((entry, index) => { // Display top 10
                        const listItem = document.createElement('li');
                        // Ensure name and score are valid before displaying
                        const name = entry.name ? String(entry.name) : 'Unknown';
                        const score = typeof entry.score === 'number' ? entry.score : 0;
                        listItem.innerHTML = `
                            <span>#${index + 1} ${name}</span>
                            <span>${score} Clicks</span>
                        `;
                        leaderboardList.appendChild(listItem);
                    });
                }
            } else {
                console.error('Failed to load leaderboard from JSONBin:', response.statusText);
                leaderboardList.innerHTML = '<li>Error loading leaderboard.</li>';
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardList.innerHTML = '<li>Error loading leaderboard.</li>';
        }
    }

    async function saveScore() {
        // Disable button to prevent multiple submissions during the save process
        submitScoreButton.disabled = true;
        submitScoreButton.textContent = 'Submitting...';

        try {
            // 1. Get the current content of the bin
            const getResponse = await fetch(JSONBIN_URL, {
                method: 'GET',
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                }
            });

            let binContent = {};
            let currentScores = [];

            if (getResponse.ok) {
                const data = await getResponse.json();
                binContent = data; // Store the entire object
                // Access the 'scores' array, create empty if it doesn't exist
                currentScores = data.scores && Array.isArray(data.scores) ? data.scores : [];
            } else if (getResponse.status !== 404) { // 404 might mean bin is empty/new, which is fine
                console.error('Failed to retrieve current scores before saving:', getResponse.statusText);
                alert('Failed to get current scores. Cannot save.');
                return;
            }

            // 2. Add the new score only if clicks are positive
            if (clickCount > 0) {
                currentScores.push({ name: playerName, score: clickCount, timestamp: new Date().toISOString() });
            }

            // 3. Limit the number of entries
            currentScores.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });
            currentScores = currentScores.slice(0, 100); // Keep top 100 scores

            // 4. Update the binContent object with the modified scores array
            binContent.scores = currentScores;

            // 5. Send the updated content back to JSONBin.io
            const updateResponse = await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'Content-Length': JSON.stringify(binContent).length // Important for PUT requests
                },
                body: JSON.stringify(binContent) // Send the entire updated object
            });

            if (updateResponse.ok) {
                console.log('Score saved successfully to JSONBin!');
                loadLeaderboard(); // Reload and display updated leaderboard
                alert(`Game Over! You clicked ${clickCount} times. Your score has been submitted.`);
            } else {
                console.error('Failed to save score to JSONBin:', updateResponse.statusText);
                const errorDetails = await updateResponse.text();
                console.error('JSONBin Error Details:', errorDetails);
                alert('Failed to save your score. Please try again.');
            }
        } catch (error) {
            console.error('Error saving score:', error);
            alert('An unexpected error occurred while saving your score. Check your connection.');
        } finally {
            // Re-enable and reset button text regardless of success/failure
            submitScoreButton.disabled = false;
            submitScoreButton.textContent = 'Submit Score';
        }
    }

    // --- Game End and Reset Logic ---
    function endGameAndReset() {
        clickButton.disabled = true; // Disable the click button
        submitScoreButton.style.display = 'none'; // Hide submit button after click

        // Only try to save score if user actually clicked
        if (clickCount > 0) {
            saveScore(); // This function now handles its own alerts for success/failure
        } else {
            alert("You didn't click anything! No score to submit.");
        }

        // Reset UI for a new game after a short delay
        setTimeout(() => {
            clickCount = 0;
            clickCountSpan.textContent = 0;
            playerNameInput.value = ''; // Clear name input
            nameSetupDiv.style.display = 'block'; // Show name setup again
            gamePlayDiv.style.display = 'none'; // Hide game play area
        }, 2000); // Wait 2 seconds before resetting UI
    }

    // --- Event Listeners ---
    submitScoreButton.addEventListener('click', endGameAndReset);

    // Hide the submit button initially when the page loads
    submitScoreButton.style.display = 'none';
});
