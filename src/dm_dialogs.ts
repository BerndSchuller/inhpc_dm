
import {
	Dialog,
} from '@jupyterlab/apputils';

import {
  Widget
} from '@lumino/widgets';


const INPUT_DIALOG_CLASS = 'jp-Input-Dialog';

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

    this._input_remoteDir = document.createElement('input');
    this._input_remoteDir.classList.add('jp-mod-styled');
    this._input_remoteDir.id = 'jp-dialog-input-id_rd';

    const labelElement_rd = document.createElement('label');
    labelElement_rd.textContent = "Remote directory";
    labelElement_rd.htmlFor = this._input_remoteDir.id;
    this.node.appendChild(labelElement_rd);
    this.node.appendChild(this._input_remoteDir);

    this._input_localDir = document.createElement('input');
    this._input_localDir.classList.add('jp-mod-styled');
    this._input_localDir.id = 'jp-dialog-input-id_ld';

    const labelElement_ld = document.createElement('label');
    labelElement_ld.textContent = "Mount point";
    labelElement_ld.htmlFor = this._input_localDir.id;
    this.node.appendChild(labelElement_ld);
    this.node.appendChild(this._input_localDir);

  }

  /** Input HTML nodes */
  protected _input_endpoint: HTMLInputElement;
  protected _list: HTMLSelectElement;

  protected _input_remoteDir: HTMLInputElement;

  protected _input_localDir: HTMLInputElement;

  getValue(): any {
    return { "endpoint": this._input_endpoint.value,
    		 "remoteDir": this._input_remoteDir.value,
    		 "localDir": this._input_localDir.value
    }
  }
}


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
 
