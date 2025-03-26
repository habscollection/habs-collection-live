// Carousel functionality for product pages
document.addEventListener('DOMContentLoaded', function() {
    const carouselContainer = document.querySelector('.carousel-container');
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const carouselDots = document.querySelectorAll('.carousel-dot');
    
    if (!carouselContainer || carouselSlides.length === 0) return;
    
    let currentSlide = 0;
    
    // Function to show a specific slide
    function showSlide(index) {
        if (index < 0) {
            currentSlide = carouselSlides.length - 1;
        } else if (index >= carouselSlides.length) {
            currentSlide = 0;
        } else {
            currentSlide = index;
        }
        
        // Update slides
        carouselContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        
        // Update dots
        if (carouselDots.length > 0) {
            carouselDots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentSlide);
            });
        }
    }
    
    // Set up dot navigation
    if (carouselDots.length > 0) {
        carouselDots.forEach((dot, i) => {
            dot.addEventListener('click', () => showSlide(i));
        });
    }
    
    // Optional: Add swipe functionality for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    carouselContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    carouselContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        if (touchEndX < touchStartX) {
            // Swipe left, next slide
            showSlide(currentSlide + 1);
        } else if (touchEndX > touchStartX) {
            // Swipe right, previous slide
            showSlide(currentSlide - 1);
        }
    }
    
    // Auto-advance slides (optional)
    /* 
    setInterval(() => {
        showSlide(currentSlide + 1);
    }, 5000);
    */
});

class ProductCarousel {
    constructor() {
        this.container = document.querySelector('.carousel-container');
        this.slides = document.querySelectorAll('.carousel-slide');
        this.dots = document.querySelectorAll('.carousel-dot');
        this.currentSlide = 0;
        this.slideCount = this.slides.length;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.isDragging = false;

        this.init();
    }

    init() {
        // Initialize carousel
        this.updateCarousel();
        this.setupEventListeners();
        this.setupTouchEvents();
    }

    setupEventListeners() {
        // Dot navigation
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.goToSlide(index);
            });
        });

        // Optional: Auto-play
        // this.startAutoPlay();
    }

    setupTouchEvents() {
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.isDragging = true;
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            
            this.touchEndX = e.touches[0].clientX;
            const diff = this.touchStartX - this.touchEndX;
            
            // Optional: Add real-time dragging effect
            this.container.style.transform = `translateX(${-this.currentSlide * 100 - (diff / this.container.offsetWidth) * 100}%)`;
        }, { passive: true });

        this.container.addEventListener('touchend', () => {
            if (!this.isDragging) return;
            
            const diff = this.touchStartX - this.touchEndX;
            const threshold = this.container.offsetWidth * 0.2; // 20% threshold

            if (Math.abs(diff) > threshold) {
                if (diff > 0 && this.currentSlide < this.slideCount - 1) {
                    // Swipe left
                    this.goToSlide(this.currentSlide + 1);
                } else if (diff < 0 && this.currentSlide > 0) {
                    // Swipe right
                    this.goToSlide(this.currentSlide - 1);
                } else {
                    // Return to current slide if at the end
                    this.goToSlide(this.currentSlide);
                }
            } else {
                // Return to current slide if swipe wasn't strong enough
                this.goToSlide(this.currentSlide);
            }

            this.isDragging = false;
        });
    }

    goToSlide(index) {
        this.currentSlide = index;
        this.updateCarousel();
    }

    updateCarousel() {
        // Update slides
        this.container.style.transform = `translateX(-${this.currentSlide * 100}%)`;

        // Update dots
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });
    }

    startAutoPlay(interval = 5000) {
        setInterval(() => {
            const nextSlide = (this.currentSlide + 1) % this.slideCount;
            this.goToSlide(nextSlide);
        }, interval);
    }
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on mobile devices
    if (window.innerWidth <= 768) {
        const carousel = new ProductCarousel();
    }
});

// Handle window resize
let carousel;
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !carousel) {
        carousel = new ProductCarousel();
    } else if (window.innerWidth > 768 && carousel) {
        // Clean up carousel on desktop
        carousel = null;
    }
}); 