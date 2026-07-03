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

// Use a vision model to describe images, then pass descriptions to GLM-5.2
async function describeImages(client: OpenAI, images: any[]): Promise<string> {
  const contentParts: any[] = [];
  for (const img of images) {
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`,
      }
    });
  }
  contentParts.push({
    type: 'text',
    text: 'Hãy mô tả chi tiết, đầy đủ và chính xác nhất có thể tất cả nội dung trong hình ảnh này. Nếu có sơ đồ mạch điện, hãy liệt kê tất cả linh kiện, giá trị, kết nối chân. Nếu có code, hãy chép lại toàn bộ code. Nếu có text, hãy chép lại toàn bộ text. Nếu có bảng dữ liệu, hãy liệt kê đầy đủ. Mô tả bằng tiếng Việt.',
  });

  const response = await client.chat.completions.create({
    model: 'meta/llama-3.2-90b-vision-instruct',
    messages: [{
      role: 'user',
      content: contentParts,
    }],
    temperature: 0.3,
    max_tokens: 4096,
    stream: false,
  });

  return response.choices?.[0]?.message?.content || 'Không thể phân tích hình ảnh.';
}

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

    // Pre-process messages: convert images to text descriptions using vision model
    // then pass everything to GLM-5.2 for intelligent analysis
    const processedMessages: any[] = [];
    for (const m of messages) {
      if (m.images && Array.isArray(m.images) && m.images.length > 0) {
        // Use vision model to describe the images
        const imageDescription = await describeImages(client, m.images);
        const enhancedContent = `[PHÂN TÍCH HÌNH ẢNH TỪ NGƯỜI DÙNG]\n${imageDescription}\n\n[YÊU CẦU CỦA NGƯỜI DÙNG]\n${m.content || 'Hãy phân tích hình ảnh trên và đưa ra nhận xét chi tiết.'}`;
        processedMessages.push({
          role: m.role,
          content: enhancedContent,
        });
      } else {
        processedMessages.push({
          role: m.role,
          content: m.content || '',
        });
      }
    }

    // Always use GLM-5.2 for the final intelligent response
    const model = 'z-ai/glm-5.2';

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const responseStream = await client.chat.completions.create({
          model: model,
          messages: processedMessages,
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
      const response = await client.chat.completions.create({
        model: model,
        messages: processedMessages,
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
