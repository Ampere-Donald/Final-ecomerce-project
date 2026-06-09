import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import {
  ScanBarcode, Search, X, Package, Tag, Layers,
  AlertCircle, CheckCircle, Loader2, RotateCcw, Camera, CameraOff,
} from 'lucide-react';
import { produitApi } from '../services/api';

/* ── Formatage ───────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

/* ── Parsing du code-barres ──────────────────────────────────────────────── */
function parseBarcode(raw: string): { codeFamille: string; code: string } | null {
  const val = raw.trim();
  for (const sep of ['/', '-', '|']) {
    const idx = val.indexOf(sep);
    if (idx > 0 && idx < val.length - 1) {
      return { codeFamille: val.slice(0, idx), code: val.slice(idx + 1) };
    }
  }
  return null;
}

/* ── Composant principal ─────────────────────────────────────────────────── */
export const ScanCode = () => {
  /* ── Caméra ───────────────────────────────────────────────────────────── */
  const [cameraOpen, setCameraOpen]     = useState(false);
  const [cameraError, setCameraError]   = useState<string | null>(null);
  const [cameras, setCameras]           = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const videoRef   = useRef<HTMLVideoElement>(null);
  const readerRef  = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  /* ── Recherche ────────────────────────────────────────────────────────── */
  const [barcodeInput, setBarcodeInput] = useState('');
  const [codeFamille, setCodeFamille]   = useState('');
  const [code, setCode]                 = useState('');
  const [produit, setProduit]           = useState<any>(null);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  /* ── Lister les caméras ───────────────────────────────────────────────── */
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0) setSelectedCamera(videoDevices[0].deviceId);
    }).catch(() => {});
  }, []);

  /* ── Arrêter le stream ────────────────────────────────────────────────── */
  const stopStream = () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  /* ── Démarrer la caméra ───────────────────────────────────────────────── */
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera
          ? { deviceId: { exact: selectedCamera } }
          : { facingMode: 'environment' },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Refresh la liste des caméras (certains navigateurs ne les exposent qu'après permission)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);

      // Démarrage du scan ZXing
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      scanningRef.current = true;

      readerRef.current.decodeFromVideoDevice(
        selectedCamera || undefined,
        videoRef.current,
        (result, err) => {
          if (!scanningRef.current) return;
          if (result) {
            handleScannedValue(result.getText());
          } else if (err && !(err instanceof NotFoundException)) {
            console.warn('[ZXing]', err);
          }
        },
      );
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setCameraError("Permission caméra refusée. Autorisez l'accès dans votre navigateur.");
      } else if (msg.includes('NotFound') || msg.includes('Requested device not found')) {
        setCameraError('Aucune caméra trouvée sur cet appareil.');
      } else {
        setCameraError('Impossible d\'ouvrir la caméra : ' + msg);
      }
      setCameraOpen(false);
    }
  };

  useEffect(() => {
    if (cameraOpen) {
      startCamera();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [cameraOpen, selectedCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Valeur scannée (caméra ou clavier) ──────────────────────────────── */
  const handleScannedValue = (raw: string) => {
    stopStream();
    setCameraOpen(false);

    const parsed = parseBarcode(raw);
    if (!parsed) {
      setError(`Format non reconnu : "${raw}". Attendu : code_famille/code  ex: 101/101001`);
      return;
    }
    setCodeFamille(parsed.codeFamille);
    setCode(parsed.code);
    setBarcodeInput(raw);
    doSearch(parsed.codeFamille, parsed.code);
  };

  /* ── Recherche API ────────────────────────────────────────────────────── */
  const doSearch = async (cf: string, c: string) => {
    if (!cf.trim() || !c.trim()) { setError('Code famille et code requis.'); return; }
    setLoading(true);
    setError(null);
    setProduit(null);
    try {
      const data = await produitApi.findByCode(cf.trim(), c.trim());
      setProduit(data);
    } catch (e: any) {
      setError(
        e?.response?.status === 404
          ? `Aucun produit trouvé pour ${cf}/${c}.`
          : 'Erreur lors de la recherche.',
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setProduit(null);
    setError(null);
    setBarcodeInput('');
    setCodeFamille('');
    setCode('');
    setTimeout(() => barcodeRef.current?.focus(), 50);
  };

  /* ── Scan clavier ─────────────────────────────────────────────────────── */
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    handleScannedValue(barcodeInput);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(codeFamille, code);
  };

  /* ── Rendu ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ScanBarcode size={26} className="text-primary" />
            Scanner un code-barres
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Utilisez la caméra, un lecteur USB/Bluetooth, ou saisissez manuellement.
          </p>
        </div>

        {/* ── Vue caméra ─────────────────────────────────────────────────── */}
        {cameraOpen && (
          <div className="bg-black rounded-2xl overflow-hidden relative shadow-xl">
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover"
              muted
              playsInline
            />
            {/* Viseur */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-32 border-2 border-white/40 rounded-xl relative">
                <span className="absolute -top-px -left-px w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <span className="absolute -top-px -right-px w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-px -left-px w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-px -right-px w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-0.5 bg-primary/70 animate-pulse" />
              </div>
            </div>
            {/* Contrôles bas */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-4 flex items-center gap-3">
              {cameras.length > 1 && (
                <select
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                  className="text-xs bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 outline-none flex-1"
                >
                  {cameras.map((cam, i) => (
                    <option key={cam.deviceId} value={cam.deviceId} className="text-black">
                      {cam.label || `Caméra ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-white/60 text-xs flex-1 text-center">Placez le code-barres dans le cadre</p>
              <button
                onClick={() => setCameraOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/25 text-white rounded-xl transition"
              >
                <CameraOff size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Erreur caméra */}
        {cameraError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{cameraError}</p>
          </div>
        )}

        {/* ── Panneau principal ──────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">

          {/* Bouton caméra */}
          <button
            onClick={() => { setCameraOpen(v => !v); setError(null); }}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 font-semibold text-sm transition
              ${cameraOpen
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/40 hover:text-primary'
              }`}
          >
            {cameraOpen
              ? <><CameraOff size={18} /> Fermer la caméra</>
              : <><Camera size={18} /> Ouvrir la caméra pour scanner</>
            }
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs font-semibold text-slate-400">ou lecteur USB / Bluetooth</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Champ scan clavier */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Code-barres — puis Entrée
            </label>
            <div className="relative">
              <ScanBarcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeRef}
                autoFocus
                type="text"
                value={barcodeInput}
                onChange={e => { setBarcodeInput(e.target.value); setError(null); }}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scannez ou collez le code, puis Entrée…"
                className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm
                           focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 focus:bg-white transition font-mono"
              />
              {barcodeInput && (
                <button onClick={() => { setBarcodeInput(''); setError(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Format : <span className="font-mono text-primary">code_famille/code</span> — ex :&nbsp;
              <span className="font-mono text-primary">101/101001</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs font-semibold text-slate-400">ou saisie manuelle</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Formulaire manuel */}
          <form onSubmit={handleManualSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Code famille</label>
              <input
                type="text"
                value={codeFamille}
                onChange={e => { setCodeFamille(e.target.value); setError(null); }}
                placeholder="ex : 101"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setError(null); }}
                placeholder="ex : 101001"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Chercher
            </button>
          </form>
        </div>

        {/* États */}
        {loading && (
          <div className="flex items-center justify-center gap-3 text-slate-500 py-10">
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
            <button onClick={reset} className="text-red-400 hover:text-red-600"><RotateCcw size={16} /></button>
          </div>
        )}

        {/* ── Résultat ────────────────────────────────────────────────────── */}
        {produit && !loading && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle size={16} /> Produit identifié
              </span>
              <button onClick={reset}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1">
                <RotateCcw size={13} /> Nouveau scan
              </button>
            </div>

            <div className="p-5 flex gap-5">
              <div className="w-24 h-24 shrink-0 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                {produit.imageUrl
                  ? <img src={produit.imageUrl} alt={produit.nomProduit} className="w-full h-full object-contain" />
                  : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-slate-300" /></div>
                }
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-mono text-slate-600">
                    <Tag size={11} /> Famille : {produit.codeFamille}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-mono text-slate-600">
                    <Tag size={11} /> Code : {produit.code}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Stock</p>
                    <p className={`text-xl font-black mt-0.5 ${produit.quantiteStock <= produit.seuilAlerte ? 'text-red-500' : 'text-slate-800'}`}>
                      {produit.quantiteStock}
                    </p>
                    {produit.quantiteStock <= produit.seuilAlerte && (
                      <p className="text-[10px] text-red-400 font-semibold">⚠ Alerte</p>
                    )}
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

                {produit.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{produit.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
