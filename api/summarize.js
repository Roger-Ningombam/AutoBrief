import Groq from "groq-sdk";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(request, response) {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    let bookTitle = "";

    try {
        bookTitle = request.body.bookTitle;

        if (!bookTitle) {
            return response.status(400).json({ error: 'Book title is required' });
        }

        if (!process.env.GROQ_API_KEY) {
            console.error("DEBUG: GROQ_API_KEY is missing in environment variables.");
            return response.status(500).json({
                error: 'Server misconfigured: API Key missing',
                tip: 'Ensure GROQ_API_KEY is added to Vercel Environment Variables.'
            });
        }
        console.log(`DEBUG: Processing summary for "${bookTitle}"`);

        const prompt = `
      You are an elite literary analyst. I will give you a book title: "${bookTitle}".
      
      **CRITICAL INSTRUCTION:** The user is complaining that previous summaries were too short and generic. 
      You must go DEEP. Do not summarize in 1 sentence. Explain in paragraphs.
      
      **Your Goal:** Create an 8-slide "Deep Dive" that feels like a full chapter-by-chapter breakdown.

      **The Content Rules (Strict):**
      1. **Word Count:** Each slide's 'content' MUST contain at least 80-120 words.
      2. **Formatting:** You MUST use HTML tags inside the JSON strings to structure the text:
         - Use <p> for detailed explanations.
         - Use <ul><li> for lists of examples.
         - Use <strong> for emphasis.
      3. **Specificity:** Do not say "The author discusses habits." Say "James Clear argues that habits are the compound interest of self-improvement..."

      **The 8-Slide Structure:**
      1. **The Hook:** Introduction + Author Background + Who this book is for (Detailed).
      2. **The Core Problem:** What specific pain point does this book solve? (Use a <p> followed by a <ul> of 3 symptoms).
      3. **The Central Thesis:** The main argument in detail.
      4. **Key Concept I:** First major pillar. Explain the "What", "Why", and "How" in detail.
      5. **Key Concept II:** Second major pillar. Include a specific example/study from the book if possible.
      6. **Key Concept III:** Third major pillar. Connect it to real life.
      7. **The Golden Nugget:** A famous story, quote, or case study from the text, retold fully.
      8. **Action Plan:** A detailed 3-step implementation guide (Use <ul><li>).

      **JSON Structure:**
      {
        "book_title": "String",
        "author": "String",
        "theme_color": "#HexCode (Choose a WARM, professional, or earthy tone like Sienna, Gold, or Deep Brown - AVOID Blues or purples)",
        "slides": [
           { 
             "title": "Slide Title", 
             "content": "<p>Detailed paragraph 1...</p><ul><li>Point 1</li><li>Point 2</li></ul>" 
           },
           ... (8 items total)
        ]
      }
      
      Output ONLY raw JSON.
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a specialized book summarizer that outputs only valid JSON." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3, // Lower temperature for more consistent JSON
        });

        const text = chatCompletion.choices[0]?.message?.content || "";

        // Clean up the text just in case the model adds markdown code blocks
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse JSON from Groq:", text);
            return response.status(500).json({ error: 'Failed to parse AI response', rawResponse: text });
        }

        return response.status(200).json(jsonResponse);

    } catch (error) {
        console.error("CRITICAL ERROR generating summary:", error);
        return response.status(500).json({
            error: 'Failed to generate summary',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

