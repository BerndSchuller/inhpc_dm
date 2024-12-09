import {
    Dialog,
    ToolbarButton,
    showDialog,
    showErrorMessage
  } from '@jupyterlab/apputils';
  
import { 
    addIcon,
    clearIcon
  } from '@jupyterlab/ui-components';
  
import { dm_FileBrowser } from './mod_browser';

import { dm_Settings } from './dm_widget';

import { requestAPI } from './dm_handler';

import { selectEndpoint } from './dm_dialogs';

import { dm_TransferList } from './dm_transferlist';

import { dm_FileTreePanel } from './dm_filetree';

/**
 * Button for selecting remote FS
 */
export class dm_SelectEndpointButton extends ToolbarButton {

	constructor(fb: dm_FileTreePanel, _settings: dm_Settings){
		super( {
          icon: addIcon,
	      tooltip: 'Select remote filesystem',
	      onClick: () => { this.handle_click(fb, _settings); }
	    });
	}
	
	async handle_click(fb: dm_FileTreePanel, _settings: dm_Settings){
	    // perform GET request for the list of available endpoints
		try {
			console.log("Getting available endpoints from jupyterfs...");
			const data: Array<Object> = await requestAPI<any>('jupyterfs/resources', {
				'method': 'GET'});
			console.log(data);
			const urls: Array<string> = [];
			data.forEach( (v: any) => {
				console.log(`Available endpoint: ${v['url']}`);
				urls.push(v['url']);
			});
			const selection = await selectEndpoint(urls);
			const selected_url = selection.value;
			let drive:string;
			data.forEach( (v: any) => {
				if(selected_url===v['url']) drive = v['drive'];
			});
			console.log(`Selected drive = ${drive}`);
			fb.setEndpoint(drive);
		} catch (reason) {
			console.error(`Error on POST /inhpc_dm/mount: ${reason}`);
			showErrorMessage("Error", `${reason}`);
		}
	}
} // end dm_SelectEndpointButton

/**
 * Button for un-mounting remote FS
 */
export class dm_UnmountButton extends ToolbarButton {

	constructor(fb: dm_FileBrowser){
		super( {
          icon: clearIcon,
	      tooltip: 'Unmount remote filesystem',
	      onClick: () => { this.handle_click(fb); }
	    });
	}
	
	async handle_click(fb: dm_FileBrowser){
	    console.log(this);
        var mountDirectory = fb.getSelectedDirectory();
        var req_data = JSON.stringify({ 'mount_point': mountDirectory })
        console.log('mount params: ' + req_data);
        try {
      	  const data = await requestAPI<any>('inhpc_dm/unmount', {
      	     'body': req_data,
      	     'method': 'POST'});
      	  console.log(data);
      	  showDialog({ title: "OK", body: "Unmount successful",
      	 	            buttons: [ Dialog.okButton() ] });
      	    // TODO trigger model refresh
            //below commands dont make any difference!
            //fb.getListing().update;
            //fb.update;
      	} catch (reason) {
      	    console.error(`Error on POST /inhpc_dm/unmount: ${reason}`);
      	    showErrorMessage("Error", `${reason}`);
    	}
	}
} // end dm_UnmountButton

/**
 * Button for launching copy task
 */
export class dm_CopyButton extends ToolbarButton {

	constructor(source: dm_FileBrowser, target: dm_FileBrowser, monitor: dm_TransferList, label: string, tooltip: string){
		super( {
          label: label,
	      tooltip: tooltip,
	      onClick: () => { this.handle_click(source, target, monitor); }
	    });
	}
	
	async handle_click(source: dm_FileBrowser, target: dm_FileBrowser, monitor: dm_TransferList){
	    var _action = "copy";
	    var _target_dir = target.getSelectedDirectory();
	    var _sources: string[] = []
	    for (const item of source.getListing().selectedItems()) {
			_sources.push(item.path);
		};
		if(_sources.length ==0){
			showErrorMessage("Error", "Please select source file(s)");
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
      	  showDialog({ title: "OK", body: "Task launched successfully",
      	 	             buttons: [ Dialog.okButton() ] });
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