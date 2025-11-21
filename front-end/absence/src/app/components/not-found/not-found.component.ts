import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 class="text-2xl font-semibold text-gray-600 mb-4">Page non trouvée</h2>
        <p class="text-gray-500 mb-8">La page que vous recherchez n'existe pas.</p>
        <a 
          href="/" 
          class="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  `,
  styles: []
})
export class NotFoundComponent {}






























































