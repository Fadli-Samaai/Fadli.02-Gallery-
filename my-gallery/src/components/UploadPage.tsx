import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function UploadPage() {
  const navigate = useNavigate()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data, error } = await supabase
        .from('site_config')
        .select('is_upload_active')
        .eq('id', 1)
        .single()

      if (error || !data?.is_upload_active) {
        navigate('/') 
      } else {
        setIsAuthorized(true)
      }
    }
    checkAuth()
  }, [navigate])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile)
      } else {
        alert('Please drop a valid image file.')
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('gallery_images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('gallery_images')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase
        .from('photos')
        .insert([
          {
            title: title || 'Untitled',
            image_url: publicUrl,
            alt_text: title || 'Gallery Image'
          }
        ])

      if (dbError) throw dbError

      alert('Photo uploaded successfully!')
      setFile(null)
      setTitle('')
    } catch (error) {
      console.error('Error uploading:', error)
      alert('Failed to upload photo. Check console for details.')
    } finally {
      setUploading(false)
    }
  }

  if (isAuthorized === null) return null 

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8 border-b pb-4">
          <UploadCloud className="w-8 h-8 text-gray-900" />
          <h1 className="text-2xl font-bold text-gray-900">Upload to Gallery</h1>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
              placeholder="E.g., Cape Town Sunset"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select or Drop Image
            </label>
            
            {/* The Drop Zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors duration-200 ${
                isDragging 
                  ? 'border-gray-900 bg-gray-100'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="space-y-1 text-center">
                <ImageIcon className={`mx-auto h-12 w-12 transition-colors ${isDragging ? 'text-gray-900' : 'text-gray-400'}`} />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label className="relative cursor-pointer rounded-md font-medium text-gray-900 underline hover:text-gray-700">
                    <span>Click to upload</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="sr-only" 
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-2">
                  {file ? (
                    <span className="text-gray-900">Selected: {file.name}</span>
                  ) : (
                    "PNG, JPG, WEBP up to 10MB"
                  )}
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Photo'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}