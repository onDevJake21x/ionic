import { Component, Element, Event, EventEmitter, Listen, Method, Prop } from '@stencil/core';
import { Animation, AnimationBuilder, Config, DomController, FrameworkDelegate, OverlayDismissEvent, OverlayDismissEventDetail } from '../../index';

import { DomFrameworkDelegate } from '../../utils/dom-framework-delegate';
import { domControllerAsync } from '../../utils/helpers';
import { createThemedClasses } from '../../utils/theme';
import { BACKDROP, OverlayInterface, overlayAnimation } from '../../utils/overlays';

import iosEnterAnimation from './animations/ios.enter';
import iosLeaveAnimation from './animations/ios.leave';
import mdEnterAnimation from './animations/md.enter';
import mdLeaveAnimation from './animations/md.leave';

@Component({
  tag: 'ion-popover',
  styleUrls: {
    ios: 'popover.ios.scss',
    md: 'popover.md.scss'
  },
  host: {
    theme: 'popover'
  }
})
export class Popover implements OverlayInterface {

  private presented = false;
  private usersComponentElement: HTMLElement;

  animation: Animation;

  @Element() private el: HTMLElement;

  @Prop({ connect: 'ion-animation-controller' }) animationCtrl: HTMLIonAnimationControllerElement;
  @Prop({ context: 'config' }) config: Config;
  @Prop({ context: 'dom' }) dom: DomController;
  @Prop({ mutable: true }) delegate: FrameworkDelegate;
  @Prop() overlayId: number;

  /**
   * The color to use from your Sass `$colors` map.
   * Default options are: `"primary"`, `"secondary"`, `"tertiary"`, `"success"`, `"warning"`, `"danger"`, `"light"`, `"medium"`, and `"dark"`.
   * For more information, see [Theming your App](/docs/theming/theming-your-app).
   */
  @Prop() color: string;

  /**
   * The mode determines which platform styles to use.
   * Possible values are: `"ios"` or `"md"`.
   * For more information, see [Platform Styles](/docs/theming/platform-specific-styles).
   */
  @Prop() mode: 'ios' | 'md';

  /**
   * Animation to use when the popover is presented.
   */
  @Prop() enterAnimation: AnimationBuilder;

  /**
   * Animation to use when the popover is dismissed.
   */
  @Prop() leaveAnimation: AnimationBuilder;

  /**
   * The component to display inside of the popover.
   */
  @Prop() component: string;

  /**
   * The data to pass to the popover component.
   */
  @Prop() data: any = {};

  /**
   * Additional classes to apply for custom CSS. If multiple classes are
   * provided they should be separated by spaces.
   */
  @Prop() cssClass: string;

  /**
   * If true, the popover will be dismissed when the backdrop is clicked. Defaults to `true`.
   */
  @Prop() enableBackdropDismiss = true;

  /**
   * The event to pass to the popover animation.
   */
  @Prop() ev: any;

  /**
   * If true, a backdrop will be displayed behind the popover. Defaults to `true`.
   */
  @Prop() showBackdrop = true;

  /**
   * If true, the popover will be translucent. Defaults to `false`.
   */
  @Prop() translucent = false;

  /**
   * If true, the popover will animate. Defaults to `true`.
   */
  @Prop() willAnimate = true;

  /**
   * Emitted after the popover has loaded.
   */
  @Event() ionPopoverDidLoad: EventEmitter<PopoverEventDetail>;

  /**
   * Emitted after the popover has presented.
   */
  @Event() ionPopoverDidPresent: EventEmitter<PopoverEventDetail>;

  /**
   * Emitted before the popover has presented.
   */
  @Event() ionPopoverWillPresent: EventEmitter<PopoverEventDetail>;

  /**
   * Emitted before the popover has dismissed.
   */
  @Event() ionPopoverWillDismiss: EventEmitter<PopoverDismissEventDetail>;

  /**
   * Emitted after the popover has dismissed.
   */
  @Event() ionPopoverDidDismiss: EventEmitter<PopoverDismissEventDetail>;

  /**
   * Emitted after the popover has unloaded.
   */
  @Event() ionPopoverDidUnload: EventEmitter<PopoverEventDetail>;

  componentDidLoad() {
    this.ionPopoverDidLoad.emit();
  }

  componentDidUnload() {
    this.ionPopoverDidUnload.emit();
  }

  @Listen('ionDismiss')
  protected onDismiss(ev: UIEvent) {
    ev.stopPropagation();
    ev.preventDefault();

    this.dismiss();
  }

  @Listen('ionBackdropTap')
  protected onBackdropTap() {
    this.dismiss(null, BACKDROP).catch();
  }

  /**
   * Present the popover overlay after it has been created.
   */
  @Method()
  present(): Promise<void> {
    if (this.presented) {
      return Promise.reject('overlay already presented');
    }
    this.presented = true;

    this.ionPopoverWillPresent.emit();

    this.el.style.zIndex = `${10000 + this.overlayId}`;

    // get the user's animation fn if one was provided
    const animationBuilder = this.enterAnimation || this.config.get('popoverEnter', this.mode === 'ios' ? iosEnterAnimation : mdEnterAnimation);

    const userComponentParent = this.el.querySelector(`.${USER_COMPONENT_POPOVER_CONTAINER_CLASS}`);
    if (!this.delegate) {
      this.delegate = new DomFrameworkDelegate();
    }

    const cssClasses: string[] = [];
    if (this.cssClass && this.cssClass.length) {
      cssClasses.push(this.cssClass);
    }

    // add the modal by default to the data being passed
    this.data = this.data || {};
    this.data.modal = this.el;

    return this.delegate.attachViewToDom(userComponentParent, this.component, this.data, cssClasses)
      .then((mountingData) => {
        this.usersComponentElement = mountingData.element;
      })
      .then(() => domControllerAsync(this.dom.raf))
      .then(() => this.playAnimation(animationBuilder))
      .then(() => {
        this.ionPopoverDidPresent.emit();
      });
  }

  /**
   * Dismiss the popover overlay after it has been presented.
   */
  @Method()
  dismiss(data?: any, role?: string) {
    if (!this.presented) {
      return Promise.reject('overlay is not presented');
    }
    this.presented = false;
    if (this.animation) {
      this.animation.destroy();
      this.animation = null;
    }

    this.ionPopoverWillDismiss.emit({ data, role });

    if (!this.delegate) {
      this.delegate = new DomFrameworkDelegate();
    }

    const animationBuilder = this.leaveAnimation || this.config.get('popoverLeave', this.mode === 'ios' ? iosLeaveAnimation : mdLeaveAnimation);

    return this.playAnimation(animationBuilder).then(() => {
      this.ionPopoverDidDismiss.emit({ data, role });

      return domControllerAsync(this.dom.write, () => {
        const userComponentParent = this.el.querySelector(`.${USER_COMPONENT_POPOVER_CONTAINER_CLASS}`);
        this.delegate.removeViewFromDom(userComponentParent, this.usersComponentElement);
        this.el.parentNode.removeChild(this.el);
      });
    });
  }

  private playAnimation(animationBuilder: AnimationBuilder): Promise<void> {
    return overlayAnimation(this, animationBuilder, this.willAnimate, this.el, this.ev);
  }

  hostData() {
    const themedClasses = this.translucent ? createThemedClasses(this.mode, this.color, 'popover-translucent') : {};

    return {
      class: {
        ...themedClasses
      }
    };
  }

  render() {
    const wrapperClasses = createThemedClasses(this.mode, this.color, 'popover-wrapper');

    return [
      <ion-backdrop tappable={this.enableBackdropDismiss}/>,
      <div class={wrapperClasses}>
        <div class='popover-arrow' />
        <div class='popover-content'>
          <div class={USER_COMPONENT_POPOVER_CONTAINER_CLASS}>
          </div>
        </div>
      </div>
    ];
  }
}

export interface PopoverOptions {
  component: any;
  data?: any;
  showBackdrop?: boolean;
  enableBackdropDismiss?: boolean;
  translucent?: boolean;
  enterAnimation?: AnimationBuilder;
  leaveAnimation?: AnimationBuilder;
  cssClass?: string;
  ev: Event;
  delegate?: FrameworkDelegate;
}

export interface PopoverEvent extends CustomEvent {
  target: HTMLIonPopoverElement;
  detail: PopoverEventDetail;
}

export interface PopoverEventDetail {

}

export interface PopoverDismissEventDetail extends OverlayDismissEventDetail {
  // keep this just for the sake of static types and potential future extensions
}

export interface PopoverDismissEvent extends OverlayDismissEvent {
  // keep this just for the sake of static types and potential future extensions
}

export const POPOVER_POSITION_PROPERTIES: any = {
  ios: {
    padding: 2,
    unit: '%',
    showArrow: true,
    centerTarget: true
  },
  md: {
    padding: 12,
    unit: 'px',
    showArrow: false,
    centerTarget: false
  }
};

export {
  iosEnterAnimation as iosPopoverEnterAnimation,
  iosLeaveAnimation as iosPopoverLeaveAnimation,
  mdEnterAnimation as mdPopoverEnterAnimation,
  mdLeaveAnimation as mdPopoverLeaveAnimation
};

export const USER_COMPONENT_POPOVER_CONTAINER_CLASS = 'popover-viewport';
