
import {
	Dialog,
} from '@jupyterlab/apputils';

import {
  Widget
} from '@lumino/widgets';


const INPUT_DIALOG_CLASS = 'jp-Input-Dialog';

/**
 * A popup dialog for selecting a jupyterfs endpoint to show
 * in one of the file trees
 */
class SelectDialog<T> extends Widget implements Dialog.IBodyWidget<T> {

  constructor(availableEndpoints: string[] = []) {
    super();
    this.addClass(INPUT_DIALOG_CLASS);
    this._list = Array<HTMLInputElement>();
    this._input_endpoint = document.createElement('div');
    this._input_endpoint.classList.add('jp-mod-styled');
    this._input_endpoint.id = 'jp-dialog-input-id_ep';
    
    let i=0;
    availableEndpoints.forEach((item) => {
      const container = document.createElement('div');
      const option = document.createElement('input');
      option.type = 'checkbox';
      option.name = 'inhpc_dm_endpoint_selection';
      option.value = item;
      option.id = 'inhpc_dm_endpoint_selection'+i;
      option.onclick = (e: Event)=> {
        var cb = e.target as HTMLInputElement;
        if(cb.checked){
          // uncheck everything else
          this._list.forEach( (item) => {
           item.checked = false;
        });
        cb.checked = true;
        }
      };
      if (i==0) option.checked = true;
      const label = document.createElement('label');
      label.textContent = item;
      label.htmlFor = option.id;
      container.appendChild(option);
      container.appendChild(label);
      this._list.push(option)
      this._input_endpoint.appendChild(container);
      i++;
  });

    const labelElement_ep = document.createElement('label');
    labelElement_ep.textContent = "Select Endpoint";
    labelElement_ep.htmlFor = this._input_endpoint.id;
    this.node.appendChild(labelElement_ep);
    this.node.appendChild(this._input_endpoint);
    
  }// end constructor

  /** Input HTML nodes */
  protected _input_endpoint: HTMLDivElement;
  protected _list: Array<HTMLInputElement>;

  getValue(): any {
      const checked_option = this._list.find(b => b.checked || b.ariaChecked)
      return checked_option ? checked_option.value : null;
  }
}//end endpoint selector dialog class

export function showDialog<T>(
  options: Partial<Dialog.IOptions<T>> = {}
): Promise<Dialog.IResult<T>> {
  const dialog = new Dialog(options);
  return dialog.launch();
}

export function selectEndpoint(availableEndpoints: string[]): Promise<Dialog.IResult<string>> {
  return showDialog({
    body: new SelectDialog(availableEndpoints),
    buttons: [
      Dialog.cancelButton({ label: 'Cancel' }),
      Dialog.okButton({ label: 'OK' })
    ],
    focusNodeSelector: 'input'
  });
}
