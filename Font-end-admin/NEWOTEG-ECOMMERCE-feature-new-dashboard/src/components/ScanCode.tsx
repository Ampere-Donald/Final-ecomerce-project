import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle,
  Layers,
  Loader2,
  Package,
  RotateCcw,
  ScanBarcode,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { getApiErrorMessage, produitApi } from '../services/api';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

const fmt = (value: number) =>
  `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;

interface ScannedProduct {
  id: string;
  nomProduit: string;
  marque?: string | null;
  imageUrl?: string | null;
  code?: string | null;
  codeFamille?: string | null;
  quantiteStock: number;
  seuilAlerte: number;
  prixDetail?: number | null;
  prixGros?: number | null;
  categorie?: { nom: string } | null;
}

export const ScanCode = () => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [produit, setProduit] = useState<ScannedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code) {
      setError('Le code produit est requis.');
      return;
    }

    setLoading(true);
    setError(null);
    setProduit(null);
    try {
      const data = await produitApi.findByCameraScan(code) as ScannedProduct;
      setBarcodeInput(code);
      setProduit(data);
      navigator.vibrate?.(100);
    } catch (searchError: any) {
      setError(getApiErrorMessage(searchError, `Aucun produit trouvé pour le code "${code}".`));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDetected = useCallback(async (code: string) => {
    setCameraOpen(false);
    await doSearch(code);
  }, [doSearch]);

  const {
    videoRef,
    error: cameraError,
    clearError: clearCameraError,
    start: startCamera,
    stop: stopCamera,
  } = useBarcodeScanner({ onDetected: handleDetected });

  useEffect(() => {
    if (cameraOpen) void startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [cameraOpen, startCamera, stopCamera]);

  const toggleCamera = () => {
    setError(null);
    clearCameraError();
    setCameraOpen((open) => !open);
  };

  const reset = () => {
    stopCamera();
    setCameraOpen(false);
    setProduit(null);
    setError(null);
    setBarcodeInput('');
    setTimeout(() => barcodeRef.current?.focus(), 50);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    stopCamera();
    setCameraOpen(false);
    void doSearch(barcodeInput);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ScanBarcode size={26} className="text-primary" />
            Scanner un code-barres
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Le code-barres correspond directement au code unique du produit.
          </p>
        </div>

        {cameraOpen && (
          <div className="bg-black rounded-2xl overflow-hidden relative shadow-xl">
            <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-32 border-2 border-white/40 rounded-xl relative">
                <span className="absolute -top-px -left-px w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <span className="absolute -top-px -right-px w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-px -left-px w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-px -right-px w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-0.5 bg-primary/70 animate-pulse" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setCameraOpen(false);
              }}
              aria-label="Fermer la caméra"
              className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-xl hover:bg-black/70"
            >
              <CameraOff size={18} />
            </button>
            <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">
              Placez le code-barres dans le cadre
            </p>
          </div>
        )}

        {cameraError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{cameraError}</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <button
            type="button"
            onClick={toggleCamera}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 font-semibold text-sm transition ${
              cameraOpen
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {cameraOpen ? <CameraOff size={18} /> : <Camera size={18} />}
            {cameraOpen ? 'Fermer la caméra' : 'Ouvrir la caméra pour scanner'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs font-semibold text-slate-400">ou lecteur USB / Bluetooth</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="barcode-code" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Code-barres / code produit
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanBarcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="barcode-code"
                  ref={barcodeRef}
                  autoFocus
                  type="text"
                  maxLength={50}
                  value={barcodeInput}
                  onChange={(event) => {
                    setBarcodeInput(event.target.value);
                    setError(null);
                  }}
                  placeholder="Ex : 101001"
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 focus:bg-white transition font-mono"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeInput('');
                      setError(null);
                    }}
                    aria-label="Effacer le code"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Chercher
              </button>
            </div>
          </form>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 text-slate-500 py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span>Recherche en cours…</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Produit introuvable</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
            <button type="button" onClick={reset} aria-label="Nouveau scan" className="text-red-400 hover:text-red-600">
              <RotateCcw size={16} />
            </button>
          </div>
        )}

        {produit && !loading && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle size={16} /> Produit identifié
              </span>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                <RotateCcw size={13} /> Nouveau scan
              </button>
            </div>

            <div className="p-5 flex gap-5">
              <div className="w-24 h-24 shrink-0 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                {produit.imageUrl ? (
                  <img src={produit.imageUrl} alt={produit.nomProduit} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={32} className="text-slate-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  {produit.marque && <p className="text-xs font-bold text-primary uppercase tracking-wider">{produit.marque}</p>}
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">{produit.nomProduit}</h2>
                  {produit.categorie && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Layers size={12} /> {produit.categorie.nom}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-xs font-mono text-primary">
                    <ScanBarcode size={12} /> Code : {produit.code}
                  </span>
                  {produit.codeFamille && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-mono text-slate-600">
                      <Tag size={11} /> Famille : {produit.codeFamille}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Stock</p>
                    <p className={`text-xl font-black mt-0.5 ${produit.quantiteStock <= produit.seuilAlerte ? 'text-red-500' : 'text-slate-800'}`}>
                      {produit.quantiteStock}
                    </p>
                  </div>
                  {produit.prixDetail != null && (
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Prix détail</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{fmt(produit.prixDetail)}</p>
                    </div>
                  )}
                  {produit.prixGros != null && (
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Prix gros</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{fmt(produit.prixGros)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
