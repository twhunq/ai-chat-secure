import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Lazy-loaded NVIDIA OpenAI-compatible client
let aiClient: OpenAI | null = null;
const getNvidiaClient = () => {
  if (!aiClient) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error('NVIDIA_API_KEY environment variable is required but missing.');
    }
    aiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
  }
  return aiClient;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase body size limit for base64 images
  app.use(express.json({ limit: '20mb' }));

  // API chat endpoint with streaming support
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, temperature = 1, top_p = 1, max_tokens = 4096, stream = true } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
         return res.status(400).json({ error: 'Messages array is required.' });
      }

      const client = getNvidiaClient();

      // Build OpenAI-compatible messages, with multimodal support
      const openaiMessages: any[] = messages.map((m: any) => {
        // If the message has images, use content array format (OpenAI vision)
        if (m.images && Array.isArray(m.images) && m.images.length > 0) {
          const contentParts: any[] = [];
          // Add images first
          for (const img of m.images) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`,
              }
            });
          }
          // Add text
          if (m.content) {
            contentParts.push({
              type: 'text',
              text: m.content,
            });
          }
          return {
            role: m.role,
            content: contentParts,
          };
        }
        // Standard text message
        return {
          role: m.role,
          content: m.content || '',
        };
      });

      // Detect if any message has images to choose appropriate model
      const hasImages = messages.some((m: any) => m.images && m.images.length > 0);
      const model = hasImages ? 'google/gemma-3-27b-it' : 'z-ai/glm-5.2';

      if (stream) {
        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
          const responseStream = await client.chat.completions.create({
            model: model,
            messages: openaiMessages,
            temperature: temperature,
            top_p: top_p,
            max_tokens: max_tokens,
            stream: true,
          });

          for await (const chunk of responseStream) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          }
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (streamError: any) {
          console.error('Error in completion stream:', streamError);
          res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
          res.end();
        }
      } else {
        // Non-streaming response fallback
        const response = await client.chat.completions.create({
          model: model,
          messages: openaiMessages,
          temperature: temperature,
          top_p: top_p,
          max_tokens: max_tokens,
          stream: false,
        });

        return res.json({
          content: response.choices?.[0]?.message?.content || '',
        });
      }
    } catch (error: any) {
      console.error('Chat API Error:', error);
      return res.status(500).json({ error: error.message || 'An error occurred during completion.' });
    }
  });

  // Serve frontend assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
