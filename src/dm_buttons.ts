import {
    Dialog,
    ToolbarButton,
    showDialog,
    showErrorMessage,
  } from '@jupyterlab/apputils';
  
import { 
    addIcon,
	LabIcon,
	refreshIcon
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
	
	/**
	 * gets the list of available resources, and opens a dialog
	 * allowing the user to select one of them
	 */
	async handle_click(fb: dm_FileTreePanel){
	    try {
			const data: Array<Object> = await requestAPI<any>('inhpc_dm/resources', {
				'method': 'GET'});
			console.log(data);
			const names: Array<string> = [];
			const tooltips: Array<string> = [];
			data.forEach( (v: any) => {
				names.push(v['name']);
				tooltips.push(v['url']);
			});
			const selection = await selectEndpoint(names, tooltips);
			const name = selection.value;
			if (name==null)
				return;
			let url:string;
			let drive:string;
			data.forEach( (v: any) => {
				if(name===v['name']){
					drive = v['drive'];
					url = v['url'];
				}
			});
			console.log(`Selected drive = ${drive}`);
			fb.setEndpoint(url, drive, name);
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

	constructor(source: dm_FileTreePanel, target: dm_FileTreePanel, monitor: dm_TransferList, icon: LabIcon, tooltip: string){
		super( {
          icon,
		  //label : 'Copy',
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

	constructor(transferlist: dm_TransferList, tooltip:string){
		super( {
		  icon: refreshIcon,
	      tooltip: tooltip,
	      onClick: () => { this.handle_click(transferlist); }
	    });
	}
	
	async handle_click(transferlist: dm_TransferList){
	    transferlist.refreshData();
	}
} // end dm_RefreshButton