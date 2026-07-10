"use client";

import { useState, useRef } from "react";
import { Paperclip, X, Loader2, Image as ImageIcon, FileText, Mic, Square } from "lucide-react";
import { validateImageFile, compressImage } from "@/lib/image-utils";

interface FileUploadProps {
  onFileSelect: (file: File, type: "image" | "document" | "audio") => void;
  disabled?: boolean;
}

export function ChatFileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (file.type.startsWith("image/")) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          alert(validation.error);
          return;
        }
        const compressedFile = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
        onFileSelect(compressedFile, "image");
      } else if (file.type === "application/pdf" || file.type.startsWith("text/")) {
        if (file.size > 5 * 1024 * 1024) {
          alert("Document size must be under 5MB");
          return;
        }
        onFileSelect(file, "document");
      } else {
        alert("Unsupported file type. Only images, PDFs, and text files are allowed.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        if (audioFile.size > 10 * 1024 * 1024) {
          alert("Voice note too long. Maximum 10MB allowed.");
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
          if (prev >= 120) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert("Could not access microphone. Please grant microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.txt"
        className="hidden"
        disabled={disabled || uploading}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
        title="Attach file"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </button>

      {isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg animate-pulse"
        >
          <Square className="w-4 h-4" />
          <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled || uploading}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Record voice note"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export function FilePreview({
  file,
  type,
  onRemove,
}: {
  file: File;
  type: "image" | "document" | "audio";
  onRemove: () => void;
}) {
  const previewUrl = type === "image" ? URL.createObjectURL(file) : null;

  return (
    <div className="relative inline-flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
      {type === "image" && previewUrl && (
        <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />
      )}
      {type === "document" && (
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-gray-500" />
          <span className="text-sm text-gray-700 truncate max-w-[150px]">{file.name}</span>
        </div>
      )}
      {type === "audio" && (
        <div className="flex items-center gap-2">
          <Mic className="w-8 h-8 text-gray-500" />
          <span className="text-sm text-gray-700">Voice note</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="p-1 bg-gray-200 rounded-full hover:bg-gray-300"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
}
