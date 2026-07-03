export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string; // Text content if text-based
  dataUrl?: string; // Data URL for images
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  files?: AttachedFile[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  systemPrompt: string;
}
