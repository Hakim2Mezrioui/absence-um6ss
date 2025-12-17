import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const TokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Récupérer le token depuis le service d'authentification
  const token = authService.getRawToken();
  
  // DEBUG: Log pour vérifier si le token est récupéré
  console.log('🔍 TokenInterceptor - URL:', request.url);
  console.log('🔍 TokenInterceptor - Token récupéré:', token ? 'OUI' : 'NON', token ? token.substring(0, 20) + '...' : null);

  if (token) {
    // Cloner la requête et attacher le token dans l'en-tête Authorization
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('🔍 TokenInterceptor - Headers ajoutés:', request.headers.get('Authorization') ? 'OUI' : 'NON');
    console.log('🔍 TokenInterceptor - Authorization header:', request.headers.get('Authorization')?.substring(0, 50) + '...');
  } else {
    console.warn('⚠️ TokenInterceptor - Aucun token trouvé pour la requête:', request.url);
  }

  // Intercepter la réponse pour gérer les erreurs 401
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.log('⚠️ TokenInterceptor - 401 sur', request.url, 'message:', error.error?.message || error.message);

        // Ne pas forcer la déconnexion pour le scan QR, laisser le composant gérer l'erreur
        if (request.url.includes('/etudiants/qr-scan')) {
          console.log('⚠️ TokenInterceptor - 401 sur scan QR, pas de redirection vers login');
          return throwError(() => error);
        }

        // Pour les autres endpoints, considérer le token comme expiré / invalide
        console.log('❌ Token expiré ou invalide, déconnexion et redirection vers la connexion');
        console.log('❌ Erreur complète:', error);

        // Important: souscrire à logout() pour exécuter le nettoyage
        authService.logout().subscribe({
          next: () => {
            router.navigate(['/login']);
          },
          error: (logoutError) => {
            console.error('Erreur lors du logout après 401:', logoutError);
            router.navigate(['/login']);
          }
        });
      }
      return throwError(() => error);
    })
  );
};
