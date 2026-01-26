import Groq from "groq-sdk";
import { supabase } from './lib/supabase.js';
import { secureEndpoint } from './lib/security.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper to create a consistent slug from title
const createSlug = (title) => {
    return title.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/[\s_-]+/g, '-') // Replace spaces with dashes
        .replace(/^-+|-+$/g, ''); // Trim dashes
};

export default async function handler(request, response) {
    // SECURITY CHECK: Rate Limiting, Headers, Validation
    const sanitizedBody = await secureEndpoint(request, response, ['bookTitle']);
    if (!sanitizedBody) return; // Request rejected by security layer

    const { bookTitle } = sanitizedBody;
    const slug = createSlug(bookTitle);

    try {
        // 1. Check Supabase (Cache Hit)
        const { data: existingBook, error: dbError } = await supabase
            .from('books')
            .select('*')
            .eq('slug', slug)
            .single();

        if (existingBook) {
            console.log(`CACHE HIT: Found "${bookTitle}" in DB.`);
            return response.status(200).json({
                source: 'database',
                data: existingBook.knowledge,
                slug: existingBook.slug
            });
        }

        // 2. Groq Extraction (Cache Miss)
        console.log(`CACHE MISS: Ingesting "${bookTitle}" via AI...`);

        const prompt = `
      You are an intelligent literary assistant. 
      FIRST, verify if the book "${bookTitle}" actually exists and is a known published work.
      
      **Validation Rule:**
      - If the input is gibberish (e.g., "afshfhjd"), random letters, or not a real book, output EXACTLY:
        { "error": "Book not found", "is_real": false }
      
      **If the book IS real, proceed with the "Curious Friend" summary:**
      
      **Goal:** Write a simple, clear analysis of the book.
      **Tone:** Calm human, not a teacher or AI. Simple English. No fancy words.
      
      **Output Strict JSON** with the following structure:
      {
        "is_real": true,
        "title": "${bookTitle}",
        "core_thesis": "A simple, clear summary of what the book is about, why people like it, and what problem it solves.",
        "key_concepts": [
           { "title": "Main Idea Name", "explanation": "Simple explanation of this idea." }
        ],
        "mental_models": [
           { "name": "Model/Tool Name", "description": "How to use this in real life." }
        ],
        "misconceptions": [
           "Common mistake people make about this topic"
        ]
      }
      
      **Rules for the Content:**
      - **core_thesis**: Focus only on the main idea. Explanation should be simple and direct.
      - **key_concepts**: Extract 5-7 important concepts. Use simple English.
      - **mental_models**: Extract 3-5 practical tools for thinking.
      - NO MARKDOWN or formatting outside the JSON structure.
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a senior literary analyst. Output strict JSON only." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const rawContent = chatCompletion.choices[0]?.message?.content;
        let knowledgeObject;

        try {
            knowledgeObject = JSON.parse(rawContent);
        } catch (e) {
            console.error("JSON Parse Error:", rawContent);
            return response.status(500).json({ error: "AI generation failed to produce valid JSON" });
        }

        // Hallucination Check
        if (knowledgeObject.is_real === false || knowledgeObject.error) {
            return response.status(404).json({ error: "Sorry, I couldn't find that book. Please check the title." });
        }

        // 3. Save to Supabase (Write-Once)
        const { error: insertError } = await supabase
            .from('books')
            .insert([{
                title: bookTitle,
                slug: slug,
                knowledge: knowledgeObject
            }]);

        if (insertError) {
            console.error("Supabase Save Error:", insertError);
            // We still return the data to the user even if caching failed
        }

        return response.status(200).json({
            source: 'ai_generated',
            data: knowledgeObject,
            slug: slug
        });

    } catch (error) {
        console.error("Ingestion Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
