/**
 * AutoBrief Single-Page Interaction Script
 *
 * This script handles:
 * 1. Background Blob Animation
 * 2. Active Nav Highlighting (Scrollspy)
 * 3. Animate On Scroll (AOS) Initialization
 * 4. Auth Modal (Sign In/Sign Up) Toggle Animation
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. BACKGROUND BLOB ANIMATION ---
    const blob1 = document.getElementById('blob1');
    const blob2 = document.getElementById('blob2');
    if (blob1 && blob2) {
        const handleScrollForBlobs = () => {
            const scrollY = window.scrollY;
            const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollFraction = pageHeight > 0 ? scrollY / pageHeight : 0;
            const blob1X = -20 + scrollFraction * 100;
            const blob1Y = 10 + scrollFraction * 50;
            const blob2X = 80 - scrollFraction * 100;
            const blob2Y = 60 - scrollFraction * 70;
            window.requestAnimationFrame(() => {
                blob1.style.transform = `translate(${blob1X}vw, ${blob1Y}vh)`;
                blob2.style.transform = `translate(${blob2X}vw, ${blob2Y}vh)`;
            });
        };
        window.addEventListener('scroll', handleScrollForBlobs, { passive: true });
        handleScrollForBlobs();
    }

    // --- 2. ACTIVE NAV HIGHLIGHTING (SCROLLSPY) ---
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    if (sections.length > 0 && navLinks.length > 0) {
        const handleScrollForNav = () => {
            let currentSectionId = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const triggerPoint = sectionTop - window.innerHeight / 2;
                if (window.scrollY >= triggerPoint) {
                    currentSectionId = section.getAttribute('id');
                }
            });
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSectionId}`) {
                    link.classList.add('active');
                }
            });
        };
        window.addEventListener('scroll', handleScrollForNav);
        handleScrollForNav();
    }

    // --- 3. ANIMATE ON SCROLL INITIALIZATION ---
    AOS.init({
        duration: 800,
        once: true,
        offset: 100,
    });

    // --- 4. AUTH MODAL TOGGLE ---
    const authModal = document.getElementById('authModal');
    if (authModal) {
        const toggleSignIn = document.getElementById('auth-toggle-signin');
        const toggleSignUp = document.getElementById('auth-toggle-signup');
        const modalContent = authModal.querySelector('.auth-modal-content');

        toggleSignIn.addEventListener('click', () => {
            modalContent.classList.remove('show-signup');
            toggleSignIn.classList.add('active');
            toggleSignUp.classList.remove('active');
        });

        toggleSignUp.addEventListener('click', () => {
            modalContent.classList.add('show-signup');
            toggleSignUp.classList.add('active');
            toggleSignIn.classList.remove('active');
        });
    }
});