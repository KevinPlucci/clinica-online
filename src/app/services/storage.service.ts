// src/app/services/storage.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private storage = inject(Storage);

  /** Subida simple (sin progreso) con metadatos de caché */
  async uploadUsuarioImagen(uid: string, file: File, nombreArchivo: string): Promise<string> {
    const safeName = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `usuarios/${uid}/${Date.now()}_${safeName}`;
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public,max-age=31536000,immutable',
    });
    return await getDownloadURL(storageRef);
  }

  /** Subida resumible con progreso + metadatos de caché */
  uploadUsuarioImagenResumable(
    uid: string,
    file: File,
    nombreArchivo: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const safeName = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `usuarios/${uid}/${Date.now()}_${safeName}`;
    const storageRef = ref(this.storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public,max-age=31536000,immutable',
    });

    return new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / (snap.totalBytes || 1)) * 100);
          onProgress?.(pct);
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(storageRef);
          resolve(url);
        }
      );
    });
  }
}
