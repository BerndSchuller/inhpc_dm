
import {
	Dialog,
} from '@jupyterlab/apputils';

import {
  Widget
} from '@lumino/widgets';


const INPUT_DIALOG_CLASS = 'jp-Input-Dialog';

/**
 * A popup dialog for choosing a system to mount via UFTP.
 */
class MountDialog<T> extends Widget implements Dialog.IBodyWidget<T> {

  constructor(availableEndpoints: string[] = []) {
    super();
    this.addClass(INPUT_DIALOG_CLASS);

    // editable list of endpoints
    this._list = document.createElement('select');
    let current = '';
    availableEndpoints.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        this._list.appendChild(option);
    });
    const data = document.createElement('datalist');
    data.id = 'input-dialog-items';
    data.appendChild(this._list);

    //creating endpoint
    this._input_endpoint = document.createElement('input');
    this._input_endpoint.classList.add('jp-mod-styled');
    this._input_endpoint.id = 'jp-dialog-input-id_ep';
    this._input_endpoint.type = 'list';
    this._input_endpoint.value = current;
    this._input_endpoint.setAttribute('list', data.id);
    this.node.appendChild(data);
    
    const labelElement_ep = document.createElement('label');
    labelElement_ep.textContent = "UFTP endpoint";
    labelElement_ep.htmlFor = this._input_endpoint.id;
    this.node.appendChild(labelElement_ep);
    this.node.appendChild(this._input_endpoint);
    
    //creating remote directory
    this._input_remoteDir = document.createElement('input');
    this._input_remoteDir.classList.add('jp-mod-styled');
    this._input_remoteDir.id = 'jp-dialog-input-id_rd';

    const labelElement_rd = document.createElement('label');
    labelElement_rd.textContent = "Remote directory";
    labelElement_rd.htmlFor = this._input_remoteDir.id;
    this.node.appendChild(labelElement_rd);
    this.node.appendChild(this._input_remoteDir);

    //creating local directory
    this._input_localDir = document.createElement('input');
    this._input_localDir.classList.add('jp-mod-styled');
    this._input_localDir.id = 'jp-dialog-input-id_ld';

    const labelElement_ld = document.createElement('label');
    labelElement_ld.textContent = "Mount point";
    labelElement_ld.htmlFor = this._input_localDir.id;
    this.node.appendChild(labelElement_ld);
    this.node.appendChild(this._input_localDir);

    //creating username
    this._input_username = document.createElement('input');
    this._input_username.classList.add('jp-mod-styled');
    this._input_username.id = 'jp-dialog-input-id_un';

    const labelElement_un = document.createElement('label');
    labelElement_un.textContent = "Username";
    labelElement_un.htmlFor = this._input_username.id;
    this.node.appendChild(labelElement_un);
    this.node.appendChild(this._input_username);

    //creating password
    this._input_password = document.createElement('input');
    this._input_password.classList.add('jp-mod-styled');
    this._input_password.type = 'password';

    const labelElement_pw = document.createElement('label');
    labelElement_pw.textContent = "Password";
    labelElement_pw.htmlFor = this._input_password.id;
    this.node.appendChild(labelElement_pw);
    this.node.appendChild(this._input_password);


  }// end constructor

  /** Input HTML nodes */
  protected _input_endpoint: HTMLInputElement;
  protected _list: HTMLSelectElement;
  protected _input_remoteDir: HTMLInputElement;
  protected _input_localDir: HTMLInputElement;
  protected _input_username: HTMLInputElement;
  protected _input_password: HTMLInputElement;

  getValue(): any {
    return { "endpoint": this._input_endpoint.value,
    		 "remote_directory": this._input_remoteDir.value,
    		 "mount_point": this._input_localDir.value,
    		 "credentials": {
    		 	"type": "basic",
    		 	"username": this._input_username.value,
    		 	"password": this._input_password.value,
    		 }
    }
  }
}//end mount dialog class


export function showDialog<T>(
  options: Partial<Dialog.IOptions<T>> = {}
): Promise<Dialog.IResult<T>> {
  const dialog = new Dialog(options);
  return dialog.launch();
}

 export function getMountInfo(availableEndpoints?: string[]): Promise<Dialog.IResult<string>> {
    return showDialog({
      body: new MountDialog(availableEndpoints),
      buttons: [
        Dialog.cancelButton({ label: 'Cancel' }),
        Dialog.okButton({ label: 'OK' })
      ],
      focusNodeSelector: 'input'
    });
  }
 
