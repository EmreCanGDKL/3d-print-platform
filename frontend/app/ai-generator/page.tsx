'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AIGenerator() {
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedModelId, setGeneratedModelId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (mode === 'text' && !prompt.trim()) {
      alert('Lütfen açıklama girin');
      return;
    }
    if (mode === 'image' && !imageFile) {
      alert('Lütfen görsel yükleyin');
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('type', mode);
      
      if (mode === 'text') {
        formData.append('prompt', prompt);
      } else {
        formData.append('image', imageFile!);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Oluşturma başarısız');

      const data = await response.json();
      
      if (data.taskId) {
        await pollForResult(data.taskId, token!);
      }
    } catch (error: any) {
      alert('Hata: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const pollForResult = async (taskId: string, token: string) => {
    for (let i = 0; i < 60; i++) {
      const response = await fetch(`/api/ai/status/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) continue;

      const status = await response.json();
      setProgress(status.progress || i * 1.5);

      if (status.status === 'completed') {
        setGeneratedModelId(status.modelId);
        return;
      }

      await new Promise(r => setTimeout(r, 5000));
    }
  };

  const startChat = () => {
    if (generatedModelId) {
      router.push(`/chat/new?modelId=${generatedModelId}&type=ai`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">AI 3D Generator</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 py-3 rounded-lg font-medium transition ${
            mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Text to 3D
        </button>
        <button
          onClick={() => setMode('image')}
          className={`flex-1 py-3 rounded-lg font-medium transition ${
            mode === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Image to 3D
        </button>
      </div>

      {mode === 'text' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Açıklaması
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="örn: Modern bir koltuk..."
            disabled={generating}
            className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none"
          />
        </div>
      )}

      {mode === 'image' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referans Görsel
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])}
            disabled={generating}
            className="w-full p-4 border border-gray-300 rounded-xl"
          />
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating || (mode === 'text' ? !prompt.trim() : !imageFile)}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {generating ? `Oluşturuluyor... %${progress}` : 'Model Oluştur'}
      </button>

      {generating && (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {generatedModelId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mt-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Model Oluşturuldu!
          </h3>
          <p className="text-green-600 mb-4">ID: {generatedModelId}</p>
          <button
            onClick={startChat}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
          >
            Fiyat Teklifi Al
          </button>
        </div>
      )}
    </div>
  );
}