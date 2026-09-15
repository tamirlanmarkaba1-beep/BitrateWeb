import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(cors());
app.use(express.json());

// AI Chat endpoint
app.post('/api/ai-chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'mixtral-8x7b-32768',
      max_tokens: 1024,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response';
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Groq API error:', error.message);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('AI Chat endpoint: POST /api/ai-chat');
});
