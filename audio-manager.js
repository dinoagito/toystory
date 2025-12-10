// Audio Manager - keeps music playing across pages
const audioManager = {
    init: function() {
        const audio = document.getElementById('bg-music');
        if (!audio) return;

        // Get saved time from session storage
        const savedTime = sessionStorage.getItem('audioTime');
        const savedVolume = sessionStorage.getItem('audioVolume');

        if (savedTime) {
            audio.currentTime = parseFloat(savedTime);
        }

        if (savedVolume) {
            audio.volume = parseFloat(savedVolume);
        }

        // Save time every 100ms
        setInterval(() => {
            if (audio) {
                sessionStorage.setItem('audioTime', audio.currentTime);
                sessionStorage.setItem('audioVolume', audio.volume);
            }
        }, 100);

        // Try to play
        audio.play().catch(() => {
            // Browser blocked autoplay, that's okay
        });
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    audioManager.init();
});
