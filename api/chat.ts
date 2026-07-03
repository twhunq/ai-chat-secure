import OpenAI from 'openai';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    const model = hasImages ? 'meta/llama-3.2-90b-vision-instruct' : 'z-ai/glm-5.2';

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
}
