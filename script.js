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

// Book Summarization
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
    
    // Update reading content with loading message
    readingContent.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Generating AI summary for "${bookName}"...</p>
            <p class="loading-subtext">This may take a few moments</p>
        </div>
    `;
    
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate mock summary (in real implementation, this would be an API call)
        const summary = generateMockSummary(bookName);
        
        // Display the summary with typewriter effect
        displaySummaryWithEffect(summary, bookName);
        
        showNotification('Summary generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating summary:', error);
        readingContent.innerHTML = `
            <div class="error-container">
                <p>Sorry, we couldn't generate a summary for "${bookName}" at this time.</p>
                <p>Please try again or contact support if the issue persists.</p>
            </div>
        `;
        showNotification('Failed to generate summary', 'error');
    } finally {
        // Reset button
        summariseButton.innerHTML = 'Summarise';
        summariseButton.disabled = false;
    }
}

// Generate Mock Summary
function generateMockSummary(bookName) {
    const mockSummaries = {
        "1984": {
            title: "1984 by George Orwell",
            content: `"1984" is a dystopian novel that presents a totalitarian society under the rule of Big Brother and the Party. The story follows Winston Smith, a low-ranking Party member who works at the Ministry of Truth, rewriting historical records to match the Party's current narrative.

The novel explores themes of surveillance, thought control, and the manipulation of truth. The Party uses technology and psychological manipulation to control every aspect of citizens' lives, including their thoughts through "thoughtcrime" and "doublethink."

Winston's rebellion begins with keeping a secret diary and later develops into a love affair with Julia, both acts of defiance against the Party's control. However, their resistance is ultimately crushed when they are captured and subjected to torture and brainwashing.

The book serves as a warning about the dangers of totalitarianism and the importance of individual freedom and truth. Orwell's vision of a surveillance state and propaganda has become increasingly relevant in the digital age.

Key concepts include: Big Brother (omnipresent leader), Newspeak (language control), Room 101 (ultimate fear), and the famous slogans "War is Peace," "Freedom is Slavery," and "Ignorance is Strength."`
        },
        "default": {
            title: `${bookName} - AI Generated Summary`,
            content: `This is an AI-generated summary of "${bookName}". The book explores various themes and presents compelling characters that navigate through complex situations.

The narrative structure follows a traditional arc, beginning with an introduction to the main characters and their world. The author skillfully develops the plot through a series of events that challenge the protagonists and reveal deeper truths about human nature.

Key themes in this work include personal growth, the complexity of relationships, and the impact of choices on one's destiny. The author uses vivid imagery and thoughtful dialogue to convey these concepts effectively.

The character development throughout the story shows how individuals can transform when faced with adversity. The supporting characters each contribute unique perspectives that enrich the overall narrative.

The book's conclusion brings resolution to the main conflicts while leaving readers with thought-provoking questions about the nature of life, love, and personal responsibility. This work stands as a testament to the power of storytelling and its ability to illuminate the human experience.`
        }
    };
    
    return mockSummaries[bookName] || mockSummaries["default"];
}

// Display Summary with Typewriter Effect
function displaySummaryWithEffect(summary, bookName) {
    const readingContent = document.getElementById('readingContent');
    const readingTitle = document.querySelector('.reading-title');
    
    // Update title
    readingTitle.textContent = summary.title;
    readingTitle.style.color = '#8b7355';
    
    // Clear content and prepare for typewriter effect
    readingContent.innerHTML = '';
    
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
        }
    }
    
    typeWriter();
}

// Export to PDF functionality
function exportToPDF() {
    const readingContent = document.getElementById('readingContent');
    const bookTitle = document.querySelector('.reading-title').textContent;
    
    if (!readingContent.textContent.trim() || readingContent.textContent.includes('Enter a book name')) {
        showNotification('Please generate a summary first before exporting', 'error');
        return;
    }
    
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${bookTitle}</title>
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px 20px;
                    line-height: 1.6;
                    color: #333;
                }
                h1 {
                    color: #8b7355;
                    border-bottom: 2px solid #8b7355;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                }
                .generated-by {
                    text-align: center;
                    margin-bottom: 30px;
                    color: #666;
                    font-style: italic;
                }
                .content {
                    text-align: justify;
                    font-size: 14px;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
            </style>
        </head>
        <body>
            <h1>${bookTitle}</h1>
            <div class="generated-by">Generated by AutoBrief AI</div>
            <div class="content">${readingContent.innerHTML.replace(/\n/g, '<br>')}</div>
            <div class="footer">
                Generated on ${new Date().toLocaleDateString()} | AutoBrief.com
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
    
    showNotification('PDF export initiated', 'success');
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
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('.submit-button');
            const originalText = submitBtn.textContent;
            
            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Simulate form submission
            setTimeout(() => {
                showNotification('Thank you for your feedback! We\'ll get back to you soon.', 'success');
                this.reset();
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 1500);
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
        showNotification('Welcome to AutoBrief! Start by entering a book name to get an AI summary.', 'info');
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