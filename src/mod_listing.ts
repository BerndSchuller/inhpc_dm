/** Modified DirListing class from @jupyterlab/filebrowser
 *  - modified constructor (logging)
 *  - overwrite and extend handleEvent
 *  - introduce getter method for clicked signal
 */
 
import { 
  DirListing,
  FilterFileBrowserModel
} from '@jupyterlab/filebrowser';
import {
  ITranslator
} from '@jupyterlab/translation';
import { ISignal, Signal } from '@lumino/signaling';


/**
 * A widget which hosts a file list area.
 */
export class dm_DirListing extends DirListing {
  /**
   * Construct a new file browser directory listing widget.
   *
   * @param model - The file browser view model.
   */

  //here
  constructor(options: dm_DirListing.IOptions) {
    super(options)

    //here
    // this._renderer = options.renderer || dm_DirListing.defaultRenderer;

    // const headerNode = DOMUtils.findElement(this.node, HEADER_CLASS);
    // this._renderer.populateHeaderNode(
    //   headerNode,
    //   this.translator,
    //   this._hiddenColumns
    // );
    //problem?
    //this._manager.activateRequested.connect(this._onActivateRequested, this);
	//console.log('dm_DirListing constructor');
  }
  /**
   * Get the model used by the listing.
   */
  get model(): FilterFileBrowserModel {
    return this._model;
  }



  // /**
  //  * Handle the DOM events for the directory listing.
  //  *
  //  * @param event - The DOM event sent to the widget.
  //  *
  //  * #### Notes
  //  * This method implements the DOM `EventListener` interface and is
  //  * called in response to events on the panel's DOM node. It should
  //  * not be called directly by user code.
  //  */
  // handleEvent(event: Event): void {
	// //console.log("Event: ", event);
	// switch (event.type) {
	
  //     case 'mousedown':
  //       this._evtMousedown(event as MouseEvent);
  //       break;
  //     case 'mouseup':
  //       this._evtMouseup(event as MouseEvent);
  //       break;
  //     case 'mousemove':
  //       this._evtMousemove(event as MouseEvent);
  //       break;
  //     case 'keydown':
  //       this.evtKeydown(event as KeyboardEvent);
  //       break;
  //     case 'click':
  //       this._evtClick(event as MouseEvent);
		
	// 	// modified
	// 	//console.log('dm_DirListing.handleEvent: click');
  //       this._clicked.emit('click');
		
  //       break;
  //     case 'dblclick':
  //       this.evtDblClick(event as MouseEvent);
  //       break;
  //     case 'dragenter':
  //     case 'dragover':
  //       this.addClass('jp-mod-native-drop');
  //       event.preventDefault();
  //       break;
  //     case 'dragleave':
  //     case 'dragend':
  //       this.removeClass('jp-mod-native-drop');
  //       break;
  //     case 'drop':
  //       this.removeClass('jp-mod-native-drop');
  //       this.evtNativeDrop(event as DragEvent);
  //       break;
  //     case 'scroll':
  //       this._evtScroll(event as MouseEvent);
  //       break;
  //     case 'lm-dragenter':
  //       this.evtDragEnter(event as IDragEvent);
  //       break;
  //     case 'lm-dragleave':
  //       this.evtDragLeave(event as IDragEvent);
  //       break;
  //     case 'lm-dragover':
  //       this.evtDragOver(event as IDragEvent);
  //       break;
  //     case 'lm-drop':
	// 	//console.log("DirListing.Drop Event: ", event);
	// 	this.evtDrop(event as IDragEvent);
  //       break;
  //     default:
  //       break;
  //   }
  // }

  // added
  // signal to be consumed by other objects
  // https://jupyterlab.github.io/lumino/signaling/classes/signal.html
  get clicked(): ISignal<this, string> {
    return this._clicked;
  }

  // // signal to be consumed by other objects
  private _clicked = new Signal<this, string>(this);
  // // modification end
  // //here
  // // private _sortState: DirListing.ISortState = {
  // //   direction: 'ascending',
  // //   key: 'name'
  // // };
}

/**
 * The namespace for the `DirListing` class statics.
 */
export namespace dm_DirListing {
  /**
   * An options object for initializing a file browser directory listing.
   */
  export interface IOptions {
    /**
     * A file browser model instance.
     */
    model: FilterFileBrowserModel;

    /**
     * A renderer for file items.
     *
     * The default is a shared `Renderer` instance.
     */
    renderer?: DirListing.IRenderer;

    /**
     * A language translator.
     */
    translator?: ITranslator;
  }

    //leave in here too...?
    // /**
    //  * Handle a header click.
    //  *
    //  * @param node - A node populated by [[populateHeaderNode]].
    //  *
    //  * @param event - A click event on the node.
    //  *
    //  * @returns The sort state of the header after the click event.
    //  */
    // handleHeaderClick(node: HTMLElement, event: MouseEvent): ISortState | null {
    //   const name = DOMUtils.findElement(node, NAME_ID_CLASS);
    //   const modified = DOMUtils.findElement(node, MODIFIED_ID_CLASS);
    //   const state: ISortState = { direction: 'ascending', key: 'name' };
    //   const target = event.target as HTMLElement;
    //   if (name.contains(target)) {
    //     const modifiedIcon = DOMUtils.findElement(
    //       modified,
    //       HEADER_ITEM_ICON_CLASS
    //     );
    //     const nameIcon = DOMUtils.findElement(name, HEADER_ITEM_ICON_CLASS);

    //     if (name.classList.contains(SELECTED_CLASS)) {
    //       if (!name.classList.contains(DESCENDING_CLASS)) {
    //         state.direction = 'descending';
    //         name.classList.add(DESCENDING_CLASS);
    //         Private.updateCaret(nameIcon, 'right', 'down');
    //       } else {
    //         name.classList.remove(DESCENDING_CLASS);
    //         Private.updateCaret(nameIcon, 'right', 'up');
    //       }
    //     } else {
    //       name.classList.remove(DESCENDING_CLASS);
    //       Private.updateCaret(nameIcon, 'right', 'up');
    //     }
    //     name.classList.add(SELECTED_CLASS);
    //     modified.classList.remove(SELECTED_CLASS);
    //     modified.classList.remove(DESCENDING_CLASS);
    //     Private.updateCaret(modifiedIcon, 'left');
    //     return state;
    //   }
    //   if (modified.contains(target)) {
    //     const modifiedIcon = DOMUtils.findElement(
    //       modified,
    //       HEADER_ITEM_ICON_CLASS
    //     );
    //     const nameIcon = DOMUtils.findElement(name, HEADER_ITEM_ICON_CLASS);

    //     state.key = 'last_modified';
    //     if (modified.classList.contains(SELECTED_CLASS)) {
    //       if (!modified.classList.contains(DESCENDING_CLASS)) {
    //         state.direction = 'descending';
    //         modified.classList.add(DESCENDING_CLASS);
    //         Private.updateCaret(modifiedIcon, 'left', 'down');
    //       } else {
    //         modified.classList.remove(DESCENDING_CLASS);
    //         Private.updateCaret(modifiedIcon, 'left', 'up');
    //       }
    //     } else {
    //       modified.classList.remove(DESCENDING_CLASS);
    //       Private.updateCaret(modifiedIcon, 'left', 'up');
    //     }
    //     modified.classList.add(SELECTED_CLASS);
    //     name.classList.remove(SELECTED_CLASS);
    //     name.classList.remove(DESCENDING_CLASS);
    //     Private.updateCaret(nameIcon, 'right');
    //     return state;
    //   }
    //   return state;
    // }

 }//dm_dirlisting namespace...