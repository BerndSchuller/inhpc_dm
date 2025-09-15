import {
    Dialog,
    ToolbarButton,
    showDialog,
    showErrorMessage,
  } from '@jupyterlab/apputils';
  
import { 
    addIcon
  } from '@jupyterlab/ui-components';

import { requestAPI } from './dm_handler';

import { selectEndpoint } from './dm_dialogs';

import { dm_TransferList } from './dm_transferlist';

import { dm_FileTreePanel } from './dm_filetree';

/**
 * Button for selecting remote FS
 */
export class dm_SelectEndpointButton extends ToolbarButton {

	constructor(fb: dm_FileTreePanel){
		super( {
          icon: addIcon,
	      tooltip: 'Choose remote filesystem',
	      onClick: () => { this.handle_click(fb); }
	    });
	}
	
	async handle_click(fb: dm_FileTreePanel){
	    // perform GET request for the list of available endpoints
		try {
			const data: Array<Object> = await requestAPI<any>('inhpc_dm/resources', {
				'method': 'GET'});
			console.log(data);
			const urls: Array<string> = [];
			data.forEach( (v: any) => {
				console.log(`Available endpoint: ${v['url']}`);
				urls.push(v['url']);
			});
			const selection = await selectEndpoint(urls);
			const selected_url = selection.value;
			if (selected_url==null)
				return;
			let drive:string;
			let name:string;
			data.forEach( (v: any) => {
				if(selected_url===v['url']){
					drive = v['drive'];
					name = v['name'];
				}
			});
			console.log(`Selected drive = ${drive}`);
			fb.setEndpoint(selected_url, drive, name);
		} catch (reason) {
			console.error(`Error on GET /inhpc_dm/resources: ${reason}`);
			showErrorMessage("Error", `${reason}`);
		}
	}
} // end dm_SelectEndpointButton

/**
 * Button for launching copy task
 */
export class dm_CopyButton extends ToolbarButton {

	constructor(source: dm_FileTreePanel, target: dm_FileTreePanel, monitor: dm_TransferList, label: string, tooltip: string){
		super( {
          label: label,
	      tooltip: tooltip,
	      onClick: () => { this.handle_click(source, target, monitor); }
	    });
	}
	
	async handle_click(source: dm_FileTreePanel, target: dm_FileTreePanel, monitor: dm_TransferList){
	    var _action = "copy";
	    var _target_dir = target.getSelectedDir();
	    var _sources: string[] = []
	    for (const item of source.getSelected()) {
			_sources.push(item.path);
		};
		if(_sources.length==0){
			showErrorMessage("Error", "Please select source file(s)");
			return
		}
		if(_target_dir==null){
			showErrorMessage("Error", "Please select a target directory");
			return
		}
		var req_data = JSON.stringify({
						"command": _action,
		                "parameters": { 
		                    "target" : _target_dir,
		                    "sources": _sources }
		                })
        console.log('Copy command params: ' + req_data);
        try {
      		const data = await requestAPI<any>('inhpc_dm/tasks', {
      	    	'body': req_data,
      	    	'method': 'POST'});
      	  	console.log(data);
		  	var _title = data.status ?? "OK";
		  	var _msg = data.error_info ?? "Task launched successfully";
		  	showDialog({ title: _title, body: _msg, buttons: [ Dialog.okButton() ] });
			monitor.refreshData();
      	} catch (reason) {
      	    console.error(`Error on POST /inhpc_dm/tasks: ${reason}`);
      	    showErrorMessage("Error", `${reason}`);
    	}
	}
} // end dm_CopyButton

/**
 * Button for refreshing the list of transfer tasks
 */
export class dm_RefreshButton extends ToolbarButton {

	constructor(transferlist: dm_TransferList, label:string, tooltip:string){
		super( {
          label: label,
	      tooltip: tooltip,
	      onClick: () => { this.handle_click(transferlist); }
	    });
	}
	
	async handle_click(transferlist: dm_TransferList){
	    transferlist.refreshData();
	}
} // end dm_RefreshButton