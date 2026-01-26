# Manual Testing Guide: AutoBrief 2.0 (Human Tone Update)

This guide helps you verify the "Simpler, Human" updates to the AutoBrief engine.

## Prerequisites
1.  **Server**: Ensure `node server.js` is running in your terminal.
2.  **Browser**: Open `http://localhost:3000` in Chrome/Edge/Firefox.

---

## Test 1: "Human" Summary Ingestion
**Goal**: Verify the new "Curious Friend" persona works.

1.  **Action**: Open `http://localhost:3000/read.html`
2.  **Search**: Enter a new book you haven't searched before (e.g., *Essentialism* or *The Psychology of Money*).
    *   *Note: If you search a book you've already done, it will load the OLD cached version from Supabase. Use a fresh title.*
3.  **Verify Loading**: Watch the "Reading & Analyzing..." screen (~15s).
4.  **Verify Output**:
    *   **Thesis**: Does the main summary under the title sound like a "calm human"? Check that it avoids robotic jargon.
    *   **Concepts**: Are the "Core Concepts" cards written in simple English?

---

## Test 2: "Unlimited" Slide Deck
**Goal**: Verify the slide deck is no longer fixed to 8 slides.

1.  **Action**: Scroll to the bottom and click "**Create Slides**".
2.  **Verify**:
    *   Wait for the modal to load.
    *   **Count**: Are there more than just 8 slides? (The AI should now decide the length).
    *   **Content**: Do the bullets feel simple and educational, not "marketing-like"?

---

## Test 3: "Dynamic" Flashcards
**Goal**: Verify the new question types.

1.  **Action**: Scroll down and click "**Flashcards**".
2.  **Verify**:
    *   Read the "Front" of the cards.
    *   **Check**: Do you see questions like *"How can I use this in real life?"* or *"What mistake do people usually make?"*
    *   **Tone**: Is the answer simple and direct?

---

## Troubleshooting
*   **"Book not found"**: The AI might have failed. Try a very famous book title.
*   **Old Content?**: If you see the old robotic text, you likely hit the database cache. Unfortunately, to clear this, you'd need to delete the row in Supabase, or just search for a slightly different title (e.g. "Atomic Habits Book" instead of "Atomic Habits").
