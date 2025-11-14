import { trigger, animate, transition, style, query } from '@angular/animations';

export const fadeAnimation = trigger('fadeAnimation', [
  transition('* => *', [
    // Al entrar una nueva página, que empiece transparente
    query(':enter', [style({ opacity: 0, position: 'absolute', width: '100%' })], {
      optional: true,
    }),
    // La página que se va, se desvanece
    query(':leave', [style({ opacity: 1 }), animate('0.3s ease-in-out', style({ opacity: 0 }))], {
      optional: true,
    }),
    // La página nueva aparece suavemente
    query(':enter', [style({ opacity: 0 }), animate('0.3s ease-in-out', style({ opacity: 1 }))], {
      optional: true,
    }),
  ]),
]);
