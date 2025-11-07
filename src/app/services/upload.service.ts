// upload.service.ts (ejemplo breve)
import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private storage = inject(Storage);

  async uploadProfileImages(uid: string, files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const path = `usuarios/${uid}/perfil_${i + 1}.jpg`;
      const r = ref(this.storage, path);
      const t = uploadBytesResumable(r, files[i]);
      await new Promise<void>((res, rej) => t.on('state_changed', undefined, rej, () => res()));
      urls.push(await getDownloadURL(r));
    }
    return urls;
  }
}
