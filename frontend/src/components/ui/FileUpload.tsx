import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface FileUploadProps {
  onEmailsExtracted: (emails: string[]) => void;
  extractedCount?: number;
  label?: string;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onEmailsExtracted,
  extractedCount = 0,
  label = 'Recipients File (CSV or TXT)',
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  const parseFileContent = (content: string) => {
    // Extract all unique email addresses matching the pattern
    const matches = content.match(emailRegex);
    if (!matches || matches.length === 0) {
      setParseError('No valid email addresses found in this file');
      onEmailsExtracted([]);
      return;
    }

    // Deduplicate and sanitize
    const uniqueEmails = Array.from(
      new Set(matches.map((email) => email.trim().toLowerCase()))
    ).filter(Boolean);

    setParseError(null);
    onEmailsExtracted(uniqueEmails);
  };

  const handleFile = (file: File) => {
    if (!file) return;

    // Check extension
    const validExtensions = ['.csv', '.txt'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setParseError('Please upload a .csv or .txt file');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        parseFileContent(text);
      } else {
        setParseError('File is empty');
        onEmailsExtracted([]);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    setFileSize(null);
    setParseError(null);
    onEmailsExtracted([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          <span className="text-red-500 ml-1">*</span>
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleInputChange}
        className="hidden"
      />

      {!fileName ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-150 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            CSV or TXT file (one email per line or comma-separated)
          </p>
        </div>
      ) : (
        <div className="p-4 border rounded-xl bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>{fileSize}</span>
                {extractedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {extractedCount} valid recipient{extractedCount === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors ml-2 shrink-0"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {(parseError || error) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{parseError || error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
