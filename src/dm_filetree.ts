/**
 * Filetree widget based on jupyter-fs
 */

import {
  ContentsProxy
} from "./contents_proxy";

import {
  TreeFinderSidebar, TreeFinderWidget
} from "./treefinder";

import {
  JupyterFrontEnd
} from '@jupyterlab/application';

import { Toolbar,
    ToolbarButton,
    newFolderIcon,
    refreshIcon
} from "@jupyterlab/ui-components";

import { PanelLayout, Widget } from "@lumino/widgets";

import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { commandIDs } from "./commands";
import { revealPath } from "./contents_utils";
import { UploadButton } from "./upload";

//holds one TreeFinderWidget
export class dm_FileTreePanel extends Widget {
  constructor(
    app : JupyterFrontEnd,
    settings: ISettingRegistry.ISettings
  ){
    super();
    this.addClass("jp-tree-finder-sidebar");
    this.node.classList.add("jfs-mod-notRenaming");
    this.app = app;
    this.settings = settings;
    this.drive = null;
    this.name = null;
    this.treefinder = null;
    this.toolbar = new Toolbar();
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addWidget(this.toolbar);
    this._buttons = []

    const refresh_button = new ToolbarButton({
      icon: refreshIcon,
      onClick: () => {
        TreeFinderSidebar.tracker.setCurrent(this.treefinder);
        void app.commands.execute(commandIDs.refresh);
        TreeFinderSidebar.tracker.setCurrent(null);
    },
       tooltip: "Refresh",
       enabled: false
     }
     
    );

    const new_folder_button = new ToolbarButton({
      icon: newFolderIcon,
      onClick: () => {
        TreeFinderSidebar.tracker.setCurrent(this.treefinder);
        void app.commands.execute((commandIDs.create_folder));
        TreeFinderSidebar.tracker.setCurrent(null);
      },
      tooltip: "New Folder",
       enabled: false
    });

    const upload_button = new UploadButton({ uploader: null });
    upload_button.enabled = false;

    this.toolbar.addItem("refresh", refresh_button);
    this.toolbar.addItem("new folder", new_folder_button);
    this.toolbar.addItem("upload", upload_button);

    this._buttons.push(refresh_button);
    this._buttons.push(new_folder_button);
    this._buttons.push(upload_button);
   }

  protected onBeforeShow(msg: any): void {
   if(this.treefinder){
    this.treefinder.refresh();
    this.treefinder.draw();
   }
  }

  protected onResize(msg: any): void {
    if(this.treefinder){
      this.treefinder.draw();
    }
  }

  setEndpoint(url: string, drive: string, name: string){
    this.drive = drive;
    this.name = name;
    if(this.treefinder){
      // remove existing treefinder from UI
      this.treefinder.parent = null;
      this.update();
      TreeFinderSidebar.tracker.remove(this.treefinder);
      this.treefinder = null;
    }
    let columns = Array<keyof ContentsProxy.IJupyterContentRow>();
    columns.push("path");
    columns.push("size");
    this.treefinder = new TreeFinderWidget( {app:this.app, columns:columns, url:url, rootPath: drive, settings:this.settings });
    (this.layout as PanelLayout).addWidget(this.treefinder);
    TreeFinderSidebar.tracker.add(this.treefinder);
    this._buttons.forEach(b => {
      b.enabled = true;
      if (b instanceof UploadButton){
        b.uploader = this.treefinder.ready.then(() => this.treefinder!.uploader!)
        void this.treefinder.ready.then(() => {
          this.treefinder.uploader!.uploadCompleted.connect((sender, args) => {
            // Do not select/scroll into view: Upload might be slow, so user might have moved on!
            // We do however want to expand the folder
            void revealPath(this.treefinder!.model!, args.path).then(() => this.treefinder.model!.flatten());
          });
        });
      }
    });
    this.update();
  }

  getSelectedDir(): string | null {
    var sel: dm_FileTreeSelection[] = this.getSelected();
    if(sel.length==1 && sel[0].isDir){
      return sel[0].path;
    }
    else{
      return this.getCurrentDir();
    }
  }

  getSelected(): dm_FileTreeSelection[]{
    var result: dm_FileTreeSelection[] = [];
    this.treefinder.model.selection.forEach((item)=>{
      console.log("selected: "+JSON.stringify(item));
      var x = new dm_FileTreeSelection();
      x.drive = this.drive;
      x.path = item.pathstr;
      x.isDir = "dir"==item.row.kind;
      console.log("--> "+JSON.stringify(x));
      result.push(x);
    });
    return result;
  }

  getCurrentDir(): string {
    var result = this.treefinder.model.root.pathstr
    if (result.includes("/")){
      return result
    }
    else {
      return result+"/"
    }
  
  }
  toolbar: Toolbar;
  treefinder: TreeFinderWidget;
  drive: string;
  name: string;
  app: JupyterFrontEnd;
  settings: ISettingRegistry.ISettings;
  _buttons: ToolbarButton[];
};

export class dm_FileTreeSelection {
  constructor(){};
  path: string;
  drive: string;
  isDir: boolean = false;
}
