import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src); // Clean up memory
      };
      img.onerror = () => reject(new Error('Failed to read image dimensions'));
      img.src = URL.createObjectURL(file);
    });
  };

  const generateSafeFilename = (titleText: string, originalFile: File) => {
    const ext = originalFile.name.substring(originalFile.name.lastIndexOf('.'));
    
    let baseName = titleText;
    if (!baseName) {
      baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
    }

    let cleanName = baseName.toLowerCase().trim();
    cleanName = cleanName.replace(/\s+/g, '_');
    cleanName = cleanName.replace(/[^\w\-]/g, '');

    return `${cleanName}${ext}`;
  };


  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isUploading) return;

    const droppedFile = e.dataTransfer.files?.[0];
    
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setSelectedFile(droppedFile);
      setErrorMessage('');
    } else {
      setErrorMessage('Please drop a valid image file.');
    }
  };

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault(); 
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadSuccess(false);
    setErrorMessage('');

    try {
      let safeFilename = generateSafeFilename(title, selectedFile);
      
      const { data: existingFiles, error: checkError } = await supabase
        .from('photos')
        .select('file_name_google_cloud')
        .eq('file_name_google_cloud', safeFilename);

      if (checkError) throw new Error("Failed to check for existing files: " + checkError.message);

      if (existingFiles && existingFiles.length > 0) {
        const userWantsToProceed = window.confirm(
          `A photo with the filename "${safeFilename}" already exists in the gallery.\n\nDo you want to upload this anyway with a randomized name to prevent overwriting?`
        );

        if (!userWantsToProceed) {
          setIsUploading(false);
          return; 
        }

        const extIndex = safeFilename.lastIndexOf('.');
        const namePart = safeFilename.substring(0, extIndex);
        const extPart = safeFilename.substring(extIndex);
        const randomID = Math.random().toString(36).substring(2, 7); 
        
        safeFilename = `${namePart}_${randomID}${extPart}`;
      }

      const dimensions = await getImageDimensions(selectedFile);

      const { data, error } = await supabase.functions.invoke('generate-upload-url', {
        body: { 
          filename: safeFilename, 
          contentType: selectedFile.type 
        }
      });

      if (error) throw new Error("Failed to get upload URL: " + error.message);

      const { url } = data;

      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to Google Cloud");
      }

      const publicUrl = `https://storage.googleapis.com/fadli-samaai-gallery/${safeFilename}`;
      
      const { error: dbError } = await supabase
        .from('photos')
        .insert([
          { 
            image_url: publicUrl, 
            title: title || selectedFile.name, 
            alt_text: altText,
            width: dimensions.width,
            height: dimensions.height,
            file_name_google_cloud: safeFilename 
          }
        ]);

      if (dbError) {
        throw new Error("Database error: " + dbError.message);
      }

      setUploadSuccess(true);
      
      setSelectedFile(null);
      setTitle('');
      setAltText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-xl shadow-md border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Add to Gallery</h1>
      
      <form onSubmit={handleUpload} className="space-y-6">
        
        {/* DRAG AND DROP ZONE */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Image File</label>
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center w-full h-40 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedFile ? (
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-blue-600">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">Click or drag to replace</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
              </div>
            )}
            
            {/* Hidden native file input */}
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => {
                if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
              }} 
              disabled={isUploading}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
            placeholder="e.g. BMW 330D (Front Profile)"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Alt Text Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text (Accessibility)</label>
          <input 
            type="text" 
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            disabled={isUploading}
            placeholder="A brief description of the image"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={!selectedFile || isUploading}
          className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isUploading ? 'Uploading to Cloud...' : 'Upload Image'}
        </button>
      </form>
      
      {/* Status Messages */}
      <div className="mt-4 min-h-[24px]">
        {uploadSuccess && !isUploading && (
          <p className="text-green-600 font-medium text-center">
            Success! Image saved to gallery.
          </p>
        )}
        {errorMessage && !isUploading && (
          <p className="text-red-500 font-medium text-center">
            Error: {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}