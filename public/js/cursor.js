(function() {
    // Only run on desktop devices (non-touch)
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Inject cursor elements
    const cursorGlow = document.createElement('div');
    cursorGlow.id = 'cursor-glow';
    cursorGlow.className = 'cursor-glow';
    
    const cursorOutline = document.createElement('div');
    cursorOutline.id = 'cursor-outline';
    cursorOutline.className = 'cursor-outline';
    
    const cursorDot = document.createElement('div');
    cursorDot.id = 'cursor-dot';
    cursorDot.className = 'cursor-dot';
    
    document.body.appendChild(cursorGlow);
    document.body.appendChild(cursorOutline);
    document.body.appendChild(cursorDot);

    // Track mouse position
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    // Track outline position
    let outlineX = mouseX;
    let outlineY = mouseY;
    
    // Track glow position
    let glowX = mouseX;
    let glowY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Dot follows exactly
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
    });

    function animate() {
        // Easing factors
        let easingOutline = 0.15;
        let easingGlow = 0.05;
        
        outlineX += (mouseX - outlineX) * easingOutline;
        outlineY += (mouseY - outlineY) * easingOutline;
        
        glowX += (mouseX - glowX) * easingGlow;
        glowY += (mouseY - glowY) * easingGlow;
        
        cursorOutline.style.left = outlineX + 'px';
        cursorOutline.style.top = outlineY + 'px';
        
        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';
        
        requestAnimationFrame(animate);
    }
    
    animate();

    // Hover detection for interactive elements
    function setupHoverEvents() {
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, .hover-target');
        interactiveElements.forEach(el => {
            // Avoid duplicate listeners
            if(el.hasAttribute('data-cursor-hover')) return;
            el.setAttribute('data-cursor-hover', 'true');

            el.addEventListener('mouseenter', () => {
                cursorOutline.classList.add('hovering');
                cursorDot.classList.add('hovering');
            });
            el.addEventListener('mouseleave', () => {
                cursorOutline.classList.remove('hovering');
                cursorDot.classList.remove('hovering');
            });
        });
    }

    // Run initially
    setupHoverEvents();

    // Re-run if DOM changes (for dynamic content like loaded reviews/products)
    const observer = new MutationObserver(() => {
        setupHoverEvents();
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
