import { BlockComponent } from '../BlockComponent/BlockComponent.js';
import { FileItem } from '../FileItem/FileItem.js';
import { UiConfirmation } from '../ConfirmationDialog/ConfirmationDialog.js';

export class UploadList extends BlockComponent {
  init$ = {
    uploadBtnDisabled: false,
    onAdd: () => {
      this.$['*currentActivity'] = BlockComponent.activities.SOURSE_SELECT;
    },
    onUpload: () => {
      this.set$({
        uploadBtnDisabled: true,
        '*uploadTrigger': {},
      });
    },
    onCancel: () => {
      let cfn = new UiConfirmation();
      cfn.confirmAction = () => {
        this.$['*modalActive'] = false;
        this.uploadCollection.clearAll();
      };
      cfn.denyAction = () => {
        this.historyBack();
      };
      this.$['*confirmation'] = cfn;
    },
  };

  _renderMap = Object.create(null);

  initCallback() {
    this.uploadCollection.observe(() => {
      let notUploaded = this.uploadCollection.findItems((item) => {
        return !item.getValue('uuid');
      });
      this.$.uploadBtnDisabled = !notUploaded.length;
    });
    this.sub('*uploadList', (/** @type {String[]} */ list) => {
      if (!list.length) {
        this.$['*currentActivity'] = '';
        return;
      }
      list.forEach((id) => {
        if (!this._renderMap[id]) {
          let item = new FileItem();
          this.ref.files.prepend(item);
          item['entry-id'] = id;
          this._renderMap[id] = item;
        }
        for (let id in this._renderMap) {
          if (!list.includes(id)) {
            this._renderMap[id].remove();
            delete this._renderMap[id];
          }
        }
      });
    });
  }
}

UploadList.template = /*html*/ `
<div .files-el ref="files">
  <div .add-more-row></div>
</div>
<div .toolbar-el>
  <button 
    .cancel-btn 
    .secondary-btn
    set="onclick: onCancel;" 
    l10n="cancel"></button>
  <div></div>
  <button 
    .add-more-btn 
    .secondary-btn
    set="onclick: onAdd" 
    l10n="add-more"></button>
  <button 
    .upload-btn 
    .primary-btn
    set="onclick: onUpload; @disabled: uploadBtnDisabled" 
    l10n="upload"></button>
</div>
`;
