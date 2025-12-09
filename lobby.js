const playButton = document.getElementById('play-btn');
const instructionsButton = document.getElementById('instructions-btn');
const leaderboardsButton = document.getElementById('leaderboards-btn');
const playerNameInput = document.getElementById('player-name');

function startGame() { 
    let playerName = playerNameInput.value.trim();

    sessionStorage.setItem('playerName', playerName);

    window.location.href = 'game.html'; 
}

function showInstructions() {
    window.location.href = 'instructions.html'; 
}

function showLeaderboards() {
    window.location.href = 'leaderboards.html';
}

playButton.addEventListener('click', startGame);
instructionsButton.addEventListener('click', showInstructions);
leaderboardsButton.addEventListener('click', showLeaderboards);

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startGame();
    }
});

window.addEventListener('load', () => {
    const savedName = sessionStorage.getItem('playerName');
    if (savedName) {
        playerNameInput.value = savedName;
    } 
});
