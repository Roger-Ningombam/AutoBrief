import Groq from "groq-sdk";
import dotenv from 'dotenv';
import { secureEndpoint } from './lib/security.js';

// Load environment variables
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(request, response) {
    // SECURITY CHECK: Wraps CORS, Rate Limiting, Validation
    const sanitizedBody = await secureEndpoint(request, response, ['bookTitle']);
    if (!sanitizedBody) return;

    let { bookTitle } = sanitizedBody;

    try {
        // bookTitle is already validated and sanitised by secureEndpoint

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
                { role: "system", content: "You are a specialized book summarizer that outputs ONLY raw valid JSON. Do not include any intro text, markdown formatting, or explanations." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // Even lower for maximum consistency
            max_tokens: 4000, // Ensure long summaries don't get cut off
        });

        const text = chatCompletion.choices[0]?.message?.content || "";
        console.log("DEBUG: Raw response received from Groq");

        // Advanced JSON extraction: Find the first '{' and the last '}'
        let cleanedText = "";
        const firstBracket = text.indexOf('{');
        const lastBracket = text.lastIndexOf('}');

        if (firstBracket !== -1 && lastBracket !== -1) {
            cleanedText = text.substring(firstBracket, lastBracket + 1);
        } else {
            cleanedText = text.trim(); // Fallback
        }

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse JSON from Groq. Raw text starting with:", text.substring(0, 100));
            return response.status(500).json({
                error: 'AI formatting error: The summary was generated but the format was slightly off.',
                tip: 'Try clicking summarize again. Large models occasionally add conversational text.',
                rawResponse: text.substring(0, 500) // Send a snippet to help debug
            });
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

