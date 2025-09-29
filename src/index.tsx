import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ICommandPalette, IThemeManager } from "@jupyterlab/apputils";
import { ILauncher} from '@jupyterlab/launcher';
import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { folderIcon, fileIcon } from "@jupyterlab/ui-components";

import { IFSOptions, IFSResource, IFSSettingsResource } from "./filesystem";
import { initResources } from "./resources";
import { unpartialResource } from "./settings";
import { activate_dm } from './dm_widget';
import { createDynamicCommands, createStaticCommands } from "./commands";
import { TreeFinderSidebar } from "./treefinder";

let MY_ID = 'inhpc_dm:plugin';

/**
 * Initialization for the inhpc_dm extension
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: MY_ID,
  autoStart: true,
  requires: [ISettingRegistry,ICommandPalette, ILayoutRestorer, ILauncher, IThemeManager],
  activate: (
    app: JupyterFrontEnd, 
    settingRegistry: ISettingRegistry,
    palette: ICommandPalette, 
    restorer: ILayoutRestorer,
    launcher: ILauncher,
    themeManager: IThemeManager
)=>  {
    console.log('JupyterLab extension InHPC data management activating.');

    async function handleSettingsUpdate(app: JupyterFrontEnd, settings: ISettingRegistry.ISettings): Promise<void> {
      let resources: IFSResource[] = (
        settings?.composite.resources as unknown as IFSSettingsResource[] ?? []
      ).map(unpartialResource);
      const options: IFSOptions = settings?.composite.options as any ?? {};
      try {
        resources = (await initResources(resources, options)).filter(r => r.init);
        } catch (e) {
        console.error("Failed to update resources!", e);
      }
      createDynamicCommands(app, TreeFinderSidebar.tracker, TreeFinderSidebar.clipboard, resources, settings);
  }
  createStaticCommands(app, TreeFinderSidebar.tracker, TreeFinderSidebar.clipboard);
  // Load application settings and setup update handler
  try {
    Promise.all([app.restored, settingRegistry.load(MY_ID)])
      .then(([, settings]) => {
        handleSettingsUpdate(app, settings);
        settings.changed.connect(() => {
          handleSettingsUpdate(app, settings);
        });
        activate_dm(app, palette, restorer, launcher, settings);
      })
    } catch (error) {
      console.warn(`Failed to load settings for the inhpc_dm extension.\n${error}`);
    }

    // Inject lab icons
    const style = document.createElement("style");
    style.setAttribute("id", "jupyter-fs-icon-inject");

    // Hackish, but needed since tree-finder insists on pseudo elements for icons.
    function iconStyleContent(folderStr: string, fileStr: string) {
      // Note: We aren't able to style the hover/select colors with this.
      return `
      .jp-tree-finder {
        --tf-dir-icon: url('data:image/svg+xml,${encodeURIComponent(folderStr)}');
        --tf-file-icon: url('data:image/svg+xml,${encodeURIComponent(fileStr)}');
      }
      `;
    }

    themeManager.themeChanged.connect(() => {
      // Update SVG icon fills (since we put them in pseudo-elements we cannot style with CSS)
      const primary = getComputedStyle(document.documentElement).getPropertyValue("--jp-ui-font-color1");
      style.textContent = iconStyleContent(
        folderIcon.svgstr.replace(/fill="([^"]{0,7})"/, `fill="${primary}"`),
        fileIcon.svgstr.replace(/fill="([^"]{0,7})"/, `fill="${primary}"`)
      );
    });

    style.textContent = iconStyleContent(folderIcon.svgstr, fileIcon.svgstr);
    document.head.appendChild(style);
  }
};

export default extension ;