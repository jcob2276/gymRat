import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, Plus, Trash2, Maximize2, Split } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Photos({ session }) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [gridLineX, setGridLineX] = useState(50); // percentage
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchPhotos() {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });

    if (data) setPhotos(data);
    setLoading(false);
  }

  async function uploadPhoto(e) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(filePath);

      // 3. Save to Database
      const { error: dbError } = await supabase
        .from('progress_photos')
        .insert({
          user_id: session.user.id,
          image_url: publicUrl,
          date: photoDate
        });

      if (dbError) throw dbError;

      fetchPhotos();
      alert('Zdjęcie dodane!');
    } catch (error) {
      alert('Błąd przesyłania: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(id, url) {
    if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) return;

    const path = url.split('/').pop();
    const fileName = `${session.user.id}/${path}`;

    await supabase.storage.from('progress-photos').remove([fileName]);
    await supabase.from('progress_photos').delete().eq('id', id);
    
    fetchPhotos();
  }

  const toggleSelect = (photo) => {
    if (selectedPhotos.find(p => p.id === photo.id)) {
      setSelectedPhotos(selectedPhotos.filter(p => p.id !== photo.id));
    } else {
      if (selectedPhotos.length < 2) {
        setSelectedPhotos([...selectedPhotos, photo]);
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-neutral-500 uppercase font-black animate-pulse">Ładowanie galerii...</div>;

  return (
    <div className="flex-1 p-6 space-y-8 pb-24">
      
      <header className="flex justify-between items-center">
        <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase">📸 Zdjęcia Transformacji</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg border transition-colors ${showGrid ? 'bg-dayC text-white border-dayC' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
            title="Analiza Postawy"
          >
            <Maximize2 size={18} />
          </button>
          <button 
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedPhotos([]);
            }}
            className={`p-2 rounded-lg border transition-colors ${compareMode ? 'bg-primary text-white border-primary' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
          >
            <Split size={18} />
          </button>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={photoDate}
              onChange={(e) => setPhotoDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-[10px] font-black text-white outline-none"
            />
            <label className="cursor-pointer bg-primary hover:bg-blue-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center">
              {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <Plus size={20} />}
              <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
            </label>
          </div>
        </div>
      </header>

      {compareMode && selectedPhotos.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
             <span className="text-[10px] font-bold text-primary uppercase">Tryb Porównania ({selectedPhotos.length}/2)</span>
             {selectedPhotos.length === 2 && (
               <button onClick={() => setSelectedPhotos([])} className="text-[10px] text-neutral-500 uppercase font-bold">Wyczyść</button>
             )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {selectedPhotos.map(p => (
              <div key={p.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-primary">
                <img src={p.image_url} className="w-full h-full object-cover" alt="Selected" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[8px] font-black uppercase text-white">
                  {format(parseISO(p.date), 'dd.MM.yyyy')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4">
        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className={`relative group aspect-[3/4] rounded-2xl overflow-hidden border transition-all ${
              selectedPhotos.find(p => p.id === photo.id) ? 'border-primary ring-2 ring-primary/20' : 'border-neutral-800'
            }`}
            onClick={() => compareMode && toggleSelect(photo)}
          >
            <img src={photo.image_url} className="w-full h-full object-cover" alt="Postęp" />
            
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Grid */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-8 opacity-20">
                  {Array(48).fill(0).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-primary/50"></div>
                  ))}
                </div>
                {/* Drag Handle Container (Full Width) */}
                <div 
                  className="absolute inset-0 pointer-events-auto cursor-ew-resize"
                  onTouchMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.touches[0].clientX - rect.left;
                    setGridLineX(Math.max(0, Math.min(100, (x / rect.width) * 100)));
                  }}
                >
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)] pointer-events-none"
                    style={{ left: `${gridLineX}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-primary rounded-full border-4 border-background flex items-center justify-center">
                      <div className="w-1 h-2 bg-white/50 rounded-full mx-0.5"></div>
                      <div className="w-1 h-2 bg-white/50 rounded-full mx-0.5"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id, photo.image_url); }}
                className="p-1.5 bg-red-500/80 text-white rounded-lg backdrop-blur-sm"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-[10px] font-black text-white uppercase">{format(parseISO(photo.date), 'dd MMMM yyyy')}</p>
            </div>

            {compareMode && !selectedPhotos.find(p => p.id === photo.id) && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={32} className="text-white/50" />
              </div>
            )}
          </div>
        ))}

        {photos.length === 0 && (
          <div className="col-span-2 py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto border border-neutral-800">
              <Camera className="text-neutral-700" size={32} />
            </div>
            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Brak zdjęć transformacji</p>
          </div>
        )}
      </section>

    </div>
  );
}
