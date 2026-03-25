/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
import { expect, fixture, html } from '@open-wc/testing';

import { sendMouse } from '@web/test-runner-commands';

import { SinonSpy, spy } from 'sinon';

import {
  isInsert,
  isRemove,
} from '@openenergytools/scl-lib/dist/foundation/utils.js';

import { dataSetDoc } from './data-set-editor.testfiles.js';

import { DataSetEditor } from './data-set-editor.js';

window.customElements.define('data-set-editor', DataSetEditor);

const doc = new DOMParser().parseFromString(dataSetDoc, 'application/xml');

describe('DataSet editor component', () => {
  let editEvent: SinonSpy;
  let editor: DataSetEditor;

  beforeEach(async () => {
    editor = await fixture(
      html`<data-set-editor .doc="${doc}"></data-set-editor>`
    );

    editEvent = spy();
    window.addEventListener('oscd-edit-v2', editEvent);
  });

  it('allows to add a new empty DataSet element to a selected LDevice if multiple LDevices are available', async () => {
    // should open LDevice select dialog
    const addDataSetListItem = editor.shadowRoot
      ?.querySelector('action-list')
      ?.shadowRoot?.querySelector('md-list:nth-child(2)')
      ?.querySelector('md-list-item') as HTMLElement;
    expect(addDataSetListItem).to.exist;
    addDataSetListItem.click();

    await editor.updateComplete;
    await Promise.resolve();

    // get the dialog
    const dialog = editor.lDeviceSelectDialog;

    // get the second lDevice radio button
    const radio = dialog
      .querySelector('md-list')
      ?.querySelector('md-list-item:nth-child(2)')!
      .querySelector('md-radio') as HTMLElement;

    // select second lDevice as target
    radio.click();
    await editor.updateComplete;
    await Promise.resolve();

    // click the "Select" button
    const selectBtn = dialog.querySelector(
      'md-text-button.do.picker.save'
    ) as HTMLElement;
    selectBtn.click();

    await editor.updateComplete;
    await Promise.resolve();

    expect(editEvent).to.have.been.calledOnce;

    const insert = editEvent.args[0][0].detail.edit;

    expect(insert).to.satisfy(isInsert);
    expect(insert.parent.tagName).to.equal('LN0');
    expect(insert.node.tagName).to.equal('DataSet');
    expect(insert.node.getAttribute('name')).to.equal('newDataSet_001');
    expect(insert.node.children.length).to.equal(0);
  });

  it('allows to remove an existing DataSet element', async () => {
    await sendMouse({ type: 'click', position: [760, 200] });

    expect(editEvent).to.have.been.calledOnce;
    expect(editEvent.args[0][0].detail.edit[0]).to.satisfy(isRemove);
    expect(editEvent.args[0][0].detail.edit[0].node.tagName).to.equal(
      'DataSet'
    );
  });

  it('sets searchValue on ActionList when passed as a prop', async () => {
    const el = await fixture(
      html`<data-set-editor .doc="${doc}" searchValue="IED1"></data-set-editor>`
    );
    await (el as DataSetEditor).updateComplete;

    const actionList = (el as DataSetEditor).selectionList;
    expect(actionList).to.exist;
    actionList.items;
    expect(actionList.searchValue).to.equal('IED1');
  });
});
