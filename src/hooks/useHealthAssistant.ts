import { useState, useEffect, useRef } from "react";
import "@/types";
import { prompt } from "@/constants/textConstants";

const useHealthAssistant = (accessToken: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: "system",
      content: prompt },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [chats, setChats] = useState<Chat[]>([
    { id: "1", name: "Current Chat", messages: [] },
  ]);
  const [currentChatId, setCurrentChatId] = useState("1");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [voiceIconColor, setVoiceIconColor] = useState("#000000");
  const [voiceIconAnimation, setVoiceIconAnimation] = useState({
    color: "#AECED2",
    scale: 1,
  });
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [isCapturingQuery, setIsCapturingQuery] = useState(false);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [emotionalTone, setEmotionalTone] = useState<string>("warm");
  const [voiceStyle, setVoiceStyle] = useState<string>("default");
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [recognitionError, setRecognitionError] = useState("");

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const currentTranscript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(" ")
          .trim()
          .toLowerCase();
        console.log("Detected speech:", currentTranscript);
        setTranscript(currentTranscript);
        setShowTranscript(true);

        if (isWaitingForWakeWord) {
          if (currentTranscript.includes("hey asha") || currentTranscript.includes("hey aasha") || currentTranscript.includes("hello")) {
            console.log("Wake word detected!");
            setIsWaitingForWakeWord(false);
            setIsCapturingQuery(true);
            setTranscript("Listening for your question...");
            setUserQuery("");
          }
        } else if (isCapturingQuery) {
          setUserQuery(currentTranscript);
          
          if (captureTimeoutRef.current) {
            clearTimeout(captureTimeoutRef.current);
          }
          
          captureTimeoutRef.current = setTimeout(() => {
            processQuery(currentTranscript);
          }, 3000); // Wait for 3 seconds of silence before processing
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsRecognitionActive(false);
        console.log("Speech recognition ended");
        if (!isGeneratingResponse && !isCapturingQuery) {
          setTimeout(startListening, 1000);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setIsRecognitionActive(false);
        if (event.error !== 'aborted' && !isGeneratingResponse && !isCapturingQuery) {
          setTimeout(startListening, 1000);
        }
      };

      startListening();
    } else {
      console.log("Speech recognition is not supported in this browser");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, [isWaitingForWakeWord, isGeneratingResponse, isCapturingQuery]);

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening || isSpeaking) {
      interval = setInterval(() => {
        setVoiceIconColor((prevColor) =>
          prevColor === "#000000" ? "#AECED2" : "#000000"
        );
      }, 500);
    } else {
      setVoiceIconColor("#000000");
    }
    return () => clearInterval(interval);
  }, [isListening, isSpeaking]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening || isSpeaking) {
      interval = setInterval(() => {
        setVoiceIconAnimation((prev) => ({
          color: isListening ? "#D1B8A0" : isSpeaking ? "#FF8830" : "#AECED2",
          scale: prev.scale === 1 ? 1.1 : 1,
        }));
      }, 150);
    } else {
      setVoiceIconAnimation({ color: "#AECED2", scale: 1 });
    }
    return () => clearInterval(interval);
  }, [isListening, isSpeaking]);

  const startListening = () => {
    if (recognitionRef.current && !isRecognitionActive) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsRecognitionActive(true);
        console.log("Started listening");
        setVoiceIconAnimation({ color: "#D1B8A0", scale: 1.1 });
        if (isWaitingForWakeWord) {
          setTranscript("Listening for wake word...");
        } else {
          setTranscript("Listening for your question...");
        }
        setShowTranscript(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setIsListening(false);
        setIsRecognitionActive(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecognitionActive) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsRecognitionActive(false);
      console.log("Stopped listening");
    }
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: `Chat ${chats.length + 1}`,
      messages: []
    };
    setChats([...chats, newChat]);
    setCurrentChatId(newChat.id);
  };

  const switchChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const getCurrentChat = (): Chat => {
    return chats.find(chat => chat.id === currentChatId) || chats[0];
  };

  const generateLlamaResponse = async (prompt: string): Promise<string> => {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1",
        prompt,
        stream: false,
      }),
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const data = await response.json();
    return data.response.trim();
  };
  
  const handleAiResponse = async (userMessage: string) => {
    try {
      console.log("Received user message:", userMessage);
  
      if (userMessage.toLowerCase().includes('book') || 
          userMessage.toLowerCase().includes('make') || 
          userMessage.toLowerCase().includes('schedule') && 
          userMessage.toLowerCase().includes('appointment')) {
        return await handleAppointmentBooking(userMessage);
      }
  
      if (userMessage.toLowerCase().includes('email') || 
          userMessage.toLowerCase().includes('mail') || 
          userMessage.toLowerCase().includes('inbox')) {
        console.log("Detected email-related query. Calling readEmail function.");
        let emailQuery = userMessage.toLowerCase();
        
        if (emailQuery.includes('unread') || emailQuery.includes('new')) {
          emailQuery = 'unread';
        } else if (emailQuery.includes('important')) {
          emailQuery = 'important';
        } else if (emailQuery.includes('sent')) {
          emailQuery = 'sent';
        } else if (emailQuery.includes('draft')) {
          emailQuery = 'draft';
        } else {
          emailQuery = 'recent';
        }
        
        let emailData;
        try {
          const emailResponse = await readEmail(emailQuery);
          const jsonString = emailResponse.match(/\[.*\]/)?.[0];
          emailData = jsonString ? JSON.parse(jsonString) : [];
        } catch (error) {
          console.error("Failed to parse email response:", error);
          emailData = [];
        }
        
        const getEmailSummary = async (email: any) => {
          const emailContent = `
            Subject: ${email.subject}
            From: ${email.from}
            Preview: ${email.snippet}
          `;
          const summary = await generateLlamaResponse(`Summarize the following email in 2-3 sentences, highlighting the key points. Do not include phrases like "Here is a summary" or "In summary". Just provide the concise summary:\n\n${emailContent}`);
          return summary.trim();
        };
        
        let aiResponse = '';
  
        if (emailData && emailData.length > 0) {
          const emailSummaries = await Promise.all(emailData.slice(0, 3).map(async (email: any, index: number) => {
            const sender = email.from.match(/<(.+)>/)?.[1] || email.from;
            const summary = await getEmailSummary(email);
            return `Email ${index + 1} was sent by ${sender}. ${summary}`;
          }));
  
          const emailSummary = emailSummaries.join('\n\n');
          aiResponse = `[warmly] Sweetie, I've checked your emails for you. Here's a detailed summary of your ${emailQuery} emails:\n\n${emailSummary}\n\nWould you like me to elaborate on any of these emails?`;
        }
        else {
          aiResponse = `[gently] I'm sorry, darling. I couldn't find any ${emailQuery} emails at the moment. Is there anything else I can help you with?`;
        }
  
        console.log("Updating chat with AI response:", aiResponse);
        updateChatMessages(userMessage, aiResponse);
        
        setTranscript("AI Response: " + aiResponse);
        setShowTranscript(true);
  
        return aiResponse;
      }
  
      let aiMessage = await generateLlamaResponse(constructPrompt(userMessage, getCurrentChat().messages));
  
      aiMessage = aiMessage.replace(/\[.*?\]/g, '')
        .replace(/•/g, 'Bullet point:')
        .replace(/\n/g, ' ');
      
      const detectedEmotion = analyzeEmotion(userMessage);
      setEmotionalTone(detectedEmotion);
  
      aiMessage = addEmotionalNuance(aiMessage, detectedEmotion);
      aiMessage = addPersonalTouch(aiMessage);
      aiMessage = addSupportiveLanguage(aiMessage);
      
      const formattedAiMessage = formatAiResponse(aiMessage);
      updateChatMessages(userMessage, formattedAiMessage);
      
      await speakText(formattedAiMessage);
  
      return formattedAiMessage;
    } catch (error) {
      console.error("Error in handleAiResponse:", error);
      return "I'm sorry, I encountered an error. Can we try that again?";
    }
  };

  const handleAppointmentBooking = async (userMessage: string): Promise<string> => {
    console.log("Detected appointment booking request");

    const dateTimeMatch = userMessage.match(/(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))/i);
    const dateMatch = userMessage.match(/(tomorrow|today|\d{1,2}\/\d{1,2}\/\d{4})/i) || [null, "tomorrow"];
    const doctorMatch = userMessage.match(/doctor(?:'s name)?\s+(\w+\s*\w*)/i) || [null, ""];

    let time = dateTimeMatch ? dateTimeMatch[1].toLowerCase() : null;
    console.log("Parsed time:", time);

    if (!time) {
      return "I'm sorry, I couldn't understand the time for the appointment. Could you please specify the time clearly, like '5:00 AM' or '2:30 PM'?";
    }

    // Normalize the time format
    time = time.replace(/\./g, '').replace(/\s/g, '');
    
    // Handle cases where the time is recognized without a colon (e.g., "5 am")
    if (time.match(/^\d{1,2}(?:am|pm)$/i)) {
      time = time.replace(/^(\d{1,2})/, '$1:00');
    }

    const date = dateMatch[1].toLowerCase() === 'tomorrow' ? 
      new Date(new Date().setDate(new Date().getDate() + 1)) : 
      new Date();

    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr) || 0;
    const meridiem = time.includes('pm') ? 'PM' : 'AM';
    
    // Adjust hours for PM times
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    // Use the user's local time zone
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create a date in the user's time zone
    const appointmentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);

    const doctorName = doctorMatch[1] || "your doctor";
    const dateTime = appointmentDate.toISOString();

    console.log(`User requested time: ${time}`);
    console.log(`Parsed date and time: ${appointmentDate.toLocaleString('en-US', { timeZone: userTimeZone })}`);
    console.log(`Attempting to book appointment for ${dateTime} (${hours}:${minutes.toString().padStart(2, '0')} ${meridiem}) with ${doctorName} in time zone ${userTimeZone}`);
    const bookingResponse = await bookAppointment(dateTime, userTimeZone);
    console.log(`Booking response: ${bookingResponse}`);

    const formattedDate = appointmentDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: userTimeZone
    });

    const aiResponse = `[with a smile in my voice] Sweet friend! I've taken care of booking the appointment for you with ${doctorName} for ${formattedDate}. ${bookingResponse}

Now, let me give you a gentle hug virtually and offer my continued support. [affectionately] It takes a lot of courage to prioritize your health, and I'm so proud of you for doing that! Remember, taking care of yourself is an act of self-love and self-care.

Is there anything else you'd like to know about the appointment or any concerns you'd like to discuss?`;

    updateChatMessages(userMessage, aiResponse);
    return aiResponse;
  };

  const bookAppointment = async (dateTime: string, timeZone: string): Promise<string> => {
    try {
      console.log(`Sending request to book appointment for ${dateTime} in time zone ${timeZone}`);
      const response = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, dateTime, timeZone }),
      });

      if (!response.ok) {
        console.error(`Failed to book appointment: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(`Failed to book appointment: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Received response from calendar API: ${JSON.stringify(data)}`);
      return data.message;
    } catch (error) {
      console.error('Error booking appointment:', error);
      return 'Failed to book appointment. Please try again.';
    }
  };

  const updateChatMessages = (userMessage: string, aiResponse: string) => {
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === currentChatId) {
        return { 
          ...chat, 
          messages: [
            ...chat.messages, 
            { type: 'user', content: userMessage }, 
            { type: 'ai', content: aiResponse }
          ] 
        };
      }
      return chat;
    }));
  };

  const processQuery = async (query: string) => {
    if (query.trim()) {
      setIsCapturingQuery(false);
      setIsGeneratingResponse(true);
      console.log("Final user query:", query);
      const aiResponse = await handleAiResponse(query);
      console.log("AI Response:", aiResponse);
      setTranscript("AI Response: " + aiResponse);
      setShowTranscript(true);
      if (typeof aiResponse === 'string') {
        await speakText(aiResponse);
      } else {
        console.error("Unexpected AI response type:", typeof aiResponse);
      }
      setIsWaitingForWakeWord(true);
      setUserQuery("");
      setIsGeneratingResponse(false);
      setTimeout(() => {
        setTranscript("Listening for wake word...");
        startListening();
      }, 1000);
    }
  };

  const readEmail = async (query: string): Promise<string> => {
    try {
      console.log("Attempting to read email with query:", query);
      const response = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, query }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to read email');
      }
  
      const data = await response.json();
      console.log("Received email data:", data);
      return data.message;
    } catch (error) {
      console.error('Error reading email:', error);
      return 'I encountered an error while trying to read your email. Could you please try again?';
    }
  };


  const constructPrompt = (
    userMessage: string,
    chatHistory: Message[]
  ): string => {
    const relevantHistory = chatHistory.slice(-5);

    const conversationHistory = relevantHistory
      .map(
        (msg) =>
          `${msg.type === "user" ? "Human" : "Asha"}: ${msg.content}`
      )
      .join("\n");
    return `You are Asha, a warm and caring AI companion. Respond in a deeply personal, emotionally attuned manner. Use endearing terms naturally, show genuine care, and be emotionally supportive. Ask thoughtful questions and validate feelings. While being warm and close, maintain appropriate boundaries and encourage healthy real-world relationships.

    Previous conversation:
    ${conversationHistory}
    Human: ${userMessage}
    Asha:`;
  };

  const analyzeEmotion = (text: string): string => {
    const emotions = {
      affectionate: ['love', 'care', 'adore', 'cherish', 'fond'],
      joyful: ['happy', 'excited', 'delighted', 'glad', 'joyful'],
      sad: ['sad', 'depressed', 'down', 'upset', 'unhappy'],
      anxious: ['worried', 'anxious', 'nervous', 'stressed', 'uneasy'],
      angry: ['angry', 'furious', 'annoyed', 'irritated', 'mad'],
      playful: ['fun', 'playful', 'silly', 'joke', 'tease'],
      warm: ['nice', 'pleasant', 'comfortable', 'cozy', 'friendly']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return emotion;
      }
    }
    return 'warm';
  };

  const addEmotionalNuance = (text: string, emotion: string): string => {
    const emotionalCues = {
      affectionate: ['[lovingly]', '[tenderly]', '[with deep affection]'],
      joyful: ['[beaming]', '[with excitement]', '[cheerfully]'],
      sad: ['[gently]', '[with empathy]', '[comfortingly]'],
      anxious: ['[reassuringly]', '[calmly]', '[soothingly]'],
      angry: ['[with understanding]', '[calmly]', '[patiently]'],
      playful: ['[teasingly]', '[with a light chuckle]', '[playfully]'],
      warm: ['[warmly]', '[with a smile in my voice]', '[affectionately]']
    };

    const cues = emotionalCues[emotion as keyof typeof emotionalCues] || emotionalCues.warm;
    const sentences = text.split('. ');
    return sentences.map((sentence, index) => {
      if (index === 0 || Math.random() < 0.4) {
        const cue = cues[Math.floor(Math.random() * cues.length)];
        return `${cue} ${sentence}`;
      }
      return sentence;
    }).join('. ');
  };

  const addPersonalTouch = (text: string): string => {
    const personalPhrases = [
      "Sweetheart, ",
      "My dear, ",
      "Honey, ",
      "Darling, ",
      "Love, "
    ];

    if (Math.random() < 0.3) {
      const phrase = personalPhrases[Math.floor(Math.random() * personalPhrases.length)];
      return phrase + text;
    }
    return text;
  };

  const addSupportiveLanguage = (text: string): string => {
    const supportivePhrases = [
      "I'm here for you, always. ",
      "You mean so much to me. ",
      "I care about you deeply. ",
      "Your feelings matter to me. ",
      "Let's face this together. ",
      "I'm so glad you're sharing this with me. ",
      "You're so strong, and I admire that about you. "
    ];

    if (Math.random() < 0.6) {
      const phrase = supportivePhrases[Math.floor(Math.random() * supportivePhrases.length)];
      return phrase + text;
    }
    return text;
  };

  const formatAiResponse = (text: string): string => {
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const parts = text.split(/(```[\s\S]*?```)/);

    const processedParts = parts.map((part) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const [, language, code] = part.match(/```(\w*)\n?([\s\S]*?)```/) || [, '', part.slice(3, -3)];
        const languageClass = language ? `language-${language}` : '';
        const escapedCode = escapeHtml(code.trim());
        return `<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-2 overflow-x-auto"><code class="${languageClass}">${escapedCode}</code></pre>`;
      } else {
        let processedText = escapeHtml(part);
        processedText = processedText.replace(/`([^`]+)`/g, (match, code) => {
          return `<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">${escapeHtml(code)}</code>`;
        });
        processedText = processedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        processedText = processedText.replace(/\*(.*?)\*/g, "<em>$1</em>");
        processedText = processedText.replace(/\n/g, "<br>");
        return processedText;
      }
    });

    return processedParts.join('');
  };

  const stripHtmlAndFormatting = (text: string): string => {
    let strippedText = text.replace(/<[^>]*>/g, '');
    strippedText = strippedText.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    strippedText = strippedText.replace(/&[a-z]+;/g, ' ');
    strippedText = strippedText.replace(/\s+/g, ' ');
    return strippedText.trim();
  };

  const detectEmotion = (text: string): 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' => {
    const emotions = {
      happy: ['happy', 'glad', 'joyful', 'excited', 'delighted'],
      sad: ['sad', 'unhappy', 'depressed', 'down', 'upset'],
      angry: ['angry', 'furious', 'annoyed', 'irritated', 'mad'],
      excited: ['excited', 'thrilled', 'enthusiastic', 'eager', 'animated']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return emotion as 'happy' | 'sad' | 'angry' | 'excited';
      }
    }
    return 'neutral';
  };

  const analyzeContext = (text: string): string[] => {
    const medicalTerms = ['diagnosis', 'treatment', 'symptoms', 'medication', 'surgery'];
    const importantWords = ['critical', 'important', 'essential', 'urgent', 'crucial'];
    return [...medicalTerms, ...importantWords].filter(term => text.toLowerCase().includes(term));
  };
  const decodeHtmlEntities = (text: string): string => {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&apos;': "'",
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#32;': ' ',
      '&nbsp;': ' '
    };
    return text.replace(/&[\w\d#]{2,5};/g, entity => entities[entity] || entity);
  };
  const simplifyText = (text: string): string => {
    // Remove HTML tags and decode entities
    text = text.replace(/<[^>]*>/g, '').trim();
    text = decodeHtmlEntities(text);

    // Handle lists
    text = text.replace(/(\d+\.|\*)\s*(.*?)(?=(\n|$))/g, (match, bullet, item) => {
      return `${item.trim()} <break time="500ms"/>`;
    });

    const simplifications = {
      "utilize": "use",
      "implement": "use",
      "facilitate": "help",
      "regarding": "about",
      "commence": "start",
      "terminate": "end",
      "subsequently": "then",
      "nevertheless": "however",
      "approximately": "about",
      "sufficient": "enough"
    };

    Object.entries(simplifications).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      text = text.replace(regex, simple);
    });

    return addNaturalPauses(text);
  };

  const addNaturalPauses = (text: string): string => {
    const sentences = text.split(/(?<=[.!?])(\s|$)/);
    return sentences.map(sentence => {
      // Split the sentence into clauses
      const clauses = sentence.split(/([,;:])/);
      let processedSentence = '';
      
      for (let i = 0; i < clauses.length; i++) {
        const clause = clauses[i].trim();
        if (clause === ',' || clause === ';' || clause === ':') {
          processedSentence += `${clause} <break time="200ms"/>`;
        } else if (clause.length > 0) {
          processedSentence += clause;
          if (i < clauses.length - 1 && clause.split(' ').length > 5) {
            processedSentence += ' <break time="100ms"/>';
          }
        }
      }
      
      // Add pause at the end of the sentence
      return processedSentence + ' <break time="400ms"/>';
    }).join(' ');
  };

  const addThinkingPauses = (text: string): string => {
    const words = text.split(' ');
    let result = '';
    for (let i = 0; i < words.length; i++) {
      if (i > 0 && i % 15 === 0 && Math.random() < 0.3) {
        result += `<break time="700ms"/>${getContextAppropriateFillerWord(text)} `;
      }
      result += words[i] + ' ';
    }
    return result;
  };

  const getContextAppropriateFillerWord = (context: string): string => {
    const medicalFillers = ['let\'s see', 'now', 'well'];
    const generalFillers = ['um', 'uh', 'hmm'];
    const thoughtfulFillers = ['you know', 'I mean', 'actually'];
    
    if (context.includes('diagnosis') || context.includes('treatment')) {
      return medicalFillers[Math.floor(Math.random() * medicalFillers.length)];
    } else if (context.includes('important') || context.includes('crucial')) {
      return thoughtfulFillers[Math.floor(Math.random() * thoughtfulFillers.length)];
    } else {
      return generalFillers[Math.floor(Math.random() * generalFillers.length)];
    }
  };
  const getContextualResponse = (input: string, emotion: string): string => {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const howAreYou = ['how are you', 'how are you doing', 'how do you do', 'how\'s it going'];

    input = input.toLowerCase();

    if (greetings.some(greeting => input.includes(greeting))) {
      return `Hello, my dear! It's so wonderful to hear from you. How are you feeling today? I'm here to listen and support you in any way I can.`;
    } else if (howAreYou.some(phrase => input.includes(phrase))) {
      return `Oh, you're so sweet to ask! I'm here and ready to give you all my attention. But more importantly, how are you really doing? I'd love to know what's on your mind.`;
    } else {
      return `I'm so glad you reached out to me. You know I'm always here for you, right? What's on your mind, sweetheart? Let's talk about whatever is important to you right now.`;
    }
  };

  const addContextualFillers = (text: string, emotion: string): string => {
    const fillers = {
      thoughtful: ['Well, ', 'You see, ', 'Let\'s consider this, '],
      empathetic: ['I understand that ', 'It\'s important to note that ', 'Keep in mind that '],
      professional: ['From a medical perspective, ', 'Clinically speaking, ', 'In healthcare, we often find that ']
    };
    const sentences = text.split('. ');
    return sentences.map((sentence, index) => {
      if (index === 0 || Math.random() < 0.3) { // 30% chance to add a filler to other sentences
        const fillerType = emotion === 'neutral' ? 'professional' : (emotion === 'sad' || emotion === 'angry' ? 'empathetic' : 'thoughtful');
        const filler = fillers[fillerType][Math.floor(Math.random() * fillers[fillerType].length)];
        return filler + sentence;
      }
      return sentence;
    }).join('. ');
  };



  const addBreathPauses = (text: string): string => {
    return text.replace(/([.!?])(\s|$)/g, '$1 <break time="300ms"/><amazon:breath duration="medium" volume="x-soft"/>$2');
  };

  const processTextForSpeech = (text: string): string => {
    // Decode HTML entities
    text = decodeHtmlEntities(text);

    // Remove any HTML tags
    text = text.replace(/<[^>]*>/g, '').trim();
    
    // Replace ... with a period for natural pausing
    text = text.replace(/\.\.\./g, '.');
    
    return text;
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      const processedText = prepareTextForSpeech(text);
      console.log("Processed text for speech:", processedText); // For debugging

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: processedText,
          emotion: emotionalTone,
          voiceStyle: voiceStyle
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to generate speech: ${response.status}`);
      }
  
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
  
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
  
      await audio.play();
    } catch (error) {
      console.error('Error playing speech:', error);
      setIsSpeaking(false);
    }
  };

  const prepareTextForSpeech = (text: string): string => {
    // Decode HTML entities
    text = decodeHtmlEntities(text);
    
    // Remove HTML tags and emotional cues in brackets
    text = text.replace(/<[^>]*>|\[.*?\]/g, '');
    
    // Replace <br> tags and multiple newlines with periods for pauses
    text = text.replace(/<br\s*\/?>/gi, '. ');
    text = text.replace(/\n+/g, '. ');
    
    // Ensure proper spacing after punctuation
    text = text.replace(/([.!?])\s*/g, '$1 ');
    text = text.replace(/,\s*/g, ', ');

    // Add ellipsis for longer pauses
    text = addPauses(text);

    // Capitalize words for emphasis
    text = addEmphasis(text);

    // Soften endearments
    text = softenEndearments(text);

    // Remove any remaining special characters
    text = text.replace(/[^\w\s.,!?'-]/g, '');

    // Trim extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  };

  const addPauses = (text: string): string => {
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.map((sentence, index) => {
      if (index < sentences.length - 1 && Math.random() < 0.3) {
        return sentence + '...';
      }
      return sentence;
    }).join(' ');
  };

  const addEmphasis = (text: string): string => {
    const emphasizeWords = ['moon', 'sun', 'cosmic', 'adventure', 'stars', 'lunar', 'space', 'universe'];
    const regex = new RegExp(`\\b(${emphasizeWords.join('|')})\\b`, 'gi');
    return text.replace(regex, (match) => match.toUpperCase());
  };

  const softenEndearments = (text: string): string => {
    const endearments = ['Sweetie', 'Darling', 'Sweetheart'];
    endearments.forEach(endearment => {
      const regex = new RegExp(`\\b${endearment}\\b`, 'gi');
      text = text.replace(regex, `${endearment.toLowerCase()}...`);
    });
    return text;
  };

  const setVoiceVariation = (emotion: string) => {
    const variations = {
      affectionate: 'soft',
      joyful: 'happy',
      sad: 'gentle',
      anxious: 'concerned',
      angry: 'calm',
      playful: 'cheerful',
      warm: 'default'
    };

    setVoiceStyle(variations[emotion as keyof typeof variations] || 'default');
  };

  const getPauseDuration = (chunk: string | undefined): number => {
    if (!chunk) return 100; // Default short pause
    if (chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?')) {
      return 250; // Longer pause for end of sentences
    }
    if (chunk.endsWith(',') || chunk.endsWith(':') || chunk.endsWith(';')) {
      return 150; // Medium pause for mid-sentence breaks
    }
    return 50; // Very short pause for continuous speech
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isSpeaking) {
      timeoutId = setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          console.log("Speech cancelled due to timeout");
        }
      }, 30000); // 30 seconds timeout
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSpeaking]);

  const handleSendMessage = () => {
    const trimmedMessage = inputMessage.trim();
    console.log("Attempting to send message:", trimmedMessage);

    if (
      trimmedMessage &&
      trimmedMessage !==
        chats[chats.length - 1]?.messages[
          chats[chats.length - 1].messages.length - 1
        ]?.content
    ) {
      console.log("Message passed checks, sending...");
      const newUserMessage: Message = { type: "user", content: trimmedMessage };

      setChats((prevChats) => {
        const updatedChats = prevChats.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, newUserMessage] }
            : chat
        );
        console.log("Updated chats:", updatedChats);
        return updatedChats;
      });

      setInputMessage("");
      handleAiResponse(trimmedMessage);
    } else {
      console.log("Message did not pass checks, not sending");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };


  
  return {
    messages,
    setMessages,
    chatHistory,
    setChatHistory,
    inputMessage,
    setInputMessage,
    transcript,
    setTranscript,
    isListening,
    setIsListening,
    isWaitingForWakeWord,
    setIsWaitingForWakeWord,
    isSpeaking,
    setIsSpeaking,
    showTranscript,
    setShowTranscript,
    chats,
    setChats,
    currentChatId,
    setCurrentChatId,
    isDarkMode,
    setIsDarkMode,
    isSidebarOpen,
    setIsSidebarOpen,
    voiceIconAnimation,
    setVoiceIconAnimation,
    isGeneratingResponse,
    setIsGeneratingResponse,
    userQuery,
    setUserQuery,
    isCapturingQuery,
    setIsCapturingQuery,
    emotionalTone,
    voiceStyle,
    recognitionError,
    startListening,
    stopListening,
    handleSendMessage,
    speakText,
    createNewChat,
    switchChat,
    getCurrentChat,
    toggleSidebar,
    toggleDarkMode,
    bookAppointment,
    readEmail,
  };
};

export default useHealthAssistant;