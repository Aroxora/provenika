import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initFirebase } from './app/core/firebase';

void initFirebase();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
