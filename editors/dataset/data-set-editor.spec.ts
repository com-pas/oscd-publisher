/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
import { expect, fixture, html } from '@open-wc/testing';

import { sendMouse } from '@web/test-runner-commands';

import { SinonSpy, spy } from 'sinon';

import {
  isInsert,
  isRemove,
} from '@openenergytools/scl-lib/dist/foundation/utils.js';

import { dataSetDoc, dataSetCopyDoc } from './data-set-editor.testfiles.js';

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

  it('allows to add a new empty DataSet element directly if only one LDevice is available', async () => {
    // Prepare document to have IED with only one LDevice
    const copyDoc = doc.cloneNode(true) as XMLDocument;
    const ied = copyDoc.querySelector('IED[name="IED"]')!;

    const lDevices = ied.querySelectorAll(
      ':scope > AccessPoint > Server > LDevice'
    );
    lDevices.forEach(ld => {
      if (ld.getAttribute('inst') !== 'ldInst1') {
        ld.remove();
      }
    });

    editor = await fixture(
      html`<data-set-editor .doc="${copyDoc}"></data-set-editor>`
    );

    // should add new DataSet element to the only available LDevice without opening the LDevice select dialog
    const addDataSetListItem = editor.shadowRoot
      ?.querySelector('action-list')
      ?.shadowRoot?.querySelector('md-list:nth-child(2)')
      ?.querySelector('md-list-item') as HTMLElement;
    expect(addDataSetListItem).to.exist;
    addDataSetListItem.click();

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

describe('DataSet copy', () => {
  const copyDoc = new DOMParser().parseFromString(
    dataSetCopyDoc,
    'application/xml'
  );

  let editor: DataSetEditor;
  let editEvent: SinonSpy;

  beforeEach(async () => {
    editor = await fixture(
      html`<data-set-editor .doc="${copyDoc}"></data-set-editor>`
    );
    editEvent = spy();
    window.addEventListener('oscd-edit-v2', editEvent);
  });

  afterEach(() => {
    window.removeEventListener('oscd-edit-v2', editEvent);
  });

  it('determines CanCopy status when target IED has matching structure and no conflict', () => {
    const dataSet = copyDoc.querySelector(
      'IED[name="IED"] DataSet[name="datSet"]'
    )!;
    const ied2 = copyDoc.querySelector('IED[name="IED2"]')!;

    const status = (editor as any).getDataSetCopyStatus(dataSet, ied2);
    expect(status).to.equal('CanCopy');
  });

  it('determines DataSetAlreadyExists when target IED has a DataSet with the same name', () => {
    const dataSet = copyDoc.querySelector(
      'IED[name="IED"] DataSet[name="datSet"]'
    )!;
    const ied3 = copyDoc.querySelector('IED[name="IED3"]')!;

    const status = (editor as any).getDataSetCopyStatus(dataSet, ied3);
    expect(status).to.equal('DataSetAlreadyExists');
  });

  it('determines IEDStructureIncompatible when target IED has no matching LDevice', () => {
    const dataSet = copyDoc.querySelector(
      'IED[name="IED"] DataSet[name="datSet"]'
    )!;
    const ied4 = copyDoc.querySelector('IED[name="IED4"]')!;

    const status = (editor as any).getDataSetCopyStatus(dataSet, ied4);
    expect(status).to.equal('IEDStructureIncompatible');
  });

  it('pre-selects only CanCopy IEDs when copy dialog is opened', async () => {
    const dataSet = copyDoc.querySelector(
      'IED[name="IED"] DataSet[name="datSet"]'
    )!;

    // Simulate the folder_copy callback by setting copy options directly
    editor.dataSetCopyOptions = ['IED2', 'IED3', 'IED4'].map(name => {
      const ied = copyDoc.querySelector(`IED[name="${name}"]`)!;
      const status = (editor as any).getDataSetCopyStatus(dataSet, ied);
      return { ied, dataSet, status, selected: status === 'CanCopy' };
    });
    await editor.updateComplete;

    const ied2Option = editor.dataSetCopyOptions.find(
      o => o.ied.getAttribute('name') === 'IED2'
    );
    const ied3Option = editor.dataSetCopyOptions.find(
      o => o.ied.getAttribute('name') === 'IED3'
    );
    const ied4Option = editor.dataSetCopyOptions.find(
      o => o.ied.getAttribute('name') === 'IED4'
    );

    expect(ied2Option?.selected).to.be.true;
    expect(ied3Option?.selected).to.be.false;
    expect(ied4Option?.selected).to.be.false;
  });

  it('dispatches an insert edit event for each selected IED when copying', async () => {
    const dataSet = copyDoc.querySelector(
      'IED[name="IED"] DataSet[name="datSet"]'
    )!;
    const ied2 = copyDoc.querySelector('IED[name="IED2"]')!;

    // Set up copy options with IED2 selected (CanCopy)
    editor.dataSetCopyOptions = [
      { ied: ied2, dataSet, status: 'CanCopy' as any, selected: true },
    ];
    await editor.updateComplete;

    (editor as any).copyDataSet();

    expect(editEvent).to.have.been.calledOnce;

    const edits = editEvent.args[0][0].detail.edit;
    expect(edits).to.be.an('array').with.lengthOf(1);
    expect(edits[0]).to.satisfy(isInsert);
    expect(edits[0].parent.tagName).to.equal('LN0');
    expect(edits[0].node.tagName).to.equal('DataSet');
    expect(edits[0].node.getAttribute('name')).to.equal('datSet');
  });

  it('does not dispatch an edit event when no IED is selected', async () => {
    const dataSet = copyDoc.querySelector(
      'IED[name="IED"] DataSet[name="datSet"]'
    )!;
    const ied2 = copyDoc.querySelector('IED[name="IED2"]')!;

    // All options deselected
    editor.dataSetCopyOptions = [
      { ied: ied2, dataSet, status: 'CanCopy' as any, selected: false },
    ];
    await editor.updateComplete;

    (editor as any).copyDataSet();

    expect(editEvent).to.not.have.been.called;
  });
});
