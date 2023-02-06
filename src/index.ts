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

/**
 * Initialization data for the jupyterlab extensions
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/inhpc-extension:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd, 
    palette: ICommandPalette, 
    restorer: ILayoutRestorer,
    settingReg: ISettingRegistry
) =>
  {
    activate_dm(app, palette, restorer, settingReg, extension.id);
  }
};

export default extension;
