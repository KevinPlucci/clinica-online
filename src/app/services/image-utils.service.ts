// src/app/services/image-utils.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageUtilsService {
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
    mime = 'image/jpeg'
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
    return new Promise((res) => {
      canvas.toBlob((b) => res(b as Blob), type, quality);
    });
  }

  private appendSuffix(originalName: string, suffix: string, mime: string) {
    const base = originalName.replace(/\.[^.]+$/, '');
    const ext = mime === 'image/png' ? '.png' : '.jpg';
    return `${base}${suffix}${ext}`;
  }
}
