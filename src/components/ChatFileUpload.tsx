"use client";

import { useState, useRef } from "react";
import { Paperclip, X, Loader2, FileText, Mic, Square, Image as ImageIcon } from "lucide-react";
import { validateImageFile, compressImage } from "@/lib/image-utils";

interface FileUploadProps {
  onFileSelect: (file: File, type: "image" | "document" | "audio") => void;
  disabled?: boolean;
}

export function ChatFileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setShowMenu(false);
    try {
      if (file.type.startsWith("image/")) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          alert(validation.error);
          return;
        }
        const compressedFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
        onFileSelect(compressedFile, "image");
      } else if (file.type === "application/pdf" || file.type.startsWith("text/")) {
        if (file.size > 10 * 1024 * 1024) {
          alert("Document size must be under 10MB");
          return;
        }
        onFileSelect(file, "document");
      } else {
        alert("Unsupported file type. Only images and PDFs are allowed.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        if (audioFile.size > 10 * 1024 * 1024) {
          alert("Voice note too long.");
          return;
        }
        onFileSelect(audioFile, "audio");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 120) { stopRecording(); return prev; }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex items-center gap-2">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.txt" className="hidden" disabled={disabled || uploading} />

      {isRecording ? (
        <div className="flex items-center gap-3 bg-red-50 pl-3 pr-1 py-1 rounded-full border border-red-100">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-sm font-semibold text-red-600 min-w-[40px]">{formatRecordingTime(recordingTime)}</span>
          <button type="button" onClick={stopRecording} className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform active:scale-95">
            <Square className="w-4 h-4" fill="currentColor" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
             <button type="button" onClick={() => setShowMenu(!showMenu)} disabled={disabled || uploading} className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors disabled:opacity-50">
               {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
             </button>
             
             {showMenu && (
               <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1 w-48 z-50 animate-in fade-in zoom-in-95 duration-200">
                 <button onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 w-full text-left transition-colors">
                   <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><ImageIcon className="w-4 h-4" /></div> Gallery
                 </button>
                 <button onClick={() => { fileInputRef.current?.setAttribute('accept', '.pdf,.txt'); fileInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 w-full text-left transition-colors">
                   <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div> Document
                 </button>
               </div>
             )}
          </div>
          <button type="button" onClick={startRecording} disabled={disabled || uploading} className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors disabled:opacity-50">
            <Mic className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}

export function FilePreview({ file, type, onRemove }: { file: File; type: "image" | "document" | "audio"; onRemove: () => void; }) {
  const previewUrl = type === "image" ? URL.createObjectURL(file) : null;
  return (
    <div className="absolute bottom-full left-0 mb-3 w-full bg-white border border-gray-200 rounded-t-2xl p-3 shadow-lg flex items-center justify-between z-10 animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        {type === "image" && previewUrl && <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-gray-100" />}
        {type === "document" && <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6 text-gray-400" /></div>}
        {type === "audio" && <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center"><Mic className="w-6 h-6 text-gray-400" /></div>}
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-700 truncate max-w-[200px]">{file.name}</span>
          <span className="text-xs font-medium text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      </div>
      <button type="button" onClick={onRemove} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
