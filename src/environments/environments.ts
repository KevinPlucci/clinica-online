// src/environments.ts
export const environment = {
  production: false,
  // TODO: reemplazar con las credenciales reales de tu proyecto Firebase
  firebase: {
    apiKey: 'AIzaSyDVQFMndUtebNgui3y5URfVKIqQ2VTF4Mc',
    authDomain: 'clinica-online-423c1.firebaseapp.com',
    projectId: 'clinica-online-423c1',
    storageBucket: 'clinica-online-423c1.appspot.com',
    appId: '1:1083063989189:web:023f5d2688d3fc2d5a91ac',
  },
  /** Lista opcional de correos que son admin aunque su doc no tenga rol=admin */
  adminWhitelist: [],
};
