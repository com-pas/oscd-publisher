import { LitElement, TemplateResult } from 'lit';
import { ActionList } from '@openenergytools/filterable-lists/dist/ActionList.js';
import { MdOutlinedButton } from '@scopedelement/material-web/button/MdOutlinedButton.js';
import { MdDialog } from '@scopedelement/material-web/dialog/MdDialog.js';
import { MdIcon } from '@scopedelement/material-web/icon/MdIcon.js';
import { MdTextButton } from '@scopedelement/material-web/button/MdTextButton.js';
import { MdRadio } from '@scopedelement/material-web/radio/radio.js';
import { MdList } from '@scopedelement/material-web/list/MdList.js';
import { MdListItem } from '@scopedelement/material-web/list/MdListItem.js';
import { DataSetElementEditor } from './data-set-element-editor.js';
declare const DataSetEditor_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class DataSetEditor extends DataSetEditor_base {
    static scopedElements: {
        'action-list': typeof ActionList;
        'md-text-button': typeof MdTextButton;
        'data-set-element-editor': typeof DataSetElementEditor;
        'md-outlined-button': typeof MdOutlinedButton;
        'md-dialog': typeof MdDialog;
        'md-icon': typeof MdIcon;
        'md-radio': typeof MdRadio;
        'md-list': typeof MdList;
        'md-list-item': typeof MdListItem;
    };
    /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
    doc: XMLDocument;
    /** SCL change indicator */
    editCount: number;
    searchValue: string;
    selectedDataSet?: Element;
    lDevices: Element[];
    selectedLDevice: Element | null;
    selectedIed: Element | null;
    selectionList: ActionList;
    selectDataSetButton: MdOutlinedButton;
    dataSetElementEditor: DataSetElementEditor;
    lDeviceSelectDialog: MdDialog;
    /** Resets selected DataSet, if not existing in new doc
    update(props: Map<string | number | symbol, unknown>): void {
      if (props.has('doc') && this.selectedDataSet) {
        const newDataSet = updateElementReference(this.doc, this.selectedDataSet);
  
        this.selectedDataSet = newDataSet ?? undefined;
  
        /* TODO(Jakob Vogelsang): fix when action-list is activable
        if (!newDataSet && this.selectionList && this.selectionList.selected)
          (this.selectionList.selected as ListItem).selected = false;
      }
  
      super.update(props);
    } */
    updated(changedProps: Map<string | number | symbol, unknown>): void;
    private renderElementEditorContainer;
    private renderSelectionList;
    private createDataSet;
    private renderToggleButton;
    private renderLDeviceSelectDialog;
    private selectLDevice;
    private handleLDeviceSelect;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
