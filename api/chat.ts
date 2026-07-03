import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
const getGeminiClient = () => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required but missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, temperature = 1, top_p = 1, max_tokens = 4096, stream = true } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGeminiClient();

    // Extract system instructions from messages if present
    const systemMsg = messages.find((m: any) => m.role === 'system');
    const systemInstruction = systemMsg ? systemMsg.content : undefined;

    // Filter out system messages and map the remaining messages
    // Support multimodal: if message has images[], include them as inlineData parts
    const contents = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => {
        const parts: any[] = [];
        // Add image parts first if present
        if (m.images && Array.isArray(m.images)) {
          for (const img of m.images) {
            parts.push({
              inlineData: {
                mimeType: img.mimeType || 'image/jpeg',
                data: img.data, // base64 string without the data:...;base64, prefix
              }
            });
          }
        }
        // Add text part
        if (m.content) {
          parts.push({ text: m.content });
        }
        // Ensure at least one part exists
        if (parts.length === 0) {
          parts.push({ text: '' });
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

    if (stream) {
      // Set headers for Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: temperature,
            topP: top_p,
          }
        });

        for await (const chunk of responseStream) {
          const content = chunk.text || '';
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
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
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: temperature,
          topP: top_p,
        }
      });

      return res.json({
        content: response.text || '',
      });
    }
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: error.message || 'An error occurred during completion.' });
  }
}
