/** Modified FileBrowser class and namespace from @jupyterlab/filebrowser
 *  - includes adjusted to use external resourses
 *  - get listing(): dm_DirListing to grant access to listing and thus signal
 *  - use dm_DirListing instead DirListing
 *  - introduce title for dockpanel
 */

import {
  showErrorMessage,
  Toolbar,
  ToolbarButton,
  ReactWidget
} from '@jupyterlab/apputils';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { Contents, ServerConnection } from '@jupyterlab/services';

import { newFolderIcon, refreshIcon } from '@jupyterlab/ui-components';

import { IIterator } from '@lumino/algorithm';

import { PanelLayout, Widget } from '@lumino/widgets';

//import { BreadCrumbs } from './crumbs';
//import { DirListing } from './listing';
//import { FilterFileBrowserModel } from './model';
//import { Uploader } from './upload';
//import { FilenameSearcher } from './search';

import { 
//	BreadCrumbs as dm_BreadCrumbs, 
//	DirListing as dm_DirListing,
//	FileBrowser,
//	Uploader as dm_Uploader, 
//	FilenameSearcher as dm_FilenameSearcher
} from '@jupyterlab/filebrowser';
import {
  dm_BreadCrumbs,
} from './mod_crumbs';
import { 
 dm_DirListing 
} from './mod_listing';
import {
  dm_Uploader,
} from './mod_upload';
import {
  dm_FilenameSearcher
} from './mod_search';

import { 
//  FilterFileBrowserModel as dm_FilterFileBrowserModel
} from '@jupyterlab/filebrowser';
import {
  dm_FilterFileBrowserModel
} from './mod_model';

//import { ISignal, Signal } from '@lumino/signaling';

import {
  nullTranslator,
  TranslationBundle,
  ITranslator
} from '@jupyterlab/translation';

/**
 * The class name added to file browsers.
 */
const FILE_BROWSER_CLASS = 'jp-FileBrowser';

/**
 * The class name added to the filebrowser crumbs node.
 */
const CRUMBS_CLASS = 'jp-FileBrowser-crumbs';

/**
 * The class name added to the filebrowser filterbox node.
 */
const FILTERBOX_CLASS = 'jp-FileBrowser-filterBox';

/**
 * The class name added to the filebrowser toolbar node.
 */
const TOOLBAR_CLASS = 'jp-FileBrowser-toolbar';

/**
 * The class name added to the filebrowser listing node.
 */
const LISTING_CLASS = 'jp-FileBrowser-listing';

/**
 * A widget which hosts a file browser.
 *
 * The widget uses the Jupyter Contents API to retrieve contents,
 * and presents itself as a flat list of files and directories with
 * breadcrumbs.
 */
export class dm_FileBrowser extends Widget {
  /**
   * Construct a new file browser.
   *
   * @param model - The file browser view model.
   */
  constructor(options: dm_FileBrowser.IOptions, title: string) {
    super();
	//const ffbm = options.model;
	//console.log("test ffbm: ", ffbm);
    this.title.label = title;
	this.addClass(FILE_BROWSER_CLASS);
    this.id = options.id;

    const model = (this.model = options.model);
	
    const renderer = options.renderer;
    
    model.connectionFailure.connect(this._onConnectionFailure, this);
    this.translator = options.translator || nullTranslator;
	const translator = this.translator;
    this._manager = model.manager;
    this._trans = this.translator.load('jupyterlab');
    this._crumbs = new dm_BreadCrumbs({ model, translator });
    this.toolbar = new Toolbar<Widget>();
    // a11y
    this.toolbar.node.setAttribute('role', 'navigation');
    this.toolbar.node.setAttribute(
      'aria-label',
      this._trans.__('file browser')
    );
    this._directoryPending = false;

    const newFolder = new ToolbarButton({
      icon: newFolderIcon,
      onClick: () => {
        this.createNewDirectory();
      },
      tooltip: this._trans.__('New Folder')
    });
    const uploader = new dm_Uploader({ model, translator: this.translator });

    const refresher = new ToolbarButton({
      icon: refreshIcon,
      onClick: () => {
        void model.refresh();
      },
      tooltip: this._trans.__('Refresh File List')
    });

    this.toolbar.addItem('newFolder', newFolder);
    this.toolbar.addItem('upload', uploader);
    this.toolbar.addItem('refresher', refresher);

    this._listing = new dm_DirListing({
      model,
      renderer,
      translator: this.translator
    });

    this._filenameSearcher = dm_FilenameSearcher({
      listing: this._listing,
      useFuzzyFilter: this._useFuzzyFilter,
      placeholder: this._trans.__('Filter files by name')
    });

    this._crumbs.addClass(CRUMBS_CLASS);
    this.toolbar.addClass(TOOLBAR_CLASS);
    this._filenameSearcher.addClass(FILTERBOX_CLASS);
    this._listing.addClass(LISTING_CLASS);

    this.layout = new PanelLayout();
    this.layout.addWidget(this.toolbar);
    this.layout.addWidget(this._filenameSearcher);
    this.layout.addWidget(this._crumbs);
    this.layout.addWidget(this._listing);

    if (options.restore !== false) {
      void model.restore(this.id);
    }
  }

  /**
   * The model used by the file browser.
   */
  readonly model: dm_FilterFileBrowserModel;

  /**
   * The toolbar used by the file browser.
   */
  readonly toolbar: Toolbar<Widget>;

  /**
   * Override Widget.layout with a more specific PanelLayout type.
   */
  layout: PanelLayout;

  /**
   * Whether to show active file in file browser
   */
  get navigateToCurrentDirectory(): boolean {
    return this._navigateToCurrentDirectory;
  }

  set navigateToCurrentDirectory(value: boolean) {
    this._navigateToCurrentDirectory = value;
  }

  /**
   * Whether to use fuzzy filtering on file names.
   */
  set useFuzzyFilter(value: boolean) {
    this._useFuzzyFilter = value;

    this._filenameSearcher = dm_FilenameSearcher({
      listing: this._listing,
      useFuzzyFilter: this._useFuzzyFilter,
      placeholder: this._trans.__('Filter files by name'),
      forceRefresh: true
    });
    this._filenameSearcher.addClass(FILTERBOX_CLASS);

    this.layout.removeWidget(this._filenameSearcher);
    this.layout.removeWidget(this._crumbs);
    this.layout.removeWidget(this._listing);

    this.layout.addWidget(this._filenameSearcher);
    this.layout.addWidget(this._crumbs);
    this.layout.addWidget(this._listing);
  }

  /**
   * Create an iterator over the listing's selected items.
   *
   * @returns A new iterator over the listing's selected items.
   */
  selectedItems(): IIterator<Contents.IModel> {
    return this._listing.selectedItems();
  }

  /**
   * Select an item by name.
   *
   * @param name - The name of the item to select.
   */
  async selectItemByName(name: string): Promise<void> {
    await this._listing.selectItemByName(name);
  }

  clearSelectedItems(): void {
    this._listing.clearSelectedItems();
  }

  /**
   * Rename the first currently selected item.
   *
   * @returns A promise that resolves with the new name of the item.
   */
  rename(): Promise<string> {
    return this._listing.rename();
  }

  /**
   * Cut the selected items.
   */
  cut(): void {
    this._listing.cut();
  }

  /**
   * Copy the selected items.
   */
  copy(): void {
    this._listing.copy();
  }

  /**
   * Paste the items from the clipboard.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  paste(): Promise<void> {
    return this._listing.paste();
  }

  /**
   * Create a new directory
   */
  createNewDirectory(): void {
    if (this._directoryPending === true) {
      return;
    }
    this._directoryPending = true;
    // TODO: We should provide a hook into when the
    // directory is done being created. This probably
    // means storing a pendingDirectory promise and
    // returning that if there is already a directory
    // request.
    void this._manager
      .newUntitled({
        path: this.model.path,
        type: 'directory'
      })
      .then(async model => {
        await this._listing.selectItemByName(model.name);
        this._directoryPending = false;
      })
      .catch(err => {
        this._directoryPending = false;
      });
  }

  /**
   * Delete the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  delete(): Promise<void> {
    return this._listing.delete();
  }

  /**
   * Duplicate the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  duplicate(): Promise<void> {
    return this._listing.duplicate();
  }

  /**
   * Download the currently selected item(s).
   */
  download(): Promise<void> {
    return this._listing.download();
  }

  /**
   * Shut down kernels on the applicable currently selected items.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  shutdownKernels(): Promise<void> {
    return this._listing.shutdownKernels();
  }

  /**
   * Select next item.
   */
  selectNext(): void {
    this._listing.selectNext();
  }

  /**
   * Select previous item.
   */
  selectPrevious(): void {
    this._listing.selectPrevious();
  }

  /**
   * Find a model given a click.
   *
   * @param event - The mouse event.
   *
   * @returns The model for the selected file.
   */
  modelForClick(event: MouseEvent): Contents.IModel | undefined {
    return this._listing.modelForClick(event);
  }

  protected translator: ITranslator;

  /**
   * Handle a connection lost signal from the model.
   */
  private _onConnectionFailure(
    sender: dm_FilterFileBrowserModel,
    args: Error
  ): void {
    if (
      args instanceof ServerConnection.ResponseError &&
      args.response.status === 404
    ) {
      const title = this._trans.__('Directory not found');
      args.message = this._trans.__(
        'Directory not found: "%1"',
        this.model.path
      );
      void showErrorMessage(title, args);
    }
  }
  
  // avoid dual signaling, instead offer DirListing instead to connect
  get listing(): dm_DirListing {
    return this._listing;
  }
//  // signal to be consumed by other objects
//  // https://jupyterlab.github.io/lumino/signaling/classes/signal.html
//  get clicked(): ISignal<this, string> {
//    return this._clicked;
//  }
//  // signal to be consumed by other objects
//  private _clicked = new Signal<this, string>(this);
  private _trans: TranslationBundle;
  private _crumbs: dm_BreadCrumbs;
  private _listing: dm_DirListing;
  private _filenameSearcher: ReactWidget;
  private _manager: IDocumentManager;
  private _directoryPending: boolean;
  private _navigateToCurrentDirectory: boolean = false;
  private _useFuzzyFilter: boolean = true;
}

/**
 * The namespace for the `FileBrowser` class statics.
 */
export namespace dm_FileBrowser {
  /**
   * An options object for initializing a file browser widget.
   */
  export interface IOptions {
    /**
     * The widget/DOM id of the file browser.
     */
    id: string;

    /**
     * A file browser model instance.
     */
    model: dm_FilterFileBrowserModel;

    /**
     * An optional renderer for the directory listing area.
     *
     * The default is a shared instance of `DirListing.Renderer`.
     */
    renderer?: dm_DirListing.IRenderer;

    /**
     * Whether a file browser automatically restores state when instantiated.
     * The default is `true`.
     *
     * #### Notes
     * The file browser model will need to be restored manually for the file
     * browser to be able to save its state.
     */
    restore?: boolean;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}