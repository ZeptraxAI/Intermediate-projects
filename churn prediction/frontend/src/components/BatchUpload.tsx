'use client';

import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function BatchUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload-to-s3', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed. Make sure your backend is running and AWS credentials are correct.');
      }

      const data = await response.json();
      setStatus('success');
      setMessage(data.message || 'File uploaded successfully to S3!');
      
      // Clear file after a delay
      setTimeout(() => {
        setFile(null);
        setStatus('idle');
        setMessage('');
      }, 5000);
      
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Batch CSV Upload to S3</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Upload a batch CSV file. It will be sent securely to your AWS S3 bucket and processed automatically by the background pipeline.
      </p>

      <div className="space-y-4">
        <label 
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            file ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className={`w-8 h-8 mb-3 ${file ? 'text-indigo-600' : 'text-slate-400'}`} />
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold">{file ? file.name : 'Click to upload'}</span> {file ? '' : 'or drag and drop'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">CSV files only</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileChange}
          />
        </label>

        {status === 'error' && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {message}
          </div>
        )}

        {status === 'success' && (
          <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {message}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading to S3...
            </>
          ) : (
            'Upload to S3 Bucket'
          )}
        </button>
      </div>
    </div>
  );
}
