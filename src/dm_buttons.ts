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

import { getMountInfo } from './dm_dialogs';

import { dm_TransferList } from './dm_transferlist';

/**
 * Button for mounting remote FS
 */
export class dm_MountButton extends ToolbarButton {

	constructor(fb: dm_FileBrowser, _settings: dm_Settings){
		super( {
          icon: addIcon,
	      tooltip: 'Mount remote filesystem via UFTP',
	      onClick: () => { this.handle_click(fb, _settings); }
	    });
	}
	
	handle_click(fb: dm_FileBrowser, _settings: dm_Settings){
	    console.log(this);
        var selectedDirectory = fb.getSelectedDirectory();
        getMountInfo(_settings.getUFTPEndpoints(), selectedDirectory, _settings.getDefaultEndpoint()).then(async value => {
          var req_data = JSON.stringify(value.value);
		  if(req_data!="null") {
			// final mount directory from dialog result
			var mountDirectory = JSON.parse(req_data).mount_point
			console.log("Mount dir: " + mountDirectory);
			
				console.log('mount params: ' + req_data);
				// perform POST request
				try {
				const data = await requestAPI<any>('mount', {
					'body': req_data,
					'method': 'POST'});
				console.log(data);
				if("OK" == data.status) {
					showDialog({ title: "OK", body: "Mount successful",
								buttons: [ Dialog.okButton() ] });
					// TODO: find a better/faster way to change directory
					await fb.getListing().model.cd("/");
					await fb.getListing().model.cd(mountDirectory);
				}
				else{
					showErrorMessage("Error", data.error_info);
				}
				} catch (reason) {
					console.error(`Error on POST /inhpc_dm/mount".\n${reason}`);
					showErrorMessage("Error", `${reason}`);
				}
			
			} else {
				console.log('Mount cancelled');
			}
	    });
	}
} // end dm_MountButton


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
      	  const data = await requestAPI<any>('unmount', {
      	     'body': req_data,
      	     'method': 'POST'});
      	  console.log(data);
      	  if("OK" == data.status) {
      	    showDialog({ title: "OK", body: "Unmount successful",
      	 	             buttons: [ Dialog.okButton() ] });
      	 	// TODO trigger model refresh
            //below commands dont make any difference!
            //fb.getListing().update;
            //fb.update;
      	  }
      	  else{
	        showErrorMessage("Error", data.error_info);
	      }
      	} catch (reason) {
      	    console.error(`Error on POST /inhpc_dm/unmount".\n${reason}`);
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
      	  const data = await requestAPI<any>('tasks', {
      	     'body': req_data,
      	     'method': 'POST'});
      	  console.log(data);
      	  if("OK" == data.status) {
      	    showDialog({ title: "OK", body: "Task launched successfully",
      	 	             buttons: [ Dialog.okButton() ] });
			monitor.refreshData();
      	  }
      	  else{
	        showErrorMessage("Error", data.error_info);
	      }
      	} catch (reason) {
      	    console.error(`Error on POST /inhpc_dm/tasks".\n${reason}`);
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
} // end dm_CopyButton