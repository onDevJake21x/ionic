import { Component, ViewEncapsulation } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'page-one',
  template: `
<ion-page>
  <ion-header>
    <ion-toolbar>
      <ion-title>Page One</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    Page One
    <ul>
      <li>ngOnInit - {{ngOnInitDetection}}</li>
    </ul>
    <ion-button class="dismiss-btn" (click)="dismiss()">Close Modal</ion-button>
  </ion-content>
</ion-page>
  `,
  encapsulation: ViewEncapsulation.None
})
export class ModalPageToPresent {

  ngOnInitDetection = 'initial';

  constructor(private modalController: ModalController) {

  }


  ngOnInit() {
    console.log('page one ngOnInit');
    setInterval(() => {
      this.ngOnInitDetection = '' + Date.now();
    }, 500);
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
