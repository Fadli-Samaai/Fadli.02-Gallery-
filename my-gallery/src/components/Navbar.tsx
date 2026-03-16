import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Instagram, UploadCloud } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Navbar() {
  const [isUploadActive, setIsUploadActive] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    async function checkUploadConfig() {
      const { data, error } = await supabase
        .from('site_config')
        .select('is_upload_active')
        .eq('id', 1)
        .single()

      if (!error && data) {
        setIsUploadActive(data.is_upload_active)
      }
    }
    
    checkUploadConfig()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 5) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16">
          <div className="flex justify-start">
            <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900 hover:text-gray-600 transition-colors">
              <div className="flex items-center gap-2">
                <Camera 
                  className={`w-6 h-6 duration-300 ${
                    isScrolled ? 'text-white/80 blur-md' : 'text-white'
                  }`} 
                />
                <span 
                  className={`hidden sm:inline duration-300 ${
                    isScrolled ? 'text-white/80 blur-md' : 'text-white'
                  }`}
                >
                  Gallery
                </span>
              </div>
            </Link>
          </div>

          <div className="flex justify-center">
            <a 
              href="https://instagram.com/fadli.02?igsh=MXBtbRrZzBiNWRqbw==" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 text-gray-900 hover:text-pink-600 transition-colors font-medium"
            >
              <Instagram className="w-5 h-5" />
              <span>Fadli.02</span>
            </a>
          </div>

          <div className="flex justify-end">
            {isUploadActive && (
              <Link 
                to="/upload" 
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  )
}