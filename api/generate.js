import Groq from "groq-sdk";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(request, response) {
    // Add CORS headers to allow requests from any origin
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

    try {
        const { prompt } = request.body;

        if (!prompt) {
            return response.status(400).json({ error: 'Prompt is required' });
        }

        // Generate content using Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "";

        return response.status(200).json({ result: responseText });
    } catch (error) {
        console.error("Error generating content:", error);
        return response.status(500).json({ error: 'Failed to generate content', details: error.message });
    }
}

