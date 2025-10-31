// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';

// FIX: La importación correcta apunta a 'app.component' y trae 'AppComponent'
import { AppComponent } from './app/app';

// FIX: Usamos AppComponent para iniciar la aplicación
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
