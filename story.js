const storySlides = [
    { image: "images/page1.png" },
    { image: "images/page3.png" },
    { image: "images/page5.png" }
];

let currentSlide = 0;

document.addEventListener('DOMContentLoaded', function() {
    const continueBtn = document.getElementById('continue-btn');
    const backBtn = document.getElementById('back-btn');
    const storyText = document.getElementById('story-text');

    // Display first slide
    displaySlide();

    // Continue button
    continueBtn.addEventListener('click', function() {
        currentSlide++;
        if (currentSlide < storySlides.length) {
            displaySlide();
        } else {
            // Story ended, go to lobby
            window.location.href = 'index.html';
        }
    });

    // Back button
    backBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    // Allow keyboard navigation
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            continueBtn.click();
        }
    });
});

function displaySlide() {
    const storyText = document.getElementById('story-text');
    const storyImage = document.getElementById('story-image');
    const continueBtn = document.getElementById('continue-btn');
    
    const slide = storySlides[currentSlide];
    storyText.textContent = slide.text;
    
    if (slide.image) {
        storyImage.src = slide.image;
        storyImage.style.display = 'block';
    } else {
        storyImage.style.display = 'none';
    }
    
    // On last slide, hide the Continue button
    if (currentSlide === storySlides.length - 1) {
        continueBtn.style.display = 'none';
    } else {
        continueBtn.style.display = 'block';
    }
}

