document.addEventListener('DOMContentLoaded', () => {
    const playerNameInput = document.getElementById('playerName');
    const playerScoreInput = document.getElementById('playerScore');
    const saveScoreButton = document.getElementById('saveScoreButton');
    const messageDisplay = document.getElementById('message');
    const errorDisplay = document.getElementById('error');
    const leaderboardList = document.getElementById('leaderboard-list');

    // --- JSONBin.io Configuration ---
    // Make sure your Bin ID and Master Key are correctly set here
    const JSONBIN_BIN_ID = '683805bc8960c979a5a28af2'; // Your provided Bin ID
    const JSONBIN_MASTER_KEY = '$2a$10$f70uReJz0DPw8f.h9AN4fu0XspUA3cs3pKerRqXOLGB4Na9PFTare'; // Your provided Secret Key
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

    // Function to display messages
    function showMessage(msg, type = 'success') {
        messageDisplay.textContent = ''; // Clear previous messages
        errorDisplay.textContent = '';
        if (type === 'success') {
            messageDisplay.textContent = msg;
        } else {
            errorDisplay.textContent = msg;
        }
        setTimeout(() => {
            messageDisplay.textContent = '';
            errorDisplay.textContent = '';
        }, 3000); // Clear message after 3 seconds
    }

    // Function to load scores from JSONBin.io
    async function loadScores() {
        leaderboardList.innerHTML = '<li>Loading scores...</li>'; // Show loading message
        errorDisplay.textContent = ''; // Clear previous errors

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
                            <span>${score} Points</span>
                        `;
                        leaderboardList.appendChild(listItem);
                    });
                }
            } else {
                console.error('Failed to load scores from JSONBin:', response.statusText);
                showMessage('Failed to load scores. Check console for details.', 'error');
                leaderboardList.innerHTML = '<li>Error loading scores.</li>';
            }
        } catch (error) {
            console.error('Error loading scores:', error);
            showMessage('Network error loading scores. Check your connection.', 'error');
            leaderboardList.innerHTML = '<li>Error loading scores.</li>';
        }
    }

    // Function to save a new score to JSONBin.io
    async function saveScore() {
        const name = playerNameInput.value.trim();
        const score = parseInt(playerScoreInput.value, 10);

        if (!name) {
            showMessage('Please enter a name.', 'error');
            return;
        }
        if (isNaN(score) || score < 0) {
            showMessage('Please enter a valid positive score.', 'error');
            return;
        }

        saveScoreButton.disabled = true; // Disable button to prevent multiple submissions
        saveScoreButton.textContent = 'Saving...';
        errorDisplay.textContent = ''; // Clear previous errors

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
                currentScores = data.scores && Array.isArray(data.scores) ? data.scores : [];
            } else if (getResponse.status !== 404) { // 404 might mean bin is empty/new, which is fine
                console.error('Failed to retrieve current scores before saving:', getResponse.statusText);
                showMessage('Failed to get current scores. Cannot save.', 'error');
                saveScoreButton.disabled = false;
                saveScoreButton.textContent = 'Save Score';
                return;
            }

            // 2. Add the new score
            currentScores.push({ name: name, score: score, timestamp: new Date().toISOString() });

            // 3. Optional: Limit the number of entries
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
                showMessage('Score saved successfully!', 'success');
                loadScores(); // Reload and display updated leaderboard
            } else {
                console.error('Failed to save score to JSONBin:', updateResponse.statusText);
                const errorDetails = await updateResponse.text();
                console.error('JSONBin Error Details:', errorDetails);
                showMessage('Failed to save score. See console for details.', 'error');
            }
        } catch (error) {
            console.error('Error saving score:', error);
            showMessage('Network error saving score. Check your connection.', 'error');
        } finally {
            saveScoreButton.disabled = false;
            saveScoreButton.textContent = 'Save Score';
        }
    }

    // --- Event Listeners ---
    saveScoreButton.addEventListener('click', saveScore);

    // Initial load of scores when the page loads
    loadScores();
});
