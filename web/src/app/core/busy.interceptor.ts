import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { BusyService } from './busy.service';

/** Increments the global busy counter for the lifetime of every HTTP request. */
export const busyInterceptor: HttpInterceptorFn = (req, next) => {
  const busy = inject(BusyService);
  busy.inc();
  return next(req).pipe(finalize(() => busy.dec()));
};
