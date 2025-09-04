import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { TokenInterceptor } from './interceptors/token.interceptor';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Désactivé temporairement pour éviter les rechargements
    // provideClientHydration(withEventReplay()),
    provideHttpClient(
      withInterceptors([TokenInterceptor]),
      withFetch()
    ),
    provideAnimationsAsync()
  ]
};
