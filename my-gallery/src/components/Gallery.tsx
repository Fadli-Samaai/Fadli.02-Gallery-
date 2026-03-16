import { useEffect, useState } from 'react'
import { Download, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface Photo {
  id: string
  created_at: string
  image_url: string
  title: string | null
  alt_text: string | null
  width: number | null
  height: number | null
}

function ImageCard({ 
  photo, 
  onClick, 
  priority, 
  onLoad 
}: { 
  photo: Photo; 
  onClick: () => void; 
  priority?: boolean;
  onLoad?: () => void;
}) {
  const cleanTitle = (title: string | null) => {
    if (!title) return ''
    return title
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/[\[\]]/g, '')   
      .trim()
  }

  const aspectRatioStyle = (photo.width && photo.height) 
    ? { aspectRatio: `${photo.width} / ${photo.height}` } 
    : {};

  const optimizedThumbnailUrl = `https://wsrv.nl/?url=${encodeURIComponent(photo.image_url)}&w=600&output=webp&q=80`;

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white p-2 sm:p-3 shadow-sm cursor-zoom-in transition-all duration-500 hover:scale-[1.02] hover:shadow-md rounded-2xl overflow-hidden"
      style={aspectRatioStyle}
    >
      <img
        src={optimizedThumbnailUrl}
        alt={photo.alt_text || 'Gallery image'}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={onLoad}
        onError={onLoad} 
        className="w-full h-full object-cover rounded-xl"
      />
      
      <div className="absolute inset-2 sm:inset-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none rounded-xl">
        <span className="text-white font-medium tracking-widest uppercase text-xs">
          {cleanTitle(photo.title) || 'VIEW'}
        </span>
      </div>
    </div>
  )
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loadingDB, setLoadingDB] = useState(true) 
  const [loadedInitialCount, setLoadedInitialCount] = useState(0)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  
  const [numCols, setNumCols] = useState(4)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth < 640) setNumCols(1)
      else if (window.innerWidth < 1024) setNumCols(2)
      else setNumCols(4)
    }
    
    updateCols() 
    window.addEventListener('resize', updateCols)
    return () => window.removeEventListener('resize', updateCols)
  }, [])

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
      } else if (error) {
        console.error("Error fetching images:", error)
      }
      setLoadingDB(false)
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) nextPhoto() 
    else if (distance < -minSwipeDistance) prevPhoto() 
    
    setTouchStart(0)
    setTouchEnd(0)
  }

  const targetInitialCount = Math.min(4, photos.length)
  const isReady = photos.length > 0 && loadedInitialCount >= targetInitialCount
  const showLoader = loadingDB || (!isReady && photos.length > 0)

  const photosToRender = isReady ? photos : photos.slice(0, 4)

  const columns: Photo[][] = Array.from({ length: numCols }, () => [])
  photosToRender.forEach((photo, index) => {
    columns[index % numCols].push(photo)
  })

  return (
    <div className="w-full px-4 sm:px-8 pb-20 bg-gray-50 min-h-screen">
      
      {showLoader && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-50 z-50">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 transition-opacity duration-700 ${showLoader ? 'opacity-0' : 'opacity-100'}`}>
        {columns.map((colPhotos, colIndex) => (
          <div 
            key={colIndex} 
            className={`flex flex-col gap-6 sm:gap-8 ${
              (colIndex === 1 || colIndex === 3) ? 'sm:pt-12 lg:pt-24' : 'pt-4'
            }`}
          >
            {colPhotos.map((photo) => {
              const globalIndex = photos.findIndex(p => p.id === photo.id)
              const isPriority = globalIndex < 4 

              return (
                <ImageCard 
                  key={photo.id} 
                  photo={photo} 
                  priority={isPriority}
                  onLoad={() => {
                    if (isPriority) {
                      setLoadedInitialCount(prev => prev + 1)
                    }
                  }}
                  onClick={() => setSelectedPhotoIndex(globalIndex)} 
                />
              )
            })}
          </div>
        ))}
      </div>

      {selectedPhotoIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setSelectedPhotoIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button className="absolute top-4 right-4 sm:top-8 sm:right-8 text-black/50 hover:text-black transition-colors bg-transparent border-none outline-none focus:outline-none hover:bg-transparent cursor-pointer z-50">
            <X className="w-8 h-8" />
          </button>

          <button onClick={prevPhoto} className="hidden sm:block absolute left-4 text-black/20 hover:text-black p-2 bg-transparent border-none outline-none focus:outline-none hover:bg-transparent cursor-pointer z-50">
            <ChevronLeft className="w-12 h-12 stroke-1" />
          </button>
          
          <button onClick={nextPhoto} className="hidden sm:block absolute right-4 text-black/20 hover:text-black p-2 bg-transparent border-none outline-none focus:outline-none hover:bg-transparent cursor-pointer z-50">
            <ChevronRight className="w-12 h-12 stroke-1" />
          </button>

          <div className="relative max-w-6xl max-h-full flex flex-col items-center gap-6 pt-12 sm:pt-0">
            <img 
              src={photos[selectedPhotoIndex].image_url} 
              className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain shadow-2xl select-none"
              alt="Enlarged"
              onClick={(e) => e.stopPropagation()} 
              draggable="false"
            />
            
            <div className="text-center space-y-4">
              <h2 className="text-black tracking-[0.3em] font-light uppercase text-sm">
                {photos[selectedPhotoIndex].title 
                  ? photos[selectedPhotoIndex].title!.replace(/\s*\(.*?\)\s*/g, '').replace(/[\[\]]/g, '').trim() 
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