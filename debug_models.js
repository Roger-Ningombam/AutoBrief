import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

async function listModels() {
    console.log("Checking available models for your API Key...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        // Did you know? You can ask the SDK to list what models you have access to!
        // This is the definitive test.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        // Note: SDK doesn't have a direct 'listModels' helper easily accessible in the simplified client 
        // without an authenticated admin client sometimes, but checking a basic fetch works.

        // Actually, we can use the API directly with fetch to see the error more clearly
        // or just try to hit the 'list models' endpoint if possible.
        // Let's stick to trying to generate with a very safe fallback.

        console.log("Trying 'gemini-1.5-flash-latest'...");
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        await modelFlash.generateContent("Hi");
        console.log("SUCCESS: gemini-1.5-flash-latest works!");

    } catch (error) {
        console.log("\n--- DETAILED ERROR INFO ---");
        console.log(error.message);

        if (error.message.includes("404")) {
            console.log("\nANALYSIS: The API is reachable, but the specific MODEL is 404.");
            console.log("This usually means the API Key is valid, but the project it belongs to");
            console.log("has not enabled the 'Generative Language API'.");
        }
        if (error.message.includes("403")) {
            console.log("ANALYSIS: API Key rejected (403).");
        }
    }
}

listModels();
