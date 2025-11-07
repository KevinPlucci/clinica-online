// src/app/services/image-utils.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from '@angular/fire/storage';

export interface UploadOptions {
  /** Comprimir antes de subir (default: true) */
  compress?: boolean;
  /** Dimensión máxima de ancho/alto al comprimir (px) */
  maxDim?: number;
  /** Calidad JPEG [0..1] al comprimir */
  quality?: number;
  /** MIME de salida al comprimir (recomendado: 'image/jpeg') */
  mime?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Callback de progreso: 0..100 */
  onProgress?: (percent: number) => void;
}

@Injectable({ providedIn: 'root' })
export class ImageUtilsService {
  private storage = inject(Storage);

  // ========== SUBIDAS A STORAGE ==========

  /**
   * Sube N imágenes de perfil a `usuarios/{uid}/perfil_{i}.jpg` y devuelve los downloadURL en orden.
   */
  async uploadProfileImages(
    uid: string,
    files: File[],
    opts: UploadOptions = {}
  ): Promise<string[]> {
    const {
      compress = true,
      maxDim = 1024,
      quality = 0.82,
      mime = 'image/jpeg',
      onProgress,
    } = opts;

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const original = files[i];

      const fileToSend =
        compress && original.type.startsWith('image/')
          ? await this.compressImage(original, maxDim, quality, mime)
          : original;

      // Fijamos .jpg por consistencia cuando se comprime a JPEG
      const path =
        compress && mime === 'image/jpeg'
          ? `usuarios/${uid}/perfil_${i + 1}.jpg`
          : `usuarios/${uid}/perfil_${i + 1}${this.extensionForMime(
              (fileToSend as File).type || 'image/jpeg'
            )}`;

      const url = await this.uploadToStorage(path, fileToSend, onProgress);
      urls.push(url);
    }
    return urls;
  }

  /**
   * Sube un archivo (Blob/File) a la ruta indicada y devuelve su downloadURL.
   */
  async uploadToStorage(
    path: string,
    file: Blob | File,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const contentType = (file as File).type || 'application/octet-stream';
    const r = ref(this.storage, path);
    const task = uploadBytesResumable(r, file, { contentType });

    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            onProgress(p);
          }
        },
        reject,
        () => resolve()
      );
    });

    return await getDownloadURL(r);
  }

  /**
   * Borra un archivo en Storage (por si necesitás reemplazar/limpiar).
   */
  async deleteFromStorage(path: string): Promise<void> {
    await deleteObject(ref(this.storage, path));
  }

  // ========== PREVIEW LOCAL ==========

  /** Crea un ObjectURL para previsualizar un File al instante (acordate de revocarlo). */
  createObjectURL(file: File): string {
    return URL.createObjectURL(file);
  }
  /** Revoca un ObjectURL creado con createObjectURL. */
  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  // ========== COMPRESIÓN DE IMÁGENES ==========

  /**
   * Comprime una imagen en el navegador usando <canvas>.
   * @param file     File original (image/*)
   * @param maxDim   Máximo ancho/alto resultante (px)
   * @param quality  Calidad JPEG [0..1]
   * @param mime     Tipo de salida (image/jpeg recomendado)
   */
  async compressImage(
    file: File,
    maxDim = 1024,
    quality = 0.82,
    mime: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): Promise<File> {
    const dataUrl = await this.readAsDataURL(file);
    const img = await this.loadImage(dataUrl);

    const { width, height } = this.fitContain(img.width, img.height, maxDim);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await this.canvasToBlob(canvas, mime, quality);
    const name = this.appendSuffix(file.name, '_compressed', mime);
    return new File([blob], name, { type: mime, lastModified: Date.now() });
  }

  // ========== PRIVADOS / HELPERS ==========

  private readAsDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = (e) => rej(e);
      fr.readAsDataURL(file);
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = (e) => rej(e);
      img.decoding = 'async';
      img.src = src;
    });
  }

  private fitContain(w: number, h: number, maxDim: number) {
    if (Math.max(w, h) <= maxDim) return { width: w, height: h };
    const scale = maxDim / Math.max(w, h);
    return { width: Math.round(w * scale), height: Math.round(h * scale) };
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((res, rej) => {
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob() returned null'))), type, quality);
    });
  }

  private appendSuffix(originalName: string, suffix: string, mime: string) {
    const base = originalName.replace(/\.[^.]+$/, '');
    const ext = this.extensionForMime(mime);
    return `${base}${suffix}${ext}`;
  }

  private extensionForMime(mime: string): string {
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    return '.jpg'; // default para image/jpeg
  }
}
