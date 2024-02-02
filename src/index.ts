/**
 * files structure:
 * index.ts         Main file with all imports, adding extensions to JupyterLab, ...
 * dm_*.ts          dm = data management files
 * mod_*.ts         mod = modified files for existing JupyterLab classes
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
} from '@jupyterlab/apputils';

import{ ISettingRegistry } from '@jupyterlab/settingregistry';

import { activate_dm } from './dm_widget';
import { IDocumentManager } from '@jupyterlab/docmanager';

/**
 * Initialization data for the jupyterlab extensions
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'inhpc_dm:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer, ISettingRegistry, IDocumentManager],
  activate: (
    app: JupyterFrontEnd, 
    palette: ICommandPalette, 
    restorer: ILayoutRestorer,
    settingReg: ISettingRegistry,
    documentManager: IDocumentManager
) =>
  {
    activate_dm(app, documentManager, palette, restorer, settingReg, extension.id);
  }
};

export default extension;
