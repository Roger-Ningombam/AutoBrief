import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

        if (!process.env.GEMINI_API_KEY) {
            console.error("Error: GEMINI_API_KEY is missing in environment variables.");
            return response.status(500).json({ error: 'Server misconfigured: API Key missing' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
You are an expert book summarizer. I will give you a book title: "${bookTitle}".
You must return a valid JSON object with exactly these keys:
- \`title\`: The full correct title of the book.
- \`author\`: The author's name.
- \`slide1_title\`: 'The Big Idea'
- \`slide1_content\`: A 2-sentence hook explaining the core concept.
- \`slide2_title\`: 'Key Insights'
- \`slide2_content\`: An HTML bulleted list (<ul><li>...</li></ul>) of 3 distinct lessons.
- \`slide3_title\`: 'Action Plan'
- \`slide3_content\`: A practical conclusion on how to apply this book.

Ambiguity Handling:
- If the user provides a generic title (e.g. 'Influence'), default to the most seminal business/psychology work with that name.
- If the book doesn't exist or you cannot summarize it, return a JSON with a single key \`error\` containing a helpful message.

IMPORTANT: Output ONLY the raw JSON string. Do not wrap it in markdown code blocks (e.g. \`\`\`json). Do not add any other text.
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean up the text just in case the model adds markdown
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse JSON from Gemini:", text);
            return response.status(500).json({ error: 'Failed to parse AI response', rawResponse: text });
        }

        return response.status(200).json(jsonResponse);

    } catch (error) {
        console.error("Error generating summary:", error);

        // FAILOVER: If the API fails (e.g. 404/403/Quota), return a Mock Response so the User can check the UI.
        console.log("⚠️ API Failed. Falling back to MOCK data for demonstration.");

        const mockData = {
            title: bookTitle || "Atomic Habits",
            author: "James Clear (Demo)",
            slide1_title: "The Big Idea",
            slide1_content: "This is a DEMO summary because the AI API key is not yet active. Small habits compound over time to create massive results.",
            slide2_title: "Key Insights",
            slide2_content: "<ul><li><strong>Insight 1:</strong> Habits are the compound interest of self-improvement.</li><li><strong>Insight 2:</strong> Focus on systems, not goals.</li><li><strong>Insight 3:</strong> Identity change is the North Star of habit change.</li></ul>",
            slide3_title: "Action Plan",
            slide3_content: "1. Update your Google Cloud Console to enable Generative Language API.<br>2. Check your billing status.<br>3. This UI is ready to go once the key works!",
            is_mock: true
        };

        return response.status(200).json(mockData);
    }
}
