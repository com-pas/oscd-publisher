/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
import { fixture, html, expect } from '@open-wc/testing';

import { sendKeys, sendMouse, setViewport } from '@web/test-runner-commands';

import { visualDiff } from '@web/test-runner-visual-regression';

import {
  dataSetDoc,
  otherDataSetDoc,
  dataSetDocWithDescs,
} from './data-set-editor.testfiles.js';

import { DataSetEditor } from './data-set-editor.js';

window.customElements.define('data-set-editor', DataSetEditor);

const factor = window.process && process.env.CI ? 4 : 2;
function timeout(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms * factor);
  });
}
mocha.timeout(2000 * factor);

describe('DataSet editor component', () => {
  describe('with missing SCL document', () => {
    let editor: DataSetEditor;
    beforeEach(async () => {
      editor = await fixture(html`<data-set-editor></data-set-editor>`);
      document.body.prepend(editor);
    });

    afterEach(async () => {
      editor.remove();
    });

    it('looks like the latest snapshot', async () => {
      await editor.updateComplete;
      await timeout(200);
      await visualDiff(
        editor,
        `dataset/data-set-editor/#1 Missing SCL document`
      );
    });
  });

  describe('with SCL document loaded', () => {
    let editor: DataSetEditor;
    beforeEach(async () => {
      const doc = new DOMParser().parseFromString(
        dataSetDoc,
        'application/xml'
      );

      editor = await fixture(
        html`<data-set-editor .doc="${doc}"></data-set-editor>`
      );
      document.body.prepend(editor);
    });

    afterEach(async () => {
      editor.remove();
    });

    describe('with unselected DataSet', () => {
      it('looks like the latest snapshot', async () => {
        await setViewport({ width: 1900, height: 1200 });

        await editor.updateComplete;
        await timeout(300);
        await visualDiff(
          editor,
          `dataset/data-set-editor/#2 Unselected DataSet 1900x1200`
        );
      });

      it('filtered looks like the latest snapshot', async () => {
        await setViewport({ width: 1900, height: 1200 });
        await sendMouse({ type: 'click', position: [200, 50] });
        await sendKeys({ type: 'ldInst2' });

        await editor.updateComplete;
        await timeout(400);
        await visualDiff(
          editor,
          `dataset/data-set-editor/#3 With filtered DataSets`
        );
      });

      it('on mobile looks like the latest snapshot', async () => {
        await setViewport({ width: 599, height: 1100 });

        await editor.updateComplete;
        await timeout(400);
        await visualDiff(
          editor,
          `dataset/data-set-editor/#4 Unselected DataSet 599x1100`
        );
      });
    });

    describe('with selected DataSet', () => {
      beforeEach(async () => {
        await setViewport({ width: 1200, height: 800 });
        await sendMouse({ type: 'click', position: [100, 500] });
        await timeout(200);
      });

      it('looks like the latest snapshot', async () => {
        await setViewport({ width: 1900, height: 1200 });

        await timeout(200);
        await visualDiff(
          editor,
          `dataset/data-set-editor/#5 Selected DataSet 1900x1200`
        );
      });

      it('on mobile looks like the latest snapshot', async () => {
        await setViewport({ width: 599, height: 1100 });

        await editor.updateComplete;
        await timeout(200);
        await visualDiff(
          editor,
          `dataset/data-set-editor/#6 Selected DataSet 599x1100`
        );
      });

      it('with active opened selection list looks like the latest snapshot', async () => {
        await setViewport({ width: 599, height: 1100 });

        editor.selectDataSetButton.click();

        await editor.updateComplete;
        await timeout(200);
        await visualDiff(
          editor,
          `dataset/data-set-editor/#7 Selection List 599x1100`
        );
      });

      it('shows copy dialog for DataSet and matches snapshot', async () => {
        await setViewport({ width: 599, height: 1100 });

        // Open selection list
        editor.selectDataSetButton.click();
        await editor.updateComplete;
        await timeout(200);

        const actionList = editor.selectionList;
        expect(actionList).to.exist;
        expect(actionList.items?.length).to.be.greaterThan(0);

        // Find item containing copy action
        const dataSetItem = actionList.items.find(item =>
          item.actions?.some(a => a.icon === 'content_copy')
        );

        expect(
          dataSetItem,
          'Expected at least one DataSet with a content_copy action'
        ).to.exist;

        const copyAction = dataSetItem!.actions!.find(
          a => a.icon === 'content_copy'
        );

        expect(copyAction, 'content_copy action should exist').to.exist;
        expect(
          copyAction!.callback,
          'content_copy callback should be defined'
        ).to.be.a('function');

        // Trigger dialog
        copyAction!.callback();

        await editor.updateComplete;
        await timeout(200);

        await visualDiff(
          editor,
          `dataset/data-set-editor/#copy-dialog-DataSet-599x1100`
        );
      });

      it('dynamically loaded new doc looks like the latest snapshot', async () => {
        await setViewport({ width: 599, height: 1100 });

        editor.selectDataSetButton.click();
        editor.doc = new DOMParser().parseFromString(
          otherDataSetDoc,
          'application/xml'
        );

        await editor.updateComplete;
        await timeout(200);
        await visualDiff(
          editor,
          `dataset/data-set-editor/#8 New Doc with selected DataSet 599x1100`
        );
      });
    });
  });

  describe('with SCL document containing DataSet descriptions', () => {
    let editor: DataSetEditor;
    beforeEach(async () => {
      const doc = new DOMParser().parseFromString(
        dataSetDocWithDescs,
        'application/xml'
      );
      // eslint-disable-next-line prefer-const
      editor = await fixture(
        html`<data-set-editor .doc="${doc}"></data-set-editor>`
      );

      document.body.prepend(editor);
    });

    afterEach(async () => {
      editor.remove();
    });

    it('looks like the latest snapshot', async () => {
      await setViewport({ width: 1200, height: 1600 });
      editor.selectDataSetButton.click();
      await editor.updateComplete;
      await timeout(300);

      await sendMouse({ type: 'click', position: [40, 225] });
      await timeout(300);
      await editor.updateComplete;

      await visualDiff(
        editor,
        `dataset/data-set-editor/#9 Document shows descriptions in DataSet 1200x1600`
      );
    });
  });
});
