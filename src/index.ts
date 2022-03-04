/**
 * files structure:
 * index.ts         Main file with all imports, adding extensions to JupyterLab, ...
 * dm_*.ts          dm = data management files
 *   dm_widget.ts   main data management widget
 * mod_*.ts         mod = modified files for existing JupyterLab classes, rest of name is untouched.
 *   mod_browser.ts Modified FileBrowser class
 *   mod_listing.ts modified DirListing class for FileBrowser
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
} from '@jupyterlab/apputils';

import { activate_dm } from './dm_widget';

/**
 * Initialization data for the jupyterlab extensions
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_inhpc',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd, 
    palette: ICommandPalette, 
    restorer: ILayoutRestorer) =>
  {
    activate_dm(app, palette, restorer);
  }
};

export default extension;
