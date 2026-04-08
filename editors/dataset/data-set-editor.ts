/* eslint-disable import/no-extraneous-dependencies */
import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import {
  ActionItem,
  ActionList,
} from '@openenergytools/filterable-lists/dist/ActionList.js';
import { MdOutlinedButton } from '@scopedelement/material-web/button/MdOutlinedButton.js';

import { newEditEvent } from '@openenergytools/open-scd-core';
import { newLogEvent } from '@compas-oscd/core';
import {
  createDataSet,
  identity,
  removeDataSet,
} from '@openenergytools/scl-lib';

import { MdDialog } from '@scopedelement/material-web/dialog/MdDialog.js';
import { MdIcon } from '@scopedelement/material-web/icon/MdIcon.js';
import { MdTextButton } from '@scopedelement/material-web/button/MdTextButton.js';
import { MdRadio } from '@scopedelement/material-web/radio/radio.js';
import { MdList } from '@scopedelement/material-web/list/MdList.js';
import { MdListItem } from '@scopedelement/material-web/list/MdListItem.js';
import { pathIdentity, styles } from '../../foundation.js';
import { DataSetElementEditor } from './data-set-element-editor.js';

export class DataSetEditor extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'action-list': ActionList,
    'md-text-button': MdTextButton,
    'data-set-element-editor': DataSetElementEditor,
    'md-outlined-button': MdOutlinedButton,
    'md-dialog': MdDialog,
    'md-icon': MdIcon,
    'md-radio': MdRadio,
    'md-list': MdList,
    'md-list-item': MdListItem,
  };

  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** SCL change indicator */
  @property({ type: Number })
  editCount = 0;

  @property({ type: String }) searchValue = '';

  @state()
  selectedDataSet?: Element;

  @state()
  lDevices: Element[] = []; // lDevices of the currently selected IED, used for the LDevice select dialog

  @state()
  selectedLDevice: Element | null = null;

  @state()
  selectedIed: Element | null = null;

  @query('.selectionlist') selectionList!: ActionList;

  @query('.change.scl.element') selectDataSetButton!: MdOutlinedButton;

  @query('data-set-element-editor')
  dataSetElementEditor!: DataSetElementEditor;

  @query('#ldevice-select') lDeviceSelectDialog!: MdDialog;

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

  updated(changedProps: Map<string | number | symbol, unknown>) {
    super.updated?.(changedProps);
    if (changedProps.has('searchValue') && this.selectionList) {
      this.selectionList.searchValue = this.searchValue;
    }
  }

  private renderElementEditorContainer(): TemplateResult {
    if (this.selectedDataSet)
      return html`<div class="elementeditorcontainer">
        <data-set-element-editor
          .element=${this.selectedDataSet}
          editCount="${this.editCount}"
        ></data-set-element-editor>
      </div>`;

    return html``;
  }

  private renderSelectionList(): TemplateResult {
    const items = Array.from(this.doc.querySelectorAll(':root > IED')).flatMap(
      ied => {
        const dataSets = Array.from(
          ied.querySelectorAll(
            ':scope > AccessPoint > Server > LDevice > LN0 > DataSet, :scope > AccessPoint > Server > LDevice > LN > DataSet'
          )
        );

        const item: ActionItem = {
          headline: `${ied.getAttribute('name')}`,
          startingIcon: 'developer_board',
          divider: true,
          filtergroup: dataSets.map(dataset => `${identity(dataset)}`),
          actions: [
            {
              icon: 'playlist_add',
              callback: () => {
                this.selectedIed = ied;
                const lDevices = ied.querySelectorAll(
                  ':scope > AccessPoint > Server > LDevice'
                );
                if (lDevices.length === 0) {
                  // LDevice does not exist, cannot create DataSet
                } else if (lDevices.length === 1) {
                  // only one LDevice, create DataSet directly
                  const selectedLDevice = lDevices[0];
                  this.createDataSet(ied, selectedLDevice);
                } else {
                  // multiple LDevices, show select dialog
                  this.selectedLDevice = null;
                  this.lDevices = Array.from(lDevices);
                  this.lDeviceSelectDialog?.show();
                }
              },
            },
          ],
        };

        const dataset: ActionItem[] = dataSets.map(dataSet => ({
          headline: `${dataSet.getAttribute('name')}`,
          supportingText: `${pathIdentity(dataSet)}`,
          primaryAction: () => {
            if (this.selectedDataSet === dataSet) return;

            if (this.dataSetElementEditor)
              this.dataSetElementEditor.resetInputs();

            this.selectedDataSet = dataSet;
            this.selectionList.classList.add('hidden');
            this.selectDataSetButton.classList.remove('hidden');
          },
          actions: [
            {
              icon: 'delete',
              callback: () => {
                this.dispatchEvent(
                  newEditEvent(removeDataSet({ node: dataSet }), {
                    title: `Remove DataSet`,
                  })
                );

                this.selectedDataSet = undefined;
              },
            },
          ],
        }));

        return [item, ...dataset];
      }
    );

    return html`<action-list
      class="selectionlist"
      .items=${items}
      filterable
      searchhelper="Filter DataSet's"
    ></action-list>`;
  }

  private createDataSet(ied: Element, targetLDevice: Element): void {
    if (!targetLDevice) return;
    const ln0 = targetLDevice.querySelector(':scope > LN0');
    if (!ln0) return;

    const insertDataSet = createDataSet(ln0);
    if (insertDataSet) {
      this.dispatchEvent(
        newEditEvent(insertDataSet, { title: `Create New DataSet` })
      );
    } else {
      const iedName = ied.getAttribute('name');
      let reason: string;
      const anyLn = ied.querySelector('LN0, LN');
      if (!anyLn) {
        reason = 'it has no LN0 or LN element';
      } else {
        reason = 'an unknown validation error occurred';
      }

      this.dispatchEvent(
        newLogEvent({
          title: 'Could not create DataSet',
          message: `The DataSet could not be created in IED '${iedName}' because ${reason}.`,
          kind: 'warning',
        })
      );
    }
  }

  private renderToggleButton(): TemplateResult {
    return html`<md-outlined-button
      class="change scl element"
      @click=${() => {
        this.selectionList.classList.remove('hidden');
        this.selectDataSetButton.classList.add('hidden');
      }}
      >Select DataSet</md-outlined-button
    >`;
  }

  private renderLDeviceSelectDialog(): TemplateResult {
    return html` <md-dialog id="ldevice-select">
      <div slot="headline">Select LDevice</div>

      <div slot="content">
        <p style="color: var(--mdc-theme-on-surface, #333); font-size: 0.95em;">
          Choose the LDevice to which the new DataSet will be added.
        </p>
        <form>
          <md-list role="radiogroup">
            ${this.lDevices.map(
              (ld, i) => html`
                <md-list-item>
                  <md-radio
                    id="ldevice${i}"
                    name="ldevice"
                    value="${ld.getAttribute('inst')}"
                    ?checked=${this.selectedLDevice?.getAttribute('inst') ===
                    ld.getAttribute('inst')}
                    @change=${() => this.selectLDevice(ld)}
                  ></md-radio>
                  <label for="ldevice${i}">${ld.getAttribute('inst')}</label>
                </md-list-item>
              `
            )}
          </md-list>
        </form>
      </div>

      <div slot="actions">
        <md-text-button @click=${() => this.lDeviceSelectDialog?.close()}
          >Close</md-text-button
        >
        <md-text-button
          class="do picker save"
          ?disabled=${!this.selectedLDevice}
          @click=${() => this.handleLDeviceSelect()}
          >Select<md-icon slot="icon">check</md-icon></md-text-button
        >
      </div>
    </md-dialog>`;
  }

  private selectLDevice(ld: Element | null): void {
    this.selectedLDevice = ld;
  }

  private handleLDeviceSelect(): void {
    this.lDeviceSelectDialog?.close();
    if (!this.selectedLDevice || !this.selectedIed) return;
    this.createDataSet(this.selectedIed, this.selectedLDevice);
  }

  render(): TemplateResult {
    if (!this.doc) return html`<div>No SCL loaded</div>`;

    return html`${this.renderToggleButton()}
      <div class="section">
        ${this.renderSelectionList()}${this.renderElementEditorContainer()}${this.renderLDeviceSelectDialog()}
      </div>`;
  }

  static styles = css`
    ${styles}

    data-set-element-editor {
      flex: auto;
    }

    md-icon-button[icon='playlist_add'] {
      pointer-events: all;
    }
  `;
}
