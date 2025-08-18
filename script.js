// Scroll Animation Observer
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe all elements with fade-in-scroll class
    document.querySelectorAll('.fade-in-scroll').forEach(el => {
        observer.observe(el);
    });
}

// REPLACE your old summariseBook function with this new one
async function summariseBook() {
    const bookInput = document.getElementById('bookNameInput');
    const readingContent = document.getElementById('readingContent');
    const summariseButton = document.querySelector('.summarise-button');
    
    const bookName = bookInput.value.trim();
    
    if (!bookName) {
        showNotification('Please enter a book name', 'error');
        return;
    }
    
    // Show loading state
    summariseButton.innerHTML = '<span class="loading"></span> Summarising...';
    summariseButton.disabled = true;
    readingContent.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><p>Generating AI summary for "${bookName}"...</p><p class="loading-subtext">This may take a few moments</p></div>`;
    
    try {
        // THIS IS THE NEW PART: Call your backend
        const response = await fetch('https://autobrief-backend-nyk6.onrender.com/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bookName: bookName }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const summary = {
            title: `${bookName} - AI Generated Summary`,
            content: data.summary,
        };
        
        // Display the summary with typewriter effect
        displaySummaryWithEffect(summary, bookName);
        showNotification('Summary generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating summary:', error);
        readingContent.innerHTML = `<div class="error-container"><p>Sorry, we couldn't generate a summary for "${bookName}" at this time.</p><p>Please try again or contact support if the issue persists.</p></div>`;
        showNotification('Failed to generate summary', 'error');
    } finally {
        // Reset button
        summariseButton.innerHTML = 'Summarise';
        summariseButton.disabled = false;
    }
}

// Display Summary with Typewriter Effect
// REPLACE your displaySummaryWithEffect function with this:
function displaySummaryWithEffect(summary, bookName) {
    const readingContent = document.getElementById('readingContent');
    const readingTitle = document.querySelector('.reading-title');
    
    // Update title
    readingTitle.textContent = summary.title;
    readingTitle.style.color = '#8b7355';
    
    // STORE THE CLEAN CONTENT FOR PDF EXPORT
    window.cleanSummaryContent = summary.content;
    window.cleanSummaryTitle = summary.title;
    
    // Clear content and prepare for typewriter effect
    readingContent.innerHTML = '';
    
    // Set typing flag
    window.isTyping = true;
    
    let index = 0;
    const text = summary.content;
    const speed = 30; // milliseconds per character
    
    function typeWriter() {
        if (index < text.length) {
            readingContent.innerHTML += text.charAt(index);
            index++;
            setTimeout(typeWriter, speed);
            
            // Auto-scroll to bottom during typing
            readingContent.scrollTop = readingContent.scrollHeight;
        } else {
            // Typewriter finished - clear the typing flag
            window.isTyping = false;
            console.log("Typewriter finished, PDF export now safe");
        }
    }
    
    typeWriter();
}

// REPLACE your exportToPDF function with this:
function exportToPDF() {
    const readingContent = document.getElementById('readingContent');
    const bookTitle = document.querySelector('.reading-title').textContent;

    if (!readingContent.textContent.trim() || readingContent.innerText.includes('your favourite book here')) {
        showNotification('Please generate a summary first before exporting', 'error');
        return;
    }

    // Check if typewriter is still running
    if (window.isTyping) {
        showNotification('Please wait for the summary to finish loading before exporting', 'info');
        return;
    }

    console.log("Starting PDF generation...");

    // Use the clean stored content instead of the potentially broken HTML
    function exportToPDF() {
    const readingContent = document.getElementById('readingContent');
    const bookTitle = document.querySelector('.reading-title').textContent;

    if (!readingContent.textContent.trim() || readingContent.innerText.includes('your favourite book here')) {
        showNotification('Please generate a summary first before exporting', 'error');
        return;
    }

    if (window.isTyping) {
        showNotification('Please wait for the summary to finish loading before exporting', 'info');
        return;
    }

    // Clean and get ALL the content - this is the key fix
    const contentToExport = (window.cleanSummaryContent || readingContent.textContent)
        .replace(/\*\*/g, '')  
        .replace(/\*/g, '')    
        .replace(/#{1,6}\s*/g, '') 
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${bookTitle}</title>
            <meta charset="utf-8">
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    max-width: 800px;
                    margin: 20px auto;
                    padding: 20px;
                    line-height: 1.6;
                    color: #333;
                }
                h1 {
                    color: #8b7355;
                    border-bottom: 2px solid #8b7355;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                    text-align: center;
                    page-break-after: avoid;
                }
                .generated-by {
                    text-align: center;
                    margin-bottom: 20px;
                    color: #666;
                    font-style: italic;
                }
                .content {
                    font-size: 14px;
                    white-space: pre-line;
                    word-wrap: break-word;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                    border-top: 1px solid #eee;
                    padding-top: 15px;
                }
            </style>
        </head>
        <body>
            <h1>${bookTitle}</h1>
            <div class="generated-by">Generated by AutoBrief AI</div>
            <div class="content">${contentToExport}</div>
            <div class="footer">Generated on ${new Date().toLocaleDateString()} | AutoBrief.com</div>
        </body>
        </html>
    `;

    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${bookTitle.replace(/[^a-z0-9\s]/gi, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.9 },
        html2canvas: { 
            scale: 1.5,
            useCORS: true,
            letterRendering: true,
            allowTaint: true
        },
        jsPDF: { 
            unit: 'in', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(htmlContent).save()
        .then(() => {
            showNotification('PDF exported successfully!', 'success');
        })
        .catch(err => {
            console.error("PDF error:", err);
            showNotification('PDF generation failed. Please try again.', 'error');
        });
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles
    const styles = `
        .notification {
            position: fixed;
            top: 100px;
            right: 20px;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        .notification-success {
            border-left: 4px solid #4CAF50;
            color: #2E7D32;
        }
        .notification-error {
            border-left: 4px solid #f44336;
            color: #C62828;
        }
        .notification-info {
            border-left: 4px solid #2196F3;
            color: #1565C0;
        }
        .notification-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: inherit;
            opacity: 0.7;
        }
        .notification-close:hover {
            opacity: 1;
        }
    `;
    
    // Add styles to head if not already added
    if (!document.querySelector('#notification-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'notification-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Smooth Scrolling for Navigation Links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Form Submission Handler
function initFormHandler() {
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) { // made async
            e.preventDefault();
            
            const submitBtn = this.querySelector('.submit-button');
            const originalText = submitBtn.textContent;

            // Get form data as a plain object
            const formData = new FormData(this);
            const formProps = Object.fromEntries(formData);
            
            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            try {
                // THIS IS THE NEW PART: Call your backend
                const response = await fetch('https://autobrief-backend-nyk6.onrender.com/send-feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formProps),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                showNotification('Thank you for your feedback!', 'success');
                this.reset();

            } catch (error) {
                console.error('Error sending feedback:', error);
                showNotification('Sorry, something went wrong. Please try again.', 'error');
            } finally {
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

// Navbar Scroll Effect
function initNavbarScrollEffect() {
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(245, 241, 232, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(245, 241, 232, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    });
}

// Parallax Effect for Hero Section
function initParallaxEffect() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-image');
        
        if (heroImage && scrolled < window.innerHeight) {
            const rate = scrolled * -0.5;
            heroImage.style.transform = `translateY(${rate}px)`;
        }
    });
}

// Enhanced Button Hover Effects
function initButtonEffects() {
    document.querySelectorAll('.cta-button, .cta-button-secondary, .export-button, .summarise-button').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        button.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(0) scale(0.98)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
    });
}

// Initialize all functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initScrollAnimations();
    initSmoothScrolling();
    initFormHandler();
    initNavbarScrollEffect();
    initParallaxEffect();
    initButtonEffects();
    
    // Add loading styles for summary generation
    const loadingStyles = `
        .loading-container {
            text-align: center;
            padding: 3rem 1rem;
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(139, 115, 85, 0.3);
            border-radius: 50%;
            border-top-color: #8b7355;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        .loading-subtext {
            color: #8b7355;
            font-style: italic;
            margin-top: 0.5rem;
        }
        .error-container {
            text-align: center;
            padding: 2rem;
            color: #c62828;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    
    const loadingStyleSheet = document.createElement('style');
    loadingStyleSheet.textContent = loadingStyles;
    document.head.appendChild(loadingStyleSheet);
    
    // Show welcome message
    setTimeout(() => {
        if (window.location.pathname.endsWith('read.html')) {
        showNotification('Welcome to AutoBrief Reading Room! Start by entering a book name to get an AI summary.', 'info');}
    }, 1000);
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to summarise book
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const bookInput = document.getElementById('bookNameInput');
        if (bookInput) {
            summariseBook();
        }
    }
});





