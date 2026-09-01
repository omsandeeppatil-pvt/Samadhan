"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Trash2, ChevronRight, Sparkles, Shield, Activity } from 'lucide-react';
import { processAudioQuery, AudioMessage, VoiceResponse } from '@/app/support/support_API/audio-support';
import { motion, AnimatePresence, m } from 'framer-motion';
import '@/app/styles/audio.css';

// Add missing properties to the Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface AudioQuerySolverProps {
  onResponse?: (response: VoiceResponse) => void;
}

const AudioQuerySolverInner: React.FC<AudioQuerySolverProps> = ({ onResponse }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<AudioMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [liveTranscription, setLiveTranscription] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('en');
  const [isUrduDetected, setIsUrduDetected] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  type SpeechRecognitionType = typeof window.SpeechRecognition | typeof window.webkitSpeechRecognition;
  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);

  // Generate particles for background animation
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 3
  }));

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        type: "spring",
        stiffness: 100
      }
    }),
    hover: {
      scale: 1.03,
      y: -10,
      boxShadow: "0 25px 35px -5px rgba(50, 205, 50, 0.25)",
      transition: { type: "spring", stiffness: 300 }
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, liveTranscription, isProcessing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize audio context for visualization
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      } catch (error) {
        console.warn('Audio context initialization failed:', error);
      }
    };
    initAudioContext();
    initSpeechRecognition();
  }, []);

  // Function to sanitize language input - converts Urdu to Hindi
  const sanitizeLanguage = (language: string): string => {
    const lang = language.toLowerCase();
    if (lang === 'ur' || lang === 'urdu' || lang.includes('urdu')) {
      return 'hi';
    }
    if (lang === 'hi' || lang === 'hindi' || lang.includes('hindi')) {
      return 'hi';
    }
    return 'en'; // Default to English
  };

  // Function to detect if text contains Urdu script
  const detectUrduScript = (text: string): boolean => {
    const urduPattern = /[\u0600-\u06FF]/g;
    return urduPattern.test(text);
  };

  // Function to convert Urdu text to Hindi (basic transliteration)
  const convertUrduToHindi = (text: string): string => {
    const urduToHindiMap: { [key: string]: string } = {
      'ا': 'अ', 'ب': 'ब', 'پ': 'प', 'ت': 'त', 'ٹ': 'ट', 'ث': 'स',
      'ج': 'ज', 'چ': 'च', 'ح': 'ह', 'خ': 'ख', 'د': 'द', 'ڈ': 'ड',
      'ذ': 'ज़', 'ر': 'र', 'ڑ': 'ड़', 'ز': 'ज़', 'ژ': 'ज़', 'س': 'स',
      'ش': 'श', 'ص': 'स', 'ض': 'ज़', 'ط': 'त', 'ظ': 'ज़', 'ع': 'अ',
      'غ': 'ग़', 'ف': 'फ', 'ق': 'क़', 'ک': 'क', 'گ': 'ग', 'ل': 'ल',
      'م': 'म', 'ن': 'न', 'ں': 'ं', 'و': 'व', 'ہ': 'ह', 'ھ': 'ह',
      'ء': 'ء', 'ی': 'य', 'ے': 'ए'
    };

    let convertedText = text;
    Object.entries(urduToHindiMap).forEach(([urdu, hindi]) => {
      convertedText = convertedText.replace(new RegExp(urdu, 'g'), hindi);
    });

    return convertedText;
  };

  const initSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = detectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          let transcript = result[0].transcript;
          
          // Check for Urdu script and convert to Hindi
          if (detectUrduScript(transcript)) {
            transcript = convertUrduToHindi(transcript);
            setIsUrduDetected(true);
            setDetectedLanguage('hi');
          }
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        if (fullTranscript.trim()) {
          setLiveTranscription(fullTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setCurrentTranscription('Microphone permission denied');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected');
        }
      };
      
      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current?.start();
          } catch (error) {
            console.warn('Failed to restart speech recognition:', error);
          }
        }
      };
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  };

  // Audio level visualization
  const updateAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
    setAudioLevel(average / 255);
    
    if (isListening) {
      requestAnimationFrame(updateAudioLevel);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Connect to audio context for visualization
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        updateAudioLevel();
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        if (audioBlob.size > 0) {
          await processAudioInput(audioBlob);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsListening(true);
      setCurrentTranscription('Listening...');
      setLiveTranscription('');
      setIsUrduDetected(false);
      
      // Start speech recognition for live transcription
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = detectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
          recognitionRef.current.start();
        } catch (error) {
          console.warn('Failed to start speech recognition:', error);
        }
      }
      
    } catch (error) {
      console.error('Error starting audio recording:', error);
      alert('Microphone access denied or not available');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsListening(false);
    setAudioLevel(0);
    setCurrentTranscription('Processing...');
    
    setTimeout(() => {
      setLiveTranscription('');
    }, 1000);
  };

  const processAudioInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setCurrentTranscription('');
    
    try {
      const response = await processAudioQuery(audioBlob, sessionId);
      
      if (response.success) {
        setSessionId(response.sessionId);
        
        // Update detected language from response
        const responseLanguage = sanitizeLanguage(response.response.language);
        setDetectedLanguage(responseLanguage);
        
        // Update messages - the API already handles Urdu to Hindi conversion
        setMessages(response.conversationContext.messages);
        
        // Play audio response if available
        if (response.audioUrl) {
          playAudioResponse(response.audioUrl);
        } else {
          // Fallback to text-to-speech
          speakText(response.response.response, responseLanguage);
        }
        
        onResponse?.(response);
      } else {
        console.error('Audio processing failed:', response.error);
        addErrorMessage('Sorry, I couldn\'t process your audio. Please try again.');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      addErrorMessage('An error occurred while processing your request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    setIsSpeaking(true);
    
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => {
      setIsSpeaking(false);
      console.error('Audio playback failed');
    };
    
    audio.play().catch(console.error);
  };

  const speakText = (text: string, language: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      
      const sanitizedLang = sanitizeLanguage(language);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getVoiceLanguage(sanitizedLang);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      speechSynthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  };

  const getVoiceLanguage = (lang: string): string => {
    const sanitizedLang = sanitizeLanguage(lang);
    
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN'
    };
    return langMap[sanitizedLang] || 'en-US';
  };

  const addErrorMessage = (error: string) => {
    const errorMessage: AudioMessage = {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: error,
      timestamp: new Date(),
      language: 'en'
    };
    setMessages(prev => [...prev, errorMessage]);
  };

  const toggleSpeech = () => {
    if (isSpeaking && speechSynthesisRef.current) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setSessionId('');
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setLiveTranscription('');
    setDetectedLanguage('en');
    setIsUrduDetected(false);
  };

  const getLanguageDisplay = (lang: string): string => {
    const sanitizedLang = sanitizeLanguage(lang);
    const langMap: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi'
    };
    return langMap[sanitizedLang] || 'English';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fff8] to-[#f0fff0] relative overflow-hidden">
      {/* Header with particles animation */}
      <motion.div 
        className="relative h-[400px] w-full bg-gradient-to-br from-[#7FFF00] via-[#32CD32] to-[#9AFF9A] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute bg-white/20 rounded-full backdrop-blur-sm"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [-20, 20, -20],
                x: [-10, 10, -10],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 6 + particle.id * 0.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <div className="relative z-10 h-full flex flex-col px-8 py-8">
          {/* Navigation */}
          <motion.nav 
            className="flex items-center justify-between w-full"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div 
              className="flex items-center gap-4"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="w-14 h-14 bg-[#1a2332] rounded-2xl flex items-center justify-center shadow-2xl"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative">
                  <motion.div 
                    className="text-xl font-bold text-white"
                    animate={{ textShadow: ["0 0 0px #7FFF00", "0 0 10px #7FFF00", "0 0 0px #7FFF00"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    S
                  </motion.div>
                  <motion.div 
                    className="absolute -right-1 top-1 w-2 h-2 bg-[#7FFF00] rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div 
                    className="absolute -right-1 top-3 w-2 h-2 bg-[#32CD32] rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                  <motion.div 
                    className="absolute -right-1 top-5 w-2 h-2 bg-[#9AFF9A] rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                  />
                </div>
              </motion.div>
              <div>
                <motion.div 
                  className="text-2xl font-bold text-[#1a2332]"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  SAMADHAN
                </motion.div>
                <motion.div 
                  className="text-[#1a2332]/80 font-medium text-sm"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Voice Banking Assistant
                </motion.div>
              </div>
            </motion.div>
          </motion.nav>

          {/* Hero Content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-4xl text-center">
              <motion.h1 
                className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-[#1a2332]"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <motion.span
                  animate={{ 
                    textShadow: ["0 0 0px rgba(26, 35, 50, 0.3)", "0 5px 10px rgba(26, 35, 50, 0.3)", "0 0 0px rgba(26, 35, 50, 0.3)"]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Voice Banking Assistant
                </motion.span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-[#1a2332]/80 mb-6 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
              >
                Speak naturally in English or Hindi to get banking assistance
              </motion.p>
            </div>
          </div>
        </div>

        {/* Enhanced gradient overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-[#1a2332]/30 via-transparent to-[#1a2332]/20 z-0"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </motion.div>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-8 py-12">
        <motion.div 
          className="bg-gradient-to-br from-white to-[#7FFF00]/10 rounded-3xl shadow-2xl overflow-hidden border border-[#7FFF00]/20"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1a2332]">
                  Voice Banking Assistant
                </h2>
                <p className="text-[#1a2332]/70">
                  Speak in English or Hindi • {getLanguageDisplay(detectedLanguage)} Mode
                  {isUrduDetected && <span className="ml-2 text-[#32CD32]">(Urdu converted to Hindi)</span>}
                </p>
              </div>
              <div className="flex gap-3">
                <motion.button 
                  className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#7FFF00]/20 to-[#32CD32]/20 rounded-xl border border-[#7FFF00]/30 hover:border-[#32CD32]/50 transition-all"
                  onClick={toggleSpeech}
                  disabled={!isSpeaking}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={isSpeaking ? "Stop speaking" : "Audio response"}
                >
                  {isSpeaking ? <VolumeX size={20} className="text-[#1a2332]" /> : <Volume2 size={20} className="text-[#1a2332]" />}
                </motion.button>
                <motion.button 
                  className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#7FFF00]/20 to-[#32CD32]/20 rounded-xl border border-[#7FFF00]/30 hover:border-[#32CD32]/50 transition-all"
                  onClick={clearConversation}
                  disabled={isListening || isProcessing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Clear conversation"
                >
                  <Trash2 size={20} className="text-[#1a2332]" />
                </motion.button>
              </div>
            </div>

            {/* Chat container with fixed height and proper scrolling */}
            <div 
              className="h-[400px] overflow-y-auto bg-gradient-to-b from-[#7FFF00]/5 to-[#32CD32]/5 rounded-2xl p-4 mb-6"
              ref={messagesContainerRef}
            >
              {messages.length === 0 && !isProcessing && (
                <motion.div 
                  className="welcome-message text-center py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-[#7FFF00] to-[#32CD32] rounded-full flex items-center justify-center text-3xl"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🎤
                  </motion.div>
                  <h3 className="text-2xl font-bold text-[#1a2332] mb-4">Hi! I'm your AI Banking Assistant</h3>
                  <p className="text-[#1a2332]/80 mb-6">Speak to me in English or Hindi about:</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {[
                      '✅ Card services and payments',
                      '✅ Loan types and eligibility',
                      '✅ Investment options',
                      '✅ Banking procedures',
                    ].map((item, i) => (
                      <motion.li 
                        key={i}
                        className="text-left text-[#1a2332]/80"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                  <div className="mt-8 flex items-center justify-center gap-2 text-[#1a2332]/70">
                    <MessageCircle size={16} />
                    <span>I won't ask for personal details like account numbers, Aadhaar, or PINs</span>
                  </div>
                </motion.div>
              )}

              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div 
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-gradient-to-r from-[#7FFF00] to-[#32CD32] rounded-full flex items-center justify-center mr-3">
                          <Sparkles className="w-4 h-4 text-[#1a2332]" />
                        </div>
                      )}
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        message.role === 'user' 
                          ? 'bg-[#1a2332] text-white' 
                          : 'bg-white text-[#1a2332] shadow-md border border-[#7FFF00]/20'
                      }`}>
                        <div className="message-text">{message.content}</div>
                        <div className="text-xs mt-2 opacity-70">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          <span className="ml-2">
                            {getLanguageDisplay(message.language)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isProcessing && (
                  <motion.div 
                    className="flex"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-[#7FFF00] to-[#32CD32] rounded-full flex items-center justify-center mr-3">
                      <Sparkles className="w-4 h-4 text-[#1a2332]" />
                    </div>
                    <div className="bg-white text-[#1a2332] p-4 rounded-2xl shadow-md border border-[#7FFF00]/20">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-[#32CD32] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#32CD32] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-[#32CD32] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <div className="text-xs mt-2 opacity-70">Processing...</div>
                    </div>
                  </motion.div>
                )}

                {liveTranscription && isListening && (
                  <motion.div 
                    className="flex justify-end"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="bg-[#1a2332]/80 text-white p-4 rounded-2xl">
                      <div className="message-text">
                        {liveTranscription}
                        <span className="ml-1 opacity-70 animate-pulse">|</span>
                      </div>
                      <div className="text-xs mt-2 opacity-70">
                        Speaking... 
                        {isUrduDetected && <span className="ml-2">(Converting Urdu to Hindi)</span>}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <motion.button
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${
                  isListening 
                    ? 'bg-gradient-to-br from-[#FF4D4D] to-[#FF0000]' 
                    : 'bg-gradient-to-br from-[#7FFF00] to-[#32CD32]'
                }`}
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
                
                {isListening && (
                  <motion.div 
                    className="absolute inset-0 border-4 border-[#FF4D4D]/30 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
              
              <motion.p 
                className="mt-4 text-[#1a2332]/70"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isListening 
                  ? `Listening in ${getLanguageDisplay(detectedLanguage)}...` 
                  : isProcessing 
                    ? 'Processing...' 
                    : 'Tap to speak'
                }
              </motion.p>
              
              <div className="mt-4 text-sm text-[#1a2332]/60">
                {isUrduDetected && (
                  <span className="ml-2">
                    • Urdu automatically converted to Hindi
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div 
          className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div>
            <h3 className="text-3xl font-bold text-[#1a2332] mb-6">
              Secure Voice Banking
            </h3>
            <p className="text-lg text-[#1a2332]/80 mb-6 leading-relaxed">
              Your voice interactions are protected with bank-level encryption. 
              We don't store your voice data permanently and all communications 
              are secured end-to-end.
            </p>
            <div className="flex flex-wrap gap-4">
              {['256-bit Encryption', 'Secure Protocols', 'Data Privacy', 'No Storage'].map((item, i) => (
                <motion.div
                  key={item}
                  className="bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-[#7FFF00]/30 shadow-sm"
                  whileHover={{ y: -3 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#32CD32]" />
                    <span className="font-medium text-[#1a2332]">{item}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <motion.div
            className="relative h-[300px] rounded-3xl overflow-hidden border-4 border-white shadow-xl"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2332] to-[#2a3441]"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="relative w-40 h-40 mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-[#7FFF00] to-[#32CD32] rounded-full opacity-20 blur-xl"></div>
                <Activity className="w-20 h-20 text-[#7FFF00] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Real-time Protection</h3>
              <p className="text-gray-300 text-center">
                Your voice interactions are secured with continuous monitoring
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default function AudioQuerySolverPage() {
  return <AudioQuerySolverInner />;
}
