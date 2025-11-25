const playButton = document.getElementById('play-btn');
const instructionsButton = document.getElementById('instructions-btn');

function startGame() { 
    window.location.href = 'game.html'; 
}

function showInstructions() {
    window.location.href = 'instructions.html'; 
}

playButton.addEventListener('click', startGame);
instructionsButton.addEventListener('click', showInstructions);
