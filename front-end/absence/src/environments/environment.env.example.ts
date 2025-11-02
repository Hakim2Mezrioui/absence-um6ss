// Template de configuration d'environnement local
// Copier ce fichier vers environment.env.ts et ajuster selon l'environnement
// Le fichier environment.env.ts est ignoré par git

export const environment = {
  production: false,
  // Environnement LOCAL (127.0.0.1) - actuellement actif
  apiUrl: 'http://127.0.0.1:8000/api',
  baseUrl: 'http://127.0.0.1:8000'
  
  /* Pour utiliser l'environnement SERVEUR, décommenter les lignes suivantes et commenter celles du dessus:
  apiUrl: 'http://10.0.244.100:8000/api',
  baseUrl: 'http://10.0.244.100:8000'
  */
};

