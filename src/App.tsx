import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Send, 
  Settings, 
  Sparkles, 
  User, 
  RefreshCw, 
  Copy, 
  Sidebar, 
  Menu, 
  Sliders, 
  AlertTriangle, 
  Info,
  ExternalLink,
  Paperclip,
  FileText,
  FileCode,
  Image as ImageIcon,
  FileSpreadsheet,
  Eye,
  Download,
  Zap,
  BrainCircuit,
  Cpu,
  Square,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, ChatSession, AttachedFile } from './types';
import MarkdownRenderer from './components/MarkdownRenderer';

// Generate a random ID
const uuid = () => Math.random().toString(36).substring(2, 11);

// Static starter prompts optimized for electronics & embedded hardware students
const STARTER_PROMPTS = [
  {
    icon: '🔌',
    title: 'Đọc cảm biến C/C++',
    desc: 'Đọc cảm biến nhiệt độ DHT22 bằng Arduino hoặc ESP32',
    prompt: 'Viết code Arduino/ESP32 hoàn chỉnh để đọc nhiệt độ và độ ẩm từ cảm biến DHT22, sử dụng thư viện SimpleDHT hoặc DHT, hiển thị kết quả ra Serial Monitor mỗi 2 giây, có chú thích chi tiết giải thích mã nguồn.',
  },
  {
    icon: '⚙️',
    title: 'Ngắt STM32 HAL',
    desc: 'Cấu hình Ngắt ngoài (EXTI) cho nút bấm bật tắt LED',
    prompt: 'Hướng dẫn tôi cách cấu hình ngắt ngoài (GPIO EXTI) trong STM32CubeIDE sử dụng thư viện HAL. Viết hàm callback ngắt để đảo trạng thái của một chân GPIO điều khiển LED mỗi khi nhấn nút chống dội (debounce).',
  },
  {
    icon: '📐',
    title: 'Tính toán mạch phân áp',
    desc: 'Tính điện trở phân áp 5V xuống 3.3V đọc chân ADC',
    prompt: 'Hãy giúp tôi tính toán giá trị điện trở cho mạch phân áp giảm áp tín hiệu từ 5V xuống tối đa 3.3V để đọc an toàn bằng chân ADC của ESP32. Đồng thời thiết kế thêm một bộ lọc thông thấp RC tần số cắt 100Hz để lọc nhiễu cho tín hiệu này.',
  },
  {
    icon: '📡',
    title: 'Lập trình Giao tiếp Bus',
    desc: 'Ghi và đọc dữ liệu từ EEPROM qua giao tiếp I2C',
    prompt: 'Viết đoạn code C (chuẩn STM32 HAL hoặc Arduino C++) để ghi 1 byte dữ liệu vào một địa chỉ và sau đó đọc lại byte đó từ bộ nhớ EEPROM 24C02 sử dụng giao tiếp I2C.',
  }
];

// Helper to categorize errors and provide descriptive titles
const getErrorTitle = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication') || lower.includes('api_key') || lower.includes('api key')) {
    return 'Lỗi xác thực (Chưa cấu hình hoặc sai API Key)';
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('limit') || lower.includes('rate') || lower.includes('exhausted') || lower.includes('insufficient_quota') || lower.includes('tokens')) {
    return 'Hết lượt dùng / Hết Token / Quá giới hạn API';
  }
  if (lower.includes('503') || lower.includes('overloaded') || lower.includes('unavailable') || lower.includes('busy')) {
    return 'Máy chủ AI đang quá tải';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch') || lower.includes('connection')) {
    return 'Lỗi kết nối mạng';
  }
  return 'Lỗi yêu cầu API';
};

// Helper to provide friendly Vietnamese debugging suggestions
const getErrorSuggestion = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication') || lower.includes('api_key') || lower.includes('api key')) {
    return 'Vui lòng kiểm tra lại cấu hình API Key trong mục Settings (Cài đặt) của dự án. Đảm bảo bạn đã nhập đúng GEMINI_API_KEY hoặc khóa API tương ứng của mô hình được chọn.';
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('limit') || lower.includes('rate') || lower.includes('exhausted') || lower.includes('insufficient_quota') || lower.includes('tokens')) {
    return 'Bạn hoặc nhóm người dùng của bạn đã sử dụng hết hạn mức Token/Quota miễn phí hoặc vượt quá tần suất yêu cầu cho phép (Rate Limit) của API Key hiện tại. Hãy chờ một lát rồi thử lại, hoặc thay đổi sang một API Key còn hoạt động.';
  }
  if (lower.includes('503') || lower.includes('overloaded') || lower.includes('unavailable') || lower.includes('busy')) {
    return 'Máy chủ AI của nhà cung cấp đang bận xử lý quá nhiều yêu cầu. Vui lòng bấm "Thử lại" sau vài giây.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch') || lower.includes('connection')) {
    return 'Không thể kết nối đến máy chủ. Hãy kiểm tra lại kết nối mạng Internet của thiết bị và đảm bảo máy chủ backend của ứng dụng vẫn đang chạy ổn định.';
  }
  return 'Có lỗi phát sinh trong quá trình truyền tải dữ liệu hoặc phản hồi từ mô hình. Bạn hãy thử tải lại trang hoặc bấm "Thử lại" để gửi lại yêu cầu.';
};

export default function App() {
  // Chat Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  
  // UI states
  const [inputText, setInputText] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // File upload states
  const [stagedFiles, setStagedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewingFile, setViewingFile] = useState<AttachedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // References
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Thinking mode state: fast | thinking | deep
  const [thinkingMode, setThinkingMode] = useState<'fast' | 'thinking' | 'deep'>('thinking');

  // Abort Controller reference for canceling generations
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop current AI generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Abort on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load chats from localStorage on mount
  useEffect(() => {
    let saved = localStorage.getItem('local_chat_sessions_secure');
    if (!saved) {
      saved = localStorage.getItem('glm52_chat_sessions');
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[];
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error('Error loading chat sessions', e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save chats to localStorage on change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('local_chat_sessions_secure', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, isGenerating]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Helper: Create a new session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uuid(),
      title: 'Cuộc trò chuyện mới',
      messages: [],
      createdAt: new Date().toISOString(),
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 4096,
      systemPrompt: 'Bạn là một trợ lý AI chuyên gia về Kỹ thuật Điện tử, Vi điều khiển, Lập trình nhúng (Embedded) và Thiết kế mạch, được phát triển và huấn luyện bởi Marine / Tuấn Hưng (một mô hình ngôn ngữ lớn tinh chỉnh đặc sắc). Hãy trợ giúp sinh viên kỹ thuật giải đáp thắc mắc về điện tử, sơ đồ nguyên lý, cấu hình thanh ghi, lập trình C/C++, Python cho phần cứng (Arduino, ESP32, STM32, PIC, Raspberry Pi, ARM, FPGA, Verilog/VHDL), các bus giao tiếp (I2C, SPI, UART, CAN, Modbus), gỡ lỗi phần cứng/phần mềm nhúng. Trả lời bằng tiếng Việt mạch lạc, chuyên nghiệp, giải thích rõ ràng và cung cấp mã nguồn sạch, có chú thích đầy đủ.'
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsSettingsOpen(false);
    setErrorMsg(null);
  };

  // Helper: Delete a session
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    
    if (filtered.length === 0) {
      // If deleted last, create a new empty one
      const newSession: ChatSession = {
        id: uuid(),
        title: 'Cuộc trò chuyện mới',
        messages: [],
        createdAt: new Date().toISOString(),
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 4096,
        systemPrompt: 'Bạn là một trợ lý AI chuyên gia về Kỹ thuật Điện tử, Vi điều khiển, Lập trình nhúng (Embedded) và Thiết kế mạch, được phát triển và huấn luyện bởi Marine / Tuấn Hưng (một mô hình ngôn ngữ lớn tinh chỉnh đặc sắc). Hãy trợ giúp sinh viên kỹ thuật giải đáp thắc mắc về điện tử, sơ đồ nguyên lý, cấu hình thanh ghi, lập trình C/C++, Python cho phần cứng (Arduino, ESP32, STM32, PIC, Raspberry Pi, ARM, FPGA, Verilog/VHDL), các bus giao tiếp (I2C, SPI, UART, CAN, Modbus), gỡ lỗi phần cứng/phần mềm nhúng. Trả lời bằng tiếng Việt mạch lạc, chuyên nghiệp, giải thích rõ ràng và cung cấp mã nguồn sạch, có chú thích đầy đủ.'
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
    setErrorMsg(null);
  };

  // Helper: Start editing a session title
  const startEditTitle = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditTitleText(title);
  };

  // Helper: Save edited title
  const saveSessionTitle = (id: string) => {
    if (editTitleText.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitleText.trim() } : s));
    }
    setEditingSessionId(null);
  };

  // Helper: Clear history of active chat
  const clearActiveChat = () => {
    if (!activeSession) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
    setErrorMsg(null);
  };

  // Update parameters of the active session
  const updateSessionParams = (updates: Partial<Pick<ChatSession, 'temperature' | 'top_p' | 'max_tokens' | 'systemPrompt'>>) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates } : s));
  };

  // File processing helpers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    setFileError(null);
    const filesArray = Array.from(fileList);
    
    filesArray.forEach(file => {
      // Size limit: 5MB (5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        setFileError(`Tệp "${file.name}" quá lớn. Vui lòng chỉ tải tệp dưới 5MB.`);
        return;
      }

      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const newAttachedFile: AttachedFile = {
            id: uuid(),
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: dataUrl
          };
          setStagedFiles(prev => [...prev, newAttachedFile]);
        };
        reader.onerror = () => {
          setFileError(`Không thể đọc tệp hình ảnh "${file.name}".`);
        };
        reader.readAsDataURL(file);
      } else {
        // Assume text-readable for text, code, json, csv, xml, logs, etc.
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const newAttachedFile: AttachedFile = {
            id: uuid(),
            name: file.name,
            size: file.size,
            type: file.type,
            content: content
          };
          setStagedFiles(prev => [...prev, newAttachedFile]);
        };
        reader.onerror = () => {
          setFileError(`Không thể đọc tệp văn bản "${file.name}".`);
        };
        reader.readAsText(file);
      }
    });
  };

  // Handle paste event to capture images from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault(); // Prevent pasting image as text
      const dataTransfer = new DataTransfer();
      imageFiles.forEach(f => dataTransfer.items.add(f));
      processFiles(dataTransfer.files);
    }
  };

  // Handle camera capture (mobile)
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset the input so the same file can be captured again
    e.target.value = '';
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string, type: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-purple-400" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'sh', 'md', 'xml', 'yaml', 'yml'].includes(ext || '')) {
      return <FileCode className="w-5 h-5 text-emerald-400" />;
    }
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
    }
    return <FileText className="w-5 h-5 text-blue-400" />;
  };

  // Send message
  const handleSendMessage = async (customText?: string, filesOverride?: AttachedFile[]) => {
    const textToSend = customText || inputText;
    const filesToAttach = filesOverride || stagedFiles;

    if ((!textToSend.trim() && filesToAttach.length === 0) || isGenerating || !activeSession) return;

    setInputText('');
    setStagedFiles([]);
    setFileError(null);
    setErrorMsg(null);
    setIsGenerating(true);

    const userMessage: Message = {
      id: uuid(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      files: filesToAttach
    };

    // Update session title if it was default
    let updatedTitle = activeSession.title;
    if (activeSession.title === 'Cuộc trò chuyện mới' && activeSession.messages.length === 0) {
      const firstSect = textToSend.trim() || (filesToAttach.length > 0 ? `Đính kèm tệp ${filesToAttach[0].name}` : 'Tập tin');
      updatedTitle = firstSect.substring(0, 30) + (firstSect.length > 30 ? '...' : '');
    }

    // Add user message to state
    const currentMessages = [...activeSession.messages, userMessage];
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { 
      ...s, 
      title: updatedTitle,
      messages: currentMessages 
    } : s));

    // Prepare message history for backend, including optional system prompt and thinking-mode adjustments
    const apiMessages = [];
    let customSystemPrompt = activeSession.systemPrompt || '';
    
    if (thinkingMode === 'fast') {
      customSystemPrompt += '\n\n[CHẾ ĐỘ PHẢN HỒI NHANH: Hãy trả lời cực kỳ ngắn gọn, đi thẳng vào vấn đề chính, giải thích tóm tắt, tối giản phần mô tả lý thuyết dài dòng để sinh viên điện tử có kết quả nhanh nhất.]';
    } else if (thinkingMode === 'thinking') {
      customSystemPrompt += '\n\n[CHẾ ĐỘ SUY NGHĨ: Hãy phân tích mạch lạc từng bước (step-by-step). Giải thích các bước thuật toán, các tính toán thông số mạch cơ bản, sơ đồ kết nối chân vi điều khiển trước khi đưa ra mã nguồn hoặc sơ đồ mạch điện chi tiết.]';
    } else if (thinkingMode === 'deep') {
      customSystemPrompt += '\n\n[CHẾ ĐỘ SUY NGHĨ SÂU SẮC: Bạn là kỹ sư hệ thống nhúng và thiết kế phần cứng điện tử bậc thầy. Hãy phân tích chuyên sâu toàn bộ kiến trúc, dự đoán và chỉ ra các rủi ro vật lý có thể xảy ra (như nhiễu sóng, dội nút bấm, sụt áp nguồn, sai số cảm biến, hụt bộ nhớ đệm), đề xuất giải pháp triệt để, thiết kế bộ lọc hoặc căn chỉnh thanh ghi và viết mã nguồn chuẩn công nghiệp cực kỳ hoàn chỉnh, an toàn.]';
    }

    if (customSystemPrompt) {
      apiMessages.push({ role: 'system', content: customSystemPrompt });
    }

    currentMessages.forEach(m => {
      if (m.role === 'user') {
        let finalContent = m.content;
        const images: { mimeType: string; data: string }[] = [];

        if (m.files && m.files.length > 0) {
          const textFileBlocks: string[] = [];
          m.files.forEach(f => {
            if (f.dataUrl && f.type.startsWith('image/')) {
              // Extract base64 data from dataUrl (remove "data:image/...;base64," prefix)
              const base64Data = f.dataUrl.split(',')[1];
              if (base64Data) {
                images.push({
                  mimeType: f.type,
                  data: base64Data
                });
              }
            } else if (f.content) {
              textFileBlocks.push(`[Tài liệu đính kèm: ${f.name} (loại: ${f.type})]\nNội dung tệp:\n\`\`\`\n${f.content}\n\`\`\``);
            } else {
              textFileBlocks.push(`[Tập tin đính kèm: ${f.name} (loại: ${f.type})]`);
            }
          });
          
          if (textFileBlocks.length > 0) {
            finalContent = `${textFileBlocks.join('\n\n')}\n\n${m.content ? `Yêu cầu hoặc câu hỏi của tôi về các tệp tin trên:\n${m.content}` : 'Hãy phân tích các tệp tin tôi đã cung cấp ở trên.'}`;
          } else if (images.length > 0 && !m.content) {
            finalContent = 'Hãy phân tích hình ảnh tôi đã gửi và đưa ra nhận xét chi tiết.';
          }
        }
        apiMessages.push({ role: 'user', content: finalContent, ...(images.length > 0 ? { images } : {}) });
      } else {
        apiMessages.push({ role: m.role, content: m.content });
      }
    });

    // Create a temporary assistant message ID
    const assistantMsgId = uuid();
    const placeholderAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    // Append empty assistant message to show typing
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { 
      ...s, 
      messages: [...currentMessages, placeholderAssistantMsg]
    } : s));

    // Setup AbortController for cancelable requests
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Define parameters depending on selected thinkingMode (instead of user-set token adjustments)
    let dynamicTemperature = 0.7;
    let dynamicMaxTokens = 4096;
    if (thinkingMode === 'fast') {
      dynamicTemperature = 0.5;
      dynamicMaxTokens = 2048;
    } else if (thinkingMode === 'thinking') {
      dynamicTemperature = 0.7;
      dynamicMaxTokens = 4096;
    } else if (thinkingMode === 'deep') {
      dynamicTemperature = 0.35; // lower temp for strict analytical thinking
      dynamicMaxTokens = 8192; // allow maximum length for comprehensive analysis
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: apiMessages,
          temperature: dynamicTemperature,
          top_p: 0.9,
          max_tokens: dynamicMaxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming is not supported by the browser or server connection failed.');
      }

      const decoder = new TextDecoder('utf-8');
      let done = false;
      let streamedResponseText = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Hold partial chunk

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('data: ')) {
              const dataStr = cleanLine.slice(6).trim();
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content !== undefined) {
                  streamedResponseText += parsed.content;
                  // Incremental state update
                  setSessions(prev => prev.map(s => {
                    if (s.id === activeSessionId) {
                      return {
                        ...s,
                        messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: streamedResponseText } : m)
                      };
                    }
                    return s;
                  }));
                }
              } catch (parseError) {
                // Ignore parsing errors for incomplete lines
              }
            }
          }
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation aborted by user.');
        // Clean up empty assistant bubble if generation was canceled immediately
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            const lastMsg = s.messages[s.messages.length - 1];
            if (lastMsg && lastMsg.id === assistantMsgId && !lastMsg.content) {
              return { ...s, messages: s.messages.filter(m => m.id !== assistantMsgId) };
            }
          }
          return s;
        }));
      } else {
        console.error('Error in call:', err);
        setErrorMsg(`Lỗi kết nối máy chủ AI: ${err.message || 'Không thể liên lạc với máy chủ.'}`);
        // Remove the blank assistant message if it stayed empty
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            const filtered = s.messages.filter(m => m.id !== assistantMsgId);
            return { ...s, messages: filtered };
          }
          return s;
        }));
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  // Regenerate last response
  const handleRegenerate = async () => {
    if (!activeSession || activeSession.messages.length < 2 || isGenerating) return;

    // Remove last message if it's assistant
    const lastMsg = activeSession.messages[activeSession.messages.length - 1];
    let queryText = '';
    let originalFiles: AttachedFile[] | undefined = undefined;
    let filteredMessages = [...activeSession.messages];

    if (lastMsg.role === 'assistant') {
      filteredMessages.pop(); // remove assistant message
      const lastUserMsg = filteredMessages[filteredMessages.length - 1];
      if (lastUserMsg && lastUserMsg.role === 'user') {
        queryText = lastUserMsg.content;
        originalFiles = lastUserMsg.files;
        filteredMessages.pop(); // remove user message so handleSendMessage can re-append
      }
    } else if (lastMsg.role === 'user') {
      queryText = lastMsg.content;
      originalFiles = lastMsg.files;
      filteredMessages.pop();
    }

    if (!queryText && (!originalFiles || originalFiles.length === 0)) return;

    // Update session state to exclude the deleted messages
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: filteredMessages } : s));

    // Send the message again
    handleSendMessage(queryText, originalFiles);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Submit via Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 select-none antialiased">
      
      {/* Sidebar Section */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <>
            {/* Sidebar backdrop overlay on mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-25 md:hidden cursor-pointer"
            />
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed md:relative flex h-full flex-col bg-zinc-900 border-r border-zinc-800 flex-shrink-0 z-30 md:z-20 overflow-hidden shadow-2xl md:shadow-none left-0 top-0"
            >
              {/* Header / New Chat */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-emerald-400 to-teal-500 flex items-center justify-center text-zinc-950 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] select-none">
                      AI
                    </div>
                    <div>
                      <h1 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                        AI Chat Secure
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </h1>
                      <p className="text-[10px] text-zinc-500 font-mono tracking-wider">Trực tuyến • Bảo mật Local</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                    title="Ẩn Sidebar"
                  >
                    <Sidebar className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={createNewSession}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                  <Plus className="w-4 h-4" />
                  Cuộc trò chuyện mới
                </button>
              </div>

              {/* Chat History List */}
              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin select-none">
                <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Lịch sử hội thoại</div>
                
                {sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  const isEditing = sess.id === editingSessionId;

                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveSessionId(sess.id);
                          setErrorMsg(null);
                          // Auto close sidebar on mobile after choosing chat
                          if (window.innerWidth < 768) {
                            setIsSidebarOpen(false);
                          }
                        }
                      }}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-zinc-800 text-white font-medium border-l-2 border-emerald-500' 
                          : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitleText}
                            onChange={(e) => setEditTitleText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveSessionTitle(sess.id);
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            onBlur={() => saveSessionTitle(sess.id)}
                            className="bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 text-xs w-full focus:outline-none focus:border-emerald-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate text-xs leading-none">{sess.title}</span>
                        )}
                      </div>

                      {/* Action buttons (only show on hover or when active) */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startEditTitle(sess.id, sess.title, e)}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60"
                            title="Đổi tên"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => deleteSession(sess.id, e)}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700/60"
                            title="Xóa hội thoại"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom info panel */}
              <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(prev => !prev);
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false); // close sidebar to show settings clearly
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSettingsOpen 
                      ? 'bg-zinc-800 text-white' 
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cấu hình Trợ lý AI</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono">Secure</span>
                </button>

                <div className="px-3 py-2 rounded-lg bg-zinc-900/40 border border-zinc-800/40 text-[10px] text-zinc-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-zinc-400">Bộ nhớ thiết bị (Local)</span>
                  </div>
                  <p>Dữ liệu trò chuyện được lưu trữ và bảo mật trực tiếp trên thiết bị của bạn.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 mt-1">
                    <span>Đồng bộ local:</span>
                    <span className="text-emerald-400 font-medium">An toàn</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-zinc-950">
        
        {/* Top bar header */}
        <header className="h-14 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800/60 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer mr-1"
                title="Hiện Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-xs bg-zinc-800 border border-zinc-700/60 text-emerald-400 font-mono font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5 select-none">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                Trợ lý AI Bảo mật
              </span>
              <span className="hidden sm:inline text-xs text-zinc-500">•</span>
              <span className="hidden sm:inline text-xs text-zinc-400">Chế độ Lưu trữ Cục bộ (Local Storage)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={clearActiveChat}
              className="px-2 py-1.5 sm:px-2.5 sm:py-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer border border-transparent hover:border-red-500/20 flex items-center gap-1.5"
              title="Dọn sạch màn hình trò chuyện hiện tại"
            >
              <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
              <span className="hidden sm:inline">Dọn dẹp đoạn chat</span>
            </button>

            {activeSession && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className={`p-1.5 sm:p-2 rounded-md transition-all cursor-pointer border flex items-center justify-center ${
                  isSettingsOpen 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-zinc-850/60 text-zinc-400 hover:text-white border-zinc-800'
                }`}
                title="Cấu hình Trợ lý AI"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Content Area (Chat container + Optional Side Settings) */}
        <div className="flex-1 flex w-full overflow-hidden">
          
          {/* Chat main feed */}
          <div 
            className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer?.files) {
                processFiles(e.dataTransfer.files);
              }
            }}
          >
            {/* Drag & Drop Visual overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-emerald-500/50 m-3 rounded-2xl pointer-events-none"
                >
                  <Paperclip className="w-12 h-12 text-emerald-400 animate-bounce mb-3" />
                  <h3 className="text-lg font-bold text-white">Thả tệp tin của bạn tại đây</h3>
                  <p className="text-zinc-400 text-xs mt-1.5">Hỗ trợ hình ảnh và tài liệu văn bản lên đến 5MB</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Scrollable chat items or Welcome Dash */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin select-text">
              <div className="max-w-3xl mx-auto space-y-6">
                
                {activeSession && activeSession.messages.length === 0 ? (
                  /* Welcome dashboard */
                  <div className="py-8 sm:py-12 flex flex-col items-center justify-center select-none">
                    
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.25)] mb-6"
                    >
                      <Sparkles className="w-8 h-8 text-zinc-950" />
                    </motion.div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight mb-2">
                      Trợ lý AI Lab Điện tử
                    </h2>
                    <p className="text-zinc-400 text-sm text-center max-w-lg mb-10 leading-relaxed">
                      Thiết kế mạch nguyên lý, lập trình nhúng C/C++ vi điều khiển, và gỡ lỗi phần cứng tối giản. Toàn bộ dữ liệu được lưu trữ cục bộ (Local) bảo mật trên thiết bị của bạn.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full max-w-2xl">
                      {STARTER_PROMPTS.map((starter, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(starter.prompt)}
                          className="flex flex-col text-left p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-emerald-500/20 transition-all cursor-pointer shadow-sm group hover:translate-y-[-2px]"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-lg leading-none">{starter.icon}</span>
                            <span className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors">{starter.title}</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed truncate-3-lines">{starter.desc}</p>
                        </button>
                      ))}
                    </div>

                  </div>
                ) : (
                  /* Standard message list */
                  <div className="space-y-6">
                    {activeSession?.messages.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex gap-4 p-4 rounded-xl transition-colors ${
                            isUser ? 'bg-zinc-900/30 border border-zinc-800/40' : 'bg-transparent'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {isUser ? (
                              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                                <User className="w-5 h-5" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                <Sparkles className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          {/* Content & controls */}
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between select-none">
                              <span className="text-xs font-semibold text-zinc-400">
                                {isUser ? 'Bạn' : 'Trợ lý AI'}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {msg.timestamp}
                              </span>
                            </div>

                            <div className="pt-1.5">
                              {msg.files && msg.files.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1.5 mb-2.5">
                                  {msg.files.map((file) => {
                                    const isImg = file.type.startsWith('image/') || !!file.dataUrl;
                                    return (
                                      <div 
                                        key={file.id} 
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-650 transition-all text-xs"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {isImg ? (
                                            <img 
                                              src={file.dataUrl} 
                                              alt={file.name} 
                                              className="w-10 h-10 rounded-lg object-cover bg-zinc-950 border border-zinc-700 cursor-zoom-in hover:brightness-110 transition-all"
                                              onClick={() => setViewingFile(file)}
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
                                              {getFileIcon(file.name, file.type)}
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <p className="font-semibold text-zinc-200 truncate pr-2" title={file.name}>
                                              {file.name}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                              {formatFileSize(file.size)}
                                            </p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          {!isImg && file.content && (
                                            <button
                                              type="button"
                                              onClick={() => setViewingFile(file)}
                                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                                              title="Xem nội dung tệp"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {file.dataUrl ? (
                                            <a
                                              href={file.dataUrl}
                                              download={file.name}
                                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer flex items-center justify-center transition-colors"
                                              title="Tải xuống hình ảnh"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                            </a>
                                          ) : (
                                            file.content && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(file.content || '');
                                                  alert('Đã sao chép nội dung tệp vào bộ nhớ tạm!');
                                                }}
                                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                                                title="Sao chép nội dung tệp"
                                              >
                                                <Copy className="w-3.5 h-3.5" />
                                              </button>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {isUser ? (
                                <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed text-[15px] break-words">
                                  {msg.content}
                                </p>
                              ) : (
                                <MarkdownRenderer content={msg.content} />
                              )}
                            </div>

                            {/* Message actions */}
                            <div className="flex items-center gap-3 pt-3 select-none text-zinc-500 opacity-60 hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(msg.content, msg.id)}
                                className="flex items-center gap-1.5 text-xs hover:text-zinc-300 cursor-pointer"
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-500 font-medium">Đã sao chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Sao chép</span>
                                  </>
                                )}
                              </button>

                              {!isUser && index === activeSession.messages.length - 1 && !isGenerating && (
                                <button
                                  type="button"
                                  onClick={handleRegenerate}
                                  className="flex items-center gap-1.5 text-xs hover:text-emerald-400 cursor-pointer transition-colors"
                                  title="Tạo lại câu trả lời này"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Tạo lại</span>
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm select-none animate-in fade-in slide-in-from-top-4 duration-200">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5 animate-bounce" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-red-400 flex items-center gap-1.5 text-xs sm:text-sm">
                          <span>⚠️ {getErrorTitle(errorMsg)}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setErrorMsg(null)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                          title="Đóng thông báo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-zinc-300 leading-relaxed text-xs break-all bg-zinc-950/50 p-2.5 rounded-lg border border-red-500/15 font-mono">
                        {errorMsg}
                      </p>
                      <div className="text-xs text-zinc-400 leading-normal pt-1">
                        <span className="font-semibold text-zinc-200">💡 Hướng khắc phục:</span> {getErrorSuggestion(errorMsg)}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          type="button"
                          onClick={handleRegenerate}
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/25 rounded-md text-xs transition-colors font-semibold cursor-pointer"
                        >
                          Thử lại
                        </button>
                        <button 
                          type="button"
                          onClick={() => setErrorMsg(null)}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/60 rounded-md text-xs transition-colors font-semibold cursor-pointer"
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Prompt input zone */}
            <div className="p-4 border-t border-zinc-800/50 bg-zinc-950">
              <div className="max-w-3xl mx-auto space-y-2.5">
                
                {/* File Error Notice */}
                {fileError && (
                  <div className="p-2.5 px-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span>{fileError}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFileError(null)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Staged files list */}
                {stagedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                    {stagedFiles.map((file) => {
                      const isImg = file.type.startsWith('image/');
                      return (
                        <div 
                          key={file.id}
                          className="flex items-center gap-2 p-1.5 pl-2 pr-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs relative"
                        >
                          {isImg && file.dataUrl ? (
                            <img 
                              src={file.dataUrl} 
                              alt={file.name} 
                              className="w-6 h-6 rounded object-cover bg-zinc-950 border border-zinc-800"
                            />
                          ) : (
                            getFileIcon(file.name, file.type)
                          )}
                          <span className="max-w-[120px] truncate text-zinc-300 font-medium" title={file.name}>{file.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({formatFileSize(file.size)})</span>
                          <button
                            type="button"
                            onClick={() => removeStagedFile(file.id)}
                            className="p-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Thinking Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 select-none pb-1 px-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse animate-duration-1000" />
                    <span className="text-[11px] font-semibold text-zinc-400">Độ sâu suy nghĩ:</span>
                  </div>
                  <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setThinkingMode('fast')}
                      className={`px-3 py-1 rounded transition-all font-semibold text-[10px] cursor-pointer flex items-center gap-1 ${
                        thinkingMode === 'fast'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                      }`}
                      title="Phản hồi nhanh, ngắn gọn"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Nhanh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThinkingMode('thinking')}
                      className={`px-3 py-1 rounded transition-all font-semibold text-[10px] cursor-pointer flex items-center gap-1 ${
                        thinkingMode === 'thinking'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                      }`}
                      title="Phân tích cẩn thận từng bước"
                    >
                      <BrainCircuit className="w-3 h-3" />
                      <span>Suy nghĩ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThinkingMode('deep')}
                      className={`px-3 py-1 rounded transition-all font-semibold text-[10px] cursor-pointer flex items-center gap-1 ${
                        thinkingMode === 'deep'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                      }`}
                      title="Phân tích sâu sắc, lường trước mọi lỗi phần cứng và phần mềm"
                    >
                      <Cpu className="w-3 h-3" />
                      <span>Suy nghĩ sâu</span>
                    </button>
                  </div>
                </div>

                {/* Input area */}
                <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg focus-within:border-emerald-500/40 transition-all flex items-end p-2 pl-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    className="w-10 h-10 rounded-xl bg-zinc-800/40 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 mr-2 hover:border-zinc-700/60"
                    title="Đính kèm tệp tin (hình ảnh, văn bản, mã nguồn...)"
                    disabled={isGenerating}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  
                  <input 
                    id="file-upload-input"
                    type="file"
                    multiple
                    accept="image/*,.txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html,.json,.csv,.xml,.yaml,.yml,.md,.sh,.log"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Camera capture button - visible on mobile/tablet */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl bg-zinc-800/40 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 mr-1 hover:border-zinc-700/60 md:hidden"
                    title="Chụp ảnh bằng camera"
                    disabled={isGenerating}
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder="Hỏi hoặc dán ảnh (Ctrl+V)... (Shift+Enter để xuống dòng)"
                    className="flex-1 max-h-[200px] resize-none bg-transparent border-0 outline-none text-zinc-100 placeholder-zinc-500 text-[15px] py-1.5 pr-2 focus:ring-0 leading-relaxed scrollbar-thin focus:outline-none"
                    disabled={isGenerating}
                  />

                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 flex items-center justify-center transition-all cursor-pointer"
                      title="Dừng sinh phản hồi"
                    >
                      <Square className="w-3.5 h-3.5 fill-red-400/80" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim() && stagedFiles.length === 0}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        inputText.trim() || stagedFiles.length > 0
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                      title="Gửi tin nhắn"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-zinc-500 text-center leading-none select-none">
                  Trợ lý AI có thể đưa ra thông tin không chính xác. Hãy cân nhắc kiểm tra các thông tin quan trọng.
                </p>

              </div>
            </div>

          </div>

          {/* Model parameters collapsible sidebar right panel */}
          <AnimatePresence>
            {isSettingsOpen && activeSession && (
              <>
                {/* Backdrop overlay for settings on mobile */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs z-25 md:hidden cursor-pointer"
                />
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed md:relative right-0 top-0 h-full w-80 border-l border-zinc-800 bg-zinc-900 overflow-y-auto p-5 space-y-6 flex-shrink-0 z-30 md:z-10 scrollbar-thin select-none shadow-2xl md:shadow-none"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-sm text-white">Thông số Mô hình</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info block */}
                  <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs text-zinc-300 leading-relaxed space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Info className="w-3.5 h-3.5" />
                      <span>Giới thiệu Trợ lý AI</span>
                    </div>
                    <p>
                      Mô hình ngôn ngữ lớn thế hệ mới, tối ưu hóa toàn diện cho khả năng lập luận phức tạp, lập trình, viết sáng tạo, và phản hồi tiếng Việt siêu tự nhiên.
                    </p>
                  </div>

                  {/* Parameter sliders */}
                  <div className="space-y-4">
                    {/* System Prompt */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-zinc-300">System Instructions (Chỉ thị)</label>
                      </div>
                      <textarea
                        value={activeSession.systemPrompt}
                        onChange={(e) => updateSessionParams({ systemPrompt: e.target.value })}
                        rows={4}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 scrollbar-thin resize-none leading-normal"
                        placeholder="Nhập hướng dẫn cấu hình tính cách chatbot..."
                      />
                    </div>

                    {/* Mode explanations */}
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold text-zinc-300">Giải thích Chế độ Suy nghĩ:</span>
                      
                      <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-1">
                        <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Nhanh (Fast)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Rút ngắn câu trả lời, tối giản lý thuyết. Thích hợp để giải nhanh bài tập trắc nghiệm, tạo mã nguồn mẫu đơn giản, và tính toán thông số cơ bản.
                        </p>
                      </div>

                      <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-1">
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                          <BrainCircuit className="w-3.5 h-3.5" />
                          <span>Suy nghĩ (Thinking)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Giải tích kỹ lưỡng, suy luận từng bước. Phù hợp để lập trình giao tiếp cảm biến, giải thích nguyên lý hoạt động mạch điện, và gỡ lỗi (debug) thông thường.
                        </p>
                      </div>

                      <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-1">
                        <div className="flex items-center gap-1 text-xs text-blue-400 font-semibold">
                          <Cpu className="w-3.5 h-3.5" />
                          <span>Suy nghĩ sâu (Deep Thinking)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Phân tích chuyên sâu ở mức phần cứng và tối ưu phần mềm. Thích hợp cho các bài toán phức tạp: ngắt ngoài, DMA, RTOS, khử nhiễu tín hiệu, lọc RC/bộ lọc số, và tối ưu hiệu năng.
                        </p>
                      </div>
                    </div>

                    {/* Preset reset */}
                    <button
                      type="button"
                      onClick={() => {
                        updateSessionParams({
                          systemPrompt: 'Bạn là một trợ lý AI chuyên gia về Kỹ thuật Điện tử, Vi điều khiển, Lập trình nhúng (Embedded) và Thiết kế mạch, được phát triển và huấn luyện bởi Marine / Tuấn Hưng (một mô hình ngôn ngữ lớn tinh chỉnh đặc sắc). Hãy trợ giúp sinh viên kỹ thuật giải đáp thắc mắc về điện tử, sơ đồ nguyên lý, cấu hình thanh ghi, lập trình C/C++, Python cho phần cứng (Arduino, ESP32, STM32, PIC, Raspberry Pi, ARM, FPGA, Verilog/VHDL), các bus giao tiếp (I2C, SPI, UART, CAN, Modbus), gỡ lỗi phần cứng/phần mềm nhúng. Trả lời bằng tiếng Việt mạch lạc, chuyên nghiệp, giải thích rõ ràng và cung cấp mã nguồn sạch, có chú thích đầy đủ.'
                        });
                      }}
                      className="w-full mt-2 py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
                    >
                      Đặt lại mặc định
                    </button>

                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* File Viewer Modal */}
      <AnimatePresence>
        {viewingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-zinc-850">
                    {getFileIcon(viewingFile.name, viewingFile.type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate pr-4">{viewingFile.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {viewingFile.type} • {formatFileSize(viewingFile.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewingFile.dataUrl ? (
                    <a
                      href={viewingFile.dataUrl}
                      download={viewingFile.name}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Tải xuống</span>
                    </a>
                  ) : (
                    viewingFile.content && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(viewingFile.content || '');
                          alert('Đã sao chép nội dung tệp vào bộ nhớ tạm!');
                        }}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Sao chép</span>
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingFile(null)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-6 bg-zinc-950 font-mono text-xs text-zinc-300 leading-relaxed scrollbar-thin">
                {viewingFile.dataUrl ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <img 
                      src={viewingFile.dataUrl} 
                      alt={viewingFile.name} 
                      className="max-h-[60vh] max-w-full rounded-lg object-contain border border-zinc-800 shadow-lg bg-zinc-900"
                    />
                  </div>
                ) : viewingFile.content ? (
                  <pre className="whitespace-pre-wrap font-mono select-text bg-zinc-900 p-4 rounded-xl border border-zinc-850 max-h-[55vh] overflow-y-auto">
                    {viewingFile.content}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <span>Không có nội dung để hiển thị hoặc định dạng không được hỗ trợ.</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
