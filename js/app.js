
// DOM Elements
const views = {
    idle: document.querySelector('.idle-state'),
    loading: document.querySelector('.loading-state'),
    success: document.querySelector('.success-state')
};

const inputs = {
    search: document.querySelector('.search-input'),
    submitBtn: document.querySelector('.btn-primary-custom')
};

const successContainer = document.querySelector('.success-state');

// State
let currentBookData = null;

// Event Listeners
inputs.submitBtn.addEventListener('click', handleSearch);
inputs.search.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

async function handleSearch() {
    const query = inputs.search.value.trim();
    if (!query) return;

    // Transition UI
    views.idle.classList.add('d-none');
    views.loading.classList.remove('d-none');

    // Simulate progress bar for UX
    let progress = 0;
    const bar = document.querySelector('.loading-bar-progress');
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) progress = 90;
        bar.style.width = `${progress}%`;
    }, 200);

    try {
        // Real API Call
        const response = await fetch('/api/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookTitle: query })
        });

        const data = await response.json();

        if (response.ok) {
            clearInterval(interval);
            bar.style.width = '100%';

            setTimeout(() => {
                renderBook(data.data);
                views.loading.classList.add('d-none');
                views.success.classList.remove('d-none');
                currentBookData = data.data; // Store the full book data
            }, 600); // Slight delay for smooth transition
        } else {
            throw new Error(data.error || 'Failed to ingest book');
        }

    } catch (error) {
        clearInterval(interval);

        // Hide loading, show idle
        views.loading.classList.add('d-none');
        views.idle.classList.remove('d-none');

        // Show inline error
        let errorEl = document.getElementById('searchError');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'searchError';
            errorEl.className = 'alert alert-danger mt-3 fade show';
            errorEl.style.maxWidth = '500px';
            errorEl.style.margin = '1rem auto';
            document.querySelector('.glass-panel').after(errorEl);
        }
        errorEl.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i> ${error.message}`;

        // Auto-hide after 5s
        setTimeout(() => {
            if (errorEl) errorEl.remove();
        }, 5000);
    }
}

function renderBook(book) {
    // Clear previous
    successContainer.innerHTML = '';

    // Create split-panel container
    const splitContainer = document.createElement('div');
    splitContainer.className = 'split-panel-container';

    // LEFT PANEL - Fixed Brief Summary
    const leftPanel = document.createElement('aside');
    leftPanel.className = 'left-panel-fixed';
    leftPanel.innerHTML = `
        <div class="summary-card">
            <h1 class="book-title-sidebar">${book.title}</h1>
            <span class="section-label-sidebar">Brief Summary</span>
            <div class="brief-summary">${book.core_thesis}</div>
            
            <!-- Quick Actions in Sidebar -->
            <div class="sidebar-actions">
                <button class="btn-sidebar-action" onclick="generateArtifact('slides')">
                    <i class="fas fa-layer-group"></i> Create Slides
                </button>
                <button class="btn-sidebar-action" onclick="generateArtifact('flashcards')">
                    <i class="fas fa-bolt"></i> Flashcards
                </button>
                <button class="btn-sidebar-action btn-secondary" onclick="location.reload()">
                    <i class="fas fa-search"></i> New Search
                </button>
            </div>
        </div>
    `;

    // RIGHT PANEL - Scrollable Content
    const rightPanel = document.createElement('main');
    rightPanel.className = 'right-panel-scroll';

    // Core Concepts Section
    const conceptsSection = document.createElement('section');
    conceptsSection.className = 'content-section';
    conceptsSection.innerHTML = `<h2 class="section-title-main">Core Concepts</h2>`;

    let conceptsHTML = '';
    book.key_concepts.forEach((concept, index) => {
        conceptsHTML += `
            <div class="concept-card-main">
                <h3 class="concept-title-main">${concept.title}</h3>
                <div class="concept-body-main">${concept.explanation}</div>
            </div>
        `;
    });
    conceptsSection.innerHTML += conceptsHTML;
    rightPanel.appendChild(conceptsSection);

    // Mental Models Section
    if (book.mental_models && book.mental_models.length > 0) {
        const modelsSection = document.createElement('section');
        modelsSection.className = 'content-section';
        modelsSection.innerHTML = `
            <h2 class="section-title-main">Mental Models</h2>
            <div class="models-grid-main">
                ${book.mental_models.map(model => `
                    <div class="model-card-main">
                        <h3>${model.name}</h3>
                        <p>${model.description}</p>
                    </div>
                `).join('')}
            </div>
        `;
        rightPanel.appendChild(modelsSection);
    }

    // Assemble
    splitContainer.appendChild(leftPanel);
    splitContainer.appendChild(rightPanel);
    successContainer.appendChild(splitContainer);
}



// Artifact Generation
window.generateArtifact = async (type) => {
    if (!currentBookData) return;

    // Show Modal
    const modalEl = document.getElementById('artifactModal');
    const modal = new bootstrap.Modal(modalEl);
    const contentDiv = document.getElementById('artifactContent');

    // Reset Loading State
    contentDiv.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-warning" role="status"></div>
            <p class="mt-3 text-muted font-serif">Crafting your ${type}...</p>
        </div>
    `;
    modal.show();

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookData: currentBookData, artifactType: type })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        // Render based on type
        renderArtifact(type, result.data);

        // Show header export button
        // Show header export button only for slides
        if (type === 'slides') {
            document.getElementById('headerExportBtn').style.display = 'block';
        } else {
            document.getElementById('headerExportBtn').style.display = 'none';
        }

    } catch (error) {
        contentDiv.innerHTML = `
            <div class="alert alert-danger">
                Failed to generate artifact: ${error.message}
            </div>
        `;
    }
};

// Store current artifact type for export
let currentArtifactType = null;

// Export Artifact to PDF with Dynamic Text Scaling
window.exportArtifact = async function () {
    const modalDialog = document.querySelector('.modal-dialog');
    const originalWidth = modalDialog.style.width;
    const originalMaxWidth = modalDialog.style.maxWidth;

    // 1. Temporarily force print width for calculation
    modalDialog.style.width = '800px';
    modalDialog.style.maxWidth = '800px';

    // 2. Wait for layout to update
    await new Promise(resolve => setTimeout(resolve, 50));

    // 3. Optimize each slide independently
    const slides = document.querySelectorAll('.card');
    const PAGE_HEIGHT = 920; // Safe print area height in px (reduced for safety)

    slides.forEach(slide => {
        // Find elements
        const title = slide.querySelector('h2');
        const insightText = slide.querySelector('div[style*="background"] p');
        const listItems = slide.querySelectorAll('li');

        // Initial "Max" Safe Config
        let currentScale = 1.0;
        const config = {
            titleSize: 22, // pt
            bodySize: 12, // pt
            listSize: 11, // pt
            lineHeight: 1.4,
            padding: 1.5 // rem
        };

        const applyStyles = (scale) => {
            if (title) {
                title.style.fontSize = `${config.titleSize * scale}pt`;
                title.style.marginBottom = `${1 * scale}rem`;
            }
            if (insightText) {
                insightText.style.fontSize = `${config.bodySize * scale}pt`;
                insightText.parentElement.className = `mb-${Math.max(1, Math.floor(3 * scale))} p-${Math.max(1, Math.floor(2 * scale))}`;
            }
            listItems.forEach(li => {
                li.style.fontSize = `${config.listSize * scale}pt`;
                li.style.lineHeight = config.lineHeight;
                li.style.marginBottom = `${0.6 * scale}rem`;
            });
            slide.style.padding = `${Math.max(0.5, config.padding * scale)}rem`;

            // Force layout update check
            return slide.scrollHeight;
        };

        // Reset to base (conservative start)
        applyStyles(0.95);

        // Shrink if overflowing
        while (slide.scrollHeight > PAGE_HEIGHT && currentScale > 0.6) {
            currentScale -= 0.05;
            applyStyles(currentScale);
        }

        // Grow if too small (optional, but requested to "fill page")
        // Only grow if significantly under height to avoid risk
        while (slide.scrollHeight < (PAGE_HEIGHT * 0.75) && currentScale < 1.2) {
            currentScale += 0.05;
            applyStyles(currentScale);
        }
    });

    // 4. Inject Print Styles & Print
    const printStyles = document.createElement('style');
    printStyles.id = 'print-styles';
    printStyles.textContent = `
        @media print {
            @page {
                margin: 0.25in 0.4in;
                size: letter;
            }
            body > *:not(.modal) { display: none !important; }
            .modal { position: static !important; display: block !important; }
            .modal-dialog { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
            .modal-content { border: none !important; box-shadow: none !important; }
            .modal-header, .modal-footer { display: none !important; }
            .modal-body { padding: 0 !important; }
            
            .card {
                page-break-after: always;
                page-break-inside: avoid !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                /* Use calculated inline styles for height/padding/font, just ensure display behavior */
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                padding-top: 1rem !important; /* Minimal fixed top buffer */
                min-height: 90vh !important; /* Visual consistency */
            }
            .card:last-child { page-break-after: auto; }
            
        }
    `;
    document.head.appendChild(printStyles);

    // 5. Print
    window.print();

    // 6. Cleanup
    setTimeout(() => {
        const styles = document.getElementById('print-styles');
        if (styles) styles.remove();

        // Reset container overrides
        modalDialog.style.width = originalWidth;
        modalDialog.style.maxWidth = originalMaxWidth;

        // Note: We leave the inline font styles on the cards as they don't break the web view 
        // and it's better to keep the "optimized" look than flicker back.
    }, 500);
};

function renderArtifact(type, data) {
    const contentDiv = document.getElementById('artifactContent');

    if (type === 'flashcards') {
        const flashcards = data.flashcards || data; // Support both formats
        const html = flashcards.map((card, index) => `
            <div class="flashcard-wrapper mb-3" data-card-id="${index}">
                <div class="flashcard">
                    <div class="flashcard-inner">
                        <div class="flashcard-front">
                            <h5 class="text-secondary small text-uppercase mb-3">QUESTION</h5>
                            <p class="fs-5 fw-bold mb-4">${card.front}</p>
                            <div class="flashcard-hint">
                                <i class="fas fa-redo-alt me-2"></i>
                                <span>Click to reveal answer</span>
                            </div>
                        </div>
                        <div class="flashcard-back">
                            <h5 class="text-secondary small text-uppercase mb-3">ANSWER</h5>
                            <p class="fs-5 mb-4">${card.back}</p>
                            <div class="flashcard-hint">
                                <i class="fas fa-redo-alt me-2"></i>
                                <span>Click to see question</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        contentDiv.innerHTML = `
            <div class="p-2" style="background:#F9F7F2; border-radius:12px;">
                ${html}
            </div>
            <style>
                .flashcard-wrapper {
                    perspective: 1000px;
                    cursor: pointer;
                }
                
                .flashcard {
                    background: white;
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    box-shadow: var(--shadow-sm);
                    transition: all 0.3s ease;
                    min-height: 250px;
                }
                
                .flashcard:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                }
                
                .flashcard-inner {
                    position: relative;
                    width: 100%;
                    min-height: 250px;
                    transition: transform 0.6s;
                    transform-style: preserve-3d;
                }
                
                .flashcard-wrapper.flipped .flashcard-inner {
                    transform: rotateY(180deg);
                }
                
                .flashcard-front,
                .flashcard-back {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                
                .flashcard-front {
                    background: white;
                    border-radius: 16px;
                }
                
                .flashcard-back {
                    background: linear-gradient(135deg, #FDF9F0 0%, #F9F7F2 100%);
                    transform: rotateY(180deg);
                    border-radius: 16px;
                }
                
                .flashcard-hint {
                    text-align: center;
                    color: var(--accent);
                    font-size: 0.85rem;
                    font-weight: 600;
                    margin-top: auto;
                    opacity: 0.7;
                }
                
                .flashcard-wrapper:hover .flashcard-hint {
                    opacity: 1;
                }
            </style>
        `;

        // Add click handlers
        document.querySelectorAll('.flashcard-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', function () {
                this.classList.toggle('flipped');
            });
        });
    }
    else if (type === 'slides') {
        const html = data.slides.map((slide, i) => `
            <div class="card mb-4 border-0 shadow-sm">
                <div class="card-body p-5">
                    <div class="d-flex justify-content-end text-muted small mb-3">
                        <span style="font-weight: 600;">Slide ${i + 1}</span>
                    </div>
                    <h2 class="font-serif mb-3" style="color: var(--accent);">${slide.title}</h2>
                    ${slide.key_insight ? `
                        <div class="mb-2 p-2" style="background: var(--accent-light); border-left: 3px solid var(--accent); border-radius: 6px;">
                            <p class="mb-0" style="font-size: 1.1rem; line-height: 1.6; color: var(--text-primary);">
                                <strong>Key Insight:</strong> ${slide.key_insight}
                            </p>
                        </div>
                    ` : ''}
                    ${slide.details ? `
                        <ul class="list-unstyled mb-0">
                            ${slide.details.map(detail => `
                                <li class="mb-3 d-flex">
                                    <i class="fas fa-check-circle me-3 mt-1" style="color: var(--accent); font-size: 0.9rem;"></i>
                                    <span style="line-height: 1.6;">${detail}</span>
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    ${slide.bullets ? `
                        <ul class="list-unstyled">
                            ${slide.bullets.map(b => `<li class="mb-2"><i class="fas fa-dot-circle text-warning me-2 small"></i> ${b}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            </div>
        `).join('');
        contentDiv.innerHTML = `<div class="p-2" style="background:#F0EDE5; border-radius:12px;">${html}</div>`;
    }
    else {
        contentDiv.innerHTML = `<pre class="bg-light p-3 rounded">${JSON.stringify(data, null, 2)}</pre>`;
    }
}
