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
            console.error("Error: GROQ_API_KEY is missing in environment variables.");
            return response.status(500).json({ error: 'Server misconfigured: API Key missing' });
        }

        const prompt = `
      You are an elite literary analyst and executive coach. I will give you a book title: "${bookTitle}".
      
      Your goal is to create a comprehensive "Masterclass" summary of this book, designed for high-level professionals.
      
      **Instructions:**
      1. Identify the book. Handle ambiguity by defaulting to the most seminal work (e.g. "Influence" -> Cialdini).
      2. If unknown, return JSON: { "error": "Book not found" }.
      3. If found, generate a valid JSON object with a "slides" key containing an array of exactly 8 objects.

      **The 8-Slide Structure:**
      - **Slide 1 (The Hook):** Title, Author, and a powerful 2-sentence "Why read this?" statement.
      - **Slide 2 (The Problem):** Describe the core problem or "status quo" the book challenges.
      - **Slide 3 (The Core Thesis):** The book's main solution or paradigm shift.
      - **Slide 4 (Key Concept I):** Deep dive into the first major pillar of the book.
      - **Slide 5 (Key Concept II):** Deep dive into the second major pillar.
      - **Slide 6 (Key Concept III):** Deep dive into the third major pillar.
      - **Slide 7 (The Golden Nugget):** A famous story, case study, or quote from the book that perfectly illustrates the philosophy.
      - **Slide 8 (Action Plan):** 3 concrete, actionable steps the reader can take *today*.

      **JSON Structure (Strict):**
      {
        "book_title": "String",
        "author": "String",
        "theme_color": "#HexCode",
        "slides": [
           { "title": "Slide Heading", "content": "Slide body text (use HTML <b> for emphasis, no markdown)" },
           { "title": "The Problem", "content": "..." },
           ... (8 items total)
        ]
      }

      Output ONLY valid JSON. No markdown formatting.
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
        console.error("Error generating summary:", error);
        return response.status(500).json({
            error: 'Failed to generate summary',
            details: error.message
        });
    }
}

