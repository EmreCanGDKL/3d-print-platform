'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'seller';
  content: string;
  timestamp: string;
}

export default function Chat() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const modelId = searchParams.get('modelId');

  useEffect(() => {
    setMessages([
      {
        id: '1',
        senderId: 'user',
        senderName: 'Siz',
        senderRole: 'user',
        content: 'Bu model için fiyat teklifi almak istiyorum.',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        senderId: 'seller',
        senderName: 'Satıcı',
        senderRole: 'seller',
        content: 'Merhaba! Model hakkında detaylı bilgi alabilir miyim?',
        timestamp: new Date().toISOString(),
      },
    ]);
    setLoading(false);
  }, [modelId]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      senderId: 'user',
      senderName: 'Siz',
      senderRole: 'user',
      content: newMessage,
      timestamp: new Date().toISOString(),
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 h-screen flex flex-col">
      <div className="bg-white rounded-xl border border-gray-200 flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Mesajlaşma</h2>
          {modelId && <p className="text-sm text-gray-500">Model: {modelId}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderRole === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  message.senderRole === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm font-medium mb-1">{message.senderName}</p>
                <p>{message.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Gönder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}