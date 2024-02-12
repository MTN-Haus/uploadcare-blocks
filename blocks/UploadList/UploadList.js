import { ActivityBlock } from '../../abstract/ActivityBlock.js';
import { UploaderBlock } from '../../abstract/UploaderBlock.js';
import { UiMessage } from '../MessageBox/MessageBox.js';
import { EventType } from '../UploadCtxProvider/EventEmitter.js';
import { debounce } from '../utils/debounce.js';

export class UploadList extends UploaderBlock {
  // Context owner should have access to CSS l10n
  // TODO: We need to move away l10n from CSS
  couldBeCtxOwner = true;
  historyTracked = true;
  activityType = ActivityBlock.activities.UPLOAD_LIST;

  constructor() {
    super();

    this.init$ = {
      ...this.init$,
      doneBtnVisible: false,
      doneBtnEnabled: false,
      uploadBtnVisible: false,
      addMoreBtnVisible: false,
      addMoreBtnEnabled: false,

      atcBtnEnabled: false,

      headerText: 'Product Preview',
      errorText: '',
      addMoreCount: 0,
      addMoreCountVisible: false,
      acceptMessage: window.UploadCareLocalSettings.accept_message,
      hasFiles: false,

      showCancelAlert: false,

      onAdd: () => {
        this.initFlow(true);
      },
      onAtc: () => {
        this.onAtcBtn();
      },
      onUpload: () => {
        this.uploadAll();
        this._updateUploadsState();
      },
      onDone: () => {
        this.doneFlow();
      },
      onCancel: () => {
        this.set$({
          showCancelAlert: false,
        });
        let data = this.getOutputData((dataItem) => {
          return !!dataItem.getValue('fileInfo');
        });
        this.emit(EventType.REMOVE, data, { debounce: true });
        this.uploadCollection.clearAll();
      },
      onCancelAlert: () => {
        this.set$({
          showCancelAlert: true,
        });
      },
      onCancelClear: () => {
        this.set$({
          showCancelAlert: false,
        });
      },
    };
  }

  onAtcBtn() {
    const variantId = window.UploadCareLocalSettings.variant_id;
    const lineItemsJson = window.UploadCareLocalSettings.lineItemsJson;
    const quantityValue = window.UploadCareLocalSettings.quantity;

    let lineItems = lineItemsJson;

    let fullData = {
      items: [
        {
          quantity: quantityValue || 1,
          id: variantId,
          properties: lineItemsJson,
        },
      ],
    };

    fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullData),
    }).then((data) => {
      window.location.href = '//' + window.location.host + '/cart';
    });
  }

  _debouncedHandleCollectionUpdate = debounce(() => {
    if (!this.isConnected) {
      return;
    }
    this._updateUploadsState();
    this._updateCountLimitMessage();

    if (!this.couldOpenActivity && this.$['*currentActivity'] === this.activityType) {
      this.historyBack();
    }
  }, 0);

  /**
   * @private
   * @returns {{ passed: Boolean; tooFew: Boolean; tooMany: Boolean; exact: Boolean; min: Number; max: Number }}
   */
  _validateFilesCount() {
    let multiple = !!this.cfg.multiple;
    let min = multiple ? this.cfg.multipleMin ?? 0 : 1;
    let max = multiple ? this.cfg.multipleMax ?? 0 : 1;
    let count = this.uploadCollection.size;

    let tooFew = min ? count < min : false;
    let tooMany = max ? count > max : false;
    let passed = !tooFew && !tooMany;
    let exact = max === count;

    return {
      passed,
      tooFew,
      tooMany,
      min,
      max,
      exact,
    };
  }

  /** @private */
  _updateCountLimitMessage() {
    let filesCount = this.uploadCollection.size;
    let countValidationResult = this._validateFilesCount();
    if (filesCount && !countValidationResult.passed) {
      let msg = new UiMessage();
      let textKey = countValidationResult.tooFew
        ? 'files-count-limit-error-too-few'
        : 'files-count-limit-error-too-many';
      if (countValidationResult.min === countValidationResult.max) {
        textKey = 'files-count-limit-error-min-eq-max';
      }
      msg.caption = this.l10n('files-count-limit-error-title');
      msg.text = this.l10n(textKey, {
        min: countValidationResult.min,
        max: countValidationResult.max,
        total: filesCount,
      });
      msg.isError = true;
      this.set$({
        '*message': msg,
        errorText: msg.text,
        atcBtnEnabled: false,
        addMoreCount: countValidationResult.min - filesCount,
        addMoreCountVisible: countValidationResult.min - filesCount > 0 ? true : false,
      });
    } else {
      this.set$({
        '*message': null,
        errorText: '',
        atcBtnEnabled: this.$.doneBtnVisible && this.$.doneBtnEnabled ? true : false,
        addMoreCountVisible: false,
      });
    }
  }

  /** @private */
  _updateUploadsState() {
    let itemIds = this.uploadCollection.items();
    let filesCount = itemIds.length;
    /** @type {Summary} */
    let summary = {
      total: filesCount,
      succeed: 0,
      uploading: 0,
      failed: 0,
      limitOverflow: 0,
    };
    for (let id of itemIds) {
      let item = this.uploadCollection.read(id);
      if (item.getValue('fileInfo') && !item.getValue('validationErrorMsg')) {
        summary.succeed += 1;
      }
      if (item.getValue('isUploading')) {
        summary.uploading += 1;
      }
      if (item.getValue('validationErrorMsg') || item.getValue('uploadError')) {
        summary.failed += 1;
      }
      if (item.getValue('validationMultipleLimitMsg')) {
        summary.limitOverflow += 1;
      }
    }
    const { passed: fitCountRestrictions, tooMany, exact } = this._validateFilesCount();
    const validationOk = summary.failed === 0 && summary.limitOverflow === 0;
    let uploadBtnVisible = false;
    let allDone = false;
    let doneBtnEnabled = false;

    const readyToUpload = summary.total - summary.succeed - summary.uploading - summary.failed;
    if (readyToUpload > 0 && fitCountRestrictions) {
      uploadBtnVisible = true;
    } else {
      allDone = true;
      doneBtnEnabled = summary.total === summary.succeed && fitCountRestrictions && validationOk;
    }

    this.set$({
      doneBtnVisible: allDone,
      doneBtnEnabled: doneBtnEnabled,

      uploadBtnVisible,

      addMoreBtnEnabled: summary.total === 0 || (!tooMany && !exact),
      addMoreBtnVisible: !exact || this.cfg.multiple,
    });
  }

  get couldOpenActivity() {
    return this.cfg.showEmptyList || this.uploadCollection.size > 0;
  }

  initCallback() {
    super.initCallback();

    this.registerActivity(this.activityType);

    this.subConfigValue('multiple', this._debouncedHandleCollectionUpdate);
    this.subConfigValue('multipleMin', this._debouncedHandleCollectionUpdate);
    this.subConfigValue('multipleMax', this._debouncedHandleCollectionUpdate);

    this.sub('*currentActivity', (currentActivity) => {
      if (!this.couldOpenActivity && currentActivity === this.activityType) {
        this.$['*currentActivity'] = this.initActivity;
      }
    });

    // TODO: could be performance issue on many files
    // there is no need to update buttons state on every progress tick
    this.uploadCollection.observeProperties(this._debouncedHandleCollectionUpdate);

    this.sub('*uploadList', (list) => {
      this._debouncedHandleCollectionUpdate();

      this.set$({
        hasFiles: list.length > 0,
      });

      if (!this.cfg.confirmUpload) {
        this.add$(
          {
            '*uploadTrigger': {},
          },
          true
        );
      }
    });
  }

  destroyCallback() {
    super.destroyCallback();
    this.uploadCollection.unobserveProperties(this._debouncedHandleCollectionUpdate);
  }
}

UploadList.template = /* HTML */ `
  <lr-activity-header>
    <span class="header-text">{{headerText}}</span>
    <button type="button" class="mini-btn close-btn" set="onclick: *closeModal">
      <lr-icon name="close"></lr-icon>
    </button>
  </lr-activity-header>
  <div class="no-files" set="@hidden: hasFiles">
    <slot name="empty"><span l10n="no-files"></span></slot>
  </div>
  <div class="accept-block">
    <div class="accept-block__text">
      <div set="innerHTML: acceptMessage;" class="accept-block__message"></div>
      <div class="accept-block__error" set="@hidden: !errorText">{{errorText}}</div>
    </div>
    <div class="accept-block__btns">
      <button set="onclick: onAtc; @disabled: !atcBtnEnabled" class="atc-button primary-btn">Add to cart</button>
      <button
        type="button"
        class="add-more-btn secondary-btn"
        set="onclick: onAdd; @disabled: !addMoreBtnEnabled; @hidden: !addMoreBtnVisible"
      >
        <lr-icon name="add"></lr-icon>
        <span>Add <span set="@hidden: !addMoreCountVisible">{{addMoreCount}}</span> more</span>
      </button>

      <button
        type="button"
        class="cancel-alert-btn secondary-btn"
        set="onclick: onCancelAlert; @hidden: showCancelAlert"
        l10n="clear"
      ></button>

      <div class="cancel-submodal" set="@hidden: !showCancelAlert">
        <div class="overflow" set="onclick: onCancelClear;"></div>
        <div class="inner">
          <p class="clear-alert" set="@hidden: !showCancelAlert">
            Are you sure you want to delete all uploaded pictures?
          </p>
          <button
            type="button"
            class="cancel-btn secondary-btn"
            set="onclick: onCancel; @hidden: !showCancelAlert"
            l10n="clear"
          ></button>
          <button
            type="button"
            class="cancel-cancel-btn secondary-btn"
            set="onclick: onCancelClear; @hidden: !showCancelAlert"
            l10n="cancel"
          ></button>
        </div>
      </div>
    </div>

    <div class="files" repeat="*uploadList" repeat-item-tag="lr-file-item"></div>
  </div>
  <div class="toolbar">
    <div class="toolbar-spacer"></div>
    <button
      type="button"
      class="upload-btn primary-btn"
      set="@hidden: !uploadBtnVisible; onclick: onUpload;"
      l10n="upload"
    ></button>
  </div>
  <lr-drop-area ghost></lr-drop-area>
`;
