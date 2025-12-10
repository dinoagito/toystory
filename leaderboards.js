document.getElementById('menu-btn').addEventListener('click', () => {
    // Stop the background music when leaving the page
    const bgMusic = document.getElementById("bg-music");
    if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
   }
   // Navigate back to the index/lobby page
   window.location.href = 'index.html';
});

function loadAndDisplayScores() {
    const scoresBody = document.getElementById('scores-body');
    let highScores = getCleanedScores();

    // Clear any existing content
    scoresBody.innerHTML = '';

    // If no scores are found, display a default message
    if (highScores.length === 0) {
        // Updated colspan to 2 (Pilot Name + Score)
        scoresBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #ff4c4c;">No high scores yet! Be the first to blast!</td></tr>';
        return;
    }

    // Populate the table with the sorted scores
    highScores.forEach((scoreEntry, index) => {
        const row = scoresBody.insertRow();

        row.innerHTML = `
            <td>${scoreEntry.name}</td>
            <td>${scoreEntry.score}</td>
        `;
    });
}

function getCleanedScores() {
    const scoresJSON = localStorage.getItem('buzzBlastHighScores');
    let highScores = scoresJSON ? JSON.parse(scoresJSON) : [];
    
    // Create a map to track best score per player
    const playerBestScores = {};
    
    highScores.forEach(entry => {
        const playerName = entry.name.toLowerCase();
        if (!playerBestScores[playerName] || entry.score > playerBestScores[playerName].score) {
            playerBestScores[playerName] = entry;
        }
    });
    
    // Convert back to array and sort
    highScores = Object.values(playerBestScores);
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);
    
    // Save the cleaned version back to localStorage
    localStorage.setItem('buzzBlastHighScores', JSON.stringify(highScores));
    
    return highScores;
}

window.addEventListener('load', loadAndDisplayScores);
