# 🎯 AutoBrief - Groq-Powered Book Summarizer

**Pure Groq API Implementation** - No database required!

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18 or higher)
- A Groq API key ([Get one here](https://console.groq.com))

### 2. Installation

```bash
# Clone or navigate to the project
cd auto-brief

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Configuration

Edit `.env` and add your Groq API key:
```
GROQ_API_KEY=your_actual_groq_api_key_here
```

### 4. Run Locally

```bash
# Development server
vercel dev
```

Visit `http://localhost:3000` in your browser.

## ✨ Features

- 📚 **AI-Powered Book Analysis** - Uses Groq's Llama 3.3 70B model
- 📊 **Presentation Slides** - Auto-generate comprehensive slide decks
- 🗂️ **Flashcards** - Create interactive Q&A cards for studying
- 📄 **PDF Export** - Download slides as beautifully formatted PDFs
- 🎨 **Beautiful UI** - Modern, responsive design

## 🏗️ Architecture

### How It Works

1. **User searches for a book** → Groq API generates comprehensive summary
2. **Summary displayed** → Stored temporarily in browser memory
3. **Generate artifacts** → Slides & flashcards created on-demand via Groq
4. **Export** → Clean PDF export for offline use

### Tech Stack

- **Frontend**: Vanilla JavaScript, Bootstrap 5, AOS animations
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI**: Groq API (Llama 3.3 70B Versatile)
- **Styling**: CSS Variables, Custom Animations

## 📁 Project Structure

```
auto-brief/
├── api/                    # Serverless API endpoints
│   ├── ingest.js          # Book summary generation
│   ├── generate.js        # Slides & flashcards generation
│   └── lib/
│       └── security.js    # Rate limiting & validation
├── js/
│   └── app.js            # Frontend logic
├── css/
│   ├── variables.css     # CSS custom properties
│   ├── global.css        # Global styles
│   ├── landing.css       # Landing page styles
│   └── read.css          # Reading interface styles
├── index.html            # Landing page
├── read.html             # Main app interface
└── package.json          # Dependencies
```

## 🔧 API Endpoints

### POST `/api/ingest`
Generates a book summary from a title.

**Request:**
```json
{
  "bookTitle": "Atomic Habits by James Clear"
}
```

**Response:**
```json
{
  "source": "ai_generated",
  "data": {
    "title": "Atomic Habits",
    "core_thesis": "...",
    "key_concepts": [...],
    "mental_models": [...]
  },
  "slug": "atomic-habits-by-james-clear"
}
```

### POST `/api/generate`
Generates slides or flashcards from book data.

**Request:**
```json
{
  "bookData": { /* full book data object */ },
  "artifactType": "slides" // or "flashcards"
}
```

**Response:**
```json
{
  "artifactType": "slides",
  "data": {
    "slides": [
      {
        "title": "...",
        "key_insight": "...",
        "details": [...]
      }
    ]
  }
}
```

## 🛡️ Security

- Rate limiting (15 requests per minute per IP)
- Input sanitization
- CORS protection
- API key validation

## 🎨 Customization

### Change Theme Colors

Edit `css/variables.css`:
```css
:root {
  --accent: #D4772A;        /* Primary accent color */
  --accent-hover: #B66324;  /* Hover state */
  /* ... */
}
```

### Modify AI Prompts

Edit prompts in:
- `api/ingest.js` - Book summary generation
- `api/generate.js` - Slides & flashcards generation

## 📝 Recent Changes (v2.0)

### ✅ Removed Supabase Database
- No longer requires database setup
- All data processing happens in real-time via Groq API
- Summaries stored temporarily in browser memory
- Cleaner, simpler architecture

### 🎯 Benefits
- ✨ Easier setup (only 1 API key needed)
- 💰 Reduced costs (no database fees)
- 🚀 Always fresh analysis
- 🔧 Simpler maintenance

See `SUPABASE_REMOVAL_SUMMARY.md` for detailed migration notes.

## 🐛 Troubleshooting

### "API Key missing" error
- Ensure `.env` file exists in project root
- Check that `GROQ_API_KEY` is set correctly
- Restart the development server

### Slow response times
- Groq API can take 10-15 seconds for complex summaries
- This is normal for AI processing
- Consider upgrading Groq tier for faster responses

### "Book not found" error
- Try including author name: "Title by Author"
- Check spelling of book title
- Verify it's a real, published non-fiction book

## 📄 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🙏 Credits

- **AI**: Powered by [Groq](https://groq.com)
- **UI Animations**: [AOS Library](https://michalsnik.github.io/aos/)
- **Icons**: [FontAwesome](https://fontawesome.com)
- **Framework**: [Bootstrap 5](https://getbootstrap.com)

---

**Made with ❤️ for book lovers and lifelong learners**
