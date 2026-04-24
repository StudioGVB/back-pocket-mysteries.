'use client';

import React, { useState, useRef } from 'react';

interface FileUploadProps {
  maxFiles?: number;
  accept?: string;
  onFilesChange: (files: File[]) => void;
}

export function FileUpload({ maxFiles = 5, accept = 'image/jpeg, image/png, application/pdf', onFilesChange }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    const combinedFiles = [...selectedFiles, ...newFiles].slice(0, maxFiles);
    
    setSelectedFiles(combinedFiles);
    onFilesChange(combinedFiles);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesChange(updatedFiles);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-dark mb-2 pl-4">
        Attachments (Max {maxFiles})
      </label>
      
      <div 
        className={`relative border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${
          isDragging ? 'border-brand-pink bg-brand-pink/5' : 'border-gray-200 bg-brand-gray hover:border-brand-pink/50'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input 
          type="file" 
          multiple 
          accept={accept}
          className="hidden" 
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
        />
        
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-brand-dark">
              <button 
                type="button" 
                className="text-brand-pink hover:underline focus:outline-none"
                onClick={() => fileInputRef.current?.click()}
              >
                Click to upload
              </button> or drag and drop
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">JPEG, PNG, PDF (up to 5MB each)</p>
          </div>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <ul className="mt-4 space-y-2">
          {selectedFiles.map((file, idx) => (
            <li key={idx} className="flex items-center justify-between bg-white px-4 py-3 rounded-full border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <svg className="w-5 h-5 text-brand-pink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
              </div>
              <button 
                type="button" 
                onClick={() => removeFile(idx)}
                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
