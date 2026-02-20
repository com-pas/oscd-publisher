/* eslint-disable import/no-extraneous-dependencies */
import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import {
  ActionItem,
  ActionList,
} from '@openenergytools/filterable-lists/dist/ActionList.js';
import { MdOutlinedButton } from '@scopedelement/material-web/button/MdOutlinedButton.js';
import { MdDialog } from '@scopedelement/material-web/dialog/MdDialog.js';
import { MdCheckbox } from '@scopedelement/material-web/checkbox/MdCheckbox.js';

import { newEditEvent } from '@openenergytools/open-scd-core';
import { newLogEvent } from '@compas-oscd/core';
import {
  createDataSet,
  identity,
  removeDataSet,
} from '@openenergytools/scl-lib';

import { DataSetElementEditor } from './data-set-element-editor.js';

import { pathIdentity, styles } from '../../foundation.js';
import { queryLDevice, queryLN } from '../../foundation/utils/xml.js';

export class DataSetEditor extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'action-list': ActionList,
    'data-set-element-editor': DataSetElementEditor,
    'md-outlined-button': MdOutlinedButton,
    'md-dialog': MdDialog,
    'md-checkbox': MdCheckbox,
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

  @query('.selectionlist') selectionList!: ActionList;

  @query('.change.scl.element') selectDataSetButton!: MdOutlinedButton;

  @query('data-set-element-editor')
  dataSetElementEditor!: DataSetElementEditor;

  @state()
  private dataSetCopyOptions: {
    ied: Element;
    dataSet: Element;
    status: string;
    selected: boolean;
  }[] = [];

  @query('.dialog.copy') copyDataSetDialog!: MdDialog;

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

  private async openCopyDialog(dataSet: Element): Promise<void> {
    const currentIED = dataSet.closest('IED');
    const otherIEDs = Array.from(
      this.doc.querySelectorAll(':root > IED')
    ).filter(ied => ied !== currentIED);

    this.dataSetCopyOptions = otherIEDs.map(ied => {
      const ln0 = ied.querySelector('LN0');
      const exists =
        ln0 &&
        ln0.querySelector(`DataSet[name="${dataSet.getAttribute('name')}"]`);
      let status = 'CanCopy';
      if (!ln0) status = 'IEDStructureIncompatible';
      else if (exists) status = 'DataSetAlreadyExists';
      return {
        ied,
        dataSet,
        status,
        selected: status === 'CanCopy',
      };
    });
    await this.updateComplete;
    if (this.copyDataSetDialog) this.copyDataSetDialog.open = true;
  }

  private copyDataSet(): void {
    const selectedOptions = this.dataSetCopyOptions.filter(o => o.selected);
    if (selectedOptions.length === 0) {
      if (this.copyDataSetDialog) this.copyDataSetDialog.open = false;
      return;
    }

    const inserts = selectedOptions
      .map(o => {
        // current ldevice
        const lDevice = o.dataSet.closest('LDevice');
        const lnOrLn0 = o.dataSet.closest('LN0, LN');

        if (!lnOrLn0 || !lDevice) {
          throw new Error(
            'ControlBlock must be a child of LN or LN0 and LDevice'
          );
        }

        // get location where to insert copy
        const ldInst = lDevice?.getAttribute('inst') ?? '';
        const lDeviceInIed = queryLDevice(o.ied, ldInst);

        if (!lDeviceInIed) {
          return null;
        }

        const lnClass = lnOrLn0.getAttribute('lnClass') ?? '';
        const inst = lnOrLn0.getAttribute('inst') ?? '';
        const prefix = lnOrLn0.getAttribute('prefix');

        const insertLN = queryLN(lDeviceInIed, lnClass, inst, prefix);

        return {
          parent: insertLN,
          node: o.dataSet.cloneNode(true) as Element,
          reference: null,
        };
      })
      .filter(
        (i): i is { parent: Element; node: Element; reference: null } => !!i
      );
    this.dispatchEvent(
      newEditEvent(inserts, {
        title: `Copy DataSet to ${selectedOptions.length} IEDs`,
      })
    );
    if (this.copyDataSetDialog) this.copyDataSetDialog.open = false;
  }

  private renderCopyDataSetDialog(): TemplateResult {
    const getStatusText = (status: string) => {
      if (status === 'CanCopy') return 'Copy possible';
      if (status === 'IEDStructureIncompatible')
        return 'IED structure incompatible';
      if (status === 'DataSetAlreadyExists') return 'DataSet already exists';
      return '';
    };
    return html`<md-dialog class="dialog copy">
      <div slot="content" class="copy-option-list">
        ${this.dataSetCopyOptions.map(
          option => html`
            <label class="copy-optin-row">
              <div class="copy-option-description">
                <div class="copy-option-description-ied">
                  ${option.ied.getAttribute('name')}
                </div>
                <div class="copy-option-description-status">
                  ${getStatusText(option.status)}
                </div>
              </div>
              <md-checkbox
                ?checked=${option.selected}
                @change=${() => this.toggleCopyOption(option)}
                ?disabled=${option.status !== 'CanCopy'}
              ></md-checkbox>
            </label>
          `
        )}
        <div class="copy-button">
          <md-outlined-button
            @click=${() => {
              if (this.copyDataSetDialog) this.copyDataSetDialog.open = false;
            }}
            >Close</md-outlined-button
          >
          <md-outlined-button
            @click=${this.copyDataSet}
            ?disabled=${!this.dataSetCopyOptions.some(
              o => o.selected && o.status === 'CanCopy'
            )}
            >Copy</md-outlined-button
          >
        </div>
      </div>
    </md-dialog>`;
  }

  private toggleCopyOption(option: {
    ied: Element;
    dataSet: Element;
    status: string;
    selected: boolean;
  }): void {
    const idx = this.dataSetCopyOptions.indexOf(option);
    if (idx !== -1) {
      const updated = { ...option, selected: !option.selected };
      this.dataSetCopyOptions = [
        ...this.dataSetCopyOptions.slice(0, idx),
        updated,
        ...this.dataSetCopyOptions.slice(idx + 1),
      ];
    }
    this.requestUpdate();
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
                const insertDataSet = createDataSet(ied);
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
              icon: 'content_copy',
              callback: () => {
                this.openCopyDialog(dataSet);
              },
            },
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

  render(): TemplateResult {
    if (!this.doc) return html`<div>No SCL loaded</div>`;

    return html`${this.renderToggleButton()}
      <div class="section">
        ${this.renderSelectionList()}${this.renderElementEditorContainer()}${this.renderCopyDataSetDialog()}
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

    mwc-list-item {
      --mdc-list-item-meta-size: 48px;
    }

    data-set-element-editor {
      grid-column: 1 / 2;
    }

    .copy-option-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .copy-button {
      align-self: flex-end;
    }

    .copy-optin-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .copy-option-description {
      min-width: 240px;
    }

    .copy-option-description-ied {
      font-weight: bold;
    }

    .copy-option-description-status {
      font-size: 0.8em;
    }
  `;
}
