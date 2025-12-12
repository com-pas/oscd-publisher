/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
import { expect, fixture, html } from '@open-wc/testing';
import { sendMouse, setViewport } from '@web/test-runner-commands';

import { SinonSpy, spy } from 'sinon';

import {
  isInsert,
  isRemove,
  isUpdate,
} from '@openenergytools/scl-lib/dist/foundation/utils.js';

import {
  gseControlDoc,
  gseControlDocWithoutServices,
  gseControlWithMaxGSEControl,
} from './gseControl.testfiles.js';

import { GseControlEditor } from './gse-control-editor.js';

window.customElements.define('gse-control-editor', GseControlEditor);

function timeout(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms);
  });
}

const doc = new DOMParser().parseFromString(gseControlDoc, 'application/xml');

describe('GSEControl editor component', () => {
  let editor: GseControlEditor;
  let editEvent: SinonSpy;

  beforeEach(async () => {
    editor = await fixture(
      html`<gse-control-editor .doc="${doc}"></gse-control-editor>`
    );

    editEvent = spy();
    window.addEventListener('oscd-edit-v2', editEvent);
  });

  it('allows to insert new GSEControl element', async () => {
    await sendMouse({ type: 'click', position: [688, 100] });

    expect(editEvent).to.have.been.calledOnce;
    expect(editEvent.args[0][0].detail.edit[0]).to.satisfy(isInsert);
    expect(editEvent.args[0][0].detail.edit[0].parent.tagName).to.equal('LN0');
    expect(editEvent.args[0][0].detail.edit[0].node.tagName).to.equal(
      'GSEControl'
    );
  });

  it('allows to remove and existing GSEControl element', async () => {
    await sendMouse({ type: 'click', position: [760, 200] });

    expect(editEvent).to.have.been.calledOnce;
    expect(editEvent.args[0][0].detail.edit[0]).to.satisfy(isRemove);
    expect(editEvent.args[0][0].detail.edit[0].node.tagName).to.equal(
      'GSEControl'
    );
  });

  it('allows to insert new DataSet and link with existing GSEControl', async () => {
    await sendMouse({ type: 'click', position: [400, 200] });
    editor.newDataSet.click();

    expect(editEvent).to.have.been.calledOnce;
    expect(editEvent.args[0][0].detail.edit[0]).to.satisfy(isInsert);
    expect(editEvent.args[0][0].detail.edit[0].parent.tagName).to.equal('LN0');
    expect(editEvent.args[0][0].detail.edit[0].node.tagName).to.equal(
      'DataSet'
    );
  });

  it('allows to change an existing DataSet', async () => {
    await setViewport({ width: 800, height: 800 });
    await sendMouse({ type: 'click', position: [400, 200] });

    editor.changeDataSet.click();
    await timeout(200);
    await sendMouse({ type: 'click', position: [400, 450] });

    expect(editEvent).to.have.been.calledOnce;
    expect(editEvent.args[0][0].detail.edit).to.satisfy(isUpdate);
    expect(editEvent.args[0][0].detail.edit.element.tagName).to.equal(
      'GSEControl'
    );
    expect(editEvent.args[0][0].detail.edit.attributes.datSet).to.equal(
      'datSet2'
    );
  });

  it('sets searchValue on ActionList when passed as a prop', async () => {
    const el = await fixture(
      html`<gse-control-editor
        .doc="${doc}"
        searchValue="GSE1"
      ></gse-control-editor>`
    );
    await (el as GseControlEditor).updateComplete;

    const actionList = (el as GseControlEditor).selectionList;
    expect(actionList).to.exist;
    expect(actionList?.searchValue).to.equal('GSE1');
  });

  describe('with missing <Services><GOOSE> element', () => {
    let docWithoutServices: Document;
    let logEventSpy: SinonSpy;

    beforeEach(async () => {
      docWithoutServices = new DOMParser().parseFromString(
        gseControlDocWithoutServices,
        'application/xml'
      );
      editor = await fixture(
        html`<gse-control-editor
          .doc="${docWithoutServices}"
        ></gse-control-editor>`
      );

      document.body.prepend(editor);
      logEventSpy = spy();
      editor.addEventListener('log', logEventSpy);
    });

    it("creates the message 'Services > GOOSE element is missing' when GSEControl element could not be created due to missing <Services><GOOSE> element", () => {
      const ied = docWithoutServices.querySelector('IED')!;
      const reason = (editor as any).getCreationFailureReason(ied);
      expect(reason).to.equal('Services > GOOSE element is missing');
    });

    it("creates the message 'it has no LN0 element' when GSEControl element could not be created due to missing LN0 element", () => {
      const ied = docWithoutServices.querySelector('IED[name="IED_No_LN0"]')!;
      const reason = (editor as any).getCreationFailureReason(ied);
      expect(reason).to.equal('it has no LN0 element');
    });

    it('dispatches log event when GSEControl creation fails', async () => {
      await sendMouse({ type: 'click', position: [688, 100] });

      expect(logEventSpy.callCount).to.equal(1);
      expect(logEventSpy.args[0][0].detail.title).to.equal(
        'Could not create GSEControl'
      );
      expect(logEventSpy.args[0][0].detail.kind).to.equal('warning');
      expect(logEventSpy.args[0][0].detail.message).to.include(
        'Services > GOOSE element is missing'
      );
    });
  });

  describe('with maximum GSEControl elements', () => {
    let docWithMaxGSEControl: Document;
    beforeEach(() => {
      docWithMaxGSEControl = new DOMParser().parseFromString(
        gseControlWithMaxGSEControl,
        'application/xml'
      );
    });

    it('creates a message that the maximum number of GSEControl elements has been reached', () => {
      const ied = docWithMaxGSEControl.querySelector(
        'IED[name="IED_Max_GSEControl_Reached"]'
      )!;
      const reason = (editor as any).getCreationFailureReason(ied);
      expect(reason).to.equal(
        'the maximum number of GSEControl elements (1) has been reached for IED (current: 1)'
      );
    });
  });
});
