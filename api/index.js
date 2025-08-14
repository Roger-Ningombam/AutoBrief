// --- Imports: Bring in the required tools ---
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Loads your secret keys
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sgMail = require('@sendgrid/mail');

// --- Initializations: Set up the tools ---
const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- Middleware: Basic setup for the server ---
app.use(cors()); // Allows your frontend to talk to this backend
app.use(express.json()); // Allows the server to understand JSON data

// --- API Endpoints ---

// Handles the book summary requests
app.post('/summarize', async (req, res) => {
    const { bookName } = req.body;

    if (!bookName) {
        return res.status(400).json({ error: 'Book name is required.' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        const prompt = `Create a structured summary of the book titled "${bookName}". Use the following format with clear headings and bold the headings:

**Main Summary:** [Provide a detailed summary of the plot and characters here.]

**Core Themes:** [List and explain the main themes of the book.]

**Key Lessons:** [Use bullet points to list the most important takeaways for the reader.]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summaryText = response.text();

        res.json({ summary: summaryText });

    } catch (error) {
        console.error('Error with Gemini API:', error);
        res.status(500).json({ error: 'Failed to generate summary.' });
    }
});

// Handles the contact form feedback
app.post('/send-feedback', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const emailData = {
        to: process.env.MY_PERSONAL_EMAIL,
        from: process.env.VERIFIED_SENDER_EMAIL,
        subject: `New Feedback from Autobrief Contact Form`,
        html: `<p><strong>From:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message}</p>`,
    };

    try {
        await sgMail.send(emailData);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send feedback.' });
    }
});

// --- Export the app for Vercel ---
module.exports = app;
