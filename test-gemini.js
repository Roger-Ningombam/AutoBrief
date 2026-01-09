import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
    console.log(`\nTesting model: ${modelName}`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        console.log(`SUCCESS: ${modelName} responded.`);
        return true;
    } catch (error) {
        console.log(`FAILED: ${modelName}`);
        // Print just the relevant error text to avoid truncation issues
        let msg = error.message || "";
        if (msg.includes("[404]")) console.log("Error 404: Not Found (Model or Endpoint)");
        else if (msg.includes("[403]")) console.log("Error 403: Forbidden (API Key / Quota)");
        else console.log("Error:", msg.substring(0, 200)); // Limit length
        return false;
    }
}

async function run() {
    await testModel("gemini-1.5-flash");
    await testModel("gemini-pro");
    await testModel("gemini-1.0-pro");
}

run();
