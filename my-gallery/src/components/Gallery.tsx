import { useEffect, useState } from 'react'
import { Download, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface Photo {
  id: string
  created_at: string
  image_url: string
  title: string | null
  alt_text: string | null
}

function ImageCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const cleanTitle = (title: string | null) => {
    if (!title) return ''
    return title
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/[\[\]]/g, '')   
      .trim()
  }

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white p-2 sm:p-3 shadow-sm cursor-zoom-in transition-all duration-500 hover:scale-[1.02] hover:shadow-md rounded-2xl"
    >
      <img
        src={photo.image_url}
        alt={photo.alt_text || 'Gallery image'}
        loading="lazy"
        decoding="async"
        className="w-full h-auto object-cover"
      />
      
      {/* Hover Overlay */}
      <div className="absolute inset-2 sm:inset-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none">
        <span className="text-white font-medium tracking-widest uppercase text-xs">
          {cleanTitle(photo.title) || 'VIEW'}
        </span>
      </div>
    </div>
  )
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  useEffect(() => {
    async function fetchPhotos() {
      const { data, error } = await supabase.from('photos').select('*')
      
      if (!error && data) {
        const shuffled = [...data]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        setPhotos(shuffled)
      }
      setLoading(false)
    }
    fetchPhotos()
  }, [])

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (selectedPhotoIndex !== null) setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length)
  }

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (selectedPhotoIndex !== null) setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Strictly split into 4 columns for the classic Masonry effect
  const columns: Photo[][] = [[], [], [], []]
  photos.forEach((photo, index) => {
    columns[index % 4].push(photo)
  })

  return (
    <div className="w-full px-4 sm:px-8 pb-20 bg-gray-50">
      
      {/* The 4-Column Masonry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {columns.map((colPhotos, colIndex) => (
          <div 
            key={colIndex} 
            className={`flex flex-col gap-6 sm:gap-8 ${
              (colIndex === 1 || colIndex === 3) ? 'sm:pt-12 lg:pt-24' : 'pt-4'
            }`}
          >
            {colPhotos.map((photo) => {
              const globalIndex = photos.findIndex(p => p.id === photo.id)
              return (
                <ImageCard 
                  key={photo.id} 
                  photo={photo} 
                  onClick={() => setSelectedPhotoIndex(globalIndex)} 
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhotoIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <button className="absolute top-8 right-8 text-black/50 hover:text-black transition-colors bg-transparent border-none outline-none focus:outline-none hover:bg-transparent cursor-pointer">
            <X className="w-8 h-8" />
          </button>

          <button onClick={prevPhoto} className="absolute left-4 text-black/20 hover:text-black p-2 bg-transparent border-none outline-none focus:outline-none hover:bg-transparent cursor-pointer">
            <ChevronLeft className="w-12 h-12 stroke-1" />
          </button>
          
          <button onClick={nextPhoto} className="absolute right-4 text-black/20 hover:text-black p-2 bg-transparent border-none outline-none focus:outline-none hover:bg-transparent cursor-pointer">
            <ChevronRight className="w-12 h-12 stroke-1" />
          </button>

          <div className="max-w-6xl max-h-full flex flex-col items-center gap-6">
            <img 
              src={photos[selectedPhotoIndex].image_url} 
              className="max-w-full max-h-[80vh] object-contain shadow-2xl"
              alt="Enlarged"
              onClick={(e) => e.stopPropagation()} 
            />
            
            <div className="text-center space-y-4">
              <h2 className="text-black tracking-[0.3em] font-light uppercase text-sm">
                {photos[selectedPhotoIndex].title 
                  ? photos[selectedPhotoIndex].title.replace(/\s*\(.*?\)\s*/g, '').replace(/[\[\]]/g, '').trim() 
                  : 'UNTITLED'
                }
              </h2>
              <a 
                href={photos[selectedPhotoIndex].image_url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-black/60 hover:text-black text-[10px] tracking-[0.2em] transition-colors uppercase border border-black/20 px-6 py-2 rounded-full bg-transparent hover:bg-black/5"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3 h-3" />
                Download Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}