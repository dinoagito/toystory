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

    displaySlide();

    continueBtn.addEventListener('click', function() {
        currentSlide++;
        if (currentSlide < storySlides.length) {
            displaySlide();
        } else {
            window.location.href = 'index.html';
        }
    });

    backBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            continueBtn.click();
        }
    });

    const storyImage = document.getElementById("story-image");
    const zoomOverlay = document.getElementById("image-zoom-overlay");
    const zoomedImage = document.getElementById("zoomed-image");

    storyImage.addEventListener("click", () => {
        zoomedImage.src = storyImage.src;
        zoomOverlay.style.display = "flex";
    });

    zoomOverlay.addEventListener("click", () => {
        zoomOverlay.style.display = "none";
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
    
    // Hide continue button on last slide
    if (currentSlide === storySlides.length - 1) {
        continueBtn.style.display = 'none';
    } else {
        continueBtn.style.display = 'block';
    }
}
