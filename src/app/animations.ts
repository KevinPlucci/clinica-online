import { trigger, animate, transition, style, query, group } from '@angular/animations';

// 1. Tu animación existente (Fade)
export const fadeAnimation = trigger('fadeAnimation', [
  transition('* => *', [
    query(':enter', [style({ opacity: 0, position: 'absolute', width: '100%' })], {
      optional: true,
    }),
    query(':leave', [style({ opacity: 1 }), animate('0.3s ease-in-out', style({ opacity: 0 }))], {
      optional: true,
    }),
    query(':enter', [style({ opacity: 0 }), animate('0.3s ease-in-out', style({ opacity: 1 }))], {
      optional: true,
    }),
  ]),
]);

// 2. Nueva animación requerida (Slide de Derecha a Izquierda)
export const slideInAnimation = trigger('slideInAnimation', [
  transition('* <=> *', [
    query(':enter, :leave', style({ position: 'absolute', width: '100%', zIndex: 2 }), {
      optional: true,
    }),
    group([
      query(
        ':enter',
        [
          style({ transform: 'translateX(100%)' }),
          animate('0.5s ease-out', style({ transform: 'translateX(0%)' })),
        ],
        { optional: true }
      ),
      query(
        ':leave',
        [
          style({ transform: 'translateX(0%)' }),
          animate('0.5s ease-out', style({ transform: 'translateX(-100%)' })),
        ],
        { optional: true }
      ),
    ]),
  ]),
]);
