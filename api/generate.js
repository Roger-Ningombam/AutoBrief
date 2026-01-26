import Groq from "groq-sdk";
import { supabase } from './lib/supabase.js';
import { secureEndpoint } from './lib/security.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(request, response) {
    // SECURITY CHECK: Rate Limiting, Headers, Validation
    const sanitizedBody = await secureEndpoint(request, response, ['slug', 'artifactType']);
    if (!sanitizedBody) return; // Request rejected

    const { slug, artifactType } = sanitizedBody;
    console.log(`DEBUG: Generating ${artifactType} for slug: "${slug}"`);

    try {
        // 1. Fetch Knowledge from DB
        const { data: book, error } = await supabase
            .from('books')
            .select('knowledge, title')
            .eq('slug', slug)
            .single();

        if (error || !book) {
            console.error("Supabase Lookup Error:", error, "Slug sought:", slug);
            return response.status(404).json({ error: 'Book not found. Please ingest first.' });
        }

        const knowledge = book.knowledge;
        console.log(`Generating ${artifactType} for "${book.title}"...`);

        // 2. define Artifact Prompts
        let prompt = "";

        const context = `
            Book: "${book.title}"
            Core Thesis: ${knowledge.core_thesis}
            Key Concepts: ${JSON.stringify(knowledge.key_concepts)}
        `;

        const antiHallucination = `
            **Anti-Hallucination Rules (CRITICAL):**
            - Generate content ONLY if it is explicitly present or clearly implied in the book.
            - Do NOT invent rules, names, or concepts.
            - Do NOT rename ideas to sound smarter.
            - Do NOT create variations of the same idea.
            - Do NOT add filler concepts to complete a list.
            - If a concept is not clearly from the book or you are unsure it exists, do not include it. Leave it out completely.
            - For each concept you include:
                - Make sure it is distinct.
                - Make sure it is actually from the book.
                - Explain it in simple words without adding new meaning.
            - Quality is more important than quantity. Fewer real concepts are better than many fake ones.
            - If the book does not contain enough mental models to fill a section, keep the section short.
            - Never guess. Never improvise. Never hallucinate.
        `;

        if (artifactType === 'slides') {
            prompt = `
                ${context}
                ${antiHallucination}
                
                You are creating a comprehensive slide deck that serves as a detailed summary of this book.
                Each slide should provide substantial, in-depth content that fills an entire PDF page when printed.
                
                **Rules:**
                - Create 8-12 slides minimum. Add more if needed to fully cover the book's content.
                - Each slide should focus on ONE major concept, framework, or insight from the book.
                - Every slide MUST include:
                  1. A clear, specific title (not generic)
                  2. A "key_insight" field: A 3-4 sentence comprehensive summary that thoroughly explains the core idea, its significance, and its practical implications
                  3. A "details" array: 6-8 substantial supporting points that elaborate on the concept with:
                     - Specific mechanisms, processes, or step-by-step breakdowns
                     - Real-world applications and use cases
                     - Important nuances, caveats, or common misconceptions
                     - Concrete examples from the book with context
                     - Supporting evidence or research findings
                     - Actionable implementation strategies
                - Each detail point should be a complete, informative statement (1-2 sentences when needed for clarity)
                - Use clear, precise language. Be specific, not vague.
                - Avoid marketing speak, motivational fluff, or generic advice.
                - Focus on deep, actionable understanding—what the reader needs to truly master the concept.
                
                **Example of GOOD slide structure:**
                {
                    "title": "The Habit Loop: How Behaviors Become Automatic",
                    "key_insight": "Every habit operates through a three-step neurological loop: cue, routine, and reward. The brain encodes this pattern to conserve mental energy, which is why habits feel automatic once established. Understanding this loop is essential for both building new habits and breaking old ones, as it reveals the precise intervention points where change is possible. The cue-routine-reward cycle becomes so ingrained that it operates at a subconscious level, making willpower alone insufficient for lasting change.",
                    "details": [
                        "Cue: The trigger that initiates the behavior, which can be a specific time of day, location, emotional state, presence of other people, or a preceding action that serves as an automatic prompt",
                        "Routine: The behavior itself, which can be physical (like going for a run), mental (like visualizing success), or emotional (like seeking comfort when stressed)",
                        "Reward: The benefit gained from the behavior, which tells the brain whether this particular loop is worth remembering for the future—rewards can be tangible (like a treat) or intangible (like a sense of accomplishment)",
                        "The basal ganglia, located deep in the brain, stores these habit patterns while the prefrontal cortex (responsible for conscious decision-making) essentially goes into standby mode, which is why we can drive home without actively thinking about each turn",
                        "To change a habit, keep the same cue and reward but modify the routine—this is the Golden Rule of Habit Change, because the brain's craving for the reward remains constant while you substitute a healthier behavior",
                        "Cravings emerge over time as the brain begins to anticipate the reward the moment it recognizes the cue, creating a neurological signature that drives the automatic behavior even before conscious thought occurs",
                        "Habit tracking and awareness exercises help make unconscious routines visible, allowing you to identify the specific cues that trigger unwanted behaviors",
                        "Implementation intentions (if-then plans) leverage the habit loop by establishing new cue-routine pairs intentionally, such as 'If I pour my morning coffee, then I will immediately write for 10 minutes'"
                    ]
                }
                
                **Format: Strict JSON**
                {
                    "slides": [
                        { 
                            "title": "Specific Slide Title", 
                            "key_insight": "3-4 sentence comprehensive explanation covering the concept, its significance, implications, and context",
                            "details": ["Detailed point 1", "Detailed point 2", "Detailed point 3", "Detailed point 4", "Detailed point 5", "Detailed point 6", "Detailed point 7", "Detailed point 8"]
                        }
                    ]
                }
            `;
        } else if (artifactType === 'flashcards') {
            prompt = `
                ${context}
                ${antiHallucination}
                
                Create learning flashcards from this book.
                
                **Rules:**
                - Do NOT limit the number of flashcards. Create as many as needed to cover the book well.
                - Every flashcard MUST focus on one UNIQUE idea only.
                - NO duplicate questions. NO similar questions. Each question must be distinct.
                - Ensure each flashcard covers a different concept, framework, or insight from the book.
                - Use very simple English. Avoid textbook language.
                - Front: A short, clear question (one sentence).
                - Back: A simple, direct answer (1-2 sentences maximum).
                
                **Question Types (use variety):**
                - "What does [specific concept] mean?"
                - "Why is [specific idea] important?"
                - "How can I use [specific framework] in real life?"
                - "What mistake do people usually make with [specific concept]?"
                - "What is the difference between [concept A] and [concept B]?"
                
                **Avoid:**
                - Asking the same thing in different ways
                - Generic questions that apply to multiple concepts
                - Overlapping or redundant questions
                
                **Format: Strict JSON object**
                {
                    "flashcards": [
                        { "front": "Question", "back": "Answer" }
                    ]
                }
            `;
        } else {
            return response.status(400).json({ error: 'Invalid artifactType' });
        }

        // 3. Call Groq (Fast & Cheap)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert educational content generator. Output JSON only." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile", // Or 8b for speed if needed
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        const artifact = JSON.parse(chatCompletion.choices[0]?.message?.content);

        return response.status(200).json({
            artifactType,
            data: artifact
        });

    } catch (err) {
        console.error("Generation Error:", err);
        return response.status(500).json({ error: err.message });
    }
}
