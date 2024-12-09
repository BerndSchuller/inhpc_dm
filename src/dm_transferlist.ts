/**
 * Widget containing a list of running transfers
 */

import {
  showErrorMessage
} from '@jupyterlab/apputils';

import {
  BasicKeyHandler,
  BasicMouseHandler,
  DataGrid,
  JSONModel
} from '@lumino/datagrid';

import {
  requestAPI
} from './dm_handler';

export class dm_TransferList extends DataGrid {
  
  constructor(){
    let transferListStyle: DataGrid.Style = {
      ...DataGrid.defaultStyle,
      rowBackgroundColor: i => (i % 2 === 0 ? 'rgba(64, 115, 53, 0.2)' : '')
    };
    super({
      style: transferListStyle,
      defaultSizes: {
        rowHeight: 10,
        columnHeaderHeight:12,
        columnWidth: 200,
        rowHeaderWidth: 200
      }
    });
    this.mouseHandler = new BasicMouseHandler();
    this.keyHandler = new BasicKeyHandler();
    this.refreshData();
   };

  async refreshData() {
    try {
      const task_info = await requestAPI<any>('inhpc_dm/tasks', {
         'method': 'GET'});
      console.log(task_info['tasks']);
      let transferListModel = new JSONModel({data: task_info['tasks'], schema: schema});
      this.dataModel = transferListModel;
    }
    catch (reason) {
      console.error(`Error refreshing tasks list".\n${reason}`);
      showErrorMessage("Error", `${reason}`);
    }
  };

};

const schema = {
  primaryKey: ['Started'],
  fields: [
    {
      name: 'Started',
      type: 'string'
    },
    {
      name: 'Source',
      type: 'string'
    },
    {
      name: 'Target',
      type: 'string'
    },
    {
      name: 'Status',
      type: 'string'
    }
  ],
  pandas_version: '0.20.0'
};